import { NextResponse } from 'next/server';
import { getUsers, addUser, updateUserData } from '@/lib/google/sheets';
import { MemberUser } from '@/types';

// 전화번호 정규화 (숫자만 추출)
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

// 로그인 또는 사용자 목록 조회 (아이디=성명, 비밀번호=연락처)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const phoneNumber = searchParams.get('phoneNumber');
  const email = searchParams.get('email');

  const users = await getUsers();

  // 1. 성명(아이디)과 연락처(비밀번호)로 로그인
  if (name && phoneNumber) {
    const cleanPhone = normalizePhone(phoneNumber);
    const user = users.find(
      (u) =>
        u.name.trim() === name.trim() &&
        normalizePhone(u.phoneNumber) === cleanPhone
    );

    if (!user) {
      return NextResponse.json(
        { error: '일치하는 회원을 찾을 수 없습니다. 성명(아이디)과 연락처(비밀번호)를 다시 확인해 주세요.' },
        { status: 404 }
      );
    }

    // 모임장(지정인) 계정은 항상 최고 관리자(admin) 및 승인 권한 부여
    if (user.name.trim() === '지정인' || cleanPhone.includes('82030046')) {
      user.role = 'admin';
      user.status = 'approved';
    }

    return NextResponse.json({ user });
  }

  // 2. 이메일 기반 조회 (기존 호환성 유지)
  if (email) {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return NextResponse.json({ error: '등록되지 않은 회원입니다.' }, { status: 404 });
    }
    return NextResponse.json({ user });
  }

  return NextResponse.json({ users });
}

// 회원가입 (성명, 생년월일, 직업, 연락처, 이메일)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, birthDate, job, phoneNumber, email, carrotNickname, note } = body;

    // 필수 항목 검증: 성명, 생년월일, 직업, 연락처, 이메일
    if (!name || !birthDate || !job || !phoneNumber || !email) {
      return NextResponse.json(
        { error: '성명, 생년월일, 직업, 연락처, 이메일은 모두 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    const users = await getUsers();
    const cleanPhone = normalizePhone(phoneNumber);

    // 중복 가입 체크 (성명 + 연락처가 동일한 경우)
    const existing = users.find(
      (u) =>
        u.name.trim() === name.trim() &&
        normalizePhone(u.phoneNumber) === cleanPhone
    );

    if (existing) {
      // 이미 반려된 회원인 경우, 수정 재신청 안내
      if (existing.status === 'rejected') {
        return NextResponse.json(
          {
            error: `이전 가입 신청이 반려된 계정입니다. (반려 사유: ${existing.rejectionReason || '확인 필요'}) 로그인 화면에서 반려 사유를 확인 후 수정 재신청하실 수 있습니다.`,
            isRejected: true,
            user: existing,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: '이미 동일한 성명과 연락처로 가입된 계정이 존재합니다.' },
        { status: 409 }
      );
    }

    const newUser: MemberUser = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      birthDate: birthDate.trim(),
      job: job.trim(),
      email: email.trim(),
      carrotNickname: carrotNickname?.trim() || name.trim(),
      role: 'guest', // 신규 가입 시 기본 대기/준회원 등급
      status: 'pending', // 모임장 승인 대기
      joinedAt: new Date().toISOString().split('T')[0],
      note: note || '웹 신규 가입 회원',
    };

    const { user: savedUser, sheetSaved, error: sheetError } = await addUser(newUser);
    return NextResponse.json({
      user: savedUser,
      sheetSaved,
      sheetError,
      message: '회원가입 신청이 완료되었습니다! 관리자 승인 후 모든 권한이 활성화됩니다.',
    });
  } catch (error) {
    return NextResponse.json({ error: '회원가입 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 회원 가입란 정보 수정 (반려 회원 재신청용)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, birthDate, job, phoneNumber, email, carrotNickname } = body;

    if (!userId || !name || !phoneNumber || !email) {
      return NextResponse.json({ error: '수정할 필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    const updated = await updateUserData(userId, {
      name,
      birthDate,
      job,
      phoneNumber,
      email,
      carrotNickname,
      status: 'pending', // 수정 후 승인 대기 상태로 재전환
      rejectionReason: '', // 반려 사유 초기화
    });

    if (!updated) {
      return NextResponse.json({ error: '수정할 회원을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({
      user: updated,
      message: '회원 가입 정보가 성공적으로 수정 및 재신청되었습니다! 관리자 검토 후 승인됩니다.',
    });
  } catch (error) {
    return NextResponse.json({ error: '정보 수정 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
