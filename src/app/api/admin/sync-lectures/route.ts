import { NextResponse } from 'next/server';
import { syncLecturesToGoogleSheet } from '@/lib/google/sheets';

// 관리자 전용: 동영상 업로드 현황 구글 시트 동기화 API
export async function POST() {
  try {
    const result = await syncLecturesToGoogleSheet();
    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    }
    return NextResponse.json({ error: result.message }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 });
  }
}
