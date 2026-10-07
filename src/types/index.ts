// 회원 등급 타입 정의
export type MemberRole = 'admin' | 'vip' | 'regular' | 'guest';

// 회원 승인 상태
export type MemberStatus = 'pending' | 'approved' | 'rejected' | 'blocked';

// 회원 인터페이스
export interface MemberUser {
  id: string;
  email: string;
  name: string;
  carrotNickname: string; // 당근 닉네임
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
  phoneNumber?: string;
  note?: string; // 모임장 메모
}

// 강의 자료 및 파일 인터페이스
export interface LectureMaterial {
  id: string;
  name: string;
  fileSize?: string;
  driveFileId?: string; // 구글 드라이브 파일 ID
  fileUrl?: string; // 구글 드라이브 다운로드/뷰 링크
  minDownloadRole: MemberRole; // 다운로드 가능한 최소 등급 (guest, regular, vip, admin)
}

// 강의/콘텐츠 인터페이스
export interface Lecture {
  id: string;
  title: string;
  description: string;
  category: string; // 예: "프롬프트 엔지니어링", "업무 자동화", "영상/이미지 AI", "바이브코딩" 등
  minViewRole: MemberRole; // 시청 가능한 최소 등급
  minDownloadRole: MemberRole; // 자료 다운로드 최소 등급
  videoUrl?: string; // 구글 드라이브 동영상 링크 or ID
  driveFileId?: string; // 구글 드라이브 비디오 파일 ID
  duration?: string; // 예: "45분"
  materials: LectureMaterial[]; // 첨부 강의자료 목록
  createdAt: string;
  thumbnailUrl?: string;
  isPublished: boolean;
}

// 댓글 인터페이스
export interface Comment {
  id: string;
  lectureId: string;
  authorId: string;
  authorName: string;
  authorRole: MemberRole;
  carrotNickname: string;
  content: string;
  createdAt: string;
}

// 승인형 실시간 채팅 메시지 인터페이스
export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: MemberRole;
  carrotNickname: string;
  content: string;
  createdAt: string;
  isNotice?: boolean; // 관리자 공지 여부
  isApproved?: boolean; // 채팅 승인 여부 (스팸 방지)
}

// 등급별 권한 레벨 수치화
export const ROLE_HIERARCHY: Record<MemberRole, number> = {
  admin: 4,
  vip: 3,
  regular: 2,
  guest: 1,
};

// 등급 한글 레이블
export const ROLE_LABELS: Record<MemberRole, { name: string; badgeClass: string }> = {
  admin: { name: '관리자', badgeClass: 'bg-black text-white border border-neutral-700' },
  vip: { name: 'VIP 회원', badgeClass: 'bg-carrot text-white font-medium' },
  regular: { name: '정회원', badgeClass: 'bg-zinc-800 text-zinc-100 border border-zinc-700' },
  guest: { name: '대기/준회원', badgeClass: 'bg-zinc-900 text-zinc-400 border border-zinc-800' },
};
