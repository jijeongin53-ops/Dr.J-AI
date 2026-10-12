import { google } from 'googleapis';
import { MemberUser, Lecture, Comment, ChatMessage, DrJQuestion, LectureReview, MemberLoginLog } from '@/types';
import { GOOGLE_SHEET_ID, GOOGLE_APPS_SCRIPT_DEFAULT_URL } from '../constants';
import { formatPhoneNumber, formatBirthDate, getLast4PhoneDigits, getKoreanNowString } from '../formatters';

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
        name: r[1] || '',
        phoneNumber: r[2] || '',
        birthDate: r[3] || '',
        job: r[4] || '',
        email: r[5] || '',
        carrotNickname: r[6] || r[1] || '',
        role: (r[7] as any) || 'guest',
        status: (r[8] as any) || 'pending',
        joinedAt: r[9] || '',
        note: r[10] || '',
      })) as unknown as T[];
    }

    return fallbackData;
  } catch (error) {
    console.warn(`[Google Sheets] '${sheetName}' 시트 읽기 실패, 로컬 데이터 사용:`, error);
    return fallbackData;
  }
}

/**
 * 사용자 목록 조회 (구글 스프레드시트 실시간 동기화 및 가상 회원 제외)
 * - 이름과 연락처 뒤 4자리가 일치하는 데이터 중복 제거
 * - 전화번호(010-0000-0000) 및 생년월일(0000-00-00) 서식 자동 정규화
 */
export async function getUsers(): Promise<MemberUser[]> {
  const gasUrl = getRuntimeGasUrl();
  if (gasUrl) {
    try {
      const res = await fetch(gasUrl, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const rows: any[][] = json.rows || [];
        // 첫 번째 행은 헤더이므로 rows.slice(1) 사용
        if (rows.length > 1) {
          const parsedUsers: MemberUser[] = rows
            .slice(1)
            .map((r, idx) => {
              const name = String(r[0] || '').trim();
              const rawPhone = String(r[1] || '').trim();
              const phone = formatPhoneNumber(rawPhone);
              const birthDate = formatBirthDate(r[2]);
              const isJjyAdmin = name === '지정인' || phone.includes('82030046') || rawPhone.includes('82030046');
              return {
                id: `sheet_user_${idx + 1}`,
                name: name,
                phoneNumber: phone,
                birthDate: birthDate,
                job: String(r[3] || '').trim(),
                email: String(r[4] || '').trim(),
                carrotNickname: name,
                role: isJjyAdmin ? 'admin' : ((r[5] as any) || 'guest'),
                status: isJjyAdmin ? 'approved' : ((r[6] as any) || 'pending'),
                joinedAt: String(r[7] || '').split(' ')[0] || new Date().toISOString().split('T')[0],
                note: String(r[8] || '').trim(),
              };
            })
            .filter((u) => u.name && u.name !== 'test' && u.name !== '성명(아이디)'); // 이름이 있는 실제 회원만 추출 및 테스트용 행 제외

          // [요구사항 4]: 이름과 연락처 뒤에 4자리가 일치하는 데이터 중 중복되는 데이터는 자동 병합/삭제
          const deduplicatedMap = new Map<string, MemberUser>();
          for (const u of parsedUsers) {
            const last4 = getLast4PhoneDigits(u.phoneNumber);
            const key = `${u.name}_${last4}`;

            if (!deduplicatedMap.has(key)) {
              deduplicatedMap.set(key, { ...u });
            } else {
              // 이미 존재하는 회원인 경우: 승인 상태(approved)나 관리자(admin) 권한을 우선 병합
              const existing = deduplicatedMap.get(key)!;
              if (u.status === 'approved' && existing.status !== 'approved') {
                existing.status = 'approved';
              }
              if (u.role === 'admin') {
                existing.role = 'admin';
              }
              if (u.birthDate && !existing.birthDate) existing.birthDate = u.birthDate;
              if (u.job && !existing.job) existing.job = u.job;
              if (u.email && !existing.email) existing.email = u.email;
              if (u.phoneNumber && u.phoneNumber.includes('-')) existing.phoneNumber = u.phoneNumber;
            }
          }

          const sheetUsers = Array.from(deduplicatedMap.values());

          if (sheetUsers.length > 0) {
            inMemoryUsers = sheetUsers;
            return sheetUsers;
          }
        }
      }
    } catch (e: any) {
      console.warn('[Google Sheets Sync] 시트 데이터 조회 실패, 로컬 메모리 사용:', e.message);
    }
  }

  return inMemoryUsers;
}

