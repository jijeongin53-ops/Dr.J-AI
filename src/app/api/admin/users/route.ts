import { NextResponse } from 'next/server';
import { updateUserRoleAndStatus, getUsers } from '@/lib/google/sheets';

// 관리자용 회원 등급 및 승인 상태 변경
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, role, status } = body;

    if (!userId || !role || !status) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    const updated = await updateUserRoleAndStatus(userId, role, status);
    if (!updated) {
      return NextResponse.json({ error: '해당 회원을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ user: updated, message: '회원 권한이 성공적으로 업데이트되었습니다.' });
  } catch (error) {
    return NextResponse.json({ error: '회원 정보 수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
