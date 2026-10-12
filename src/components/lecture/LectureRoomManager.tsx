'use client';

import React, { useState, useEffect } from 'react';
import { MemberUser, AttendanceSession } from '@/types';
import { RoleBadge } from '../common/RoleBadge';
import {
  Users,
  LogOut,
  LogIn,
  Clock,
  CheckCircle2,
  AlertCircle,
  Radio,
  ChevronDown,
  ChevronUp,
  Settings,
  ShieldCheck,
  UserPlus,
  KeyRound,
  Copy,
  Check,
  X,
  Sparkles,
  Calendar,
  Lock,
} from 'lucide-react';

interface LectureRoomManagerProps {
  lectureId: string;
  lectureTitle?: string;
  maxAttendees?: number;
  currentUser: MemberUser | null;
  initialStartTime?: string;
  onRoomStatusChange?: (isEntered: boolean) => void;
}

export function LectureRoomManager({
  lectureId,
  lectureTitle,
  maxAttendees = 30,
  currentUser,
  initialStartTime = '',
  onRoomStatusChange,
}: LectureRoomManagerProps) {
  const [activeCount, setActiveCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [currentMax, setCurrentMax] = useState(maxAttendees);
  const [activeMembers, setActiveMembers] = useState<MemberUser[]>([]);
  const [waitingMembers, setWaitingMembers] = useState<MemberUser[]>([]);

  const [myStatus, setMyStatus] = useState<'entered' | 'waiting' | 'none'>('none');
  const [queuePosition, setQueuePosition] = useState(0);

  const [showMembersList, setShowMembersList] = useState(false);
  const [isUpdatingMax, setIsUpdatingMax] = useState(false);
  const [newMaxInput, setNewMaxInput] = useState(String(maxAttendees));

  // 강의 시작 시간 상태 관리
  const [startTime, setStartTime] = useState<string>(initialStartTime);
  const [isUpdatingStartTime, setIsUpdatingStartTime] = useState(false);
  const [startTimeInput, setStartTimeInput] = useState(initialStartTime);

  // 실시간 출석 체크 세션 상태 (4자리 코드 방식)
  const [activeAttendanceSession, setActiveAttendanceSession] = useState<AttendanceSession | null>(null);
  const [roomAttendance, setRoomAttendance] = useState<{
    sessionId: string;
    title: string;
    isActive: boolean;
    startedAt: string;
    code?: string;
    checkedInCount: number;
    hasCheckedIn: boolean;
  } | null>(null);

  // 1. 관리자 4자리 코드 팝업 모달 상태
  const [showAdminCodeModal, setShowAdminCodeModal] = useState(false);
  const [adminGeneratedCode, setAdminGeneratedCode] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  // 2. 참석자 4자리 코드 입력 팝업 모달 상태
  const [showAttendeeModal, setShowAttendeeModal] = useState(false);
  const [attendeeCodeInput, setAttendeeCodeInput] = useState('');
  const [attendeeError, setAttendeeError] = useState<string | null>(null);
  const [attendeeSuccess, setAttendeeSuccess] = useState(false);
  const [attendeeDismissedSessionId, setAttendeeDismissedSessionId] = useState<string | null>(null);

  const [checkedIn, setCheckedIn] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.name === '지정인';

  // 1. 강의실 상태 실시간 조회 (3초 주기)
  const fetchRoomStatus = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (currentUser) {
        queryParams.set('userId', currentUser.id);
        queryParams.set('userPhone', currentUser.phoneNumber);
      }
      if (isAdmin) {
        queryParams.set('isAdmin', 'true');
      }

      const res = await fetch(`/api/lectures/${lectureId}/room?${queryParams.toString()}`, {
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        setActiveCount(data.activeCount);
        setWaitingCount(data.waitingCount);
        setCurrentMax(data.maxAttendees);
        setActiveMembers(data.activeMembers || []);
        setWaitingMembers(data.waitingMembers || []);
        setMyStatus(data.myStatus);
        setQueuePosition(data.queuePosition);

        // 강의 시작 시간 동기화
        if (data.startTime) {
          setStartTime(data.startTime);
          if (!startTimeInput) setStartTimeInput(data.startTime);
        }

        // 4자리 출석 체크 세션 동기화
        if (data.attendance && data.attendance.isActive) {
          setRoomAttendance(data.attendance);

          // 관리자: 코드 저장
          if (data.attendance.code) {
            setAdminGeneratedCode(data.attendance.code);
          }

          // 참석자: 출석 체크 여부 확인
          if (data.attendance.hasCheckedIn) {
            setCheckedIn(true);
            setShowAttendeeModal(false);
          } else if (data.myStatus === 'entered' && !isAdmin) {
            // 아직 출석 전이고, 이 세션을 닫지 않았다면 자동으로 참석자 모달 오픈
            if (attendeeDismissedSessionId !== data.attendance.sessionId && !attendeeSuccess) {
              setShowAttendeeModal(true);
            }
          }
        } else {
          setRoomAttendance(null);
          // 세션 종료 시 팝업 닫기
          if (!isAdmin) {
            setShowAttendeeModal(false);
          }
        }

        if (onRoomStatusChange) {
          onRoomStatusChange(data.myStatus === 'entered');
        }
      }
    } catch (_) {}
  };

  // 2. 출석 체크 활성화 여부 확인
  const fetchActiveAttendance = async () => {
    try {
      const res = await fetch('/api/attendance?mode=active', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setActiveAttendanceSession(data.session || null);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchRoomStatus();
    fetchActiveAttendance();

    const interval = setInterval(() => {
      fetchRoomStatus();
      fetchActiveAttendance();
    }, 3000);

    return () => clearInterval(interval);
  }, [lectureId, currentUser?.id, isAdmin, attendeeDismissedSessionId, attendeeSuccess]);

  // 페이지 진입 시 로그인 회원 자동 입장 시도
  useEffect(() => {
    if (currentUser && myStatus === 'none') {
      handleEnter();
    }
  }, [currentUser]);

  // 강의실 입장
  const handleEnter = async () => {
    if (!currentUser) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/lectures/${lectureId}/room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enter',
          user: currentUser,
          maxAttendees: currentMax,
          title: lectureTitle,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMyStatus(data.status);
        setQueuePosition(data.queuePosition || 0);
        setStatusMessage(data.message);
        fetchRoomStatus();
      }
    } catch (_) {
      setStatusMessage('입장 요청 중 네트워크 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // 강의실 퇴장 (대기자 자동 입장 승격)
  const handleLeave = async () => {
    if (!currentUser) return;
    if (!confirm('강의실에서 퇴장하시겠습니까? 퇴장 시 대기 중인 회원이 자동으로 입장합니다.')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/lectures/${lectureId}/room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          userId: currentUser.id,
        }),
      });
      if (res.ok) {
        setMyStatus('none');
        setQueuePosition(0);
        fetchRoomStatus();
      }
    } catch (_) {
    } finally {
      setActionLoading(false);
    }
  };

  // 관리자: 정원 수정
  const handleUpdateMax = async () => {
    const num = parseInt(newMaxInput, 10);
    if (isNaN(num) || num < 0) {
      alert('정원은 0 이상의 숫자를 입력하세요. (0은 무제한)');
      return;
    }
    try {
      const res = await fetch(`/api/lectures/${lectureId}/room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateMaxAttendees',
          maxAttendees: num,
        }),
      });
      if (res.ok) {
        alert(`강의실 정원이 ${num === 0 ? '무제한' : num + '명'}으로 변경되었습니다.`);
        setIsUpdatingMax(false);
        fetchRoomStatus();
      }
    } catch (_) {
      alert('정원 변경 중 오류가 발생했습니다.');
    }
  };

  // 4. 관리자: 강의 시작 시간 설정
  const handleUpdateStartTime = async () => {
    if (!startTimeInput.trim()) {
      alert('강의 시작 시간을 입력해주세요. (예: 19:30 또는 2026-10-12 19:30)');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/lectures/${lectureId}/room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateStartTime',
          startTime: startTimeInput.trim(),
        }),
      });
      if (res.ok) {
        setStartTime(startTimeInput.trim());
        setIsUpdatingStartTime(false);
        alert(`강의 시작 시간이 '${startTimeInput.trim()}'(으)로 등록되었습니다.`);
        fetchRoomStatus();
      } else {
        alert('시작 시간 저장에 실패했습니다.');
      }
    } catch (_) {
      alert('시작 시간 변경 중 통신 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // 1. 관리자: 4자리 랜덤 숫자 출석 체크 시작
  const handleStartAttendance = async () => {
    if (!isAdmin) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/lectures/${lectureId}/room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'startAttendance',
          title: '실시간 강의 출석 체크',
        }),
      });
      const data = await res.json();
      if (res.ok && data.code) {
        setAdminGeneratedCode(data.code);
        setShowAdminCodeModal(true);
        fetchRoomStatus();
      } else {
        alert(data.error || '출석 체크 시작에 실패했습니다.');
      }
    } catch (_) {
      alert('출석 체크 시작 중 네트워크 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // 관리자: 출석 체크 마감/종료
  const handleStopAttendance = async () => {
    if (!isAdmin) return;
    if (!confirm('현재 진행 중인 실시간 출석 체크를 마감하시겠습니까?')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/lectures/${lectureId}/room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stopAttendance' }),
      });
      if (res.ok) {
        setShowAdminCodeModal(false);
        fetchRoomStatus();
        alert('실시간 출석 체크가 마감되었습니다.');
      }
    } catch (_) {
      alert('출석 마감 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. 참석자: 4자리 숫자 입력하여 출석 체크 완료
  const handleAttendeeSubmitCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }
    const cleanCode = attendeeCodeInput.trim().replace(/\D/g, '');
    if (cleanCode.length !== 4) {
      setAttendeeError('4자리 숫자를 정확하게 입력해주세요.');
      return;
    }

    setActionLoading(true);
    setAttendeeError(null);
    try {
      const res = await fetch(`/api/lectures/${lectureId}/room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkInAttendance',
          code: cleanCode,
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttendeeSuccess(true);
        setCheckedIn(true);
        setTimeout(() => {
          setShowAttendeeModal(false);
          setAttendeeSuccess(false);
        }, 1800);
        fetchRoomStatus();
      } else {
        setAttendeeError(data.error || '출석 번호가 일치하지 않습니다.');
      }
    } catch (_) {
      setAttendeeError('통신 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setActionLoading(false);
    }
  };

  // 출석 체크 (해당 강의실에 입장한 회원만 가능)
  const handleCheckIn = async () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (myStatus !== 'entered') {
      alert('출석 체크는 해당 강의실에 정식 입장한 회원만 가능합니다. 먼저 강의실에 입장해 주세요.');
      return;
    }

    setShowAttendeeModal(true);
  };

  const copyCodeToClipboard = () => {
    if (adminGeneratedCode) {
      navigator.clipboard.writeText(adminGeneratedCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      {/* 1. 상단 상태 요약 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-carrot shrink-0 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">
                실시간 강의실 입장 현황
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-gray-500">
              <p>
                현재 입장: <strong className="text-gray-900">{activeCount}</strong> /{' '}
                {currentMax === 0 ? '무제한' : `${currentMax}명`}
                {waitingCount > 0 && (
                  <span className="ml-1.5 text-amber-600 font-bold">
                    (대기열: {waitingCount}명)
                  </span>
                )}
              </p>

              {/* 4. 강의 시작 시간 표시 */}
              <div className="flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
                <Clock className="w-3.5 h-3.5 text-carrot" />
                <span>시작 시간:</span>
                <strong className="text-gray-900">
                  {startTime ? startTime : '미설정'}
                </strong>
                {isAdmin && (
                  <button
                    onClick={() => setIsUpdatingStartTime(!isUpdatingStartTime)}
                    className="ml-1 text-[11px] text-carrot hover:underline font-semibold"
                    title="강의 시작 시간 변경"
                  >
                    {isUpdatingStartTime ? '닫기' : '수정'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-2 shrink-0">
          {currentUser && myStatus === 'entered' && (
            <button
              onClick={handleLeave}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-red-50 hover:border-red-200 text-gray-600 hover:text-red-600 text-xs font-semibold flex items-center gap-1.5 transition"
              title="강의실 퇴장 (대기 회원 자동 입장)"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>강의실 퇴장</span>
            </button>
          )}

          {currentUser && myStatus === 'none' && (
            <button
              onClick={handleEnter}
              disabled={actionLoading}
              className="px-3.5 py-1.5 rounded-xl bg-carrot hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>강의실 입장하기</span>
            </button>
          )}

          {/* 명단 보기 토글 버튼 */}
          <button
            onClick={() => setShowMembersList(!showMembersList)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-1 transition"
          >
            <span>대기 및 참여자 명단</span>
            {showMembersList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* 관리자 정원 변경 버튼 */}
          {isAdmin && (
            <button
              onClick={() => setIsUpdatingMax(!isUpdatingMax)}
              className="p-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500 transition"
              title="강의실 정원 변경"
            >
              <Settings className="w-4 h-4 text-gray-700" />
            </button>
          )}
        </div>
      </div>

      {/* 4. 강의 시작 시간 입력/수정 폼 (관리자 전용) */}
      {isAdmin && isUpdatingStartTime && (
        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex flex-wrap items-center gap-3 animate-fadeIn text-xs">
          <span className="font-bold text-gray-800 flex items-center gap-1">
            <Clock className="w-4 h-4 text-carrot" />
            강의 시작 시간 입력:
          </span>
          <input
            type="text"
            value={startTimeInput}
            onChange={(e) => setStartTimeInput(e.target.value)}
            className="w-44 px-3 py-1.5 border border-blue-300 rounded-lg bg-white text-gray-900 font-medium placeholder-gray-400"
            placeholder="예: 19:30 or 2026-10-12 19:30"
          />
          <button
            onClick={handleUpdateStartTime}
            disabled={actionLoading}
            className="px-3 py-1.5 bg-carrot text-white font-bold rounded-lg hover:bg-blue-600 transition"
          >
            저장
          </button>
          <span className="text-[11px] text-gray-500">
            * 입력한 강의 시작 시간이 참석자 화면에 실시간으로 표시됩니다.
          </span>
        </div>
      )}

      {/* 관리자 정원 변경 인라인 폼 */}
      {isAdmin && isUpdatingMax && (
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3 animate-fadeIn text-xs">
          <span className="font-bold text-gray-700">입장 정원 변경:</span>
          <input
            type="number"
            min="0"
            value={newMaxInput}
            onChange={(e) => setNewMaxInput(e.target.value)}
            className="w-24 px-2 py-1 border border-gray-300 rounded-lg bg-white"
            placeholder="0=무제한"
          />
          <button
            onClick={handleUpdateMax}
            className="px-3 py-1 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition"
          >
            적용
          </button>
          <span className="text-[11px] text-gray-500">
            * 정원을 늘리면 대기 중인 회원이 자동으로 즉시 입장 처리됩니다.
          </span>
        </div>
      )}

      {/* 2. 대기열 또는 입장 상태 알림 배너 */}
      {myStatus === 'waiting' && (
        <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 space-y-2 animate-fadeIn">
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
            <Clock className="w-4 h-4 text-amber-600 animate-spin" />
            <span>현재 강의실 정원 초과로 대기 중입니다! (내 대기 순번: {queuePosition}번)</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            강의실에 이미 입장한 회원이 퇴장하면, <strong>대기 순번에 따라 자동으로 즉시 입장</strong>됩니다.
            창을 닫지 않고 잠시만 대기해 주세요.
          </p>
        </div>
      )}

      {myStatus === 'entered' && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>강의실 입장 완료:</strong> 실시간 강의 시청 및 강의 자료 열람, 출석 체크가 가능합니다.
            </span>
          </div>
        </div>
      )}

      {/* 3. [요구사항 3 해결]: 출석 체크 박스 (해당 강의 입장 회원만 가능) */}
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-carrot" />
            <h4 className="text-xs font-bold text-gray-900">
              {roomAttendance?.isActive
                ? `진행 중인 출석 체크 (인증 완료: ${roomAttendance.checkedInCount}명)`
                : '실시간 강의 출석 체크'}
            </h4>
            {roomAttendance?.isActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-carrot text-white">
                4자리 인증 진행 중
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500">
            {isAdmin ? (
              <span>* <strong>관리자 권한:</strong> 아래 버튼을 눌러 4자리 랜덤 출석 번호를 발급하고 출석 체크를 시작할 수 있습니다.</span>
            ) : (
              <span>* <strong>출석 기준:</strong> 관리자가 출석을 시작하면 4자리 번호 입력 팝업이 나타납니다. (입장 회원 전용)</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 관리자: 출석 체크 제어 버튼 */}
          {isAdmin && (
            <>
              {roomAttendance?.isActive ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAdminCodeModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-carrot hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>출석 번호 확인 ({adminGeneratedCode || roomAttendance.code})</span>
                  </button>
                  <button
                    onClick={handleStopAttendance}
                    disabled={actionLoading}
                    className="px-3 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-xs transition"
                  >
                    마감하기
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartAttendance}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-carrot hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>실시간 출석 체크 시작 (4자리 랜덤)</span>
                </button>
              )}
            </>
          )}

          {/* 일반 참석자: 출석 체크 버튼 */}
          {!isAdmin && (
            <>
              {checkedIn || roomAttendance?.hasCheckedIn ? (
                <span className="px-3.5 py-2 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>출석 완료</span>
                </span>
              ) : (
                <button
                  onClick={handleCheckIn}
                  disabled={actionLoading || myStatus !== 'entered' || !roomAttendance?.isActive}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                    roomAttendance?.isActive && myStatus === 'entered'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                  }`}
                  title={
                    !roomAttendance?.isActive
                      ? '관리자가 출석 체크를 시작할 때까지 대기해주세요'
                      : myStatus === 'entered'
                      ? '4자리 출석 번호 입력하기'
                      : '강의실 입장 회원만 출석 가능'
                  }
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {!roomAttendance?.isActive
                      ? '출석 대기 중'
                      : myStatus === 'entered'
                      ? '4자리 번호 입력하기'
                      : '입장 회원만 출석 가능'}
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 4. [요구사항 4 해결]: 대기자 및 입장 회원 명단 (대기란에 회원 표시) */}
      {showMembersList && (
        <div className="pt-2 border-t border-gray-100 space-y-4 animate-fadeIn">
          {/* 대기열 회원 목록 */}
          <div>
            <h4 className="text-xs font-bold text-amber-700 flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5" />
              <span>대기 회원 목록 ({waitingMembers.length}명)</span>
            </h4>
            {waitingMembers.length === 0 ? (
              <p className="text-[11px] text-gray-400 bg-gray-50 p-2.5 rounded-xl text-center">
                현재 대기 중인 회원이 없습니다.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {waitingMembers.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-gray-900">{m.name}</span>
                    </div>
                    <RoleBadge role={m.role} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 현재 입장 회원 목록 */}
          <div>
            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-carrot" />
              <span>현재 강의실 입장 완료 회원 ({activeMembers.length}명)</span>
            </h4>
            {activeMembers.length === 0 ? (
              <p className="text-[11px] text-gray-400 bg-gray-50 p-2.5 rounded-xl text-center">
                아직 입장한 회원이 없습니다.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                {activeMembers.map((m) => (
                  <div
                    key={m.id}
                    className="px-2.5 py-1 rounded-xl bg-gray-100 border border-gray-200 text-xs flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-gray-800">{m.name}</span>
                    <RoleBadge role={m.role} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1번 요구사항: 관리자 4자리 랜덤 번호 팝업 모달 */}
      {/* ======================================================== */}
      {showAdminCodeModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 text-center space-y-5 relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center mx-auto text-carrot shadow-sm">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-carrot text-white">
                실시간 출석 인증 번호
              </span>
              <h3 className="text-xl font-extrabold text-gray-900 mt-2">
                참석자 출석 체크 번호
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                강의 화면 또는 음성/채팅으로 아래 <strong>4자리 숫자</strong>를 참석자들에게 알려주세요.
              </p>
            </div>

            {/* 4자리 큰 글씨 디스플레이 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 border-2 border-blue-300 rounded-2xl py-5 px-6 shadow-inner">
              <div className="text-4xl sm:text-5xl font-black text-carrot tracking-[0.3em] font-mono select-all text-center pl-[0.3em]">
                {adminGeneratedCode || roomAttendance?.code || '----'}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
              <span>현재 출석 완료 인원:</span>
              <strong className="text-emerald-600 text-sm">
                {roomAttendance?.checkedInCount ?? 0}명
              </strong>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copyCodeToClipboard}
                className="py-2.5 px-3 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600">복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-gray-500" />
                    <span>번호 복사</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowAdminCodeModal(false)}
                className="py-2.5 px-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs transition"
              >
                창 닫기
              </button>
            </div>

            <button
              onClick={handleStopAttendance}
              className="text-xs text-red-500 hover:text-red-700 underline font-medium block mx-auto pt-1"
            >
              출석 체크 조기 마감하기
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2 & 3번 요구사항: 참석자 4자리 숫자 입력 팝업 모달 */}
      {/* ======================================================== */}
      {showAttendeeModal && !isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 text-center space-y-5 relative">
            <button
              onClick={() => {
                setShowAttendeeModal(false);
                if (roomAttendance?.sessionId) {
                  setAttendeeDismissedSessionId(roomAttendance.sessionId);
                }
              }}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                출석 체크
              </span>
              <h3 className="text-xl font-extrabold text-gray-900 mt-2">
                4자리 출석 번호 입력
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                강의자가 공유한 <strong>4자리 숫자</strong>를 입력하면 출석 체크가 완료됩니다.
              </p>
            </div>

            {attendeeSuccess ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2 animate-bounce-short">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-extrabold">🎉 출석 체크 완료!</p>
                <p className="text-xs text-emerald-600">출석부에 정상 등록되었습니다.</p>
              </div>
            ) : (
              <form onSubmit={handleAttendeeSubmitCode} className="space-y-4">
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    autoFocus
                    value={attendeeCodeInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setAttendeeCodeInput(val);
                      setAttendeeError(null);
                    }}
                    placeholder="• • • •"
                    className="w-full text-center text-3xl font-black tracking-[0.5em] pl-[0.5em] py-3.5 border-2 border-emerald-500 rounded-2xl bg-emerald-50/30 text-gray-900 focus:outline-hidden focus:ring-4 focus:ring-emerald-200 font-mono transition"
                  />
                  {attendeeError && (
                    <p className="text-xs text-red-600 font-bold mt-2 animate-shake">
                      ⚠️ {attendeeError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || attendeeCodeInput.length !== 4}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm shadow-md transition"
                >
                  {actionLoading ? '확인 중...' : '출석 체크 완료하기'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
