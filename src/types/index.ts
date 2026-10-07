// 회원 등급 타입 정의
export type MemberRole = 'admin' | 'vip' | 'regular' | 'guest';

// 회원 승인 상태
export type MemberStatus = 'pending' | 'approved' | 'rejected' | 'blocked';

// 회원 인터페이스
export interface MemberUser {
  id: string;
  name: string; // 성명 (로그인 아이디로 사용)
  phoneNumber: string; // 연락처 (로그인 비밀번호로 사용)
  birthDate: string; // 생년월일 (YYYY-MM-DD or 6/8자리)
  job: string; // 직업
  email: string; // 이메일
  carrotNickname?: string; // 당근 닉네임 (선택)
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
  note?: string; // 모임장 메모
  rejectionReason?: string; // 반려/거절 사유
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
  maxAttendees?: number; // 입장 가능한 최대 회원 수 (0 또는 미설정 시 무제한)
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

// 강의 후기 및 평점 인터페이스
export interface LectureReview {
  id: string;
  lectureId: string;
  authorId: string;
  authorName: string;
  authorRole: MemberRole;
  carrotNickname?: string;
  rating: number; // 1 ~ 5점
  content: string; // 후기 내용
  createdAt: string;
}

// Dr. J에게 질문하기 인터페이스
export interface DrJQuestion {
  id: string;
  userName: string;
  phoneNumber: string;
  email: string;
  title: string;
  content: string;
  createdAt: string;
  isAnswered?: boolean;
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
  admin: { name: '관리자', badgeClass: 'bg-black text-white font-medium' },
  vip: { name: 'VIP 회원', badgeClass: 'bg-carrot text-white font-medium' },
  regular: { name: '정회원', badgeClass: 'bg-gray-100 text-gray-800 border border-gray-300 font-medium' },
  guest: { name: '대기/준회원', badgeClass: 'bg-gray-50 text-gray-500 border border-gray-200' },
};

// 강의 출석부 세션 인터페이스
export interface AttendanceSession {
  id: string;
  title: string; // 예: "4월 1회차 실시간 AI 강의 출석 체크"
  startedAt: string;
  isActive: boolean;
  code?: string; // 출석 확인 번호(선택)
}

// 개별 회원 출석 기록 인터페이스
export interface AttendanceRecord {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  phoneNumber: string;
  role: MemberRole;
  status: 'present' | 'absent' | 'late'; // 출석, 결석, 지각
  checkedAt: string;
  isSelfChecked: boolean; // 회원이 직접 푸시를 눌러 체크했는지 여부
}
