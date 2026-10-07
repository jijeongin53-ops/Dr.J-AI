import { NextResponse } from 'next/server';
import { getChats, addChat } from '@/lib/google/sheets';
import { ChatMessage } from '@/types';

// 채팅 메시지 목록 조회
export async function GET() {
  const chats = await getChats();
  return NextResponse.json({ chats });
}

// 새 채팅 메시지 전송
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { authorId, authorName, authorRole, carrotNickname, content, isNotice } = body;

    if (!content || !authorId) {
      return NextResponse.json({ error: '메시지 내용을 입력하세요.' }, { status: 400 });
    }

    const newChat: ChatMessage = {
      id: `chat-${Date.now()}`,
      authorId,
      authorName: authorName || '익명',
      authorRole: authorRole || 'regular',
      carrotNickname: carrotNickname || '당근회원',
      content,
      createdAt: new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isNotice: Boolean(isNotice && authorRole === 'admin'),
      isApproved: true,
    };

    const saved = await addChat(newChat);
    return NextResponse.json({ chat: saved });
  } catch (error) {
    return NextResponse.json({ error: '채팅 전송 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
