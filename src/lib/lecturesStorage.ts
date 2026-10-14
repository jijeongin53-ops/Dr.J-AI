import { Lecture } from '@/types';

const LECTURES_STORAGE_KEY = 'dr_j_custom_lectures';
const DELETED_LECTURES_KEY = 'dr_j_deleted_lectures';

function getDeletedLectureIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_LECTURES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

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
    const filtered = current.filter(
      (l) => l.id !== lecture.id && l.title.trim() !== lecture.title.trim()
    );
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
    const index = current.findIndex(
      (l) => l.id === updated.id || l.title.trim() === updated.title.trim()
    );
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
    const target = current.find((l) => l.id === id);
    const filtered = current.filter((l) => l.id !== id);
    localStorage.setItem(LECTURES_STORAGE_KEY, JSON.stringify(filtered));

    const deletedIds = new Set(getDeletedLectureIds());
    deletedIds.add(id);
    if (target?.title) deletedIds.add(`title:${target.title.trim()}`);
    localStorage.setItem(DELETED_LECTURES_KEY, JSON.stringify(Array.from(deletedIds)));
  } catch (e) {
    console.error('로컬스토리지 강의 삭제 오류:', e);
  }
}

/**
 * 서버에서 받아온 강의 목록과 로컬스토리지에 저장된 강의 목록을 병합합니다.
 */
export function mergeLectures(serverLectures: Lecture[]): Lecture[] {
  const local = getStoredLectures();
  const deletedSet = new Set(getDeletedLectureIds());
  const map = new Map<string, Lecture>();
  const seenTitles = new Map<string, string>(); // title -> id 매핑 (중복 방지)

  // 서버 데이터를 먼저 기준(표준 ID)으로 등록하여 모든 브라우저/회원이 동일한 lecture.id를 공유하도록 보장
  for (const s of serverLectures) {
    if (deletedSet.has(s.id) || deletedSet.has(`title:${s.title.trim()}`)) continue;
    map.set(s.id, s);
    seenTitles.set(s.title.trim(), s.id);
  }

  // 로컬 데이터를 병합 (제목이 같으면 서버 표준 ID를 유지하면서 누락된 영상/자료 필드만 보완)
  for (const l of local) {
    if (deletedSet.has(l.id) || deletedSet.has(`title:${l.title.trim()}`)) continue;
    const existingIdByTitle = seenTitles.get(l.title.trim());
    const targetId = map.has(l.id) ? l.id : existingIdByTitle;

    if (!targetId) {
      map.set(l.id, l);
      seenTitles.set(l.title.trim(), l.id);
    } else {
      const existing = map.get(targetId)!;
      map.set(targetId, {
        ...l,
        ...existing,
        id: targetId,
        videoUrl: existing.videoUrl || l.videoUrl || '',
        driveFileId: existing.driveFileId || l.driveFileId || '',
        materials:
          existing.materials && existing.materials.length > 0
            ? existing.materials
            : l.materials || [],
      });
    }
  }

  return Array.from(map.values());
}
