'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MemberUser } from '@/types';
import { getCurrentUser, clearCurrentUser } from '@/lib/auth';
import { RoleBadge } from '../common/RoleBadge';
import { MemberStatusModal } from '../common/MemberStatusModal';
import {
  Users,
  ShieldAlert,
  ChevronDown,
  LogOut,
  CalendarCheck2,
  MessageCircleQuestion,
  Sparkles,
  Menu,
  X,
  BookOpen,
  MessageSquare,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<MemberUser | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [memberCount, setMemberCount] = useState<number | null>(null);

  // 모임장/관리자 여부 확인
  const isAdmin = user?.role === 'admin' || user?.name === '지정인';

  useEffect(() => {
    // 저장된 로그인 사용자 상태 불러오기 및 실시간 동기화
    const syncUser = () => {
      setUser(getCurrentUser());
    };
    syncUser();

    // 전체 회원수 실시간 조회
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setMemberCount(data.users.length);
      })
      .catch(() => {});

    window.addEventListener('storage', syncUser);
    window.addEventListener('authChange', syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('authChange', syncUser);
    };
  }, []);

  // 페이지 이동 시 열려있는 모바일 메뉴 및 드롭다운 자동 닫기
  useEffect(() => {
    setMobileMenuOpen(false);
    setSwitcherOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    clearCurrentUser();
    setUser(null);
    setSwitcherOpen(false);
    setMobileMenuOpen(false);
    window.location.href = '/';
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* 좌측: 로고 + 회원수 뱃지 + 데스크톱 메인 네비게이션 */}
          <div className="flex items-center gap-2 sm:gap-6 shrink-0">
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-carrot shrink-0" />
              <span className="font-bold text-base sm:text-lg tracking-tight text-gray-950 group-hover:text-carrot transition-colors">
                Dr. J&apos;s
              </span>
              <span className="text-xs text-gray-400 font-mono hidden sm:inline">Hub</span>
            </Link>

            {/* [요구사항 해결]: 비관리자는 회원수만 확인(상세 현황 진입 불가), 관리자만 클릭 시 회원 현황 모달 열기 */}
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setStatusModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-carrot text-[11px] sm:text-xs font-semibold transition shrink-0 shadow-sm"
                title="관리자 전용: 회원 명단 및 현황 보기"
              >
                <Users className="w-3.5 h-3.5" />
                <span>회원 {memberCount ? `${memberCount}명` : '46명'}</span>
              </button>
            ) : (
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] sm:text-xs font-medium shrink-0 cursor-default select-none"
                title="현재 등록된 모임 회원수"
              >
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span>회원 {memberCount ? `${memberCount}명` : '46명'}</span>
              </div>
            )}

            {/* 메인 내비게이션 메뉴 (데스크톱) */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/lectures"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith('/lectures')
                    ? 'bg-gray-100 text-gray-900 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                강의 및 자료실
              </Link>

              <Link
                href="/chat"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/chat'
                    ? 'bg-gray-100 text-gray-900 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                승인 채팅방
              </Link>

              <Link
                href="/attendance"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === '/attendance'
                    ? 'bg-gray-100 text-gray-900 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <CalendarCheck2 className="w-4 h-4 text-carrot" />
                <span>강의 출석부</span>
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname === '/admin'
                      ? 'bg-carrot text-white font-semibold'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-carrot" />
                  <span>관리자 센터</span>
                </Link>
              )}
            </nav>
          </div>

          {/* 우측 영역: 계정 프로필 / 로그인 / 심플한 모바일 메뉴 */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Dr. J에게 물어봐! 헤더 버튼 (데스크톱 전용: 모바일은 하단 플로팅 버튼 활용) */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openAskDrJ'))}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold transition shadow-sm shrink-0"
              title="모임장 Dr. J에게 질문하기 (구글 시트 저장 및 이메일 발송)"
            >
              <MessageCircleQuestion className="w-4 h-4 text-carrot" />
              <span>Dr. J에게 물어봐!</span>
            </button>

            {/* 계정 프로필 & 로그인/로그아웃 전환 영역 */}
            <div className="relative flex items-center gap-1 sm:gap-2">
              {user ? (
                <>
                  {/* 심플한 사용자 버튼 (모바일 글자 겹침 방지) */}
                  <button
                    onClick={() => setSwitcherOpen(!switcherOpen)}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 text-xs text-gray-900 transition shrink-0 max-w-[110px] sm:max-w-none"
                  >
                    <span className="font-bold truncate">{user.name}</span>
                    <div className="hidden sm:block shrink-0">
                      <RoleBadge role={user.role} size="sm" />
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  </button>

                  {/* 콤팩트 로그아웃 버튼 (모바일 줄바꿈 방지) */}
                  <button
                    onClick={handleLogout}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-500 hover:text-red-600 text-xs font-semibold transition flex items-center gap-1 shrink-0"
                    title="로그아웃"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">로그아웃</span>
                  </button>
                </>
              ) : (
                <Link
                  href="/#auth-section"
                  className="text-xs bg-carrot text-white px-3 py-1.5 rounded-lg font-bold hover:bg-carrot-hover transition shadow-sm shrink-0 whitespace-nowrap"
                >
                  로그인 / 가입
                </Link>
              )}

              {/* 드롭다운 메뉴 (내 계정 정보 및 관리자 센터 바로가기) */}
              {switcherOpen && user && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-50 text-xs space-y-3 animate-fadeIn">
                  <div className="border-b border-gray-100 pb-2.5">
                    <p className="text-gray-400 text-[11px]">내 계정 정보</p>
                    <p className="font-bold text-gray-950 text-sm mt-0.5">
                      {user.name} 회원님
                    </p>
                    <div className="mt-1 space-y-0.5 text-gray-600 text-[11px]">
                      <p>연락처(PW): {user.phoneNumber}</p>
                      <p>직업: {user.job || '일반'}</p>
                      <p>이메일: {user.email}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">회원 등급:</span>
                      <RoleBadge role={user.role} size="sm" />
                    </div>
                  </div>

                  {/* 관리자 센터 링크 (모임장 본인 또는 관리자) */}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setSwitcherOpen(false)}
                      className="w-full px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-carrot font-bold flex items-center gap-2 transition"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>모임장 관리자 센터 열기</span>
                    </Link>
                  )}

                  <div className="border-t border-gray-100 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      로그아웃
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 모바일 햄버거 메뉴 버튼 */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 transition shrink-0"
              aria-label="메뉴 열기"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 모바일 슬라이드 다운 네비게이션 드로어 */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md px-4 py-3 space-y-2 text-xs animate-fadeIn shadow-lg">
            <nav className="flex flex-col gap-1">
              <Link
                href="/lectures"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold transition ${
                  pathname.startsWith('/lectures')
                    ? 'bg-blue-50 text-carrot'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <BookOpen className="w-4 h-4 text-carrot" />
                <span>강의 및 자료실</span>
              </Link>
              <Link
                href="/chat"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold transition ${
                  pathname === '/chat'
                    ? 'bg-blue-50 text-carrot'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-carrot" />
                <span>승인 채팅방</span>
              </Link>
              <Link
                href="/attendance"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold transition ${
                  pathname === '/attendance'
                    ? 'bg-blue-50 text-carrot'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CalendarCheck2 className="w-4 h-4 text-carrot" />
                <span>강의 출석부</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold transition ${
                    pathname === '/admin'
                      ? 'bg-blue-50 text-carrot'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-carrot" />
                  <span>관리자 센터</span>
                </Link>
              )}
            </nav>

            <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-gray-500">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openAskDrJ'));
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 py-1 text-gray-700 hover:text-carrot font-medium text-xs"
              >
                <MessageCircleQuestion className="w-3.5 h-3.5 text-carrot" />
                <span>Dr. J에게 질문하기</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new Event('replayNetflixIntro'));
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1 py-1 text-gray-400 hover:text-carrot text-[11px]"
              >
                <Sparkles className="w-3 h-3 text-carrot" />
                <span>Intro 다시보기</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 회원 현황 모달 (관리자 전용) */}
      {isAdmin && (
        <MemberStatusModal
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
        />
      )}
    </>
  );
}