// 전역 GAS Webhook URL (서버 런타임 및 관리자 입력 지원)
let runtimeGasUrl: string = process.env.GOOGLE_APPS_SCRIPT_URL || '';

export function setRuntimeGasUrl(url: string) {
  runtimeGasUrl = url.trim();
}

export function getRuntimeGasUrl(): string {
  return runtimeGasUrl || process.env.GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_DEFAULT_URL;
}

/**
 * 사용자 추가 (회원가입) - 구글 시트에 자동 영구 저장
 */
export async function addUser(user: MemberUser): Promise<{ user: MemberUser; sheetSaved: boolean; error?: string }> {
  // 전화번호 및 생년월일 정규화 (010-0000-0000, 0000-00-00)
  user.phoneNumber = formatPhoneNumber(user.phoneNumber);
  user.birthDate = formatBirthDate(user.birthDate);

  // 메모리 내 중복 방지 (성명 + 연락처 뒤 4자리 기준)
  const last4 = getLast4PhoneDigits(user.phoneNumber);
  inMemoryUsers = inMemoryUsers.filter((u) => !(u.name === user.name && getLast4PhoneDigits(u.phoneNumber) === last4));
  inMemoryUsers.push(user);

  let sheetSaved = false;
  let saveError: string | undefined;

  // 1. Google Apps Script Web App URL이 설정되어 있는 경우 (가장 간편하고 안정적인 무인증 웹훅 방식)
  const gasUrl = getRuntimeGasUrl();
  if (gasUrl) {
    try {
      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addUser',
          data: {
            id: user.id,
            name: user.name,
            phoneNumber: user.phoneNumber,
            birthDate: user.birthDate,
            job: user.job,
            email: user.email,
            carrotNickname: user.carrotNickname || '',
            role: user.role,
            status: user.status,
            joinedAt: user.joinedAt,
            note: user.note || '',
          },
        }),
      });
      if (res.ok) {
        sheetSaved = true;
        console.log('[Google Apps Script] 시트에 사용자 저장 성공:', user.name);
      } else {
        saveError = `GAS 응답 오류 (${res.status})`;
      }
    } catch (e: any) {
      saveError = e.message || 'GAS 통신 에러';
      console.warn('[Google Apps Script] 웹훅 전송 실패:', e.message);
    }
  }

  // 2. Google Sheets API v4 (Google Cloud 서비스 계정) 방식
  if (!sheetSaved) {
    const auth = getGoogleAuth();
    if (auth) {
      try {
        const sheets = google.sheets({ version: 'v4', auth });
        const rowData = [
          user.id,
          user.name,
          user.phoneNumber,
          user.birthDate,
          user.job,
          user.email,
          user.carrotNickname || '',
          user.role,
          user.status,
          user.joinedAt,
          user.note || '',
        ];

        try {
          // 'Users' 탭 시도
          await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'Users!A:K',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [rowData] },
          });
          sheetSaved = true;
        } catch (tabErr) {
          // 'Users' 탭이 없으면 기본 시트 첫 번째 탭에 저장
          await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'A:K',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [rowData] },
          });
          sheetSaved = true;
        }
        console.log('[Google Sheets API] 구글 시트에 사용자 저장 성공:', user.name);
      } catch (err: any) {
        saveError = err.message || 'Google Sheets API 호출 오류';
        console.error('[Google Sheets API] 사용자 추가 오류:', err);
      }
    } else {
      saveError = 'Google Service Account 환경 변수(GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY) 미설정';
    }
  }

  return { user, sheetSaved, error: saveError };
}

/**
 * 사용자 등급 또는 상태 업데이트 (관리자용)
 */
export async function updateUserRoleAndStatus(
  userId: string,
  role: MemberUser['role'],
  status: MemberUser['status'],
  rejectionReason?: string
): Promise<MemberUser | null> {
  const target = inMemoryUsers.find((u) => u.id === userId);
  if (target) {
    target.role = role;
    target.status = status;
    if (rejectionReason !== undefined) {
      target.rejectionReason = rejectionReason;
    }

    // 구글 스프레드시트의 해당 행 등급/상태 동기화 (GAS 웹훅)
    const gasUrl = getRuntimeGasUrl();
    if (gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateUserRole',
            data: {
              name: target.name,
              phoneNumber: target.phoneNumber,
              role,
              status,
              rejectionReason: target.rejectionReason || '',
            },
          }),
        });
      } catch (e) {
        console.warn('[Google Sheets Sync] 회원 등급 업데이트 전송 실패:', e);
      }
    }

    return target;
  }
  return null;
}

