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

// 구글 시트 실시간 브릿지 저장소 헬퍼 (서버리스 인스턴스 간 댓글/후기/채팅/강의/강의실입장/출석 영구 공유)
let cachedStoreRows: Array<{ tag: string; subKey: string; jsonStr: string }> | null = null;
let lastStoreFetchTime = 0;

export async function saveRecordToSheetStore(
  tag:
    | '__COMMENT__'
    | '__REVIEW__'
    | '__CHAT__'
    | '__LECTURE__'
    | '__LECTURE_DELETE__'
    | '__ROOM_EVENT__'
    | '__ATTENDANCE_EVENT__',
  subKey: string,
  userName: string,
  payloadObj: any,
  contentText: string
): Promise<void> {
  // 쓰기 발생 시 즉시 캐시 무효화
  cachedStoreRows = null;
  lastStoreFetchTime = 0;

  const gasUrl = getRuntimeGasUrl();
  if (!gasUrl) return;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        action: 'askDrJ',
        data: {
          createdAt: getKoreanNowString(),
          userName: userName || '회원',
          phoneNumber: subKey || '-',
          email: tag,
          title: JSON.stringify(payloadObj),
          content: contentText || '-',
        },
      }),
    });
    clearTimeout(timer);
    cachedStoreRows = null;
    lastStoreFetchTime = 0;
  } catch (e: any) {
    console.warn(`[Google Sheets Store] ${tag} 저장 실패:`, e.message);
  }
}

