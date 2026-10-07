import { NextResponse } from 'next/server';
import { addDrJQuestion } from '@/lib/google/sheets';
import { sendDrJQuestionEmail } from '@/lib/email';
import { DrJQuestion } from '@/types';

// Dr. J에게 질문하기 접수 API
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userName, phoneNumber, email, title, content } = body;

    if (!userName || !phoneNumber || !email || !title || !content) {
      return NextResponse.json(
        { error: '성명, 연락처, 이메일, 질문 제목, 질문 내용을 모두 입력해 주세요.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newQuestion: DrJQuestion = {
      id: `ask_${Date.now()}`,
      userName: userName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim(),
      title: title.trim(),
      content: content.trim(),
      createdAt,
      isAnswered: false,
    };

    // 1. 구글 스프레드시트에 자동 영구 저장
    await addDrJQuestion(newQuestion);

    // 2. 모임장 이메일(jguy12@hanmail.net)로 즉시 알림 발송
    sendDrJQuestionEmail({
      userName: newQuestion.userName,
      phoneNumber: newQuestion.phoneNumber,
      email: newQuestion.email,
      title: newQuestion.title,
      content: newQuestion.content,
    }).catch((e) => console.warn('[Ask Dr. J] 메일 발송 비동기 예외:', e));

    return NextResponse.json({
      success: true,
      question: newQuestion,
      message: '질문이 성공적으로 접수되었습니다! 모임장(Dr. J)의 이메일(jguy12@hanmail.net)로 전달되었으며 빠른 시일 내에 회신드리겠습니다.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: '질문 접수 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
