'use client';

import React, { useEffect, useState } from 'react';
import { MemberUser, Lecture } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { initialUsers, initialLectures } from '@/lib/mockData';
import { MemberManager } from '@/components/admin/MemberManager';
import { LectureUploader } from '@/components/admin/LectureUploader';
import { AttendanceSheet } from '@/components/attendance/AttendanceSheet';
import {
  ShieldAlert,
  Users,
  Video,
  CheckCircle,
  FileSpreadsheet,
  UploadCloud,
  Check,
  Loader2,
} from 'lucide-react';
import { GOOGLE_SHEET_URL } from '@/lib/constants';

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<MemberUser | null>(null);
  const [users, setUsers] = useState<MemberUser[]>(initialUsers);
  const [lectures, setLectures] = useState<Lecture[]>(initialLectures);
  const [loading, setLoading] = useState(true);
  const [syncingVideo, setSyncingVideo] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);

    Promise.all([
      fetch('/api/auth', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/lectures', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([userData, lectureData]) => {
        if (userData.users && Array.isArray(userData.users)) setUsers(userData.users);
        if (lectureData.lectures && Array.isArray(lectureData.lectures)) setLectures(lectureData.lectures);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 구글 스프레드시트에 '동영상 업로드 현황' 시트 생성 및 동기화 요청
  const handleSyncVideoSheet = async () => {
    setSyncingVideo(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/sync-lectures', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult('동영상 업로드 현황 시트 동기화 완료! 구글 시트에서 탭을 확인하세요.');
      } else {
        setSyncResult(data.error || '동기화 처리에 실패했습니다.');
      }
    } catch (e: any) {
      setSyncResult('네트워크 오류가 발생했습니다.');
    } finally {
      setSyncingVideo(false);
      setTimeout(() => setSyncResult(null), 5000);
    }
  };

  // 비관리자 접근 제한 (모임장 본인 지정인 님 또는 admin 권한 허용)
  const isAuthorized =
    currentUser?.role === 'admin' ||
    currentUser?.name === '지정인' ||
    currentUser?.phoneNumber?.includes('82030046');

  if (!loading && !isAuthorized) {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-500">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-gray-900 font-bold text-lg">관리자 권한이 필요합니다</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          이 페이지는 모임장(Admin) 전용 관리 대시보드입니다. <br />
          상단 우측의 계정 스위처에서 <strong>[모임장]</strong> 계정을 선택하시거나 모임장 계정으로 로그인해 주세요.
        </p>
      </div>
    );
  }

  const pendingCount = users.filter((u) => u.status === 'pending').length;

  return (
    <div className="space-y-8 py-4">
      {/* 관리자 헤더 (Dr. J's 로 변경) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-carrot text-white">
              ADMIN CONTROL
            </span>
            <h1 className="text-2xl font-bold text-gray-950 tracking-tight">
              Dr. J&apos;s 관리자 센터
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            회원 승인, 등급 부여, 강의 영상 등록 및 스프레드시트 DB 연동을 총괄 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 구글 시트 동영상 업로드 현황 탭 생성 & 동기화 버튼 */}
          <button
            onClick={handleSyncVideoSheet}
            disabled={syncingVideo}
            className="px-4 py-2 rounded-xl border border-carrot/30 bg-orange-50 hover:bg-orange-100 text-carrot text-xs font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            title="구글 스프레드시트에 '동영상 업로드 현황' 시트를 자동 생성하고 최신 강의를 기록합니다."
          >
            {syncingVideo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            <span>동영상 현황 시트 동기화</span>
          </button>

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
      </div>

      {/* 동기화 알림 메시지 */}
      {syncResult && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2 transition">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncResult}</span>
        </div>
      )}

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
            <span>구글 시트 실시간 연동 활성</span>
          </div>
        </div>
      </div>

      {/* 강의 업로드 컴포넌트 */}
      <LectureUploader
        onSuccess={(newLec) => setLectures((prev) => [newLec, ...prev])}
      />

      {/* 실시간 강의 출석부 컴포넌트 */}
      <AttendanceSheet currentUser={currentUser} />

      {/* 회원 승인 및 등급 관리 테이블 */}
      <MemberManager initialUsers={users} />
    </div>
  );
}
