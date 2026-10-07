'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MemberUser } from '@/types';
import { getCurrentUser, setCurrentUser, clearCurrentUser } from '@/lib/auth';
import { initialUsers } from '@/lib/mockData';
import { RoleBadge } from '../common/RoleBadge';
import { MemberStatusModal } from '../common/MemberStatusModal';
import {
  Users,
  ShieldAlert,
  ChevronDown,
  LogOut,
  User,
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

  const handleSwitchUser = (selectedUser: MemberUser) => {
    setCurrentUser(selectedUser);
    setUser(selectedUser);
    setSwitcherOpen(false);
    window.location.reload();
  };

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
              {switcherOpen && user && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-gray-100 mb-2">
                    <p className="text-gray-400 text-[11px]">로그인된 계정:</p>
                    <p className="font-bold text-gray-900 text-sm">
                      {user.name} <span className="text-gray-500 font-normal">({user.phoneNumber})</span>
                    </p>
                    <p className="text-gray-500 text-[11px]">{user.job || '회원'} | {user.email}</p>
                  </div>

                  <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    테스트 계정 전환
                  </div>

                  {initialUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleSwitchUser(u)}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between hover:bg-gray-50 transition ${
                        user.id === u.id ? 'bg-orange-50/70 font-bold text-carrot' : 'text-gray-700'
                      }`}
                    >
                      <span>
                        {u.name} <span className="text-gray-400 text-[11px]">({u.role})</span>
                      </span>
                      <RoleBadge role={u.role} size="sm" />
                    </button>
                  ))}

                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition font-medium"
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
