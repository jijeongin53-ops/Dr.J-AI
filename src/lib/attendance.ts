import { AttendanceSession, AttendanceRecord, MemberUser } from '@/types';
import { getRuntimeGasUrl } from './google/sheets';

// 메모리 내 출석 세션 및 출석 기록 상태 관리
let activeSession: AttendanceSession | null = null;
let sessions: AttendanceSession[] = [];
let attendanceRecords: AttendanceRecord[] = [];

/**
 * 현재 활성화된 출석 체크 세션 조회 (GAS 동기화 지원, 2초 타임아웃 보호)
 */
export async function getActiveAttendanceSessionAsync(): Promise<AttendanceSession | null> {
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
export function startAttendanceSession(title: string): AttendanceSession {
  const newSession: AttendanceSession = {
    id: `att_${Date.now()}`,
    title: title.trim() || '실시간 AI 강의 출석 체크',
    startedAt: new Date().toISOString(),
    isActive: true,
  };

  activeSession = newSession;
  sessions.unshift(newSession);

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
export function stopAttendanceSession(): boolean {
  if (activeSession) {
    activeSession.isActive = false;
    const found = sessions.find((s) => s.id === activeSession?.id);
    if (found) found.isActive = false;
    activeSession = null;

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
 */
export async function checkInMember(
  sessionId: string,
  user: MemberUser
): Promise<{ success: boolean; record?: AttendanceRecord; message: string }> {
  // 이미 출석 체크했는지 확인
  const existing = attendanceRecords.find(
    (r) =>
      r.sessionId === sessionId &&
      (r.userId === user.id || r.phoneNumber === user.phoneNumber)
  );

  if (existing) {
    return { success: true, record: existing, message: '이미 출석 체크가 완료되었습니다.' };
  }

  const now = new Date();
  const timeString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

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
export function manualUpdateAttendance(
  sessionId: string,
  user: MemberUser,
  status: 'present' | 'absent' | 'late'
): AttendanceRecord {
  const existingIndex = attendanceRecords.findIndex(
    (r) =>
      r.sessionId === sessionId &&
      (r.userId === user.id || r.phoneNumber === user.phoneNumber)
  );

  const now = new Date();
  const timeString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  if (existingIndex >= 0) {
    attendanceRecords[existingIndex].status = status;
    return attendanceRecords[existingIndex];
  } else {
    const newRec: AttendanceRecord = {
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
    attendanceRecords.push(newRec);
    return newRec;
  }
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
  const session = sessions.find((s) => s.id === sessionId) || activeSession;
  const currentRecords = attendanceRecords.filter((r) => r.sessionId === sessionId);

  const roster = allUsers.map((user) => {
    const record = currentRecords.find(
      (r) => r.userId === user.id || r.phoneNumber === user.phoneNumber
    );
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
