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
  User,
  Settings,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<MemberUser | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  useEffect(() => {
    // 저장된 로그인 사용자 상태 불러오기
    const current = getCurrentUser();
    if (current) {
      setUser(current);
    }
  }, []);

  const handleLogout = () => {
    clearCurrentUser();
    setUser(null);
    setSwitcherOpen(false);
    window.location.href = '/';
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* 로고 영역 */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="w-2.5 h-2.5 rounded-full bg-carrot" />
              <span className="font-bold text-lg tracking-tight text-gray-950 group-hover:text-carrot transition-colors">
                당근 AI 모임
              </span>
              <span className="text-xs text-gray-400 font-mono hidden sm:inline">Hub</span>
            </Link>

            {/* 메인 내비게이션 메뉴 */}
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
            </nav>
          </div>

          {/* 우측 영역: [회원 현황 아이콘] + 계정 버튼 (드라이브/시트DB 링크 제거됨) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 회원 현황 아이콘 버튼 */}
            <button
              onClick={() => setStatusModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 text-xs font-semibold transition shadow-sm"
              title="현재 회원 현황 보기"
            >
              <Users className="w-4 h-4 text-carrot" />
              <span>회원 현황</span>
            </button>

            {/* 계정 프로필 & 스위처 드롭다운 */}
            <div className="relative">
              {user ? (
                <button
                  onClick={() => setSwitcherOpen(!switcherOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 text-xs text-gray-900 transition"
                >
                  <span className="font-semibold">{user.name}</span>
                  <RoleBadge role={user.role} size="sm" />
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
              ) : (
                <Link
                  href="/#auth-section"
                  className="text-xs bg-carrot text-white px-3.5 py-1.5 rounded-lg font-bold hover:bg-carrot-hover transition shadow-sm"
                >
                  로그인 / 가입
                </Link>
              )}

              {/* 드롭다운 메뉴 */}
              {/* 드롭다운 메뉴 (가상 계정 전환 목록 제거, 내 계정 정보 및 관리 기능만 유지) */}
              {switcherOpen && user && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-50 text-xs space-y-3">
                  <div className="border-b border-gray-100 pb-3">
                    <p className="text-gray-400 text-[11px]">로그인된 계정 정보</p>
                    <p className="font-bold text-gray-950 text-base mt-0.5">
                      {user.name}
                    </p>
                    <div className="mt-1 space-y-0.5 text-gray-600 text-[11px]">
                      <p>연락처(PW): {user.phoneNumber}</p>
                      <p>직업: {user.job || '일반'}</p>
                      <p>이메일: {user.email}</p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">회원 등급:</span>
                      <RoleBadge role={user.role} size="sm" />
                    </div>
                  </div>

                  {/* 관리자 센터 링크 (모임장 본인 또는 관리자) */}
                  {(user.role === 'admin' || user.name === '지정인') && (
                    <Link
                      href="/admin"
                      onClick={() => setSwitcherOpen(false)}
                      className="w-full px-3 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-carrot font-bold flex items-center gap-2 transition"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>모임장 관리자 센터 열기</span>
                    </Link>
                  )}

                  <div className="border-t border-gray-100 pt-2">
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
          </div>
        </div>
      </header>

      {/* 회원 현황 모달 */}
      <MemberStatusModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
      />
    </>
  );
}