export async function fetchAllSheetStoreRows(
  forceFresh: boolean = false
): Promise<Array<{ tag: string; subKey: string; jsonStr: string }>> {
  const now = Date.now();
  if (!forceFresh && cachedStoreRows && now - lastStoreFetchTime < 800) {
    return cachedStoreRows;
  }

  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      'DrJ_질문함'
    )}&_t=${now}`;
    const res = await fetch(gvizUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    if (!res.ok) return cachedStoreRows || [];
    const text = await res.text();
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
    if (!jsonMatch || !jsonMatch[1]) return cachedStoreRows || [];
    const parsed = JSON.parse(jsonMatch[1]);
    const rows = parsed?.table?.rows || [];
    const result: Array<{ tag: string; subKey: string; jsonStr: string }> = [];
    for (const r of rows) {
      const c = r.c || [];
      const tag = String(c[3]?.v || '').trim();
      const subKey = String(c[2]?.v || '').trim();
      const jsonStr = String(c[4]?.v || '').trim();
      if (tag.startsWith('__') && jsonStr) {
        result.push({ tag, subKey, jsonStr });
      }
    }
    cachedStoreRows = result;
    lastStoreFetchTime = Date.now();
    return result;
  } catch {
    return cachedStoreRows || [];
  }
}

/**
 * 강의 후기 목록 조회
 */
export async function getReviews(lectureId?: string): Promise<LectureReview[]> {
  const storeRows = await fetchAllSheetStoreRows();
  const map = new Map<string, LectureReview>();

  for (const mem of inMemoryReviews) {
    if (mem && mem.id) map.set(mem.id, mem);
  }

  for (const r of storeRows) {
    if (r.tag === '__REVIEW__') {
      try {
        const rev = JSON.parse(r.jsonStr) as LectureReview;
        if (rev && rev.id) map.set(rev.id, rev);
      } catch (_) {}
    }
  }

  // 최신순 정렬
  const merged = Array.from(map.values()).sort((a, b) => b.id.localeCompare(a.id));
  inMemoryReviews = merged;

  if (lectureId) {
    return merged.filter((r) => r.lectureId === lectureId);
  }
  return merged;
}

/**
 * 강의 후기 추가
 */
export async function addReview(review: LectureReview): Promise<LectureReview> {
  inMemoryReviews.unshift(review);

  await saveRecordToSheetStore('__REVIEW__', review.lectureId, review.authorName, review, review.content);

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

// 삭제 처리된 강의 ID 추적 (재조회 시 부활 방지)
const deletedLectureIds = new Set<string>();

/**
 * 강의 목록 조회
 */
export async function getLectures(): Promise<Lecture[]> {
  const sheetLectures: Lecture[] = [];

  // 1. 구글 시트 '동영상 업로드 현황' 탭 실시간 조회 (gviz JSON API 활용)
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent('동영상 업로드 현황')}`;
    const res = await fetch(gvizUrl, { cache: 'no-store' });
    if (res.ok) {
      const text = await res.text();
      const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
      if (jsonMatch && jsonMatch[1]) {
        const parsed = JSON.parse(jsonMatch[1]);
        const rows = parsed?.table?.rows || [];
        for (const r of rows) {
          const c = r.c || [];
          const id = String(c[0]?.v || '').trim();
          const title = String(c[1]?.v || '').trim();
          if (!id || !title || id === '강의 번호' || title === '강의 제목') continue;

          const category = String(c[2]?.v || '프롬프트 & 업무활용').trim();
          const minViewRole = (String(c[3]?.v || 'guest').trim() as any) || 'guest';
          const minDownloadRole = (String(c[4]?.v || 'guest').trim() as any) || 'guest';
          const videoUrl = String(c[5]?.v || '').trim();
          const duration = String(c[6]?.v || '45분').trim();
          const createdAt = String(c[7]?.f || c[7]?.v || new Date().toISOString().split('T')[0]).trim();
          const description = String(c[8]?.v || '').trim();
          let materials: any[] = [];
          if (c[9]?.v) {
            try {
              materials = JSON.parse(String(c[9].v));
            } catch (_) {}
          }
          const maxAttendees = c[10]?.v !== undefined && c[10]?.v !== null ? Number(c[10].v) : 30;

          sheetLectures.push({
            id,
            title,
            description,
            category,
            minViewRole,
            minDownloadRole,
            videoUrl,
            driveFileId: videoUrl,
            duration,
            maxAttendees: !isNaN(maxAttendees) ? maxAttendees : 30,
            materials: Array.isArray(materials) ? materials : [],
            createdAt,
            isPublished: true,
          });
        }
      }
    }
  } catch (e: any) {
    console.warn('[Google Sheets] 동영상 업로드 현황 시트 조회 실패:', e.message);
  }

  // 1-2. 브릿지 스토어에 기록된 신규/수정/삭제 강의 내역 반영
  const storeRows = await fetchAllSheetStoreRows();
  for (const r of storeRows) {
    if (r.tag === '__LECTURE_DELETE__') {
      deletedLectureIds.add(r.subKey);
      try {
        const parsed = JSON.parse(r.jsonStr);
        if (parsed?.id) deletedLectureIds.add(parsed.id);
      } catch (_) {}
    } else if (r.tag === '__LECTURE__') {
      try {
        const lec = JSON.parse(r.jsonStr) as Lecture;
        if (lec && lec.id && lec.title) {
          deletedLectureIds.delete(lec.id);
          sheetLectures.push(lec);
        }
      } catch (_) {}
    }
  }

  // 2. 메모리 데이터(inMemoryLectures / initialLectures)와 시트 데이터를 중복 없이 병합
  const mergedMap = new Map<string, Lecture>();
  const titleToId = new Map<string, string>();

  for (const item of inMemoryLectures) {
    if (deletedLectureIds.has(item.id)) continue;
    mergedMap.set(item.id, { ...item });
    titleToId.set(item.title.trim(), item.id);
  }

  for (const sItem of sheetLectures) {
    if (deletedLectureIds.has(sItem.id)) continue;
    const matchId = mergedMap.has(sItem.id) ? sItem.id : titleToId.get(sItem.title.trim());

    if (!matchId) {
      mergedMap.set(sItem.id, {
        ...sItem,
        description: sItem.description || `${sItem.title} 강의 및 교육 자료실입니다.`,
      });
      titleToId.set(sItem.title.trim(), sItem.id);
    } else {
      const existing = mergedMap.get(matchId)!;
      mergedMap.set(matchId, {
        ...existing,
        ...sItem,
        id: matchId,
        description: sItem.description || existing.description || `${existing.title} 강의실입니다.`,
        videoUrl: sItem.videoUrl || existing.videoUrl || '',
        driveFileId: sItem.driveFileId || existing.driveFileId || sItem.videoUrl || existing.videoUrl || '',
        materials:
          sItem.materials && sItem.materials.length > 0
            ? sItem.materials
            : existing.materials || [],
      });
    }
  }

  const finalLectures = Array.from(mergedMap.values());
  if (finalLectures.length > 0) {
    inMemoryLectures = finalLectures;
  }

  return inMemoryLectures;
}

/**
 * 강의 추가 (관리자용) - 구글 시트 '동영상 업로드 현황' 시트에 자동 기록
 */
