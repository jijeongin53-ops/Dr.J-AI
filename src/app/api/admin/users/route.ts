import { NextResponse } from 'next/server';
import { updateUserRoleAndStatus, getUsers } from '@/lib/google/sheets';
import { sendApprovalEmail, sendRejectionEmail } from '@/lib/email';
import { ROLE_LABELS, MemberRole } from '@/types';

// 관리자용 회원 등급 및 승인 상태 변경
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, role, status, rejectionReason } = body;

    if (!userId || !role || !status) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    const updated = await updateUserRoleAndStatus(userId, role, status, rejectionReason);
    if (!updated) {
      return NextResponse.json({ error: '해당 회원을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 1. 승인 완료 시 회원에게 안내 메일 발송
    if (status === 'approved' && updated.email) {
      const roleLabel = ROLE_LABELS[role as MemberRole]?.name || '정회원';
      sendApprovalEmail(updated.email, updated.name, roleLabel).catch((e) =>
        console.warn('[Admin API] 승인 메일 비동기 발송 실패:', e)
      );
    }

    // 2. 반려/거절 시 회원에게 거절 사유 메일 발송
    if (status === 'rejected' && updated.email) {
      sendRejectionEmail(updated.email, updated.name, rejectionReason || '가입 정보 확인 필요').catch((e) =>
        console.warn('[Admin API] 반려 메일 비동기 발송 실패:', e)
      );
    }

    return NextResponse.json({
      user: updated,
      message:
        status === 'approved'
          ? `회원 승인 완료! (${updated.email}로 안내 메일 발송)`
          : status === 'rejected'
          ? `회원 반려 처리 완료! (${updated.email}로 반려 사유 메일 발송)`
          : '회원 권한이 성공적으로 업데이트되었습니다.',
    });
  } catch (error) {
    return NextResponse.json({ error: '회원 정보 수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
