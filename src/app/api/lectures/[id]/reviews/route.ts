import { NextResponse } from 'next/server';
import { getReviews, addReview } from '@/lib/google/sheets';
import { LectureReview } from '@/types';

// 강의 후기 목록 조회
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lectureId = params.id;
    const reviews = await getReviews(lectureId);
    return NextResponse.json({ reviews });
  } catch (error) {
    return NextResponse.json(
      { error: '후기 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 강의 후기 등록
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lectureId = params.id;
    const body = await request.json();
    const { authorId, authorName, authorRole, carrotNickname, rating, content } = body;

    if (!authorName || !content || typeof rating !== 'number') {
      return NextResponse.json(
        { error: '작성자, 평점, 후기 내용은 필수 항목입니다.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newReview: LectureReview = {
      id: `rev-${Date.now()}`,
      lectureId,
      authorId: authorId || 'guest',
      authorName: authorName.trim(),
      authorRole: authorRole || 'guest',
      carrotNickname: carrotNickname || authorName,
      rating: Math.max(1, Math.min(5, rating)),
      content: content.trim(),
      createdAt,
    };

    const saved = await addReview(newReview);
    return NextResponse.json({
      success: true,
      review: saved,
      message: '소중한 강의 후기가 성공적으로 등록되었습니다!',
    });
  } catch (error) {
    return NextResponse.json(
      { error: '후기 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
