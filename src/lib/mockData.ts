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

// 초기 기본 강의 목록 (구글 드라이브 폴더 1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo 기반)
export const initialLectures: Lecture[] = [
  {
    id: 'lec-1',
    title: "[1강] Dr. J's AI 모임 오리엔테이션 및 챗GPT 300% 활용법",
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
    authorId: 'user_admin_jjy',
    authorName: '지정인 (모임장)',
    authorRole: 'admin',
    carrotNickname: '지정인',
    content: '당근 모임 회원분들을 위한 공식 AI 강의 및 실습 자료실입니다. 궁금하신 점은 언제든 댓글이나 채팅방에 남겨주세요.',
    createdAt: '2025-03-01 10:00',
  },
];

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
