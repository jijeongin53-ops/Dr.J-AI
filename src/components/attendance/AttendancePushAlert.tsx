'use client';

import React, { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { MemberUser, AttendanceSession } from '@/types';
import { Bell, CheckCircle2, UserCheck, X, Sparkles, Loader2 } from 'lucide-react';

export function AttendancePushAlert() {
  const [currentUser, setCurrentUser] = useState<MemberUser | null>(null);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  // 현재 사용자 로그인 상태 감지
  useEffect(() => {
    const syncUser = () => {
      setCurrentUser(getCurrentUser());
    };
    syncUser();

    window.addEventListener('storage', syncUser);
    window.addEventListener('authChange', syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('authChange', syncUser);
    };
  }, []);

  // 주기적으로 활성 출석 세션 체크 (3초 간격)
  useEffect(() => {
    if (!currentUser) return;

    const checkActiveSession = async () => {
      try {
        const res = await fetch('/api/attendance?mode=active', { cache: 'no-store' });
        const data = await res.json();

        if (data.isActive && data.session) {
          // 새로운 세션이 시작되면 알림 재활성화
          if (activeSession?.id !== data.session.id) {
            setActiveSession(data.session);
            setDismissed(false);
            // 해당 세션에 이미 출석했는지 로컬 캐시 확인
            const cacheKey = `att_checked_${data.session.id}_${currentUser.phoneNumber}`;
            if (localStorage.getItem(cacheKey)) {
              setCheckedIn(true);
            } else {
              setCheckedIn(false);
            }
          }
        } else {
          setActiveSession(null);
          setCheckedIn(false);
        }
      } catch (_) {}
    };

    checkActiveSession();
    const interval = setInterval(checkActiveSession, 3000);
    return () => clearInterval(interval);
  }, [currentUser, activeSession?.id]);

  // 회원이 직접 출석 체크하기 클릭
  const handleCheckIn = async () => {
    if (!currentUser || !activeSession) return;

    setLoading(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkIn',
          sessionId: activeSession.id,
          user: currentUser,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCheckedIn(true);
        const time = new Date().toLocaleTimeString('ko-KR');
        setCheckInTime(time);
        const cacheKey = `att_checked_${activeSession.id}_${currentUser.phoneNumber}`;
        localStorage.setItem(cacheKey, 'true');
      } else {
        alert(data.error || '출석 체크 처리 중 오류가 발생했습니다.');
      }
    } catch (e) {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 활성 세션이 없거나 닫았을 때
  if (!currentUser || !activeSession) return null;

  return (
    <>
      {/* 화면 상단 고정 실시간 푸시 팝업 배너 */}
      {!dismissed && (
        <aside 
          aria-label="실시간 강의 출석 체크 푸시 알림"
          className="fixed top-20 inset-x-4 sm:right-6 sm:left-auto sm:w-[420px] z-50 animate-bounce-short"
        >
          <div className="bg-white border-2 border-carrot rounded-2xl shadow-2xl p-5 text-gray-900 relative overflow-hidden backdrop-blur-xl">
            {/* 상단 장식 바 */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-carrot via-orange-400 to-black" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-carrot shrink-0 animate-pulse">
                  <Bell className="w-5 h-5 text-carrot" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-carrot text-white">
                      LIVE 출석 요청
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono">
                      지금 출석 중
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-gray-950 mt-1 leading-snug">
                    {activeSession.title}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                aria-label="출석 체크 푸시 알림 닫기"
                onClick={() => setDismissed(true)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 text-xs">
              {checkedIn ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs">🎉 {currentUser.name} 회원님 출석 완료!</p>
                    <p className="text-[11px] text-emerald-600 font-normal">
                      출석이 정상 기록되었습니다. ({checkInTime || '방금 전'})
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    모임장이 실시간 출석 체크를 시작했습니다. 아래 버튼을 눌러 직접 출석을 완료해 주세요.
                  </p>
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-carrot hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>출석 처리 중...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>✋ {currentUser.name} 본인 출석 체크하기</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* 최소화되었을 때 우측 하단 플로팅 배지 */}
      {dismissed && !checkedIn && (
        <button
          type="button"
          onClick={() => setDismissed(false)}
          className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-full bg-carrot text-white font-bold text-xs shadow-xl flex items-center gap-2 hover:bg-orange-600 transition animate-bounce"
        >
          <Bell className="w-4 h-4" />
          <span>출석 체크 요청 열기</span>
        </button>
      )}
    </>
  );
}
