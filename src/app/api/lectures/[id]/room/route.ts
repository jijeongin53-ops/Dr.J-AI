import { NextResponse } from 'next/server';
import {
  enterLectureRoom,
  leaveLectureRoom,
  getMemberRoomStatus,
  setRoomMaxAttendees,
  setRoomStartTime,
  startRoomAttendance,
  stopRoomAttendance,
  checkInRoomAttendance,
  syncAllRoomsFromSheet,
} from '@/lib/lectureRoom';
import { MemberUser } from '@/types';
import { recordLectureRoomEntry } from '@/lib/google/sheets';

export const dynamic = 'force-dynamic';

// 강의실 참여 및 대기 현황 조회
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lectureId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const userPhone = searchParams.get('userPhone') || undefined;
    const userName = searchParams.get('userName') || undefined;
    const isAdmin = searchParams.get('isAdmin') === 'true';

    await syncAllRoomsFromSheet();
    const status = getMemberRoomStatus(lectureId, userId, userPhone, isAdmin, userName);
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: '강의실 상태를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 강의실 입장, 퇴장 및 정원 변경
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lectureId = params.id;
    const body = await request.json();
    const { action, user, userId, userName, userPhone, maxAttendees, startTime, title, code } = body;

    // 1. 강의실 입장
    if (action === 'enter') {
      if (!user) {
        return NextResponse.json({ error: '회원 정보가 필요합니다.' }, { status: 400 });
      }
      const result = await enterLectureRoom(lectureId, user as MemberUser, maxAttendees);

      // 구글 스프레드시트 [회원 로그인 현황] 시트에 강의실 입장 현황 자동 기록 (비동기, 최초 입장 시에만)
      if (result.status === 'entered' && !result.alreadyEntered && (user as MemberUser)?.name) {
        recordLectureRoomEntry((user as MemberUser).name, title || `강의 #${lectureId}`).catch((err) =>
          console.warn('[Activity] 강의실 입장 기록 실패:', err)
        );
      }

      return NextResponse.json({
        success: true,
        status: result.status,
        queuePosition: result.queuePosition,
        room: {
          activeCount: result.room.activeMembers.length,
          waitingCount: result.room.waitingMembers.length,
          maxAttendees: result.room.maxAttendees,
          activeMembers: result.room.activeMembers,
          waitingMembers: result.room.waitingMembers,
        },
        message:
          result.status === 'entered'
            ? '강의실에 정상 입장되었습니다.'
            : `정원 초과로 대기열에 등록되었습니다. (대기 번호: ${result.queuePosition}번)`,
      });
    }

    // 2. 강의실 퇴장
    if (action === 'leave') {
      const targetId = userId || user?.id;
      const targetName = userName || user?.name;
      const targetPhone = userPhone || user?.phoneNumber;
      if (!targetId && !targetName) {
        return NextResponse.json({ error: '퇴장할 회원 ID가 필요합니다.' }, { status: 400 });
      }
      const result = await leaveLectureRoom(lectureId, targetId || '', targetName, targetPhone);
      return NextResponse.json({
        success: true,
        promotedUsers: result.promotedUsers,
        room: {
          activeCount: result.room.activeMembers.length,
          waitingCount: result.room.waitingMembers.length,
          maxAttendees: result.room.maxAttendees,
          activeMembers: result.room.activeMembers,
          waitingMembers: result.room.waitingMembers,
        },
        message: '강의실에서 정상 퇴장 처리되었습니다.',
      });
    }

    // 3. 관리자: 강의실 입장 정원 변경
    if (action === 'updateMaxAttendees') {
      if (typeof maxAttendees !== 'number') {
        return NextResponse.json({ error: '정원 숫자가 올바르지 않습니다.' }, { status: 400 });
      }
      const room = await setRoomMaxAttendees(lectureId, maxAttendees);
      return NextResponse.json({
        success: true,
        room: {
          activeCount: room.activeMembers.length,
          waitingCount: room.waitingMembers.length,
          maxAttendees: room.maxAttendees,
          activeMembers: room.activeMembers,
          waitingMembers: room.waitingMembers,
        },
        message: `강의실 정원이 ${maxAttendees === 0 ? '무제한' : maxAttendees + '명'}으로 변경되었습니다.`,
      });
    }

    // 4. 관리자: 강의 시작 시간 설정
    if (action === 'updateStartTime') {
      if (typeof startTime !== 'string') {
        return NextResponse.json({ error: '시작 시간 형식이 올바르지 않습니다.' }, { status: 400 });
      }
      const room = await setRoomStartTime(lectureId, startTime.trim());
      return NextResponse.json({
        success: true,
        startTime: room.startTime,
        message: `강의 시작 시간이 '${startTime}'(으)로 설정되었습니다.`,
      });
    }

    // 5. 관리자: 4자리 랜덤 숫자 출석 체크 시작
    if (action === 'startAttendance') {
      const result = await startRoomAttendance(lectureId, title, code);
      return NextResponse.json({
        success: true,
        code: result.code,
        session: result.session,
        message: '4자리 실시간 출석 체크가 시작되었습니다.',
      });
    }

    // 6. 관리자: 실시간 출석 체크 마감/종료
    if (action === 'stopAttendance') {
      const stopped = await stopRoomAttendance(lectureId);
      return NextResponse.json({
        success: stopped,
        message: '출석 체크가 종료되었습니다.',
      });
    }

    // 7. 참석자: 4자리 숫자 입력 출석 체크
    if (action === 'checkInAttendance') {
      if (!user) {
        return NextResponse.json({ error: '로그인 회원 정보가 필요합니다.' }, { status: 400 });
      }
      if (!code || typeof code !== 'string') {
        return NextResponse.json({ error: '4자리 출석 번호를 입력해주세요.' }, { status: 400 });
      }
      const result = await checkInRoomAttendance(lectureId, user as MemberUser, code);
      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: '유효하지 않은 요청 액션입니다.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: '강의실 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