/**
 * 회원 가입 정보 수정 (반려 회원 재신청용)
 */
export async function updateUserData(
  userId: string,
  data: Partial<MemberUser>
): Promise<MemberUser | null> {
  const target = inMemoryUsers.find((u) => u.id === userId);
  if (target) {
    if (data.name) target.name = data.name.trim();
    if (data.phoneNumber) target.phoneNumber = formatPhoneNumber(data.phoneNumber.trim());
    if (data.birthDate) target.birthDate = formatBirthDate(data.birthDate.trim());
    if (data.job) target.job = data.job.trim();
    if (data.email) target.email = data.email.trim();
    if (data.carrotNickname) target.carrotNickname = data.carrotNickname.trim();
    if (data.status) target.status = data.status;
    if (data.rejectionReason !== undefined) target.rejectionReason = data.rejectionReason;

    const gasUrl = getRuntimeGasUrl();
    if (gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateUser',
            data: target,
          }),
        });
      } catch (e) {
        console.warn('[Google Sheets] 사용자 정보 업데이트 실패:', e);
      }
    }

    return target;
  }
  return null;
}

// 메모리 내 Dr. J 질문 및 후기 목록
let inMemoryDrJQuestions: DrJQuestion[] = [];
let inMemoryReviews: LectureReview[] = [];

/**
 * Dr. J에게 질문 저장 (구글 시트 'DrJ_질문함' 자동 기록)
 */
export async function addDrJQuestion(question: DrJQuestion): Promise<DrJQuestion> {
  inMemoryDrJQuestions.unshift(question);

  const gasUrl = getRuntimeGasUrl();
  if (gasUrl) {
    try {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'askDrJ',
          data: question,
        }),
      }).catch((e) => console.warn('[Google Sheets] Dr. J 질문 시트 기록 비동기 실패:', e));
    } catch (_) {}
  }

  const auth = getGoogleAuth();
  if (auth) {
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const rowData = [
        question.id,
        question.createdAt,
        question.userName,
        question.phoneNumber,
        question.email,
        question.title,
        question.content,
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: 'DrJ_질문함!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      }).catch(() => {});
    } catch (_) {}
  }

  return question;
}

/**
 * 강의 후기 목록 조회
 */
export async function getReviews(lectureId?: string): Promise<LectureReview[]> {
  if (lectureId) {
    return inMemoryReviews.filter((r) => r.lectureId === lectureId);
  }
  return inMemoryReviews;
}

/**
 * 강의 후기 추가
 */
export async function addReview(review: LectureReview): Promise<LectureReview> {
  inMemoryReviews.unshift(review);

  const gasUrl = getRuntimeGasUrl();
  if (gasUrl) {
    try {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addReview',
          data: review,
        }),
      }).catch(() => {});
    } catch (_) {}
  }

  return review;
}

/**
 * 강의 목록 조회
 */
export async function getLectures(): Promise<Lecture[]> {
  return inMemoryLectures;
}

/**
 * 강의 추가 (관리자용) - 구글 시트 '동영상 업로드 현황' 시트에 자동 기록
 */
export async function addLecture(lecture: Lecture): Promise<Lecture> {
  // 이미 존재하는 강의인지 확인 후 중복 방지
  const existingIdx = inMemoryLectures.findIndex((l) => l.id === lecture.id);
  if (existingIdx >= 0) {
    inMemoryLectures[existingIdx] = lecture;
  } else {
    inMemoryLectures.unshift(lecture);
  }

  // 구글 스프레드시트 '동영상 업로드 현황' 시트에 행 추가 (논블로킹 및 타임아웃 방어)
  const gasUrl = getRuntimeGasUrl();
  if (gasUrl) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          action: 'addLecture',
          data: {
            id: lecture.id,
            title: lecture.title,
            category: lecture.category,
            minViewRole: lecture.minViewRole,
            minDownloadRole: lecture.minDownloadRole,
            videoUrl: lecture.videoUrl,
            duration: lecture.duration,
            createdAt: lecture.createdAt,
          },
        }),
      })
        .then(() => clearTimeout(timer))
        .catch((e) => console.warn('[Google Sheets] 강의 시트 추가 비동기 실패:', e.message));
    } catch (e) {
      console.warn('[Google Sheets] 강의 시트 추가 실패:', e);
    }
  }

  return lecture;
}

