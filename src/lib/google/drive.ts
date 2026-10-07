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
 * 구글 드라이브 파일의 직접 다운로드 URL 반환
 */
export function getDriveDownloadUrl(fileIdOrUrl?: string): string {
  if (!fileIdOrUrl) return '';
  const fileId = extractDriveFileId(fileIdOrUrl);
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * 사용자의 등급이 필요한 최소 등급을 충족하는지 검증
 */
export function hasRequiredRole(userRole: MemberRole | undefined | null, requiredRole: MemberRole): boolean {
  if (!userRole) return false;
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}
