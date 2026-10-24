import { MemberUser, MemberRole } from '@/types';
import { getRuntimeGasUrl, saveRecordToSheetStore, fetchAllSheetStoreRows } from './google/sheets';
import { getKoreanNowString } from './formatters';

// 강의실별 실시간 출석 세션 정보
export interface RoomAttendance {
  sessionId: string;
  title: string;
  code: string; // 관리자가 발급한 4자리 출석 번호
  startedAt: string;
  isActive: boolean;
  checkedInUsers: {
    userId: string;
    userName: string;
    phoneNumber: string;
    role: MemberRole;
    checkedAt: string;
  }[];
}

// 강의실별 실시간 참여 및 대기 상태
export interface RoomState {
  lectureId: string;
  maxAttendees: number; // 0이면 무제한
  activeMembers: MemberUser[]; // 현재 입장 완료된 회원 목록
  waitingMembers: MemberUser[]; // 정원 초과로 대기 중인 회원 목록 (FIFO)
  lastUpdated: number;
  startTime?: string; // 강의 시작 시간 (예: "19:30")
  attendance?: RoomAttendance | null; // 현재 진행 중인 출석 체크 세션
}

// 구글 시트에 기록되는 강의실 이벤트 타입 (동시 접속 시 덮어쓰기 방지)
export interface RoomEvent {
  eventId: string;
  lectureId: string;
  type:
    | 'enter'
    | 'leave'
    | 'resetRoom'
    | 'updateMaxAttendees'
    | 'updateStartTime'
    | 'startAttendance'
    | 'stopAttendance'
    | 'checkInAttendance'
    | 'manualAttendance';
  timestamp: number;
  isManualEnter?: boolean;
  isPresent?: boolean;
  user?: MemberUser;
  userId?: string;
  userName?: string;
  userPhone?: string;
  maxAttendees?: number;
  startTime?: string;
  session?: RoomAttendance;
  checkedUser?: {
    userId: string;
    userName: string;
    phoneNumber: string;
    role: MemberRole;
    checkedAt: string;
  };
}

// 메모리 내 전체 강의실 상태 저장소
const roomStates: Map<string, RoomState> = new Map();
const inMemoryRoomEvents: RoomEvent[] = [];
// 서버 메모리 캐시 타임스탬프 (Vercel CPU 최적화)
let lastRoomSyncTime = 0;

function cleanPhoneDigits(phone?: string): string {
  return (phone || '').replace(/\D/g, '');
}

function isSameRoomUser(
  a: { id?: string; userId?: string; name?: string; userName?: string; phoneNumber?: string },
  b: { id?: string; userId?: string; name?: string; userName?: string; phoneNumber?: string }
): boolean {
  const aName = (a.name || a.userName || '').trim();
  const bName = (b.name || b.userName || '').trim();
  const aPhone = cleanPhoneDigits(a.phoneNumber);
  const bPhone = cleanPhoneDigits(b.phoneNumber);

  // 이름이 둘 다 존재할 때는 이름이 일치해야 동일 회원으로 판단 (시트 행 번호 기반 ID 밀림 방지)
  if (aName && bName) {
    if (aName !== bName) return false;
    if (aPhone && bPhone && aPhone.length >= 4 && bPhone.length >= 4) {
      return aPhone.slice(-4) === bPhone.slice(-4);
    }
    return true;
  }

  const aId = (a.id || a.userId || '').trim();
  const bId = (b.id || b.userId || '').trim();
  if (aId && bId && !aId.startsWith('sheet_user_') && !bId.startsWith('sheet_user_') && aId === bId) {
    return true;
  }

  if (aPhone && bPhone && aPhone.length >= 8 && aPhone === bPhone) return true;

  return false;
}

async function appendRoomEvent(event: RoomEvent): Promise<void> {
  inMemoryRoomEvents.push(event);
  lastRoomSyncTime = 0;
  const actorName =
    event.user?.name ||
    event.checkedUser?.userName ||
    event.userName ||
    '시스템';
  await saveRecordToSheetStore(
    '__ROOM_EVENT__',
    event.lectureId,
    actorName,
    event,
    `${event.type}:${event.lectureId}`
  );
}

