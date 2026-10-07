import { NextResponse } from 'next/server';
import { getLectures, addLecture, updateLecture, deleteLecture } from '@/lib/google/sheets';
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
      minViewRole = 'guest',
      minDownloadRole = 'guest',
      videoUrl,
      duration = '45분',
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
      duration,
      materials: materials.map((m: any, idx: number) => ({
        id: m.id || `mat-${Date.now()}-${idx}`,
        name: m.name || '자료.pdf',
        fileSize: m.fileSize || '자료',
        driveFileId: extractDriveFileId(m.driveFileId || m.url || ''),
        fileUrl: m.url || m.fileUrl || '',
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

// 강의 수정 (관리자용)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      description,
      category,
      minViewRole,
      minDownloadRole,
      videoUrl,
      duration,
      materials = [],
    } = body;

    if (!id || !title) {
      return NextResponse.json({ error: '강의 ID와 제목은 필수입니다.' }, { status: 400 });
    }

    const driveFileId = videoUrl ? extractDriveFileId(videoUrl) : '';

    const updatedData: Lecture = {
      id,
      title,
      description: description || '',
      category: category || '프롬프트 & 업무활용',
      minViewRole: minViewRole || 'guest',
      minDownloadRole: minDownloadRole || 'guest',
      videoUrl: videoUrl || '',
      driveFileId,
      duration: duration || '45분',
      materials: materials.map((m: any, idx: number) => ({
        id: m.id || `mat-${Date.now()}-${idx}`,
        name: m.name || '자료.pdf',
        fileSize: m.fileSize || '자료',
        driveFileId: extractDriveFileId(m.driveFileId || m.url || ''),
        fileUrl: m.url || m.fileUrl || '',
        minDownloadRole: m.minDownloadRole || minDownloadRole || 'guest',
      })),
      createdAt: body.createdAt || new Date().toISOString().split('T')[0],
      isPublished: true,
    };

    const updated = await updateLecture(updatedData);
    if (!updated) {
      // 메모리에 없더라도 해당 객체 반환
      return NextResponse.json({ lecture: updatedData, message: '강의 정보가 수정되었습니다.' });
    }

    return NextResponse.json({ lecture: updated, message: '강의 정보가 성공적으로 수정되었습니다.' });
  } catch (error) {
    return NextResponse.json({ error: '강의 수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 강의 삭제 (관리자용)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '강의 ID가 제공되지 않았습니다.' }, { status: 400 });
    }

    await deleteLecture(id);
    return NextResponse.json({ success: true, message: '강의가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    return NextResponse.json({ error: '강의 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
