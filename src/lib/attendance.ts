import { AttendanceSession, AttendanceRecord, MemberUser } from '@/types';
import { getRuntimeGasUrl, saveRecordToSheetStore, fetchAllSheetStoreRows } from './google/sheets';
import { isUserInLectureRoom, getAllRoomCheckedInUsers, syncAllRoomsFromSheet } from './lectureRoom';
import { getKoreanNowString } from './formatters';

// 메모리 내 출석 세션 및 출석 기록 상태 관리
let activeSession: AttendanceSession | null = null;
let sessions: AttendanceSession[] = [];
let attendanceRecords: AttendanceRecord[] = [];

interface GlobalAttendanceEvent {
  eventId: string;
  type: 'start' | 'stop' | 'record';
  timestamp: number;
  session?: AttendanceSession;
  record?: AttendanceRecord;
}

const inMemoryAttendanceEvents: GlobalAttendanceEvent[] = [];

async function appendAttendanceEvent(ev: GlobalAttendanceEvent): Promise<void> {
  inMemoryAttendanceEvents.push(ev);
  await saveRecordToSheetStore(
    '__ATTENDANCE_EVENT__',
    ev.type,
    ev.record?.userName || '관리자',
    ev,
    `${ev.type}:${ev.session?.id || ev.record?.sessionId || ''}`
  );
}

export async function syncAttendanceFromSheet(): Promise<void> {
  try {
    const rows = await fetchAllSheetStoreRows();
    const map = new Map<string, GlobalAttendanceEvent>();

    for (const r of rows) {
      if (r.tag === '__ATTENDANCE_EVENT__') {
        try {
          const ev = JSON.parse(r.jsonStr) as GlobalAttendanceEvent;
          if (ev && ev.eventId) map.set(ev.eventId, ev);
        } catch (_) {}
      }
    }

    for (const mem of inMemoryAttendanceEvents) {
      if (mem && mem.eventId && !map.has(mem.eventId)) {
        map.set(mem.eventId, mem);
      }
    }

    const sorted = Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    if (sorted.length === 0) return;

    let rebuiltActive: AttendanceSession | null = null;
    const rebuiltSessions: AttendanceSession[] = [];
    const rebuiltRecords: AttendanceRecord[] = [];

    for (const ev of sorted) {
      if (ev.type === 'start' && ev.session) {
        const s = { ...ev.session, isActive: true };
        rebuiltActive = s;
        const idx = rebuiltSessions.findIndex((item) => item.id === s.id);
        if (idx >= 0) rebuiltSessions[idx] = s;
        else rebuiltSessions.unshift(s);
      } else if (ev.type === 'stop') {
        if (rebuiltActive) {
          rebuiltActive.isActive = false;
          const found = rebuiltSessions.find((s) => s.id === rebuiltActive?.id);
          if (found) found.isActive = false;
          rebuiltActive = null;
        }
      } else if (ev.type === 'record' && ev.record) {
        const rec = ev.record;
        const idx = rebuiltRecords.findIndex(
          (r) =>
            r.sessionId === rec.sessionId &&
            (r.userId === rec.userId || r.userName === rec.userName || r.phoneNumber === rec.phoneNumber)
        );
        if (idx >= 0) {
          rebuiltRecords[idx] = rec;
        } else {
          rebuiltRecords.push(rec);
        }
      }
    }

    activeSession = rebuiltActive;
    sessions = rebuiltSessions;
    attendanceRecords = rebuiltRecords;
  } catch (_) {}
}

/**
 * 현재 활성화된 출석 체크 세션 조회 (GAS 동기화 지원, 2초 타임아웃 보호)
 */
