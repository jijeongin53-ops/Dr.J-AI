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
  BookOpen,
  ArrowRight,
  KeyRound,
  X,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { GOOGLE_SHEET_URL } from '@/lib/constants';

interface AttendanceSheetProps {
  currentUser: MemberUser | null;
}

// [요구사항 1]: 회원이 입장한 강의실 출석 현황 인터페이스
interface MyRoomAttendance {
  lectureId: string;
  title: string;
  category: string;
  thumbnailUrl?: string;
  startTime?: string;
  isEntered: boolean;
  isWaiting: boolean;
  queuePosition?: number;
  activeCount: number;
  maxAttendees: number;
  hasCheckedIn: boolean;
  checkedAt?: string;
  attendanceActive: boolean;
  attendanceTitle?: string;
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

  // [요구사항 1]: 내가 입장한 강의실 출석 현황 및 그리드 탭 관리
  const [myRooms, setMyRooms] = useState<MyRoomAttendance[]>([]);
  const [gridTab, setGridTab] = useState<'entered' | 'all'>('entered');
  const [checkingInRoomId, setCheckingInRoomId] = useState<string | null>(null);
  const [checkInCode, setCheckInCode] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [adminTab, setAdminTab] = useState<'roster' | 'rooms'>('roster');

  const isAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.name === '지정인' ||
    currentUser?.phoneNumber?.includes('82030046');

