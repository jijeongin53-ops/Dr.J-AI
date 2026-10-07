import { MemberRole, ROLE_HIERARCHY } from '@/types';
import { GOOGLE_DRIVE_FOLDER_ID } from '../constants';

/**
 * 구글 드라이브 링크 또는 ID에서 파일 ID를 추출합니다.
 */
export function extractDriveFileId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // 이미 순수 ID 형태인 경우 (예: 1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo)
  if (!trimmed.includes('/') && !trimmed.includes('=')) {
    return trimmed;
  }

  // /presentation/d/{id}, /document/d/{id}, /spreadsheets/d/{id}, /file/d/{id} 등 모든 /d/{id} 형태
  const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) {
    return dMatch[1];
  }

  // /file/d/{id} 형태
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) {
    return fileMatch[1];
  }

  // /folders/{id} 형태
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  // id={id} 파라미터 형태
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  return trimmed;
}

/**
 * 구글 드라이브 동영상/파일의 실시간 스트리밍 및 미리보기 임베드 URL 반환
 */
export function getDrivePreviewUrl(fileIdOrUrl?: string): string {
  if (!fileIdOrUrl) return '';
  const fileId = extractDriveFileId(fileIdOrUrl);
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * 구글 드라이브 파일의 직접 다운로드 URL 반환 (Google Slides, Docs, Sheets, Drive 파일 모두 지원)
 */
export function getDriveDownloadUrl(fileIdOrUrl?: string): string {
  if (!fileIdOrUrl) return '';
  const trimmed = fileIdOrUrl.trim();

  // 구글 프레젠테이션 (Google Slides / PPT)인 경우: PPTX 다운로드 URL 생성
  if (trimmed.includes('presentation')) {
    const fileId = extractDriveFileId(trimmed);
    return `https://docs.google.com/presentation/d/${fileId}/export/pptx`;
  }

  // 구글 문서 (Google Docs)인 경우: PDF 다운로드 URL 생성
  if (trimmed.includes('document')) {
    const fileId = extractDriveFileId(trimmed);
    return `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
  }

  // 구글 스프레드시트인 경우: XLSX 다운로드 URL 생성
  if (trimmed.includes('spreadsheets')) {
    const fileId = extractDriveFileId(trimmed);
    return `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
  }

  // 일반 외부 다운로드 링크인 경우 그대로 반환
  if (trimmed.startsWith('http') && !trimmed.includes('google.com')) {
    return trimmed;
  }

  const fileId = extractDriveFileId(trimmed);
  if (fileId && !fileId.includes('/') && !fileId.includes('=')) {
    return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
  }

  return trimmed;
}

/**
 * 구글 드라이브 / Docs 파일의 브라우저 바로보기(뷰어) URL 반환
 */
export function getDriveViewerUrl(fileIdOrUrl?: string): string {
  if (!fileIdOrUrl) return '';
  const trimmed = fileIdOrUrl.trim();

  if (trimmed.includes('presentation')) {
    const fileId = extractDriveFileId(trimmed);
    return `https://docs.google.com/presentation/d/${fileId}/edit?usp=sharing`;
  }
  if (trimmed.includes('document')) {
    const fileId = extractDriveFileId(trimmed);
    return `https://docs.google.com/document/d/${fileId}/edit?usp=sharing`;
  }
  if (trimmed.includes('spreadsheets')) {
    const fileId = extractDriveFileId(trimmed);
    return `https://docs.google.com/spreadsheets/d/${fileId}/edit?usp=sharing`;
  }

  const fileId = extractDriveFileId(trimmed);
  if (fileId && !fileId.includes('/')) {
    return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  }
  return trimmed;
}

/**
 * 사용자의 등급이 필요한 최소 등급을 충족하는지 검증
 */
export function hasRequiredRole(userRole: MemberRole | undefined | null, requiredRole: MemberRole): boolean {
  // guest(누구나) 등급인 경우 비로그인 사용자도 모두 입장/열람 가능
  if (requiredRole === 'guest') return true;
  if (!userRole) return false;
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}
