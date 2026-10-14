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
export const initialLectures: Lecture[] = [
  {
    id: 'lec-1791782002884',
    title: 'AI로 영상 자동 만들기',
    description: '(주)커넥트제로 이승엽 대표님의 특강입니다.',
    category: 'AI 이미지 & 영상 제작',
    minViewRole: 'guest',
    minDownloadRole: 'guest',
    videoUrl: 'https://drive.google.com/file/d/1h0ht1dwTxrTSCt9WXhSKZ_OJqsGBAL6A/view?usp=drive_link',
    driveFileId: '1h0ht1dwTxrTSCt9WXhSKZ_OJqsGBAL6A',
    duration: '45분',
    maxAttendees: 30,
    materials: [],
    createdAt: '2026-10-12',
    isPublished: true,
  },
  {
    id: 'lec-1791781592531',
    title: '바이브 코딩 기초 자료',
    description: '자료 다운로드 강의실 입니다.',
    category: '바이브 코딩 & 웹개발',
    minViewRole: 'guest',
    minDownloadRole: 'guest',
    videoUrl: '',
    driveFileId: '',
    duration: '45분',
    maxAttendees: 30,
    materials: [
      {
        id: 'mat-1791781592531',
        name: '바이브 코딩 기초 자료.zip',
        fileSize: '82 MB',
        driveFileId: '1VpC1RVQyGWURRLL1kQG193GTKN2SbFFV',
        fileUrl: 'https://drive.google.com/file/d/1VpC1RVQyGWURRLL1kQG193GTKN2SbFFV/view?usp=drive_link',
        minDownloadRole: 'guest',
      },
    ],
    createdAt: '2026-10-12',
    isPublished: true,
  },
  {
    id: 'lec-1791850000000',
    title: '초급자 AI (깃허브와 버셀을 통한 웹앱 배포)',
    description: '내가 만든 웹앱을 깃허브에 저장하고, 버셀로 배포합니다.',
    category: '바이브 코딩 & 웹개발',
    minViewRole: 'guest',
    minDownloadRole: 'guest',
    videoUrl: '',
    driveFileId: '',
    duration: '45분',
    maxAttendees: 30,
    materials: [],
    createdAt: '2026-10-13',
    isPublished: true,
  },
  {
    id: 'lec-1791361109796',
    title: '뮤즈 AI 활용법',
    description: '뮤즈를 배워봅시다.',
    category: '업무 자동화 & 노코드',
    minViewRole: 'guest',
    minDownloadRole: 'guest',
    videoUrl: 'https://drive.google.com/file/d/1GB7phtHP13nDCwPHYa7EzPmhnnLJKRNJ/view?usp=drive_link',
    driveFileId: '1GB7phtHP13nDCwPHYa7EzPmhnnLJKRNJ',
    duration: '45분',
    maxAttendees: 30,
    materials: [
      {
        id: 'mat-1791361109796',
        name: 'Muse_초보자_60분_강의안.pptx',
        fileSize: '99 KB',
        driveFileId: '1cPaiKHVbkBrEdtGyDm4kWpVqWsgoXYgA',
        fileUrl: 'https://drive.google.com/file/d/1cPaiKHVbkBrEdtGyDm4kWpVqWsgoXYgA/view?usp=drive_link',
        minDownloadRole: 'guest',
      },
    ],
    createdAt: '2026-10-07',
    isPublished: true,
  },
];

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