  // 출석 데이터 불러오기 (사용자 ID 및 전화번호 전달하여 내가 입장한 강의실 출석 현황 함께 수신)
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentUser?.id) params.set('userId', currentUser.id);
      if (currentUser?.phoneNumber) params.set('userPhone', currentUser.phoneNumber);
      if (currentUser?.name) params.set('userName', currentUser.name);
      const res = await fetch(`/api/attendance?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      setActiveSession(data.activeSession || null);
      if (data.roster) setRoster(data.roster);
      if (data.stats) setStats(data.stats);
      if (data.myRooms) setMyRooms(data.myRooms);
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
  }, [currentUser?.id, currentUser?.phoneNumber, currentUser?.name]);

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

  // [요구사항 1]: 4자리 출석 번호 입력 모달 제출
  const handleRoomCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkingInRoomId || !checkInCode.trim()) return;
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }
    setCheckingIn(true);
    try {
      const res = await fetch(`/api/lectures/${checkingInRoomId}/room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkInAttendance',
          user: currentUser,
          code: checkInCode.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || '출석 체크가 완료되었습니다!');
        setCheckingInRoomId(null);
        setCheckInCode('');
        fetchAttendance();
      } else {
        alert(data.error || '출석 번호가 일치하지 않습니다.');
      }
    } catch (_) {
      alert('출석 체크 처리 중 통신 오류가 발생했습니다.');
    } finally {
      setCheckingIn(false);
    }
  };

  const isMyCheckInDone = roster.find(
    (r) => r.user.id === currentUser?.id || r.user.phoneNumber === currentUser?.phoneNumber
  )?.isPresent;

  // [요구사항 1]: 내가 입장한 강의실 및 표시할 강의실 필터링
  const enteredRooms = myRooms.filter((r) => r.isEntered || r.isWaiting);
  const displayedRooms = gridTab === 'entered' ? enteredRooms : myRooms;
  const activeAttendanceRooms = myRooms.filter((r) => r.attendanceActive);

  return (
    <div className="space-y-6">
      {/* 1. 상단 컨트롤 패널: 관리자용 출석 시작/종료 & 회원용 직접 출석 버튼 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-carrot shrink-0">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-gray-950">
                  {isAdmin ? "Dr. J's 실시간 강의 출석 관리" : "내가 입장한 강의실 출석 현황"}
                </h2>
                {activeAttendanceRooms.length > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-carrot text-white animate-pulse">
                    <Radio className="w-3 h-3" />
                    실시간 출석 진행 중 ({activeAttendanceRooms.length}개)
                  </span>
                ) : activeSession ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-carrot text-white animate-pulse">
                    <Radio className="w-3 h-3" />
                    전체 출석 체크 진행 중
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                    출석 대기 상태
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {isAdmin
                  ? '관리자가 실시간 출석 세션을 관리하거나 회원 명부를 확인합니다.'
                  : '입장한 강의실의 실시간 출석 확인 및 4자리 출석 번호를 입력할 수 있습니다.'}
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

            {isAdmin && (
              <a
                href={GOOGLE_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>구글 시트 열기</span>
              </a>
            )}
          </div>
        </div>

        {/* 관리자: 출석 세션 액션 바 */}
        {isAdmin ? (
          <div className="pt-1">
            {activeSession ? (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                  className="w-full sm:w-auto px-5 py-2.5 bg-carrot hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm shrink-0"
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
          /* 일반 회원일 때 전체 공통 출석 체크 배너 (활성화 시) */
          activeSession && (
            <div className="pt-1">
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-900">
                    현재 출석 체크 진행 중: {activeSession.title}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    지금 본인 출석을 체크해 주세요.
                  </p>
                </div>

                {isMyCheckInDone ? (
                  <span className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>출석 완료</span>
                  </span>
                ) : (
                  <button
                    onClick={handleSelfCheckIn}
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-carrot hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-md shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✋ 지금 출석 체크하기</span>
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* 관리자 전용: 명부 관리 vs 강의실별 출석 탭 전환 */}
      {isAdmin && (
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setAdminTab('roster')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              adminTab === 'roster'
                ? 'bg-carrot text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>📋 전체 회원 명부 관리 ({roster.length}명)</span>
          </button>
          <button
            onClick={() => setAdminTab('rooms')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              adminTab === 'rooms'
                ? 'bg-carrot text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>🏫 강의실별 출석 현황 그리드 ({myRooms.length}개)</span>
          </button>
        </div>
      )}

      {/* [요구사항 1]: 일반 회원이거나 관리자 그리드 탭일 때: 그리드 형태의 내가 입장한 강의실 출석 현황 노출 */}
      {(!isAdmin || adminTab === 'rooms') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGridTab('entered')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  gridTab === 'entered'
                    ? 'bg-carrot text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                내가 입장한 강의실 ({enteredRooms.length})
              </button>
              <button
                onClick={() => setGridTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  gridTab === 'all'
                    ? 'bg-carrot text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                전체 강의실 목록 ({myRooms.length})
              </button>
            </div>
            <p className="text-[11px] text-gray-500">
              * 강의실에 입장해 있어야 관리자가 진행하는 4자리 출석 체크에 참여할 수 있습니다.
            </p>
          </div>

          {displayedRooms.length === 0 ? (
            <div className="p-10 rounded-2xl border border-dashed border-gray-300 bg-white text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-carrot mx-auto flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-800">
                {gridTab === 'entered' ? '현재 입장한 강의실이 없습니다.' : '등록된 강의가 없습니다.'}
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {gridTab === 'entered'
                  ? '수강할 강의실에 먼저 입장하시면 실시간 4자리 출석 체크를 진행할 수 있습니다.'
                  : '새로운 강의가 개설되면 여기에 표시됩니다.'}
              </p>
              {gridTab === 'entered' && myRooms.length > 0 && (
                <button
                  onClick={() => setGridTab('all')}
                  className="px-4 py-2 bg-carrot hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
                >
                  <span>전체 강의실 {myRooms.length}개 보러가기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedRooms.map((room) => {
                return (
                  <div
                    key={room.lectureId}
                    className={`rounded-2xl border p-5 bg-white shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                      room.isEntered
                        ? 'border-blue-300 ring-1 ring-blue-100'
                        : 'border-gray-200'
                    }`}
                  >
                    <div>
                      {/* 카드 상단 배지: 카테고리 & 입장 상태 */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-carrot border border-blue-100">
                          {room.category}
                        </span>
                        {room.isEntered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            입장 완료
                          </span>
                        ) : room.isWaiting ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            대기 {room.queuePosition}번
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
                            미입장
                          </span>
                        )}
                      </div>

                      {/* 강의 제목 & 시간 */}
                      <h4 className="text-sm font-bold text-gray-900 mt-3 line-clamp-2">
                        {room.title}
                      </h4>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-carrot" />
                          <span>{room.startTime || '시작 시간 미지정'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {room.activeCount} / {room.maxAttendees === 0 ? '무제한' : `${room.maxAttendees}명`}
                          </span>
                        </span>
                      </div>

                      {/* 출석 체크 상태 섹션 */}
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        {room.hasCheckedIn ? (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-emerald-900">출석 완료</p>
                                <p className="text-[10px] text-emerald-700">{room.checkedAt || '확인됨'}</p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                              출석 인정
                            </span>
                          </div>
                        ) : room.attendanceActive ? (
                          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                            <div className="flex items-center gap-2">
                              <Radio className="w-4 h-4 text-carrot animate-pulse shrink-0" />
                              <p className="text-xs font-bold text-gray-950">
                                4자리 출석 체크 진행 중!
                              </p>
                            </div>
                            {room.isEntered ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setCheckingInRoomId(room.lectureId);
                                  setCheckInCode('');
                                }}
                                className="w-full py-2 bg-carrot hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>4자리 번호 입력하고 출석하기</span>
                              </button>
                            ) : (
                              <p className="text-[11px] text-gray-500">
                                강의실에 먼저 입장해야 출석 번호를 입력할 수 있습니다.
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-center text-xs text-gray-400">
                            출석 체크 대기 상태
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 카드 하단 액션: 강의실 바로가기 버튼 */}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <Link
                        href={`/lectures/${room.lectureId}`}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                          room.isEntered
                            ? 'bg-gray-900 hover:bg-black text-white shadow-sm'
                            : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{room.isEntered ? '참여 중인 강의실 바로가기' : '강의실 입장하기'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 관리자 전용: 2. 출석 현황 통계 카드 & 3. 회원별 출석 명부 테이블 */}
      {isAdmin && adminTab === 'roster' && (
        <>
          {/* 출석 현황 통계 카드 */}
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

          {/* 회원별 출석 명부 테이블 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-carrot" />
                <span>회원별 실시간 출석 현황 명부 ({roster.length}명)</span>
              </h3>

              <button
                onClick={handleSyncToGoogleSheet}
                disabled={sheetSyncing}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>구글 시트 '출석부' 시트에 저장</span>
              </button>
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
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* [요구사항 1]: 4자리 출석 번호 입력 팝업 모달 */}
      {checkingInRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => setCheckingInRoomId(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-carrot mx-auto flex items-center justify-center">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-950">
                  실시간 강의 출석 체크
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  강사 또는 관리자가 안내한 4자리 숫자를 입력해 주세요.
                </p>
              </div>

              <form onSubmit={handleRoomCheckIn} className="space-y-4 pt-2">
                <input
                  type="text"
                  maxLength={4}
                  autoFocus
                  value={checkInCode}
                  onChange={(e) => setCheckInCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="0 0 0 0"
                  className="w-full text-center text-3xl font-black tracking-widest py-3 border-2 border-carrot/40 focus:border-carrot focus:outline-none rounded-2xl bg-blue-50/30 text-gray-900"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckingInRoomId(null)}
                    className="py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={checkingIn || checkInCode.length !== 4}
                    className="py-2.5 rounded-xl bg-carrot hover:bg-blue-600 text-white text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {checkingIn ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>출석 확인</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
