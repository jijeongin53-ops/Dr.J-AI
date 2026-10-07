'use client';

import React, { useEffect, useState } from 'react';
import { MemberUser, Lecture } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { initialUsers, initialLectures } from '@/lib/mockData';
import { MemberManager } from '@/components/admin/MemberManager';
import { LectureUploader } from '@/components/admin/LectureUploader';
import { RoleBadge } from '@/components/common/RoleBadge';
import {
  ShieldAlert,
  Database,
  FolderOpen,
  ExternalLink,
  Users,
  Video,
  Key,
  CheckCircle,
} from 'lucide-react';
import { GOOGLE_DRIVE_FOLDER_URL, GOOGLE_SHEET_URL } from '@/lib/constants';

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
        <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-900 flex items-center justify-center mx-auto text-red-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-white font-bold text-lg">관리자 권한이 필요합니다</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          이 페이지는 모임장(Admin) 전용 관리 대시보드입니다. <br />
          상단 우측 내비게이션의 계정 스위처에서 <strong>[모임장 (관리자)]</strong> 계정을 선택하시면 즉시 테스트할 수 있습니다.
        </p>
      </div>
    );
  }

  const pendingCount = users.filter((u) => u.status === 'pending').length;

  return (
    <div className="space-y-8 py-4">
      {/* 관리자 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-carrot text-white">
              ADMIN CONTROL
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              당근 모임 통합 관리자 센터
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            회원 승인, 등급 부여, 구글 드라이브 강의 영상 등록 및 스프레드시트 DB를 총괄 관리합니다.
          </p>
        </div>

        {/* 바로가기 링크 버튼 */}
        <div className="flex items-center gap-2">
          <a
            href={GOOGLE_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>구글 시트 바로가기</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>
          <a
            href={GOOGLE_DRIVE_FOLDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition"
          >
            <FolderOpen className="w-3.5 h-3.5 text-carrot" />
            <span>구글 드라이브 바로가기</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>
        </div>
      </div>

      {/* 요약 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>승인 대기 회원</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white flex items-baseline gap-2">
            <span>{pendingCount}</span>
            <span className="text-xs font-normal text-zinc-500">명 대기 중</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>등록된 강의 콘텐츠</span>
            <Video className="w-4 h-4 text-carrot" />
          </div>
          <div className="text-2xl font-black text-white flex items-baseline gap-2">
            <span>{lectures.length}</span>
            <span className="text-xs font-normal text-zinc-500">개 강의</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>구글 시트 & 드라이브</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1 mt-1">
            <span>실시간 연동 준비 완료</span>
          </div>
        </div>
      </div>

      {/* 강의 업로드 컴포넌트 */}
      <LectureUploader
        onSuccess={(newLec) => setLectures((prev) => [newLec, ...prev])}
      />

      {/* 회원 승인 및 등급 관리 테이블 */}
      <MemberManager initialUsers={users} />

      {/* 구글 서비스 계정 설정 안내 박스 */}
      <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950 text-xs space-y-3">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Key className="w-4 h-4 text-carrot" />
          <span>구글 스프레드시트 & 드라이브 API 영구 연동 가이드 (Vercel 배포 시)</span>
        </div>
        <p className="text-zinc-400 leading-relaxed">
          Google Cloud Console에서 서비스 계정을 생성하고 발급받은 이메일 주소를 구글 시트와 드라이브 폴더의 <strong>[공유] - [편집자]</strong>로 초대하세요.
          그런 다음 Vercel 프로젝트 환경 변수에 아래 두 값을 등록하시면 영구적으로 실시간 동기화됩니다.
        </p>
        <div className="bg-black p-3 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-1">
          <p>GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com</p>
          <p>GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"</p>
        </div>
      </div>
    </div>
  );
}
