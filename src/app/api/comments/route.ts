import { NextResponse } from 'next/server';
import { getComments, addComment } from '@/lib/google/sheets';
import { Comment } from '@/types';

// 댓글 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lectureId = searchParams.get('lectureId') || undefined;

  const comments = await getComments(lectureId);
  return NextResponse.json({ comments });
}

// 댓글 작성
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lectureId, authorId, authorName, authorRole, carrotNickname, content } = body;

    if (!lectureId || !content || !authorId) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    const newComment: Comment = {
      id: `comm-${Date.now()}`,
      lectureId,
      authorId,
      authorName: authorName || '익명 회원',
      authorRole: authorRole || 'regular',
      carrotNickname: carrotNickname || '당근회원',
      content,
      createdAt: new Date().toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const saved = await addComment(newComment);
    return NextResponse.json({ comment: saved });
  } catch (error) {
    return NextResponse.json({ error: '댓글 등록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