export async function getActiveAttendanceSessionAsync(): Promise<AttendanceSession | null> {
  await syncAttendanceFromSheet();
  if (activeSession) return activeSession;

  const gasUrl = getRuntimeGasUrl();
  if (gasUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${gasUrl}?sheet=attendance_session`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json.isActive && json.session) {
          activeSession = json.session;
          return activeSession;
        }
      }
    } catch (_) {}
  }
  return activeSession;
}

export function getActiveAttendanceSession(): AttendanceSession | null {
  return activeSession;
}

/**
 * 관리자: 새로운 출석 체크 세션 시작 (회원들에게 실시간 푸시 팝업 발송 트리거)
 */
export async function startAttendanceSession(title: string): Promise<AttendanceSession> {
  await syncAttendanceFromSheet();
  const newSession: AttendanceSession = {
    id: `att_${Date.now()}`,
    title: title.trim() || '실시간 AI 강의 출석 체크',
    startedAt: getKoreanNowString(),
    isActive: true,
  };

  activeSession = newSession;
  sessions.unshift(newSession);

  await appendAttendanceEvent({
    eventId: `ae_start_${Date.now()}`,
    type: 'start',
    timestamp: Date.now(),
    session: newSession,
  });

  // 구글 스프레드시트에 '출석부' 시트 자동 생성 및 세션 시작 알림 (백그라운드 비동기)
  const gasUrl = getRuntimeGasUrl();
  if (gasUrl) {
    fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'startAttendance',
        data: {
          sessionId: newSession.id,
          title: newSession.title,
          startedAt: newSession.startedAt,
        },
      }),
    }).catch(() => {});
  }

  return newSession;
}

/**
 * 관리자: 진행 중인 출석 체크 세션 마감/종료
 */
export async function stopAttendanceSession(): Promise<boolean> {
  await syncAttendanceFromSheet();
  if (activeSession) {
    activeSession.isActive = false;
    const found = sessions.find((s) => s.id === activeSession?.id);
    if (found) found.isActive = false;
    activeSession = null;

    await appendAttendanceEvent({
      eventId: `ae_stop_${Date.now()}`,
      type: 'stop',
      timestamp: Date.now(),
    });

    const gasUrl = getRuntimeGasUrl();
    if (gasUrl) {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stopAttendance' }),
      }).catch(() => {});
    }

    return true;
  }
  return false;
}

/**
 * 회원: 출석 푸시 알림을 받고 직접 출석 체크
 * [요구사항 3 해결]: 출석 체크는 해당 강의에 입장한 회원만 할 수 있도록 엄격히 검증
 */
export async function checkInMember(
  sessionId: string,
  user: MemberUser,
  lectureId?: string
): Promise<{ success: boolean; record?: AttendanceRecord; message: string }> {
  await syncAttendanceFromSheet();
  await syncAllRoomsFromSheet();

  // 강의실 입장 검증 (특정 강의가 지정된 경우)
  if (lectureId && !isUserInLectureRoom(lectureId, user.id, user.phoneNumber, user.name)) {
    return {
      success: false,
      message: '출석 체크는 해당 강의에 정상 입장한 회원만 할 수 있습니다. 먼저 강의실에 입장해 주세요.',
    };
  }

  // 이미 출석 체크했는지 확인
  const existing = attendanceRecords.find(
    (r) =>
      r.sessionId === sessionId &&
      (r.userId === user.id || r.userName === user.name || r.phoneNumber === user.phoneNumber)
  );

  if (existing) {
    return { success: true, record: existing, message: '이미 출석 체크가 완료되었습니다.' };
  }

  const timeString = getKoreanNowString();

  const newRecord: AttendanceRecord = {
    id: `rec_${Date.now()}`,
    sessionId,
    userId: user.id,
    userName: user.name,
    phoneNumber: user.phoneNumber,
    role: user.role,
    status: 'present',
    checkedAt: timeString,
    isSelfChecked: true,
  };

  attendanceRecords.push(newRecord);

  await appendAttendanceEvent({
    eventId: `ae_rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'record',
    timestamp: Date.now(),
    record: newRecord,
  });

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
            sessionId: newRecord.sessionId,
            userName: newRecord.userName,
            phoneNumber: newRecord.phoneNumber,
            role: newRecord.role,
            status: '출석 완료',
            checkedAt: newRecord.checkedAt,
            checkType: '직접 출석 체크',
          },
        }),
      }).catch(() => {});
    } catch (_) {}
  }

  return { success: true, record: newRecord, message: '🎉 출석 체크가 완료되었습니다!' };
}

/**
 * 관리자: 수동으로 특정 회원의 출석 상태 변경 (출석 / 결석 / 지각)
 */
