import { NextResponse } from 'next/server';
import {
  recordUserLogin,
  recordLectureRoomEntry,
  recordMaterialDownload,
  getLoginLogs,
} from '@/lib/google/sheets';

// [회원 로그인 현황 조회 API]
export async function GET() {
  try {
    const logs = await getLoginLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ error: '로그인 현황 조회 실패' }, { status: 500 });
  }
}

// [회원 로그인, 강의실 입장, 자료 다운로드 현황 실시간 자동 기록 API]
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userName, lectureTitle, materialName } = body as {
      action: 'login' | 'room_entry' | 'download';
      userName: string;
      lectureTitle?: string;
      materialName?: string;
    };

    if (!userName || !userName.trim()) {
      return NextResponse.json({ error: '회원명이 필요합니다.' }, { status: 400 });
    }

    const cleanName = userName.trim();

    if (action === 'login') {
      await recordUserLogin(cleanName);
      return NextResponse.json({ success: true, message: `${cleanName} 회원 접속 현황이 기록되었습니다.` });
    }

    if (action === 'room_entry') {
      await recordLectureRoomEntry(cleanName, lectureTitle || '실시간 강의실');
      return NextResponse.json({ success: true, message: `${cleanName} 회원 강의실 입장 현황이 기록되었습니다.` });
    }

    if (action === 'download') {
      await recordMaterialDownload(cleanName, materialName || '강의 자료');
      return NextResponse.json({ success: true, message: `${cleanName} 회원 자료 다운로드 현황이 기록되었습니다.` });
    }

    return NextResponse.json({ error: '유효하지 않은 활동 액션입니다.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: '현황 기록 중 서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
