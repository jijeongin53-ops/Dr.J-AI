'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MemberUser } from '@/types';
import { getCurrentUser, setCurrentUser, clearCurrentUser } from '@/lib/auth';
import { initialUsers } from '@/lib/mockData';
import { RoleBadge } from '../common/RoleBadge';
import {
  FolderLock,
  MessageSquare,
  ShieldAlert,
  ExternalLink,
  UserCheck,
  ChevronDown,
  LogOut,
  FolderOpen,
  FileSpreadsheet,
} from 'lucide-react';
import { GOOGLE_DRIVE_FOLDER_URL, GOOGLE_SHEET_URL } from '@/lib/constants';

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<MemberUser | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    // 초기 로딩 시 기본 로그인 상태 설정 (없으면 관리자 계정으로 자동 세팅하여 바로 모든 기능 확인 가능)
    const current = getCurrentUser();
    if (current) {
      setUser(current);
    } else {
      const defaultAdmin = initialUsers[0]; // 관리자
      setCurrentUser(defaultAdmin);
      setUser(defaultAdmin);
    }
  }, []);

  const handleSwitchUser = (selectedUser: MemberUser) => {
    setCurrentUser(selectedUser);
    setUser(selectedUser);
    setSwitcherOpen(false);
    // 페이지 갱신
    window.location.reload();
  };

  const handleLogout = () => {
    clearCurrentUser();
    setUser(null);
    setSwitcherOpen(false);
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* 로고 영역 */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-2.5 h-2.5 rounded-full bg-carrot animate-pulse" />
            <span className="font-bold text-lg tracking-tight text-white group-hover:text-carrot transition-colors">
              당근 AI 모임
            </span>
            <span className="text-xs text-zinc-500 font-mono hidden sm:inline">Hub</span>
          </Link>

          {/* 메인 내비게이션 메뉴 */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/lectures"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith('/lectures')
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              강의 및 자료실
            </Link>

            <Link
              href="/chat"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === '/chat'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              승인 채팅방
            </Link>

            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === '/admin'
                    ? 'bg-carrot text-white'
                    : 'text-carrot hover:bg-zinc-900'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                관리자 센터
              </Link>
            )}
          </nav>
        </div>

        {/* 우측 영역: 구글 드라이브/시트 바로가기 + 등급 전환 스위처 */}
        <div className="flex items-center gap-3">
          {/* 구글 드라이브 바로가기 */}
          <a
            href={GOOGLE_DRIVE_FOLDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="구글 드라이브 폴더 열기"
            className="hidden lg:flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded border border-zinc-800 hover:border-zinc-700 transition"
          >
            <FolderOpen className="w-3.5 h-3.5 text-carrot" />
            <span>드라이브</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>

          {/* 구글 시트 바로가기 */}
          <a
            href={GOOGLE_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="구글 스프레드시트 열기"
            className="hidden lg:flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded border border-zinc-800 hover:border-zinc-700 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>시트 DB</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>

          {/* 등급별 계정 전환 드롭다운 (테스트 및 권한 확인 편의성) */}
          <div className="relative">
            {user ? (
              <button
                onClick={() => setSwitcherOpen(!switcherOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 hover:border-zinc-600 text-xs text-white transition"
              >
                <span className="font-semibold text-zinc-300">{user.carrotNickname}</span>
                <RoleBadge role={user.role} size="sm" />
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            ) : (
              <Link
                href="/login"
                className="text-xs bg-carrot text-white px-3 py-1.5 rounded-md font-medium hover:bg-carrot-hover transition"
              >
                로그인 / 가입
              </Link>
            )}

            {/* 드롭다운 메뉴 */}
            {switcherOpen && user && (
              <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-zinc-800 mb-2">
                  <p className="text-zinc-400">현재 계정:</p>
                  <p className="font-bold text-white text-sm">
                    {user.name} ({user.carrotNickname})
                  </p>
                  <p className="text-zinc-500">{user.email}</p>
                </div>

                <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  등급별 화면 테스트 전환
                </div>

                {initialUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSwitchUser(u)}
                    className={`w-full text-left px-3 py-2 rounded flex items-center justify-between hover:bg-zinc-800 transition ${
                      user.id === u.id ? 'bg-zinc-800/80 font-bold text-carrot' : 'text-zinc-300'
                    }`}
                  >
                    <span>
                      {u.name} <span className="text-zinc-500 text-[11px]">({u.carrotNickname})</span>
                    </span>
                    <RoleBadge role={u.role} size="sm" />
                  </button>
                ))}

                <div className="border-t border-zinc-800 mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-1.5 rounded text-red-400 hover:bg-zinc-800 flex items-center gap-1.5 transition"
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
  );
}
