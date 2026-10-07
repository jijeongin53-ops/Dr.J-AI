// 구글 서비스 및 앱 기본 상수 정의
export const GOOGLE_DRIVE_FOLDER_ID = '1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo';
export const GOOGLE_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo?usp=drive_link';
export const GOOGLE_SHEET_ID = '1aEh870ZH6ktUVbGJQlU66aRbzKxQ59YOXCGt2FZGWdA';
export const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1aEh870ZH6ktUVbGJQlU66aRbzKxQ59YOXCGt2FZGWdA/edit?gid=0#gid=0';
export const GOOGLE_APPS_SCRIPT_DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbykfP5_Qkk6CsPYicgxFgrrfsbhSvs7PsV0UbHtmZfXXsLxlY2ecnyFPtraidukGpm7TQ/exec';

// 당근 모임 정보
export const COMMUNITY_INFO = {
  name: '당근 AI 실무 활용 모임',
  tagline: '직장인 & 1인 기업가를 위한 실전 AI 교육 & 커뮤니티',
  description: 'AI 툴을 활용한 업무 효율화, 프롬프트 엔지니어링, 실무 자동화 강의 및 검증된 교육 자료 저장소',
};

// 강의 카테고리 목록
export const LECTURE_CATEGORIES = [
  '전체',
  '프롬프트 & 업무활용',
  '업무 자동화 & 노코드',
  'AI 이미지 & 영상 제작',
  '바이브 코딩 & 웹개발',
  '모임 라이브 녹화본',
] as const;
