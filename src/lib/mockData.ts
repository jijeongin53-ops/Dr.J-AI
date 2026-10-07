import { MemberUser, Lecture, Comment, ChatMessage } from '@/types';

// 초기 기본 더미 사용자 데이터 (구글 시트 연동 전 또는 로컬 테스트용)
export const initialUsers: MemberUser[] = [
  {
    id: 'user_admin',
    email: 'admin@daangn.ai',
    name: '모임장 (관리자)',
    carrotNickname: 'AI마스터',
    role: 'admin',
    status: 'approved',
    joinedAt: '2025-01-01',
    phoneNumber: '010-1234-5678',
    note: '모임 개설자 및 강사',
  },
  {
    id: 'user_vip1',
    email: 'vip@test.com',
    name: '김우수',
    carrotNickname: '행복한당근',
    role: 'vip',
    status: 'approved',
    joinedAt: '2025-02-10',
    phoneNumber: '010-2222-3333',
    note: '실무 자동화 1기 우수 수강생',
  },
  {
    id: 'user_regular1',
    email: 'regular@test.com',
    name: '이지은',
    carrotNickname: '새싹개발자',
    role: 'regular',
    status: 'approved',
    joinedAt: '2025-03-05',
    phoneNumber: '010-4444-5555',
    note: '정회원 승인 완료',
  },
  {
    id: 'user_pending1',
    email: 'newbie@test.com',
    name: '박대기',
    carrotNickname: '당근초보',
    role: 'guest',
    status: 'pending',
    joinedAt: '2025-03-20',
    phoneNumber: '010-7777-8888',
    note: '당근 모임 채팅방에서 가입 신청',
  },
];

// 초기 기본 강의 목록 (구글 드라이브 폴더 1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo 기반)
export const initialLectures: Lecture[] = [
  {
    id: 'lec-1',
    title: '[1강] 당근 AI 모임 오리엔테이션 및 챗GPT 300% 활용법',
    description: 'AI 툴을 처음 접하는 분들을 위한 프롬프트 핵심 공식 및 직장인을 위한 10분 칼퇴 비법 강의입니다.',
    category: '프롬프트 & 업무활용',
    minViewRole: 'guest', // 준회원도 시청 가능
    minDownloadRole: 'regular', // 정회원 이상 자료 다운로드
    videoUrl: 'https://drive.google.com/file/d/1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo/preview',
    driveFileId: '1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo',
    duration: '42분',
    materials: [
      {
        id: 'mat-1-1',
        name: '01강_프롬프트_치트시트_요약본.pdf',
        fileSize: '2.4 MB',
        driveFileId: 'sample-drive-id-1',
        minDownloadRole: 'regular',
      },
      {
        id: 'mat-1-2',
        name: '실무적용_템플릿_모음.xlsx',
        fileSize: '850 KB',
        driveFileId: 'sample-drive-id-2',
        minDownloadRole: 'vip',
      },
    ],
    createdAt: '2025-03-01',
    isPublished: true,
  },
  {
    id: 'lec-2',
    title: '[2강] 구글 시트와 결합한 업무 자동화 워크플로우 구축',
    description: '스프레드시트 함수와 생성형 AI를 연동하여 반복되는 수작업을 1초 만에 자동화하는 고급 실전 튜토리얼입니다.',
    category: '업무 자동화 & 노코드',
    minViewRole: 'regular',
    minDownloadRole: 'vip',
    videoUrl: 'https://drive.google.com/file/d/1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo/preview',
    driveFileId: '1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo',
    duration: '58분',
    materials: [
      {
        id: 'mat-2-1',
        name: '구글시트_자동화_스크립트_코드.txt',
        fileSize: '45 KB',
        driveFileId: 'sample-drive-id-3',
        minDownloadRole: 'vip',
      },
    ],
    createdAt: '2025-03-12',
    isPublished: true,
  },
  {
    id: 'lec-3',
    title: '[3강 VIP 전용] 바이브 코딩(Vibe Coding)으로 나만의 웹앱 1시간 완성하기',
    description: 'Next.js와 AI 어시스턴트를 활용하여 한 줄의 코딩 지식 없이도 실제 작동하는 SaaS 웹앱을 제작하고 배포하는 비공개 심화 강좌입니다.',
    category: '바이브 코딩 & 웹개발',
    minViewRole: 'vip',
    minDownloadRole: 'vip',
    videoUrl: 'https://drive.google.com/file/d/1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo/preview',
    driveFileId: '1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo',
    duration: '1시간 15분',
    materials: [
      {
        id: 'mat-3-1',
        name: '풀스택_스타터킷_소스코드.zip',
        fileSize: '15.2 MB',
        driveFileId: 'sample-drive-id-4',
        minDownloadRole: 'vip',
      },
    ],
    createdAt: '2025-03-18',
    isPublished: true,
  },
];

export const initialComments: Comment[] = [
  {
    id: 'comm-1',
    lectureId: 'lec-1',
    authorId: 'user_vip1',
    authorName: '김우수',
    authorRole: 'vip',
    carrotNickname: '행복한당근',
    content: '1강 프롬프트 치트시트 정리 정말 깔끔합니다! 덕분에 보고서 작성 시간이 절반으로 줄었습니다.',
    createdAt: '2025-03-02 14:20',
  },
  {
    id: 'comm-2',
    lectureId: 'lec-1',
    authorId: 'user_admin',
    authorName: '모임장 (관리자)',
    authorRole: 'admin',
    carrotNickname: 'AI마스터',
    content: '도움이 되셨다니 기쁩니다! 질문 있으시면 언제든 댓글 남겨주세요.',
    createdAt: '2025-03-02 15:10',
  },
];

export const initialChats: ChatMessage[] = [
  {
    id: 'chat-1',
    authorId: 'user_admin',
    authorName: '모임장 (관리자)',
    authorRole: 'admin',
    carrotNickname: 'AI마스터',
    content: '📢 당근 AI 모임 회원 전용 통합 플랫폼에 오신 것을 환영합니다! 공지 및 강의 자료는 상단 메뉴에서 확인 가능합니다.',
    createdAt: '2025-03-01 10:00',
    isNotice: true,
    isApproved: true,
  },
  {
    id: 'chat-2',
    authorId: 'user_vip1',
    authorName: '김우수',
    authorRole: 'vip',
    carrotNickname: '행복한당근',
    content: '안녕하세요! 이번 주 오프라인 스터디도 기대됩니다 ㅎㅎ',
    createdAt: '2025-03-02 11:30',
    isApproved: true,
  },
  {
    id: 'chat-3',
    authorId: 'user_regular1',
    authorName: '이지은',
    authorRole: 'regular',
    carrotNickname: '새싹개발자',
    content: '반갑습니다! 2강 자동화 강의 듣고 왔는데 신세계네요.',
    createdAt: '2025-03-15 16:45',
    isApproved: true,
  },
];