function applyRoomEventToState(room: RoomState, ev: RoomEvent): void {
  if (ev.type === 'resetRoom') {
    room.activeMembers = [];
    room.waitingMembers = [];
    room.attendance = null;
    if (typeof ev.maxAttendees === 'number' && ev.maxAttendees >= 0) {
      room.maxAttendees = ev.maxAttendees;
    }
    room.lastUpdated = ev.timestamp || Date.now();
    return;
  }

  if (ev.type === 'enter' && ev.user) {
    // 과거 버전에서 페이지 조회 시 자동 발송되던 비정상 입장 이벤트 무시 (명시적으로 입장 버튼을 누른 이벤트만 반영)
    if (!ev.isManualEnter) {
      return;
    }

    const user = ev.user;
    if (typeof ev.maxAttendees === 'number' && ev.maxAttendees >= 0 && room.activeMembers.length === 0) {
      room.maxAttendees = ev.maxAttendees;
    }

    // 관리자는 정원과 관계없이 프리패스 입장
    if (user.role === 'admin' || user.name === '지정인') {
      const existingIdx = room.activeMembers.findIndex((u) => isSameRoomUser(u, user));
      if (existingIdx >= 0) {
        room.activeMembers[existingIdx] = { ...room.activeMembers[existingIdx], ...user };
      } else {
        room.activeMembers.unshift(user);
      }
      room.waitingMembers = room.waitingMembers.filter((u) => !isSameRoomUser(u, user));
      room.lastUpdated = ev.timestamp || Date.now();
      return;
    }

    // 이미 정식 입장해 있는 경우
    const activeIdx = room.activeMembers.findIndex((u) => isSameRoomUser(u, user));
    if (activeIdx >= 0) {
      room.activeMembers[activeIdx] = { ...room.activeMembers[activeIdx], ...user };
      room.lastUpdated = ev.timestamp || Date.now();
      return;
    }

    // 대기열에 이미 있는 경우
    const waitIdx = room.waitingMembers.findIndex((u) => isSameRoomUser(u, user));
    if (waitIdx >= 0) {
      room.waitingMembers[waitIdx] = { ...room.waitingMembers[waitIdx], ...user };
      room.lastUpdated = ev.timestamp || Date.now();
      return;
    }

    // 정원에 여유가 있는 경우 (0은 무제한)
    if (room.maxAttendees === 0 || room.activeMembers.length < room.maxAttendees) {
      room.activeMembers.push(user);
    } else {
      room.waitingMembers.push(user);
    }
    room.lastUpdated = ev.timestamp || Date.now();
    return;
  }

  if (ev.type === 'leave') {
    const target = { id: ev.userId, name: ev.userName, phoneNumber: ev.userPhone };
    const beforeLen = room.activeMembers.length;
    room.activeMembers = room.activeMembers.filter((u) => !isSameRoomUser(u, target));
    room.waitingMembers = room.waitingMembers.filter((u) => !isSameRoomUser(u, target));
    if (room.activeMembers.length < beforeLen) {
      promoteWaitingMembers(room);
    }
    room.lastUpdated = ev.timestamp || Date.now();
    return;
  }

  if (ev.type === 'updateMaxAttendees' && typeof ev.maxAttendees === 'number') {
    room.maxAttendees = Math.max(0, ev.maxAttendees);
    promoteWaitingMembers(room);
    room.lastUpdated = ev.timestamp || Date.now();
    return;
  }

  if (ev.type === 'updateStartTime' && typeof ev.startTime === 'string') {
    room.startTime = ev.startTime;
    room.lastUpdated = ev.timestamp || Date.now();
    return;
  }

  if (ev.type === 'startAttendance' && ev.session) {
    room.attendance = {
      ...ev.session,
      isActive: true,
      checkedInUsers: Array.isArray(ev.session.checkedInUsers) ? [...ev.session.checkedInUsers] : [],
    };
    room.lastUpdated = ev.timestamp || Date.now();
    return;
  }

  if (ev.type === 'stopAttendance') {
    if (room.attendance) {
      room.attendance.isActive = false;
    }
    room.lastUpdated = ev.timestamp || Date.now();
    return;
  }

  if (ev.type === 'checkInAttendance' && ev.checkedUser) {
    // 출석 체크 세션이 개설된 이후에만 출석 및 자동 입장을 반영 (최초 출석 체크 전 유입 방지)
    if (!room.attendance) {
      return;
    }
    const cu = ev.checkedUser;
    // 출석 체크한 회원이 아직 activeMembers에 없으면 자동 등록
    if (!room.activeMembers.some((u) => isSameRoomUser(u, cu))) {
      room.activeMembers.push({
        id: cu.userId,
        name: cu.userName,
        phoneNumber: cu.phoneNumber,
        birthDate: '',
        job: '',
        email: '',
        carrotNickname: cu.userName,
        role: cu.role,
        status: 'approved',
        joinedAt: '',
      });
    }
    const already = room.attendance.checkedInUsers.some((u) => isSameRoomUser(u, cu));
    if (!already) {
      room.attendance.checkedInUsers.push(cu);
    }
    room.lastUpdated = ev.timestamp || Date.now();
  }

  // 관리자 수동 출석/결석 조정 이벤트 반영
  if (ev.type === 'manualAttendance' && ev.checkedUser) {
    if (!room.attendance) {
      room.attendance = {
        sessionId: `att_room_manual_${room.lectureId}`,
        title: '강의실 출석 명부',
        code: '0000',
        startedAt: ev.checkedUser.checkedAt,
        isActive: false,
        checkedInUsers: [],
      };
    }
    const cu = ev.checkedUser;
    if (ev.isPresent) {
      const existingIdx = room.attendance.checkedInUsers.findIndex((u) => isSameRoomUser(u, cu));
      if (existingIdx >= 0) {
        room.attendance.checkedInUsers[existingIdx] = cu;
      } else {
        room.attendance.checkedInUsers.push(cu);
      }
    } else {
      room.attendance.checkedInUsers = room.attendance.checkedInUsers.filter(
        (u) => !isSameRoomUser(u, cu)
      );
    }
    room.lastUpdated = ev.timestamp || Date.now();
  }
}

