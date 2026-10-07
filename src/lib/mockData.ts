import { MemberUser, Lecture, Comment, ChatMessage } from '@/types';

// 초기 기본 사용자 데이터 (가상 회원 제거, 실제 모임장 계정만 유지)
export const initialUsers: MemberUser[] = [
  {
    id: 'user_admin_jjy',
    name: '지정인',
    phoneNumber: '010-8203-0046',
    birthDate: '1970-01-01',
    job: '사업자 / 모임장',
    email: 'admin@daangn-ai.kr',
    carrotNickname: '지정인',
    role: 'admin',
    status: 'approved',
    joinedAt: '2025-01-01',
    note: "Dr. J's 모임 최고 운영자 및 관리자",
  },
];

// 강의 목록 (가상 강의 삭제 완료, 관리자가 직접 등록한 실제 강의만 노출)
export const initialLectures: Lecture[] = [];

// 댓글 목록 (가상 댓글 삭제 완료)
export const initialComments: Comment[] = [];

export const initialChats: ChatMessage[] = [
  {
    id: 'chat-1',
    authorId: 'user_admin_jjy',
    authorName: '지정인 (모임장)',
    authorRole: 'admin',
    carrotNickname: '지정인',
    content: '📢 당근 AI 모임 회원 전용 통합 플랫폼에 오신 것을 환영합니다! 신규 강의 및 자료는 강의실에서 확인하실 수 있습니다.',
    createdAt: '2025-03-01 10:00',
    isNotice: true,
    isApproved: true,
  },
];
