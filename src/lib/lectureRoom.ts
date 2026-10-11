import { MemberUser, MemberRole } from '@/types';
import { getRuntimeGasUrl } from './google/sheets';

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

// 메모리 내 전체 강의실 상태 저장소
const roomStates: Map<string, RoomState> = new Map();

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
export function setRoomMaxAttendees(lectureId: string, maxAttendees: number): RoomState {
  const room = getOrCreateRoom(lectureId, maxAttendees);
  room.maxAttendees = Math.max(0, maxAttendees);

  // 정원이 늘어난 경우 대기 중인 회원을 즉시 자동 입장 처리
  promoteWaitingMembers(room);

  room.lastUpdated = Date.now();
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
      if (!room.activeMembers.some((u) => u.id === nextUser.id)) {
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
export function enterLectureRoom(
  lectureId: string,
  user: MemberUser,
  maxAttendees?: number
): {
  status: 'entered' | 'waiting';
  queuePosition: number;
  room: RoomState;
  promoted?: MemberUser[];
} {
  const room = getOrCreateRoom(lectureId, maxAttendees ?? 30);
  if (typeof maxAttendees === 'number' && maxAttendees >= 0) {
    room.maxAttendees = maxAttendees;
  }

  // 관리자는 정원과 관계없이 프리패스 입장
  if (user.role === 'admin' || user.name === '지정인') {
    if (!room.activeMembers.some((u) => u.id === user.id)) {
      room.activeMembers.unshift(user);
    }
    // 대기열에 있었으면 제거
    room.waitingMembers = room.waitingMembers.filter((u) => u.id !== user.id);
    return { status: 'entered', queuePosition: 0, room };
  }

  // 이미 정식 입장해 있는 경우
  if (room.activeMembers.some((u) => u.id === user.id || u.phoneNumber === user.phoneNumber)) {
    return { status: 'entered', queuePosition: 0, room };
  }

  // 대기열에 이미 있는 경우
  const existingWaitIndex = room.waitingMembers.findIndex(
    (u) => u.id === user.id || u.phoneNumber === user.phoneNumber
  );
  if (existingWaitIndex >= 0) {
    return {
      status: 'waiting',
      queuePosition: existingWaitIndex + 1,
      room,
    };
  }

  // 정원에 여유가 있는 경우 (0은 무제한)
  if (room.maxAttendees === 0 || room.activeMembers.length < room.maxAttendees) {
    room.activeMembers.push(user);
    room.lastUpdated = Date.now();
    return { status: 'entered', queuePosition: 0, room };
  }

  // 정원 초과 -> 대기열 진입
  room.waitingMembers.push(user);
  room.lastUpdated = Date.now();
  return {
    status: 'waiting',
    queuePosition: room.waitingMembers.length,
    room,
  };
}

/**
 * 회원 강의실 퇴장 처리
 * - 나간 회원 수만큼 대기 회원(waitingMembers)을 즉시 자동 입장 승격
 */
export function leaveLectureRoom(
  lectureId: string,
  userId: string
): {
  success: boolean;
  promotedUsers: MemberUser[];
  room: RoomState;
} {
  const room = getOrCreateRoom(lectureId);
  const beforeLen = room.activeMembers.length;

  room.activeMembers = room.activeMembers.filter((u) => u.id !== userId);
  room.waitingMembers = room.waitingMembers.filter((u) => u.id !== userId);

  let promotedUsers: MemberUser[] = [];
  if (room.activeMembers.length < beforeLen) {
    // 퇴장으로 빈자리가 생겼으므로 대기자 자동 입장
    promotedUsers = promoteWaitingMembers(room);
  }

  room.lastUpdated = Date.now();
  return {
    success: true,
    promotedUsers,
    room,
  };
}

/**
 * 강의 시작 시간 설정
 */
export function setRoomStartTime(lectureId: string, startTime: string): RoomState {
  const room = getOrCreateRoom(lectureId);
  room.startTime = startTime;
  room.lastUpdated = Date.now();
  return room;
}

/**
 * 관리자: 4자리 랜덤 숫자를 생성하여 강의실 실시간 출석 체크 시작
 */
export function startRoomAttendance(
  lectureId: string,
  title?: string,
  customCode?: string
): { session: RoomAttendance; code: string } {
  const room = getOrCreateRoom(lectureId);

  // 1. 4자리 랜덤 숫자 생성 (1000 ~ 9999)
  const randomCode = customCode || String(Math.floor(1000 + Math.random() * 9000));
  const now = new Date().toISOString();

  const newSession: RoomAttendance = {
    sessionId: `att_room_${Date.now()}`,
    title: title?.trim() || '실시간 강의 출석 체크',
    code: randomCode,
    startedAt: now,
    isActive: true,
    checkedInUsers: [],
  };

  room.attendance = newSession;
  room.lastUpdated = Date.now();

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
export function stopRoomAttendance(lectureId: string): boolean {
  const room = getOrCreateRoom(lectureId);
  if (room.attendance) {
    room.attendance.isActive = false;
    room.lastUpdated = Date.now();

    const gasUrl = getRuntimeGasUrl();
    if (gasUrl) {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stopAttendance', sessionId: room.attendance.sessionId }),
      }).catch(() => {});
    }
    return true;
  }
  return false;
}

/**
 * 참석자: 4자리 출석 번호 입력하여 출석 체크 완료
 */
export function checkInRoomAttendance(
  lectureId: string,
  user: MemberUser,
  inputCode: string
): { success: boolean; message: string; checkedAt?: string } {
  const room = getOrCreateRoom(lectureId);

  // 1. 강의실 입장 여부 확인
  const isEntered = room.activeMembers.some(
    (u) => u.id === user.id || u.phoneNumber === user.phoneNumber
  );
  if (!isEntered) {
    return {
      success: false,
      message: '출석 체크는 해당 강의실에 정상 입장한 회원만 가능합니다.',
    };
  }

  // 2. 진행 중인 출석 체크 세션 확인
  if (!room.attendance || !room.attendance.isActive) {
    return {
      success: false,
      message: '현재 진행 중인 실시간 출석 체크가 없거나 이미 마감되었습니다.',
    };
  }

  // 3. 4자리 출석 번호 일치 검증
  const cleanInput = inputCode.trim().replace(/\D/g, '');
  if (cleanInput !== room.attendance.code) {
    return {
      success: false,
      message: '출석 번호가 일치하지 않습니다. 관리자가 안내한 4자리 숫자를 확인해주세요.',
    };
  }

  // 4. 이미 출석 체크했는지 확인
  const alreadyChecked = room.attendance.checkedInUsers.some(
    (u) => u.userId === user.id || u.phoneNumber === user.phoneNumber
  );
  if (alreadyChecked) {
    return {
      success: true,
      message: '이미 출석 체크가 완료되었습니다.',
    };
  }

  const now = new Date();
  const timeString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  room.attendance.checkedInUsers.push({
    userId: user.id,
    userName: user.name,
    phoneNumber: user.phoneNumber,
    role: user.role,
    checkedAt: timeString,
  });

  room.lastUpdated = Date.now();

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
  isAdmin: boolean = false
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

  if (userId || userPhone) {
    const isEntered = room.activeMembers.some(
      (u) => (userId && u.id === userId) || (userPhone && u.phoneNumber === userPhone)
    );
    if (isEntered) {
      myStatus = 'entered';
    } else {
      const waitIdx = room.waitingMembers.findIndex(
        (u) => (userId && u.id === userId) || (userPhone && u.phoneNumber === userPhone)
      );
      if (waitIdx >= 0) {
        myStatus = 'waiting';
        queuePosition = waitIdx + 1;
      }
    }
  }

  // 출석 세션 요약 정보
  let attendanceSummary = null;
  if (room.attendance && room.attendance.isActive) {
    const hasCheckedIn = (userId || userPhone)
      ? room.attendance.checkedInUsers.some(
          (u) => (userId && u.userId === userId) || (userPhone && u.phoneNumber === userPhone)
        )
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
  userPhone?: string
): boolean {
  const room = getOrCreateRoom(lectureId);
  return room.activeMembers.some(
    (u) => (userId && u.id === userId) || (userPhone && u.phoneNumber === userPhone)
  );
}