/**
 * 구글 시트에 저장된 모든 강의실 이벤트를 읽어와 최신 상태를 재구성합니다.
 */
export async function syncAllRoomsFromSheet(forceFresh: boolean = false): Promise<void> {
  const now = Date.now();
  // 8초간 서버 메모리 캐시 재사용 (Vercel CPU 소모 90% 이상 절감)
  if (!forceFresh && lastRoomSyncTime > 0 && now - lastRoomSyncTime < 8000) {
    return;
  }

  try {
    const rows = await fetchAllSheetStoreRows(forceFresh);
    const eventMap = new Map<string, RoomEvent>();

    for (const r of rows) {
      if (r.tag === '__ROOM_EVENT__') {
        try {
          const ev = JSON.parse(r.jsonStr) as RoomEvent;
          if (ev && ev.eventId && ev.lectureId) {
            eventMap.set(ev.eventId, ev);
          }
        } catch (_) {}
      }
    }

    for (const memEv of inMemoryRoomEvents) {
      if (memEv && memEv.eventId && !eventMap.has(memEv.eventId)) {
        eventMap.set(memEv.eventId, memEv);
      }
    }

    const allEvents = Array.from(eventMap.values()).sort(
      (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
    );

    // 강의실별로 처음부터 이벤트 재생하여 완벽한 정합성 유지
    const rebuiltRooms = new Map<string, RoomState>();
    for (const ev of allEvents) {
      let room = rebuiltRooms.get(ev.lectureId);
      if (!room) {
        const prevRoom = roomStates.get(ev.lectureId);
        room = {
          lectureId: ev.lectureId,
          maxAttendees: prevRoom?.maxAttendees ?? 30,
          activeMembers: [],
          waitingMembers: [],
          lastUpdated: Date.now(),
          startTime: prevRoom?.startTime,
          attendance: null,
        };
        rebuiltRooms.set(ev.lectureId, room);
      }
      applyRoomEventToState(room, ev);
    }

    rebuiltRooms.forEach((room, lecId) => {
      roomStates.set(lecId, room);
    });
    lastRoomSyncTime = Date.now();
  } catch (e) {
    console.warn('[LectureRoom] 시트 동기화 실패:', e);
  }
}

/**
 * 강의실 상태 객체 초기화 또는 가져오기
 */
export function getOrCreateRoom(lectureId: string, initialMax: number = 30): RoomState {
  let room = roomStates.get(lectureId);
  if (!room) {
    room = {
      lectureId,
      maxAttendees: initialMax,
      activeMembers: [],
      waitingMembers: [],
      lastUpdated: Date.now(),
    };
    roomStates.set(lectureId, room);
  }
  return room;
}

/**
 * 강의실 입장 가능한 최대 회원 수 설정/수정
 */
export async function setRoomMaxAttendees(lectureId: string, maxAttendees: number): Promise<RoomState> {
  await syncAllRoomsFromSheet(true);
  const room = getOrCreateRoom(lectureId, maxAttendees);
  const cleanMax = Math.max(0, maxAttendees);

  const event: RoomEvent = {
    eventId: `re_max_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    lectureId,
    type: 'updateMaxAttendees',
    timestamp: Date.now(),
    maxAttendees: cleanMax,
  };

  // 정원이 늘어난 경우 대기 중인 회원을 즉시 자동 입장 처리
  applyRoomEventToState(room, event);
  await appendRoomEvent(event);

  return room;
}

/**
 * 대기열에서 여유 인원만큼 자동으로 입장 승격 처리
 */
function promoteWaitingMembers(room: RoomState): MemberUser[] {
  const promoted: MemberUser[] = [];

  // maxAttendees가 0(무제한)이거나 정원에 여유가 있을 때
  while (
    room.waitingMembers.length > 0 &&
    (room.maxAttendees === 0 || room.activeMembers.length < room.maxAttendees)
  ) {
    const nextUser = room.waitingMembers.shift();
    if (nextUser) {
      // activeMembers에 중복 확인 후 추가
      if (!room.activeMembers.some((u) => isSameRoomUser(u, nextUser))) {
        room.activeMembers.push(nextUser);
        promoted.push(nextUser);
      }
    }
  }

  return promoted;
}

/**
 * 회원 강의실 입장 시도
 * - 정원 미달: 즉시 activeMembers에 추가 (status: 'entered')
 * - 정원 초과: waitingMembers에 추가 (status: 'waiting', queuePosition 반환)
 */
export async function enterLectureRoom(
  lectureId: string,
  user: MemberUser,
  maxAttendees?: number
): Promise<{
  status: 'entered' | 'waiting';
  queuePosition: number;
  room: RoomState;
  alreadyEntered?: boolean;
  promoted?: MemberUser[];
}> {
  await syncAllRoomsFromSheet(true);
  const room = getOrCreateRoom(lectureId, maxAttendees ?? 30);

  const wasAlreadyEntered = room.activeMembers.some((u) => isSameRoomUser(u, user));
  const wasAlreadyWaitingIdx = room.waitingMembers.findIndex((u) => isSameRoomUser(u, user));

  // 이미 정식 입장해 있는 경우 중복 이벤트를 쓰지 않고 즉시 반환
  if (wasAlreadyEntered) {
    return { status: 'entered', queuePosition: 0, room, alreadyEntered: true };
  }

  // 대기열에 이미 있는 경우
  if (wasAlreadyWaitingIdx >= 0 && !(user.role === 'admin' || user.name === '지정인')) {
    return {
      status: 'waiting',
      queuePosition: wasAlreadyWaitingIdx + 1,
      room,
      alreadyEntered: true,
    };
  }

  const event: RoomEvent = {
    eventId: `re_enter_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    lectureId,
    type: 'enter',
    timestamp: Date.now(),
    isManualEnter: true,
    user,
    maxAttendees,
  };

  applyRoomEventToState(room, event);
  await appendRoomEvent(event);

  const isNowEntered = room.activeMembers.some((u) => isSameRoomUser(u, user));
  if (isNowEntered) {
    return { status: 'entered', queuePosition: 0, room, alreadyEntered: false };
  }

  const waitIdx = room.waitingMembers.findIndex((u) => isSameRoomUser(u, user));
  return {
    status: 'waiting',
    queuePosition: waitIdx >= 0 ? waitIdx + 1 : room.waitingMembers.length,
    room,
    alreadyEntered: false,
  };
}

/**
 * 강의실 신규 개설 또는 관리자 초기화 시 입장/대기/출석 상태 완전 초기화
 */
export async function resetLectureRoom(
  lectureId: string,
  maxAttendees?: number
): Promise<RoomState> {
  await syncAllRoomsFromSheet(true);
  const room = getOrCreateRoom(lectureId, maxAttendees ?? 30);

  const event: RoomEvent = {
    eventId: `re_reset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    lectureId,
    type: 'resetRoom',
    timestamp: Date.now(),
    maxAttendees: typeof maxAttendees === 'number' ? maxAttendees : room.maxAttendees,
  };

  applyRoomEventToState(room, event);
  await appendRoomEvent(event);

  return room;
}

/**
 * 회원 강의실 퇴장 처리
 * - 나간 회원 수만큼 대기 회원(waitingMembers)을 즉시 자동 입장 승격
 */
export async function leaveLectureRoom(
  lectureId: string,
  userId: string,
  userName?: string,
  userPhone?: string
): Promise<{
  success: boolean;
  promotedUsers: MemberUser[];
  room: RoomState;
}> {
  await syncAllRoomsFromSheet(true);
  const room = getOrCreateRoom(lectureId);

  const event: RoomEvent = {
    eventId: `re_leave_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    lectureId,
    type: 'leave',
    timestamp: Date.now(),
    userId,
    userName,
    userPhone,
  };

  applyRoomEventToState(room, event);
  await appendRoomEvent(event);

  return {
    success: true,
    promotedUsers: [],
    room,
  };
}

/**
 * 강의 시작 시간 설정
 */
export async function setRoomStartTime(lectureId: string, startTime: string): Promise<RoomState> {
  await syncAllRoomsFromSheet(true);
  const room = getOrCreateRoom(lectureId);

  const event: RoomEvent = {
    eventId: `re_time_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    lectureId,
    type: 'updateStartTime',
    timestamp: Date.now(),
    startTime,
  };

  applyRoomEventToState(room, event);
  await appendRoomEvent(event);

  return room;
}

/**
 * 관리자: 4자리 랜덤 숫자를 생성하여 강의실 실시간 출석 체크 시작
 */
export async function startRoomAttendance(
  lectureId: string,
  title?: string,
  customCode?: string
): Promise<{ session: RoomAttendance; code: string }> {
  await syncAllRoomsFromSheet(true);
  const room = getOrCreateRoom(lectureId);

  // 1. 4자리 랜덤 숫자 생성 (1000 ~ 9999)
  const randomCode = customCode || String(Math.floor(1000 + Math.random() * 9000));
  const now = getKoreanNowString();

  const newSession: RoomAttendance = {
    sessionId: `att_room_${Date.now()}`,
    title: title?.trim() || '실시간 강의 출석 체크',
    code: randomCode,
    startedAt: now,
    isActive: true,
    checkedInUsers: [],
  };

  const event: RoomEvent = {
    eventId: `re_att_start_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    lectureId,
    type: 'startAttendance',
    timestamp: Date.now(),
    session: newSession,
  };

  applyRoomEventToState(room, event);
  await appendRoomEvent(event);

  // 구글 스프레드시트 '출석부' 시트 자동 생성 및 세션 시작 알림 (백그라운드 비동기)
  const gasUrl = getRuntimeGasUrl();
  if (gasUrl) {
    fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'startAttendance',
        data: {
          sessionId: newSession.sessionId,
          title: newSession.title,
          startedAt: newSession.startedAt,
          code: randomCode,
          lectureId,
        },
      }),
    }).catch(() => {});
  }

  return { session: newSession, code: randomCode };
}