/**
 * 강의 수정 (관리자용)
 */
export async function updateLecture(updated: Lecture): Promise<Lecture | null> {
  const index = inMemoryLectures.findIndex((l) => l.id === updated.id);
  if (index !== -1) {
    inMemoryLectures[index] = { ...inMemoryLectures[index], ...updated };

    // 구글 스프레드시트 동기화 시도 (논블로킹)
    const gasUrl = getRuntimeGasUrl();
    if (gasUrl) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            action: 'updateLecture',
            data: updated,
          }),
        })
          .then(() => clearTimeout(timer))
          .catch(() => {});
      } catch (e) {
        // 무시
      }
    }

    return inMemoryLectures[index];
  }
  return null;
}

/**
 * 강의 삭제 (관리자용)
 */
export async function deleteLecture(id: string): Promise<boolean> {
  const beforeLen = inMemoryLectures.length;
  inMemoryLectures = inMemoryLectures.filter((l) => l.id !== id);
  const deleted = inMemoryLectures.length < beforeLen;

  // 구글 스프레드시트 동기화 시도 (논블로킹)
  if (deleted) {
    const gasUrl = getRuntimeGasUrl();
    if (gasUrl) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            action: 'deleteLecture',
            id,
          }),
        })
          .then(() => clearTimeout(timer))
          .catch(() => {});
      } catch (e) {
        // 무시
      }
    }
  }

  return deleted;
}

/**
 * 기본 강의 전체를 구글 스프레드시트 '동영상 업로드 현황' 시트에 일괄 동기화
 */
export async function syncLecturesToGoogleSheet(): Promise<{ success: boolean; message: string }> {
  const gasUrl = getRuntimeGasUrl();
  if (!gasUrl) {
    return { success: false, message: 'Google Apps Script URL이 설정되지 않았습니다.' };
  }

  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'syncLectures',
        lectures: inMemoryLectures,
      }),
    });
    if (res.ok) {
      return { success: true, message: '구글 시트 [동영상 업로드 현황] 시트에 성공적으로 동기화되었습니다.' };
    }
    return { success: false, message: `동기화 실패 (HTTP ${res.status})` };
  } catch (e: any) {
    return { success: false, message: e.message || '통신 오류' };
  }
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

// ==========================================
// [구글 시트] 회원 로그인 현황 및 활동 기록 관리
// 항목: 회원명 / 접속일 / 강의실 입장 현황 / 자료 다운로드 현황
// ==========================================

let inMemoryLoginLogs: MemberLoginLog[] = [];

/**
 * 구글 시트 [회원 로그인 현황] 시트에 회원 로그인 기록 (시간 포함 자동 저장)
 */
export async function recordUserLogin(userName: string): Promise<boolean> {
  const cleanName = (userName || '').trim();
  if (!cleanName) return false;

  const nowStr = getKoreanNowString();
  const logItem: MemberLoginLog = {
    id: `log_${Date.now()}`,
    userName: cleanName,
    loginAt: nowStr,
    roomStatus: '-',
    downloadStatus: '-',
  };

  inMemoryLoginLogs.unshift(logItem);

  const gasUrl = getRuntimeGasUrl();
  if (gasUrl) {
    try {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recordLogin',
          data: {
            userName: cleanName,
            name: cleanName,
            time: nowStr,
          },
        }),
      }).catch((e) => console.warn('[Google Sheets] 로그인 현황 기록 비동기 실패:', e.message));
    } catch (_) {}
  }

  const auth = getGoogleAuth();
  if (auth) {
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const rowData = [cleanName, nowStr, '-', '-'];
      await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: '회원 로그인 현황!A:D',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      }).catch(() => {});
    } catch (_) {}
  }

  return true;
}

/**
 * 구글 시트 [회원 로그인 현황] 시트에 강의실 입장 현황 기록 (시간 및 강의명 포함)
 */
