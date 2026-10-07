import { MemberUser } from '@/types';

// 강의실별 실시간 참여 및 대기 상태
export interface RoomState {
  lectureId: string;
  maxAttendees: number; // 0이면 무제한
  activeMembers: MemberUser[]; // 현재 입장 완료된 회원 목록
  waitingMembers: MemberUser[]; // 정원 초과로 대기 중인 회원 목록 (FIFO)
  lastUpdated: number;
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
 * 특정 회원의 현재 입장/대기 상태 조회
 */
export function getMemberRoomStatus(
  lectureId: string,
  userId?: string,
  userPhone?: string
): {
  myStatus: 'entered' | 'waiting' | 'none';
  queuePosition: number;
  activeCount: number;
  waitingCount: number;
  maxAttendees: number;
  activeMembers: MemberUser[];
  waitingMembers: MemberUser[];
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

  return {
    myStatus,
    queuePosition,
    activeCount: room.activeMembers.length,
    waitingCount: room.waitingMembers.length,
    maxAttendees: room.maxAttendees,
    activeMembers: room.activeMembers,
    waitingMembers: room.waitingMembers,
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
