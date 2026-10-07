'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MemberUser } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { JoinOrLoginForm } from '@/components/auth/JoinOrLoginForm';
import { RoleGuideSection } from '@/components/common/RoleGuideSection';
import { PrivacyPolicy } from '@/components/common/PrivacyPolicy';
import { ArrowRight, MessageSquare, BookOpen } from 'lucide-react';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<MemberUser | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);
  }, []);

  return (
    <div className="space-y-10 py-2">
      {/* 1. 최상단 회원가입 & 로그인 란 (로그인 시 폼은 숨겨지고 환영 대시보드 카드로 전환) */}
      <section id="auth-section">
        <JoinOrLoginForm
          currentUser={currentUser}
          onAuthSuccess={(user) => setCurrentUser(user)}
        />
      </section>

      {/* 2. Dr. J's 모임 소개 히어로 배너 (화이트 & 블랙 미니멀 디자인) */}
      <section className="relative rounded-3xl border border-gray-200 bg-gradient-to-b from-gray-50/80 to-white p-8 sm:p-12 overflow-hidden text-center sm:text-left shadow-sm">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white text-xs text-gray-700 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-carrot" />
            <span>Dr. J&apos;s AI 실무 교육 &amp; 모임 플랫폼</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-950 leading-tight">
            배우고, 실습하고, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-700 to-carrot">
              자료를 공유하는 모임
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            모임원이 진행한 지난 강의 영상 실시간 스트리밍, 회원 등급별 실무 자료 다운로드,
            검증된 회원들과 나누는 승인제 실시간 채팅을 한곳에서 이용하세요.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 justify-center sm:justify-start">
            <Link
              href="/lectures"
              className="px-5 py-2.5 bg-gray-900 text-white hover:bg-black font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              <span>강의 및 자료실 입장</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/chat"
              className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-xs rounded-xl border border-gray-300 flex items-center gap-2 transition shadow-sm"
            >
              <MessageSquare className="w-4 h-4 text-carrot" />
              <span>회원 전용 채팅방</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. 회원 등급 (클릭 시 상세 내용 보기로 전환되는 아코디언 컴포넌트) */}
      <section id="role-section">
        <RoleGuideSection />
      </section>

      {/* 4. 개인정보 수집 및 활용 약관 (버튼식 클릭 시 상세 보기 전환) */}
      <section id="privacy-section">
        <PrivacyPolicy />
      </section>
    </div>
  );
}