export async function recordLectureRoomEntry(userName: string, lectureTitle: string): Promise<boolean> {
  const cleanName = (userName || '').trim();
  if (!cleanName) return false;

  const nowStr = getKoreanNowString();
  const title = (lectureTitle || '실시간 강의실').trim();
  const entryText = `${nowStr} [${title}] 입장`;

  // 메모리 내 최신 항목 갱신
  const existing = inMemoryLoginLogs.find((l) => l.userName === cleanName);
  if (existing) {
    existing.roomStatus = existing.roomStatus && existing.roomStatus !== '-'
      ? `${existing.roomStatus}\n${entryText}`
      : entryText;
  } else {
    inMemoryLoginLogs.unshift({
      id: `log_${Date.now()}`,
      userName: cleanName,
      loginAt: nowStr,
      roomStatus: entryText,
      downloadStatus: '-',
    });
  }

  const gasUrl = getRuntimeGasUrl();
  if (gasUrl) {
    try {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recordRoomEntry',
          data: {
            userName: cleanName,
            name: cleanName,
            lectureTitle: title,
            title: title,
            time: nowStr,
          },
        }),
      }).catch((e) => console.warn('[Google Sheets] 강의실 입장 현황 기록 실패:', e.message));
    } catch (_) {}
  }

  return true;
}

/**
 * 구글 시트 [회원 로그인 현황] 시트에 자료 다운로드 현황 기록 (시간 및 파일명 포함)
 */
export async function recordMaterialDownload(userName: string, materialName: string): Promise<boolean> {
  const cleanName = (userName || '').trim();
  if (!cleanName) return false;

  const nowStr = getKoreanNowString();
  const matName = (materialName || '강의 자료').trim();
  const downloadText = `${nowStr} [${matName}] 다운로드`;

  // 메모리 내 최신 항목 갱신
  const existing = inMemoryLoginLogs.find((l) => l.userName === cleanName);
  if (existing) {
    existing.downloadStatus = existing.downloadStatus && existing.downloadStatus !== '-'
      ? `${existing.downloadStatus}\n${downloadText}`
      : downloadText;
  } else {
    inMemoryLoginLogs.unshift({
      id: `log_${Date.now()}`,
      userName: cleanName,
      loginAt: nowStr,
      roomStatus: '-',
      downloadStatus: downloadText,
    });
  }

  const gasUrl = getRuntimeGasUrl();
  if (gasUrl) {
    try {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recordDownload',
          data: {
            userName: cleanName,
            name: cleanName,
            materialName: matName,
            time: nowStr,
          },
        }),
      }).catch((e) => console.warn('[Google Sheets] 자료 다운로드 현황 기록 실패:', e.message));
    } catch (_) {}
  }

  return true;
}

/**
 * [회원 로그인 현황] 목록 조회
 */
export async function getLoginLogs(): Promise<MemberLoginLog[]> {
  const gasUrl = getRuntimeGasUrl();
  if (gasUrl) {
    try {
      const url = new URL(gasUrl);
      url.searchParams.set('sheet', 'login_status');
      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const rows: any[][] = json.rows || [];
        if (rows.length > 1) {
          const parsedLogs: MemberLoginLog[] = rows.slice(1).map((r, idx) => {
            let loginTime = String(r[1] || '').trim();
            if (loginTime.includes('T')) {
              try {
                const d = new Date(loginTime);
                if (!isNaN(d.getTime())) {
                  const kst = new Date(d.getTime() + 9 * 3600000);
                  const y = kst.getUTCFullYear();
                  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
                  const day = String(kst.getUTCDate()).padStart(2, '0');
                  const hh = String(kst.getUTCHours()).padStart(2, '0');
                  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
                  const ss = String(kst.getUTCSeconds()).padStart(2, '0');
                  loginTime = `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
                }
              } catch (_) {}
            }
            return {
              id: `log_${idx + 1}`,
              userName: String(r[0] || '').trim(),
              loginAt: loginTime,
              roomStatus: String(r[2] || '-').trim(),
              downloadStatus: String(r[3] || '-').trim(),
            };
          }).filter((l) => l.userName && l.userName !== '회원명');

          if (parsedLogs.length > 0) {
            inMemoryLoginLogs = parsedLogs;
            return parsedLogs;
          }
        }
      }
    } catch (e: any) {
      console.warn('[Google Sheets] 로그인 현황 조회 실패:', e.message);
    }
  }
  return inMemoryLoginLogs;
}
