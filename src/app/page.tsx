'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MemberUser, Lecture } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { initialLectures } from '@/lib/mockData';
import { LectureCard } from '@/components/lecture/LectureCard';
import { RoleBadge } from '@/components/common/RoleBadge';
import { JoinOrLoginForm } from '@/components/auth/JoinOrLoginForm';
import { PrivacyPolicy } from '@/components/common/PrivacyPolicy';
import {
  FolderOpen,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Video,
  Download,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { GOOGLE_DRIVE_FOLDER_URL, GOOGLE_SHEET_URL } from '@/lib/constants';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<MemberUser | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>(initialLectures);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);

    fetch('/api/lectures')
      .then((res) => res.json())
      .then((data) => {
        if (data.lectures) setLectures(data.lectures);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-14 py-4">
      {/* 1. 최상단 회원가입 & 로그인 란 (사용자 요청: 회원 가입란이 가장 먼저 나와야 함) */}
      <section id="auth-section">
        <JoinOrLoginForm
          currentUser={currentUser}
          onAuthSuccess={(user) => setCurrentUser(user)}
        />
      </section>

      {/* 2. 히어로 배너 섹션 */}
      <section className="relative rounded-3xl border border-zinc-800 bg-zinc-950 p-8 sm:p-12 overflow-hidden text-center sm:text-left">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-carrot/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-carrot animate-pulse" />
            <span>당근 이웃들과 함께하는 AI 실무 교육 플랫폼</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            배우고, 실습하고, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-carrot">
              자료를 공유하는 모임
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            모임원이 진행한 지난 강의 영상 실시간 스트리밍, 회원 등급별 실무 자료 다운로드,
            검증된 회원들과 나누는 승인제 실시간 채팅을 한곳에서 이용하세요.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 justify-center sm:justify-start">
            <Link
              href="/lectures"
              className="px-5 py-2.5 bg-white text-black hover:bg-zinc-200 font-bold text-xs rounded-xl flex items-center gap-2 transition shadow"
            >
              <span>강의 및 자료실 입장</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/chat"
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs rounded-xl border border-zinc-800 flex items-center gap-2 transition"
            >
              <MessageSquare className="w-3.5 h-3.5 text-carrot" />
              <span>회원 전용 채팅방</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. 구글 클라우드 연동 상태 배너 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a
          href={GOOGLE_DRIVE_FOLDER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition flex items-start gap-4 group"
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
            <FolderOpen className="w-5 h-5 text-carrot" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <span>구글 드라이브 스토리지 연동</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono">
                1dFvRKio...
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              강의 영상 및 고용량 실습 자료가 저장되는 드라이브 폴더입니다. 관리자만 업로드하며, 등급에 맞춰 다운로드됩니다.
            </p>
          </div>
        </a>

        <a
          href={GOOGLE_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition flex items-start gap-4 group"
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <span>구글 스프레드시트 데이터베이스</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono">
                1aEh870Z...
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              회원 목록, 승인 상태, 강의 정보, 댓글 및 채팅 로그가 스프레드시트에 영구 보관 및 데이터베이스화됩니다.
            </p>
          </div>
        </a>
      </section>

      {/* 4. 회원 등급 체계 & 권한 안내 */}
      <section className="space-y-6">
        <div className="border-b border-zinc-900 pb-3">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-carrot" />
            회원 등급 및 권한 체계
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            당근 모임 참여도와 활동에 따라 모임장이 등급을 승인/부여합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-zinc-850 bg-zinc-950 space-y-3">
            <div className="flex items-center justify-between">
              <RoleBadge role="guest" size="md" />
              <span className="text-xs text-zinc-500">가입 직후</span>
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-zinc-600" />
                맛보기 기초 오리엔테이션 시청
              </li>
              <li className="flex items-center gap-2 text-zinc-600">
                <span className="w-3.5 text-center">✕</span>
                심화 강의 및 실습 자료 다운로드 제한
              </li>
              <li className="flex items-center gap-2 text-zinc-600">
                <span className="w-3.5 text-center">✕</span>
                채팅 읽기 전용 (전송은 승인 대기)
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-700 bg-zinc-950 space-y-3 relative">
            <div className="flex items-center justify-between">
              <RoleBadge role="regular" size="md" />
              <span className="text-xs text-zinc-400 font-medium">승인 정회원</span>
            </div>
            <ul className="space-y-2 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                모든 기본 실무 강의 실시간 스트리밍
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                기본 강의자료 및 요약 PDF 다운로드
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                실시간 승인 채팅 참여 및 댓글 작성
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl border border-carrot/40 bg-zinc-950 space-y-3">
            <div className="flex items-center justify-between">
              <RoleBadge role="vip" size="md" />
              <span className="text-xs text-carrot font-bold">우수/VIP</span>
            </div>
            <ul className="space-y-2 text-xs text-zinc-200">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-carrot" />
                비공개 심화/바이브 코딩 강의 전편 시청
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-carrot" />
                모든 소스코드/엑셀 템플릿 무제한 다운로드
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-carrot" />
                오프라인 밋업 우선 참여 & 질의응답
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. 최신 등록 강의 목록 */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Video className="w-4 h-4 text-carrot" />
              최근 업로드 강의 & 자료
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              구글 드라이브와 실시간 연결되어 있는 최신 교육 콘텐츠입니다.
            </p>
          </div>

          <Link
            href="/lectures"
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
          >
            <span>전체보기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {lectures.slice(0, 3).map((lecture) => (
            <LectureCard
              key={lecture.id}
              lecture={lecture}
              userRole={currentUser?.role}
            />
          ))}
        </div>
      </section>

      {/* 6. 메인 하단: 개인정보 수집 및 활용, 관리에 대한 약관 (사용자 요청 사항) */}
      <section id="privacy-section">
        <PrivacyPolicy />
      </section>
    </div>
  );
}
