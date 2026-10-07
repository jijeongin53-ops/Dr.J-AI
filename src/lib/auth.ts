import { MemberUser } from '@/types';

// 클라이언트 사이드 로그인 사용자 상태 관리 키 (v2로 갱신하여 이전 자동 관리자 세션 초기화)
export const AUTH_STORAGE_KEY = 'daangn_ai_user_v2';

// 클라이언트에서 현재 로그인한 유저 정보 가져오기
export function getCurrentUser(): MemberUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MemberUser;
  } catch (e) {
    return null;
  }
}

// 클라이언트에서 유저 로그인 세션 저장
export function setCurrentUser(user: MemberUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('authChange'));
}

// 로그아웃
export function clearCurrentUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event('authChange'));
}
