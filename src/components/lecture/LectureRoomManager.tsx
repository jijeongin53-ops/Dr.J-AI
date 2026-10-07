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
} from 'lucide-react';

interface LectureRoomManagerProps {
  lectureId: string;
  maxAttendees?: number;
  currentUser: MemberUser | null;
  onRoomStatusChange?: (isEntered: boolean) => void;
}

export function LectureRoomManager({
  lectureId,
  maxAttendees = 30,
  currentUser,
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

  const [activeAttendanceSession, setActiveAttendanceSession] = useState<AttendanceSession | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.name === '지정인';

  // 1. 강의실 상태 실시간 조회 (3초 주기)
  const fetchRoomStatus = async () => {
    try {
      const query = currentUser
        ? `?userId=${encodeURIComponent(currentUser.id)}&userPhone=${encodeURIComponent(
            currentUser.phoneNumber
          )}`
        : '';
      const res = await fetch(`/api/lectures/${lectureId}/room${query}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setActiveCount(data.activeCount);
        setWaitingCount(data.waitingCount);
        setCurrentMax(data.maxAttendees);
        setActiveMembers(data.activeMembers || []);
        setWaitingMembers(data.waitingMembers || []);
        setMyStatus(data.myStatus);
        setQueuePosition(data.queuePosition);

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
  }, [lectureId, currentUser?.id]);

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

    setActionLoading(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkIn',
          user: currentUser,
          sessionId: activeAttendanceSession?.id,
          lectureId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCheckedIn(true);
        alert(data.message || '출석 체크가 완료되었습니다!');
      } else {
        alert(data.error || '출석 체크 실패');
      }
    } catch (_) {
      alert('출석 체크 통신 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      {/* 1. 상단 상태 요약 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-carrot shrink-0 shadow-sm">
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
            <p className="text-xs text-gray-500 mt-0.5">
              현재 입장: <strong className="text-gray-900">{activeCount}</strong> /{' '}
              {currentMax === 0 ? '무제한' : `${currentMax}명`}
              {waitingCount > 0 && (
                <span className="ml-2 text-amber-600 font-bold">
                  (대기열: {waitingCount}명)
                </span>
              )}
            </p>
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
              className="px-3.5 py-1.5 rounded-xl bg-carrot hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
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
              {activeAttendanceSession
                ? `진행 중인 출석 체크: "${activeAttendanceSession.title}"`
                : '실시간 강의 출석 체크'}
            </h4>
          </div>
          <p className="text-[11px] text-gray-500">
            * <strong>출석 기준:</strong> 강의실에 정식 입장한 회원만 출석 체크가 허용됩니다.
            {myStatus !== 'entered' && ' (현재 미입장/대기 상태로 출석 불가)'}
          </p>
        </div>

        <div>
          {checkedIn ? (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>출석 완료</span>
            </span>
          ) : (
            <button
              onClick={handleCheckIn}
              disabled={actionLoading || myStatus !== 'entered'}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                myStatus === 'entered'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
              }`}
              title={myStatus === 'entered' ? '출석 체크 완료하기' : '강의실 입장 회원만 출석 가능'}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{myStatus === 'entered' ? '출석 체크하기' : '입장 회원만 출석 가능'}</span>
            </button>
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
    </div>
  );
}
