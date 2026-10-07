import { NextResponse } from 'next/server';
import { MemberRole } from '@/types';
import { hasRequiredRole, getDriveDownloadUrl } from '@/lib/google/drive';

// 등급별 파일 다운로드 권한 검증 및 링크 반환 API
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userRole, minDownloadRole, driveFileId, materialName } = body as {
      userRole?: MemberRole;
      minDownloadRole: MemberRole;
      driveFileId?: string;
      materialName: string;
    };

    if (!userRole) {
      return NextResponse.json(
        { error: '로그인이 필요한 서비스입니다.' },
        { status: 401 }
      );
    }

    // 등급 검증
    const authorized = hasRequiredRole(userRole, minDownloadRole);
    if (!authorized) {
      return NextResponse.json(
        {
          error: `이 자료는 [${minDownloadRole.toUpperCase()}] 등급 이상 회원만 다운로드할 수 있습니다.`,
          requiredRole: minDownloadRole,
          currentRole: userRole,
        },
        { status: 403 }
      );
    }

    // 구글 드라이브 다운로드 URL 생성
    const downloadUrl = driveFileId
      ? getDriveDownloadUrl(driveFileId)
      : `https://drive.google.com/drive/folders/1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo`;

    return NextResponse.json({
      downloadUrl,
      materialName,
      message: '다운로드 권한이 확인되었습니다.',
    });
  } catch (error) {
    return NextResponse.json({ error: '다운로드 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