export async function addLecture(lecture: Lecture): Promise<Lecture> {
  deletedLectureIds.delete(lecture.id);
  // 이미 존재하는 강의인지 확인 후 중복 방지 (ID 또는 제목 기준)
  const existingIdx = inMemoryLectures.findIndex(
    (l) => l.id === lecture.id || l.title.trim() === lecture.title.trim()
  );
  if (existingIdx >= 0) {
    inMemoryLectures[existingIdx] = { ...inMemoryLectures[existingIdx], ...lecture };
  } else {
    inMemoryLectures.unshift(lecture);
  }

  await saveRecordToSheetStore('__LECTURE__', lecture.id, lecture.title, lecture, lecture.description);

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
            description: lecture.description,
            category: lecture.category,
            minViewRole: lecture.minViewRole,
            minDownloadRole: lecture.minDownloadRole,
            videoUrl: lecture.videoUrl,
            duration: lecture.duration,
            maxAttendees: lecture.maxAttendees ?? 30,
            materials: JSON.stringify(lecture.materials || []),
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
  deletedLectureIds.delete(updated.id);
  const index = inMemoryLectures.findIndex(
    (l) => l.id === updated.id || l.title.trim() === updated.title.trim()
  );
  if (index !== -1) {
    inMemoryLectures[index] = { ...inMemoryLectures[index], ...updated };
  } else {
    inMemoryLectures.unshift(updated);
  }

  await saveRecordToSheetStore('__LECTURE__', updated.id, updated.title, updated, updated.description);

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

  return index !== -1 ? inMemoryLectures[index] : updated;
}

/**
 * 강의 삭제 (관리자용)
 */
export async function deleteLecture(id: string): Promise<boolean> {
  deletedLectureIds.add(id);
  const beforeLen = inMemoryLectures.length;
  inMemoryLectures = inMemoryLectures.filter((l) => l.id !== id);
  const deleted = inMemoryLectures.length < beforeLen;

  await saveRecordToSheetStore('__LECTURE_DELETE__', id, id, { id }, 'deleted');

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

  return deleted || true;
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
  const storeRows = await fetchAllSheetStoreRows();
  const map = new Map<string, Comment>();

  for (const c of inMemoryComments) {
    map.set(c.id, c);
  }

  for (const r of storeRows) {
    if (r.tag === '__COMMENT__') {
      try {
        const comm = JSON.parse(r.jsonStr) as Comment;
        if (comm && comm.id) {
          map.set(comm.id, comm);
        }
      } catch (_) {}
    }
  }

  const merged = Array.from(map.values());
  inMemoryComments = merged;

  if (lectureId) {
    return merged.filter((c) => c.lectureId === lectureId);
  }
  return merged;
}

/**
 * 댓글 추가
 */
export async function addComment(comment: Comment): Promise<Comment> {
  inMemoryComments.push(comment);
  await saveRecordToSheetStore('__COMMENT__', comment.lectureId, comment.authorName, comment, comment.content);
  return comment;
}

/**
 * 실시간 승인 채팅 목록 조회
 */
export async function getChats(): Promise<ChatMessage[]> {
  const storeRows = await fetchAllSheetStoreRows();
  const map = new Map<string, ChatMessage>();

  // 기본 공지 메시지 우선 반영
  for (const initChat of initialChats) {
    map.set(initChat.id, initChat);
  }

  // 시트에 영구 저장된 대화 내역 반영
  for (const r of storeRows) {
    if (r.tag === '__CHAT__') {
      try {
        const chatObj = JSON.parse(r.jsonStr) as ChatMessage;
        if (chatObj && chatObj.id && chatObj.content) {
          map.set(chatObj.id, chatObj);
        }
      } catch (_) {}
    }
  }

  // 메모리 내 최신 대화 병합
  for (const memChat of inMemoryChats) {
    map.set(memChat.id, memChat);
  }

  const merged = Array.from(map.values());
  inMemoryChats = merged;
  return merged;
}

/**
 * 채팅 메시지 추가
 */
export async function addChat(chat: ChatMessage): Promise<ChatMessage> {
  inMemoryChats.push(chat);
  await saveRecordToSheetStore(
    '__CHAT__',
    chat.isNotice ? 'notice' : 'chat',
    chat.authorName,
    chat,
    chat.content
  );
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
