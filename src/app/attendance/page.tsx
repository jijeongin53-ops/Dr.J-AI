'use client';

import React, { useEffect, useState } from 'react';
import { MemberUser } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { AttendanceSheet } from '@/components/attendance/AttendanceSheet';
import { CalendarCheck2 } from 'lucide-react';

export default function AttendancePage() {
  const [currentUser, setCurrentUser] = useState<MemberUser | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);
  }, []);

  return (
    <div className="space-y-6 py-4">
      {/* 페이지 헤더 */}
      <div className="border-b border-gray-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-950 flex items-center gap-2">
            <CalendarCheck2 className="w-6 h-6 text-carrot" />
            <span>Dr. J&apos;s 강의 출석부</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            실시간 온·오프라인 AI 강의 출석 현황을 관리하고, 푸시 요청 시 직접 출석을 체크합니다.
          </p>
        </div>
      </div>

      {/* 출석부 통합 컴포넌트 */}
      <AttendanceSheet currentUser={currentUser} />
    </div>
  );
}
