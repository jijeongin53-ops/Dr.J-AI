import { NextResponse } from 'next/server';
import { getUsers, addUser } from '@/lib/google/sheets';
import { MemberUser } from '@/types';

// 로그인 또는 사용자 목록 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  const users = await getUsers();

  if (email) {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return NextResponse.json({ error: '등록되지 않은 회원입니다.' }, { status: 404 });
    }
    return NextResponse.json({ user });
  }

  return NextResponse.json({ users });
}

// 회원가입
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, carrotNickname, phoneNumber, note } = body;

    if (!email || !name || !carrotNickname) {
      return NextResponse.json(
        { error: '이메일, 실명, 당근 닉네임은 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    const users = await getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return NextResponse.json(
        { error: '이미 등록된 이메일 계정입니다.' },
        { status: 409 }
      );
    }

    const newUser: MemberUser = {
      id: `user_${Date.now()}`,
      email,
      name,
      carrotNickname,
      role: 'guest', // 신규 가입 시 기본 대기/준회원 등급
      status: 'pending', // 모임장 승인 대기
      joinedAt: new Date().toISOString().split('T')[0],
      phoneNumber: phoneNumber || '',
      note: note || '당근 모임 웹을 통한 신규 가입',
    };

    const saved = await addUser(newUser);
    return NextResponse.json({ user: saved, message: '회원가입 신청이 완료되었습니다. 관리자 승인 후 모든 권한이 활성화됩니다.' });
  } catch (error) {
    return NextResponse.json({ error: '회원가입 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
