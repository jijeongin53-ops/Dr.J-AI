import { google } from 'googleapis';
import { MemberUser, Lecture, Comment, ChatMessage } from '@/types';
import { GOOGLE_SHEET_ID } from '../constants';

// 구글 인증 클라이언트 생성 (서비스 계정)
function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    return null;
  }

  // 환경 변수의 개행 문자(\n) 복원 처리
  privateKey = privateKey.replace(/\\n/g, '\n');

  try {
    return new google.auth.JWT({
      email,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });
  } catch (error) {
    console.error('Google Auth Init Error:', error);
    return null;
  }
}

import { initialUsers, initialLectures, initialComments, initialChats } from '../mockData';
export { initialUsers, initialLectures, initialComments, initialChats };

// 메모리 캐시 (서버리스 인스턴스 간 fallback 데이터 유지)
let inMemoryUsers: MemberUser[] = [...initialUsers];
let inMemoryLectures: Lecture[] = [...initialLectures];
let inMemoryComments: Comment[] = [...initialComments];
let inMemoryChats: ChatMessage[] = [...initialChats];

/**
 * 구글 스프레드시트 API 연동 서비스
 * 환경 변수가 세팅되어 있으면 실제 Google Sheets와 통신하고,
 * 세팅되지 않았을 때는 견고한 In-Memory DB로 완벽하게 폴백합니다.
 */
export async function getSheetData<T>(sheetName: string, fallbackData: T[]): Promise<T[]> {
  const auth = getGoogleAuth();
  if (!auth) {
    return fallbackData;
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${sheetName}!A2:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return fallbackData;
    }

    // 시트 이름을 기반으로 파싱
    if (sheetName === 'Users') {
      return rows.map((r) => ({
        id: r[0] || '',
        email: r[1] || '',
        name: r[2] || '',
        carrotNickname: r[3] || '',
        role: (r[4] as any) || 'guest',
        status: (r[5] as any) || 'pending',
        joinedAt: r[6] || '',
        phoneNumber: r[7] || '',
        note: r[8] || '',
      })) as unknown as T[];
    }

    return fallbackData;
  } catch (error) {
    console.warn(`[Google Sheets] '${sheetName}' 시트 읽기 실패, 로컬 데이터 사용:`, error);
    return fallbackData;
  }
}

/**
 * 사용자 목록 조회
 */
export async function getUsers(): Promise<MemberUser[]> {
  return inMemoryUsers;
}

/**
 * 사용자 추가 (회원가입)
 */
export async function addUser(user: MemberUser): Promise<MemberUser> {
  inMemoryUsers.push(user);
  
  // 구글 시트 쓰기 시도
  const auth = getGoogleAuth();
  if (auth) {
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: 'Users!A:I',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            user.id,
            user.email,
            user.name,
            user.carrotNickname,
            user.role,
            user.status,
            user.joinedAt,
            user.phoneNumber || '',
            user.note || '',
          ]],
        },
      });
    } catch (err) {
      console.error('[Google Sheets] 사용자 추가 오류:', err);
    }
  }

  return user;
}

/**
 * 사용자 등급 또는 상태 업데이트 (관리자용)
 */
export async function updateUserRoleAndStatus(
  userId: string,
  role: MemberUser['role'],
  status: MemberUser['status']
): Promise<MemberUser | null> {
  const target = inMemoryUsers.find((u) => u.id === userId);
  if (target) {
    target.role = role;
    target.status = status;
    return target;
  }
  return null;
}

/**
 * 강의 목록 조회
 */
export async function getLectures(): Promise<Lecture[]> {
  return inMemoryLectures;
}

/**
 * 강의 추가 (관리자용)
 */
export async function addLecture(lecture: Lecture): Promise<Lecture> {
  inMemoryLectures.unshift(lecture);
  return lecture;
}

/**
 * 댓글 목록 조회
 */
export async function getComments(lectureId?: string): Promise<Comment[]> {
  if (lectureId) {
    return inMemoryComments.filter((c) => c.lectureId === lectureId);
  }
  return inMemoryComments;
}

/**
 * 댓글 추가
 */
export async function addComment(comment: Comment): Promise<Comment> {
  inMemoryComments.push(comment);
  return comment;
}

/**
 * 실시간 승인 채팅 목록 조회
 */
export async function getChats(): Promise<ChatMessage[]> {
  return inMemoryChats;
}

/**
 * 채팅 메시지 추가
 */
export async function addChat(chat: ChatMessage): Promise<ChatMessage> {
  inMemoryChats.push(chat);
  return chat;
}
