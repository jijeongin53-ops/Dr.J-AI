import { NextResponse } from 'next/server';
import { getLectures, addLecture } from '@/lib/google/sheets';
import { Lecture } from '@/types';
import { extractDriveFileId } from '@/lib/google/drive';

// 강의 목록 조회
export async function GET() {
  const lectures = await getLectures();
  return NextResponse.json({ lectures });
}

// 강의 등록 (관리자용)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      minViewRole = 'regular',
      minDownloadRole = 'vip',
      videoUrl,
      materials = [],
    } = body;

    if (!title || !description) {
      return NextResponse.json({ error: '제목과 설명은 필수 항목입니다.' }, { status: 400 });
    }

    const driveFileId = videoUrl ? extractDriveFileId(videoUrl) : '';

    const newLecture: Lecture = {
      id: `lec-${Date.now()}`,
      title,
      description,
      category: category || '프롬프트 & 업무활용',
      minViewRole,
      minDownloadRole,
      videoUrl,
      driveFileId,
      materials: materials.map((m: any, idx: number) => ({
        id: `mat-${Date.now()}-${idx}`,
        name: m.name || '자료.pdf',
        fileSize: m.fileSize || '1.0 MB',
        driveFileId: extractDriveFileId(m.driveFileId || m.url || ''),
        fileUrl: m.url || '',
        minDownloadRole: m.minDownloadRole || minDownloadRole,
      })),
      createdAt: new Date().toISOString().split('T')[0],
      isPublished: true,
    };

    const saved = await addLecture(newLecture);
    return NextResponse.json({ lecture: saved, message: '강의 및 자료가 성공적으로 등록되었습니다.' });
  } catch (error) {
    return NextResponse.json({ error: '강의 등록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
