import { Lecture } from '@/types';

const LECTURES_STORAGE_KEY = 'dr_j_custom_lectures';

/**
 * 브라우저 로컬스토리지에서 저장된 사용자 등록 강의 목록을 불러옵니다.
 */
export function getStoredLectures(): Lecture[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LECTURES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('로컬스토리지 강의 데이터 로드 오류:', e);
    return [];
  }
}

/**
 * 신규 등록 강의를 로컬스토리지에 저장합니다.
 */
export function saveStoredLecture(lecture: Lecture): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredLectures();
    const filtered = current.filter((l) => l.id !== lecture.id);
    localStorage.setItem(LECTURES_STORAGE_KEY, JSON.stringify([lecture, ...filtered]));
  } catch (e) {
    console.error('로컬스토리지 강의 저장 오류:', e);
  }
}

/**
 * 등록된 강의를 수정하여 로컬스토리지에 업데이트합니다.
 */
export function updateStoredLecture(updated: Lecture): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredLectures();
    const index = current.findIndex((l) => l.id === updated.id);
    if (index >= 0) {
      current[index] = { ...current[index], ...updated };
      localStorage.setItem(LECTURES_STORAGE_KEY, JSON.stringify(current));
    } else {
      localStorage.setItem(LECTURES_STORAGE_KEY, JSON.stringify([updated, ...current]));
    }
  } catch (e) {
    console.error('로컬스토리지 강의 업데이트 오류:', e);
  }
}

/**
 * 강의를 로컬스토리지에서 삭제합니다.
 */
export function deleteStoredLecture(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredLectures();
    const filtered = current.filter((l) => l.id !== id);
    localStorage.setItem(LECTURES_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('로컬스토리지 강의 삭제 오류:', e);
  }
}

/**
 * 서버에서 받아온 강의 목록과 로컬스토리지에 저장된 강의 목록을 병합합니다.
 */
export function mergeLectures(serverLectures: Lecture[]): Lecture[] {
  const local = getStoredLectures();
  const map = new Map<string, Lecture>();

  // 로컬 데이터를 우선 반영
  for (const l of local) {
    map.set(l.id, l);
  }

  // 서버 데이터를 병합 (로컬에 없는 것만 추가)
  for (const s of serverLectures) {
    if (!map.has(s.id)) {
      map.set(s.id, s);
    }
  }

  return Array.from(map.values());
}