export async function manualUpdateAttendance(
  sessionId: string,
  user: MemberUser,
  status: 'present' | 'absent' | 'late'
): Promise<AttendanceRecord> {
  await syncAttendanceFromSheet();
  const existingIndex = attendanceRecords.findIndex(
    (r) =>
      r.sessionId === sessionId &&
      (r.userId === user.id || r.userName === user.name || r.phoneNumber === user.phoneNumber)
  );

  const timeString = getKoreanNowString().slice(0, 16);

  let targetRec: AttendanceRecord;
  if (existingIndex >= 0) {
    attendanceRecords[existingIndex].status = status;
    attendanceRecords[existingIndex].checkedAt = status === 'present' ? timeString : '-';
    targetRec = attendanceRecords[existingIndex];
  } else {
    targetRec = {
      id: `rec_${Date.now()}`,
      sessionId,
      userId: user.id,
      userName: user.name,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status,
      checkedAt: status === 'present' ? timeString : '-',
      isSelfChecked: false,
    };
    attendanceRecords.push(targetRec);
  }

  await appendAttendanceEvent({
    eventId: `ae_manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'record',
    timestamp: Date.now(),
    record: targetRec,
  });

  return targetRec;
}

/**
 * 회원 동일성 비교 헬퍼 (빈 문자열 매칭이나 시트 행 인덱스 ID 밀림으로 인한 오매칭 방지)
 */
function isSameAttendanceUser(
  a: { userId?: string; id?: string; userName?: string; name?: string; phoneNumber?: string },
  b: { userId?: string; id?: string; userName?: string; name?: string; phoneNumber?: string }
): boolean {
  const aName = (a.userName || a.name || '').trim();
  const bName = (b.userName || b.name || '').trim();
  const aPhone = (a.phoneNumber || '').replace(/\D/g, '');
  const bPhone = (b.phoneNumber || '').replace(/\D/g, '');

  if (aName && bName) {
    if (aName !== bName) return false;
    if (aPhone && bPhone && aPhone.length >= 4 && bPhone.length >= 4) {
      return aPhone.slice(-4) === bPhone.slice(-4);
    }
    return true;
  }

  const aId = (a.userId || a.id || '').trim();
  const bId = (b.userId || b.id || '').trim();
  if (aId && bId && !aId.startsWith('sheet_user_') && !bId.startsWith('sheet_user_') && aId === bId) {
    return true;
  }

  if (aPhone && bPhone && aPhone.length >= 8 && aPhone === bPhone) return true;
  return false;
}

/**
 * 특정 세션의 전체 출석 명부 조회 (전체 등록 회원 대비 출석/미출석 매핑)
 */
export function getSessionAttendanceRoster(
  sessionId: string,
  allUsers: MemberUser[]
): {
  session: AttendanceSession | null;
  roster: Array<{
    user: MemberUser;
    record?: AttendanceRecord;
    isPresent: boolean;
  }>;
  stats: {
    total: number;
    presentCount: number;
    absentCount: number;
    attendanceRate: number;
  };
} {
  const session =
    sessionId && sessionId !== 'default'
      ? sessions.find((s) => s.id === sessionId) || activeSession
      : activeSession;

  // 최초 출석 체크 시작 전(activeSession이 없고 sessionId === 'default'인 상태)에는 과거 기록을 불러오지 않음
  const targetSessionId = session ? session.id : sessionId !== 'default' ? sessionId : null;
  const currentRecords = targetSessionId
    ? attendanceRecords.filter((r) => r.sessionId === targetSessionId)
    : [];
  const roomCheckedUsers = getAllRoomCheckedInUsers();

  const roster = allUsers.map((user) => {
    let record = currentRecords.find((r) => isSameAttendanceUser(r, user));

    // 강의실 4자리 출석 인증 완료자도 명부에 출석 완료로 연동 (현재 진행 중인 출석 세션만)
    if (!record) {
      const roomCheck = roomCheckedUsers.find((u) => isSameAttendanceUser(u, user));
      if (roomCheck) {
        record = {
          id: `room_rec_${roomCheck.userId}`,
          sessionId: targetSessionId || roomCheck.lectureId,
          userId: user.id,
          userName: user.name,
          phoneNumber: user.phoneNumber,
          role: user.role,
          status: 'present',
          checkedAt: roomCheck.checkedAt,
          isSelfChecked: true,
        };
      }
    }

    return {
      user,
      record,
      isPresent: record?.status === 'present',
    };
  });

  const presentCount = roster.filter((r) => r.isPresent).length;
  const total = allUsers.length;
  const absentCount = total - presentCount;
  const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  return {
    session,
    roster,
    stats: {
      total,
      presentCount,
      absentCount,
      attendanceRate,
    },
  };
}
