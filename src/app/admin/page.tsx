'use client';

import React, { useEffect, useState } from 'react';
import { MemberUser, Lecture } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { initialUsers, initialLectures } from '@/lib/mockData';
import { MemberManager } from '@/components/admin/MemberManager';
import { LectureUploader } from '@/components/admin/LectureUploader';
import {
  ShieldAlert,
  Users,
  Video,
  Key,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { GOOGLE_SHEET_URL } from '@/lib/constants';

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<MemberUser | null>(null);
  const [users, setUsers] = useState<MemberUser[]>(initialUsers);
  const [lectures, setLectures] = useState<Lecture[]>(initialLectures);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);

    Promise.all([
      fetch('/api/auth').then((r) => r.json()),
      fetch('/api/lectures').then((r) => r.json()),
    ])
      .then(([userData, lectureData]) => {
        if (userData.users) setUsers(userData.users);
        if (lectureData.lectures) setLectures(lectureData.lectures);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 비관리자 접근 제한
  if (!loading && currentUser?.role !== 'admin') {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-500">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-gray-900 font-bold text-lg">관리자 권한이 필요합니다</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          이 페이지는 모임장(Admin) 전용 관리 대시보드입니다. <br />
          상단 우측의 계정 스위처에서 <strong>[모임장]</strong> 계정을 선택하시면 즉시 관리 기능을 테스트할 수 있습니다.
        </p>
      </div>
    );
  }

  const pendingCount = users.filter((u) => u.status === 'pending').length;

  return (
    <div className="space-y-8 py-4">
      {/* 관리자 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-carrot text-white">
              ADMIN CONTROL
            </span>
            <h1 className="text-2xl font-bold text-gray-950 tracking-tight">
              당근 모임 통합 관리자 센터
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            회원 승인, 등급 부여, 강의 영상 등록 및 스프레드시트 DB 연동을 총괄 관리합니다.
          </p>
        </div>

        <a
          href={GOOGLE_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-xs text-gray-800 hover:bg-gray-50 font-semibold flex items-center gap-2 transition shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>구글 시트 바로가기</span>
        </a>
      </div>

      {/* 요약 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-2">
            <span>승인 대기 회원</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 flex items-baseline gap-2">
            <span>{pendingCount}</span>
            <span className="text-xs font-normal text-gray-500">명 대기 중</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-2">
            <span>등록된 강의 콘텐츠</span>
            <Video className="w-4 h-4 text-carrot" />
          </div>
          <div className="text-2xl font-black text-gray-900 flex items-baseline gap-2">
            <span>{lectures.length}</span>
            <span className="text-xs font-normal text-gray-500">개 강의</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-2">
            <span>스프레드시트 DB</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-sm font-bold text-emerald-700 flex items-center gap-1 mt-1">
            <span>구글 시트 연동 지원</span>
          </div>
        </div>
      </div>

      {/* 강의 업로드 컴포넌트 */}
      <LectureUploader
        onSuccess={(newLec) => setLectures((prev) => [newLec, ...prev])}
      />

      {/* 회원 승인 및 등급 관리 테이블 */}
      <MemberManager initialUsers={users} />

      {/* 구글 시트 자동 저장 셋업 가이드 (Vercel 배포 시) */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50 text-xs space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
          <Key className="w-4 h-4 text-carrot" />
          <span>구글 스프레드시트 자동 저장 연동 안내</span>
        </div>
        <p className="text-gray-600 leading-relaxed">
          회원 가입 데이터가 구글 스프레드시트에 자동으로 들어가려면 Vercel 프로젝트 환경 변수에 아래 두 방법 중 하나가 설정되어 있어야 합니다:
        </p>
        <div className="space-y-2">
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-1">
            <span className="font-bold text-gray-800">방법 A: Google Service Account (GCP 서비스 계정)</span>
            <p className="text-[11px] text-gray-500 font-mono">GOOGLE_SERVICE_ACCOUNT_EMAIL=... / GOOGLE_PRIVATE_KEY=&quot;...&quot;</p>
            <p className="text-[11px] text-gray-600">구글 시트 우측 상단 [공유]에 서비스 계정 이메일을 <strong>편집자</strong>로 추가해야 쓰기 권한이 부여됩니다.</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-1">
            <span className="font-bold text-gray-800">방법 B: Google Apps Script Web App (가장 간편한 방법)</span>
            <p className="text-[11px] text-gray-500 font-mono">GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec</p>
            <p className="text-[11px] text-gray-600">구글 시트 메뉴 [확장 프로그램] → [Apps Script]에서 웹 앱으로 배포한 URL을 넣으시면 복잡한 인증키 없이 즉시 행이 자동 추가됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
