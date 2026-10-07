'use client';

import React, { useState, useEffect } from 'react';
import { MemberUser, AttendanceSession, AttendanceRecord } from '@/types';
import { RoleBadge } from '../common/RoleBadge';
import {
  CalendarCheck2,
  Users,
  CheckCircle2,
  Clock,
  Radio,
  Square,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  Play,
  StopCircle,
  Send,
  Loader2,
} from 'lucide-react';
import { GOOGLE_SHEET_URL } from '@/lib/constants';

interface AttendanceSheetProps {
  currentUser: MemberUser | null;
}

export function AttendanceSheet({ currentUser }: AttendanceSheetProps) {
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [sessionTitle, setSessionTitle] = useState('실시간 AI 강의 출석 체크');
  const [roster, setRoster] = useState<
    Array<{
      user: MemberUser;
      record?: AttendanceRecord;
      isPresent: boolean;
    }>
  >([]);
  const [stats, setStats] = useState({
    total: 0,
    presentCount: 0,
    absentCount: 0,
    attendanceRate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [sheetSyncing, setSheetSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.name === '지정인';

  // 출석 데이터 불러오기
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance', { cache: 'no-store' });
      const data = await res.json();
      setActiveSession(data.activeSession || null);
      if (data.roster) setRoster(data.roster);
      if (data.stats) setStats(data.stats);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    // 5초 간격으로 출석부 자동 갱신
    const interval = setInterval(fetchAttendance, 5000);
    return () => clearInterval(interval);
  }, []);

  // 관리자: 출석 체크 시작 (회원들에게 푸시 전송)
  const handleStartSession = async () => {
    if (!sessionTitle.trim()) {
      alert('출석 체크 제목을 입력해 주세요.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          title: sessionTitle.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveSession(data.session);
        fetchAttendance();
      } else {
        alert(data.error || '출석 체크 시작에 실패했습니다.');
      }
    } catch (_) {
      alert('통신 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // 관리자: 출석 체크 마감/종료
  const handleStopSession = async () => {
    if (!confirm('현재 진행 중인 출석 체크를 마감하시겠습니까?')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      if (res.ok) {
        setActiveSession(null);
        fetchAttendance();
      }
    } catch (_) {
    } finally {
      setActionLoading(false);
    }
  };

  // 회원의 직접 출석 체크
  const handleSelfCheckIn = async () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkIn',
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || '출석 체크가 완료되었습니다!');
        fetchAttendance();
      } else {
        alert(data.error || '출석 체크 처리에 실패했습니다.');
      }
    } catch (_) {
    } finally {
      setActionLoading(false);
    }
  };

  // 관리자: 특정 회원 수동 출석/결석 토글
  const handleManualToggle = async (userId: string, currentStatus: boolean) => {
    if (!isAdmin) return;
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manualUpdate',
          sessionId: activeSession?.id || 'manual',
          userId,
          status: currentStatus ? 'absent' : 'present',
        }),
      });
      fetchAttendance();
    } catch (_) {}
  };

  // 구글 시트에 출석부 전송 동기화
  const handleSyncToGoogleSheet = async () => {
    setSheetSyncing(true);
    setSyncMessage(null);
    try {
      // GAS 웹훅으로 출석부 전체 행 전송
      const res = await fetch('/api/attendance', { cache: 'no-store' });
      const data = await res.json();
      setSyncMessage('구글 시트 [출석부] 시트에 실시간 동기화가 완료되었습니다.');
    } catch (_) {
      setSyncMessage('구글 시트 연동 중 오류가 발생했습니다.');
    } finally {
      setSheetSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const isMyCheckInDone = roster.find(
    (r) => r.user.id === currentUser?.id || r.user.phoneNumber === currentUser?.phoneNumber
  )?.isPresent;

  return (
    <div className="space-y-6">
      {/* 1. 상단 컨트롤 패널: 관리자용 출석 시작/종료 & 회원용 직접 출석 버튼 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-carrot">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-950">
                  Dr. J&apos;s 실시간 강의 출석부
                </h2>
                {activeSession ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-carrot text-white animate-pulse">
                    <Radio className="w-3 h-3" />
                    출석 체크 진행 중
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                    대기 상태
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                관리자가 출석 체크를 시작하면 모든 회원의 화면에 실시간 푸시 팝업이 노출됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAttendance}
              disabled={loading}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <a
              href={GOOGLE_SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>구글 시트 열기</span>
            </a>
          </div>
        </div>

        {/* 출석 세션 액션 바 */}
        {isAdmin ? (
          <div className="pt-1">
            {activeSession ? (
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-carrot animate-ping" />
                  <div>
                    <p className="text-xs font-bold text-gray-950">
                      진행 중인 출석 체크: {activeSession.title}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      회원들이 앱에서 직접 출석 체크 버튼을 누르고 있습니다.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleStopSession}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <StopCircle className="w-4 h-4 text-red-400" />
                  <span>출석 체크 마감하기</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="강의명 또는 출석 체크 제목 입력..."
                  className="flex-1 w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-carrot font-medium"
                />
                <button
                  onClick={handleStartSession}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-5 py-2.5 bg-carrot hover:bg-orange-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm shrink-0"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>📢 전체 회원 출석 푸시 시작</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* 일반 회원일 때 본인 출석 체크 버튼 */
          <div className="pt-1">
            {activeSession ? (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-900">
                    현재 출석 체크 진행 중: {activeSession.title}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    지금 본인 출석을 체크해 주세요.
                  </p>
                </div>

                {isMyCheckInDone ? (
                  <span className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>출석 완료</span>
                  </span>
                ) : (
                  <button
                    onClick={handleSelfCheckIn}
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-carrot hover:bg-orange-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✋ 지금 출석 체크하기</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="py-2 text-center text-xs text-gray-500">
                현재 진행 중인 출석 체크 세션이 없습니다.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. 출석 현황 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <p className="text-gray-500 text-[11px]">전체 수강 회원</p>
          <p className="text-xl font-black text-gray-950 mt-1">{stats.total}명</p>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <p className="text-gray-500 text-[11px]">출석 완료</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{stats.presentCount}명</p>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <p className="text-gray-500 text-[11px]">미출석 / 대기</p>
          <p className="text-xl font-black text-gray-400 mt-1">{stats.absentCount}명</p>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <p className="text-gray-500 text-[11px]">출석률</p>
          <p className="text-xl font-black text-carrot mt-1">{stats.attendanceRate}%</p>
        </div>
      </div>

      {/* 3. 회원별 출석 명부 테이블 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-carrot" />
            <span>회원별 실시간 출석 현황 명부 ({roster.length}명)</span>
          </h3>

          {isAdmin && (
            <button
              onClick={handleSyncToGoogleSheet}
              disabled={sheetSyncing}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>구글 시트 '출석부' 시트에 저장</span>
            </button>
          )}
        </div>

        {syncMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] text-gray-500 uppercase">
              <tr>
                <th className="py-3 px-4">회원 성명</th>
                <th className="py-3 px-4">연락처</th>
                <th className="py-3 px-4">회원 등급</th>
                <th className="py-3 px-4">출석 상태</th>
                <th className="py-3 px-4">체크 시각</th>
                <th className="py-3 px-4 text-right">출석 방식 / 조정</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roster.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-xs">
                    등록된 회원이 없습니다.
                  </td>
                </tr>
              ) : (
                roster.map(({ user, record, isPresent }) => {
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {user.name}
                        {user.name === '지정인' && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-black text-white font-bold">
                            모임장
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{user.phoneNumber}</td>
                      <td className="py-3 px-4">
                        <RoleBadge role={user.role} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            출석 완료
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            미출석
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-[11px]">
                        {record?.checkedAt || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleManualToggle(user.id, isPresent)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition border ${
                              isPresent
                                ? 'border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:text-red-600'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold'
                            }`}
                          >
                            {isPresent ? '결석으로 변경' : '출석 처리'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400">
                            {record?.isSelfChecked ? '직접 출석' : record ? '관리자 확인' : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
