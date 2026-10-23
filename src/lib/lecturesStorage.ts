import { Lecture } from '@/types';

const LECTURES_STORAGE_KEY = 'dr_j_custom_lectures';
const DELETED_LECTURES_KEY = 'dr_j_deleted_lectures';

function getDeletedLectureIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_LECTURES_KEY);
    const parsed: string[] = raw ? JSON.parse(raw) : [];
    // 과거 버전에 저장된 'title:...' 항목이 동일 제목의 다른 강의실을 숨기는 문제 방지 (순수 ID만 유지)
    const cleanIds = parsed.filter((item) => typeof item === 'string' && !item.startsWith('title:'));
    if (cleanIds.length !== parsed.length) {
      localStorage.setItem(DELETED_LECTURES_KEY, JSON.stringify(cleanIds));
    }
    return cleanIds;
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
    const filtered = current.filter((l) => l.id !== lecture.id);
    localStorage.setItem(LECTURES_STORAGE_KEY, JSON.stringify([lecture, ...filtered]));

    const deletedIds = getDeletedLectureIds().filter((id) => id !== lecture.id);
    localStorage.setItem(DELETED_LECTURES_KEY, JSON.stringify(deletedIds));
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

    const deletedIds = getDeletedLectureIds().filter((id) => id !== updated.id);
    localStorage.setItem(DELETED_LECTURES_KEY, JSON.stringify(deletedIds));
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

    const deletedIds = new Set(getDeletedLectureIds());
    deletedIds.add(id);
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

  // 서버 데이터를 먼저 기준(표준 ID)으로 등록하여 모든 브라우저/회원이 동일한 lecture.id를 공유하도록 보장
  for (const s of serverLectures) {
    if (deletedSet.has(s.id)) continue;
    map.set(s.id, s);
  }

  // 로컬 데이터를 병합 (각 강의의 고유 ID를 유지하여 새로 개설한 강의가 과거 강의 ID와 섞이지 않도록 보장)
  for (const l of local) {
    if (deletedSet.has(l.id)) continue;

    if (!map.has(l.id)) {
      map.set(l.id, l);
    } else {
      const existing = map.get(l.id)!;
      map.set(l.id, {
        ...l,
        ...existing,
        id: l.id,
        videoUrl: existing.videoUrl || l.videoUrl || '',
        videoUrls:
          l.videoUrls && l.videoUrls.length > (existing.videoUrls?.length || 0)
            ? l.videoUrls
            : existing.videoUrls && existing.videoUrls.length > 0
            ? existing.videoUrls
            : l.videoUrls || [],
        driveFileId: existing.driveFileId || l.driveFileId || '',
        materials:
          l.materials && l.materials.length > (existing.materials?.length || 0)
            ? l.materials
            : existing.materials && existing.materials.length > 0
            ? existing.materials
            : l.materials || [],
      });
    }
  }

  const extractTime = (id: string) => {
    const m = id.match(/(\d{10,})/);
    return m ? Number(m[1]) : 0;
  };

  return Array.from(map.values()).sort(
    (a, b) => extractTime(b.id) - extractTime(a.id)
  );
}
