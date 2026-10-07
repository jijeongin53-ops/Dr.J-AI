import { NextResponse } from 'next/server';
import {
  enterLectureRoom,
  leaveLectureRoom,
  getMemberRoomStatus,
  setRoomMaxAttendees,
} from '@/lib/lectureRoom';
import { MemberUser } from '@/types';

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

    const status = getMemberRoomStatus(lectureId, userId, userPhone);
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
    const { action, user, userId, maxAttendees } = body;

    // 1. 강의실 입장
    if (action === 'enter') {
      if (!user) {
        return NextResponse.json({ error: '회원 정보가 필요합니다.' }, { status: 400 });
      }
      const result = enterLectureRoom(lectureId, user as MemberUser, maxAttendees);
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
      if (!targetId) {
        return NextResponse.json({ error: '퇴장할 회원 ID가 필요합니다.' }, { status: 400 });
      }
      const result = leaveLectureRoom(lectureId, targetId);
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
      const room = setRoomMaxAttendees(lectureId, maxAttendees);
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

    return NextResponse.json({ error: '유효하지 않은 요청 액션입니다.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: '강의실 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
