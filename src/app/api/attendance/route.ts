import { NextResponse } from 'next/server';
import {
  getActiveAttendanceSession,
  getActiveAttendanceSessionAsync,
  startAttendanceSession,
  stopAttendanceSession,
  checkInMember,
  manualUpdateAttendance,
  getSessionAttendanceRoster,
} from '@/lib/attendance';
import { getUsers } from '@/lib/google/sheets';

// 출석 세션 및 명부 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');
  const sessionId = searchParams.get('sessionId');
  const userPhone = searchParams.get('userPhone');

  // 1. 회원 앱에서 현재 활성화된 출석 요청이 있는지 확인 (푸시 배너용)
  if (mode === 'active') {
    const active = await getActiveAttendanceSessionAsync();
    return NextResponse.json({
      isActive: !!active,
      session: active,
    });
  }

  // 2. 특정 세션의 전체 회원 출석 명부 조회 (관리자용)
  const active = await getActiveAttendanceSessionAsync();
  const users = await getUsers();
  const targetSessionId = sessionId || (active?.id ?? 'default');
  const rosterData = getSessionAttendanceRoster(targetSessionId, users);

  return NextResponse.json({
    ...rosterData,
    activeSession: active,
  });
}

// 출석 시작/종료 및 출석 체크 처리
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, title, sessionId, user, userId, status, lectureId } = body;

    // 1. 관리자: 출석 체크 세션 시작 (전체 회원 앱에 푸시 트리거)
    if (action === 'start') {
      const session = startAttendanceSession(title || '실시간 AI 강의 출석 체크');
      return NextResponse.json({
        success: true,
        session,
        message: '출석 체크가 시작되었습니다! 회원들의 앱에 출석 푸시 알림이 발송됩니다.',
      });
    }

    // 2. 관리자: 출석 체크 종료/마감
    if (action === 'stop') {
      const stopped = stopAttendanceSession();
      return NextResponse.json({
        success: stopped,
        message: '출석 체크가 마감되었습니다.',
      });
    }

    // 3. 회원: 푸시 알림을 보고 직접 출석 체크
    // [요구사항 3 해결]: 해당 강의에 입장한 회원만 출석 가능
    if (action === 'checkIn') {
      if (!user || !user.name || !user.phoneNumber) {
        return NextResponse.json(
          { error: '로그인된 회원 정보가 필요합니다.' },
          { status: 401 }
        );
      }
      const active = getActiveAttendanceSession();
      const targetSessionId = sessionId || active?.id;
      if (!targetSessionId) {
        return NextResponse.json(
          { error: '현재 진행 중인 출석 체크 세션이 없습니다.' },
          { status: 400 }
        );
      }

      const result = await checkInMember(targetSessionId, user, lectureId);
      return NextResponse.json(result);
    }

    // 4. 관리자: 특정 회원 출석 상태 수동 변경
    if (action === 'manualUpdate') {
      const users = await getUsers();
      const targetUser = users.find((u) => u.id === userId || u.phoneNumber === user?.phoneNumber);
      if (!targetUser) {
        return NextResponse.json({ error: '해당 회원을 찾을 수 없습니다.' }, { status: 404 });
      }
      const record = manualUpdateAttendance(sessionId, targetUser, status || 'present');
      return NextResponse.json({ success: true, record });
    }

    return NextResponse.json({ error: '유효하지 않은 요청입니다.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '출석 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