/**
 * 관리자: 실시간 출석 체크 마감/종료
 */
export async function stopRoomAttendance(lectureId: string): Promise<boolean> {
  await syncAllRoomsFromSheet(true);
  const room = getOrCreateRoom(lectureId);
  if (room.attendance) {
    const currentSessionId = room.attendance.sessionId;
    const event: RoomEvent = {
      eventId: `re_att_stop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      lectureId,
      type: 'stopAttendance',
      timestamp: Date.now(),
    };

    applyRoomEventToState(room, event);
    await appendRoomEvent(event);

    const gasUrl = getRuntimeGasUrl();
    if (gasUrl) {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stopAttendance', sessionId: currentSessionId }),
      }).catch(() => {});
    }
    return true;
  }
  return false;
}

/**
 * 참석자: 4자리 출석 번호 입력하여 출석 체크 완료
 */
export async function checkInRoomAttendance(
  lectureId: string,
  user: MemberUser,
  inputCode: string
): Promise<{ success: boolean; message: string; checkedAt?: string }> {
  await syncAllRoomsFromSheet(true);
  const room = getOrCreateRoom(lectureId);

  // 1. 진행 중인 출석 체크 세션 먼저 확인 (최초 출석 체크 시작 전에는 유입 차단)
  if (!room.attendance || !room.attendance.isActive) {
    return {
      success: false,
      message: '현재 진행 중인 실시간 출석 체크가 없거나 이미 마감되었습니다.',
    };
  }

  // 2. 4자리 출석 번호 일치 검증
  const cleanInput = inputCode.trim().replace(/\D/g, '');
  if (cleanInput !== room.attendance.code) {
    return {
      success: false,
      message: '출석 번호가 일치하지 않습니다. 관리자가 안내한 4자리 숫자를 확인해주세요.',
    };
  }

  // 3. 강의실 입장 여부 확인 (정원 여유가 있으면 자동 입장 처리하여 편의성 보장)
  let isEntered = room.activeMembers.some((u) => isSameRoomUser(u, user));
  if (!isEntered) {
    if (room.maxAttendees === 0 || room.activeMembers.length < room.maxAttendees || user.role === 'admin' || user.name === '지정인') {
      const enterEv: RoomEvent = {
        eventId: `re_auto_enter_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        lectureId,
        type: 'enter',
        timestamp: Date.now(),
        isManualEnter: true,
        user,
      };
      applyRoomEventToState(room, enterEv);
      await appendRoomEvent(enterEv);
      isEntered = true;
    } else {
      return {
        success: false,
        message: '출석 체크는 해당 강의실에 정상 입장한 회원만 가능합니다.',
      };
    }
  }

  // 4. 이미 출석 체크했는지 확인
  const alreadyChecked = room.attendance.checkedInUsers.some((u) => isSameRoomUser(u, user));
  if (alreadyChecked) {
    return {
      success: true,
      message: '이미 출석 체크가 완료되었습니다.',
    };
  }

  const timeString = getKoreanNowString();
  const checkedUser = {
    userId: user.id,
    userName: user.name,
    phoneNumber: user.phoneNumber,
    role: user.role,
    checkedAt: timeString,
  };

  const event: RoomEvent = {
    eventId: `re_att_checkin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    lectureId,
    type: 'checkInAttendance',
    timestamp: Date.now(),
    checkedUser,
  };

  applyRoomEventToState(room, event);
  await appendRoomEvent(event);

  // 구글 스프레드시트 '출석부' 탭에 실시간 기록 전송
  const gasUrl = getRuntimeGasUrl();
  if (gasUrl) {
    try {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recordAttendance',
          data: {
            sessionId: room.attendance.sessionId,
            userName: user.name,
            phoneNumber: user.phoneNumber,
            role: user.role,
            status: '출석 완료',
            checkedAt: timeString,
            checkType: '실시간 4자리 인증',
            lectureId,
          },
        }),
      }).catch(() => {});
    } catch (_) {}
  }

  return {
    success: true,
    message: '🎉 출석 체크가 성공적으로 완료되었습니다!',
    checkedAt: timeString,
  };
}

/**
 * 특정 회원의 현재 입장/대기 상태 조회
 */
export function getMemberRoomStatus(
  lectureId: string,
  userId?: string,
  userPhone?: string,
  isAdmin: boolean = false,
  userName?: string
): {
  myStatus: 'entered' | 'waiting' | 'none';
  queuePosition: number;
  activeCount: number;
  waitingCount: number;
  maxAttendees: number;
  activeMembers: MemberUser[];
  waitingMembers: MemberUser[];
  startTime?: string;
  attendance?: {
    sessionId: string;
    title: string;
    isActive: boolean;
    startedAt: string;
    code?: string; // 관리자에게만 노출
    checkedInCount: number;
    hasCheckedIn: boolean;
  } | null;
} {
  const room = getOrCreateRoom(lectureId);

  let myStatus: 'entered' | 'waiting' | 'none' = 'none';
  let queuePosition = 0;

  if (userId || userPhone || userName) {
    const target = { id: userId, phoneNumber: userPhone, name: userName };
    const isEntered = room.activeMembers.some((u) => isSameRoomUser(u, target));
    if (isEntered) {
      myStatus = 'entered';
    } else {
      const waitIdx = room.waitingMembers.findIndex((u) => isSameRoomUser(u, target));
      if (waitIdx >= 0) {
        myStatus = 'waiting';
        queuePosition = waitIdx + 1;
      }
    }
  }

  // 출석 세션 요약 정보
  let attendanceSummary = null;
  if (room.attendance && room.attendance.isActive) {
    const target = { id: userId, phoneNumber: userPhone, name: userName };
    const hasCheckedIn =
      userId || userPhone || userName
        ? room.attendance.checkedInUsers.some((u) => isSameRoomUser(u, target))
        : false;

    attendanceSummary = {
      sessionId: room.attendance.sessionId,
      title: room.attendance.title,
      isActive: room.attendance.isActive,
      startedAt: room.attendance.startedAt,
      code: isAdmin ? room.attendance.code : undefined, // 관리자에게만 4자리 코드 노출
      checkedInCount: room.attendance.checkedInUsers.length,
      hasCheckedIn,
    };
  }

  return {
    myStatus,
    queuePosition,
    activeCount: room.activeMembers.length,
    waitingCount: room.waitingMembers.length,
    maxAttendees: room.maxAttendees,
    activeMembers: room.activeMembers,
    waitingMembers: room.waitingMembers,
    startTime: room.startTime,
    attendance: attendanceSummary,
  };
}

/**
 * 출석 체크용: 회원이 해당 강의실에 '정식 입장(entered)' 상태인지 검증
 */
export function isUserInLectureRoom(
  lectureId: string,
  userId?: string,
  userPhone?: string,
  userName?: string
): boolean {
  const room = getOrCreateRoom(lectureId);
  return room.activeMembers.some((u) =>
    isSameRoomUser(u, { id: userId, phoneNumber: userPhone, name: userName })
  );
}

/**
 * 모든 강의실에서 4자리 출석 인증을 완료한 회원 목록 반환 (출석부 통합 연동용)
 */
export function getAllRoomCheckedInUsers(): Array<{
  lectureId: string;
  userId: string;
  userName: string;
  phoneNumber: string;
  role: MemberRole;
  checkedAt: string;
}> {
  const list: Array<{
    lectureId: string;
    userId: string;
    userName: string;
    phoneNumber: string;
    role: MemberRole;
    checkedAt: string;
  }> = [];

  roomStates.forEach((room, lectureId) => {
    // 현재 실시간 출석 체크가 진행 중인(isActive === true) 강의실의 출석 완료자만 명부에 반영
    if (room.attendance && room.attendance.isActive && Array.isArray(room.attendance.checkedInUsers)) {
      for (const u of room.attendance.checkedInUsers) {
        list.push({
          lectureId,
          ...u,
        });
      }
    }
  });

  return list;
}

/**
 * 관리자: 특정 강의실의 특정 회원 출석/결석 상태를 수동으로 변경
 */
export async function manualToggleRoomAttendance(
  lectureId: string,
  user: MemberUser,
  isPresent: boolean
): Promise<void> {
  await syncAllRoomsFromSheet(true);
  const room = getOrCreateRoom(lectureId);
  const timeString = getKoreanNowString();

  const checkedUser = {
    userId: user.id,
    userName: user.name,
    phoneNumber: user.phoneNumber,
    role: user.role,
    checkedAt: isPresent ? timeString : '-',
  };

  const event: RoomEvent = {
    eventId: `re_att_manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    lectureId,
    type: 'manualAttendance',
    timestamp: Date.now(),
    isPresent,
    checkedUser,
  };

  applyRoomEventToState(room, event);
  await appendRoomEvent(event);
}
