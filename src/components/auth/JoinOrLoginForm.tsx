'use client';

import React, { useState } from 'react';
import { MemberUser } from '@/types';
import { setCurrentUser, clearCurrentUser } from '@/lib/auth';
import { RoleBadge } from '../common/RoleBadge';
import {
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  LogOut,
  BookOpen,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

interface JoinOrLoginFormProps {
  currentUser: MemberUser | null;
  onAuthSuccess?: (user: MemberUser) => void;
}

export function JoinOrLoginForm({ currentUser, onAuthSuccess }: JoinOrLoginFormProps) {
  // 사용자의 요청대로 회원가입 탭이 기본으로 먼저 나옵니다.
  const [mode, setMode] = useState<'register' | 'login'>('register');

  // 회원가입 폼 필드: 성명, 생년월일, 직업, 연락처, 이메일
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [job, setJob] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // 반려된 회원 정보 수정 재신청 상태
  const [editingUser, setEditingUser] = useState<MemberUser | null>(null);
  const [rejectionNotice, setRejectionNotice] = useState<{ user: MemberUser; reason: string } | null>(null);

  // 로그인 폼 필드: 성명(아이디), 연락처(비밀번호)
  const [loginName, setLoginName] = useState('');
  const [loginPhone, setLoginPhone] = useState('');

  // 상태 메시지
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // 회원가입 또는 반려 정보 수정 제출
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim() || !birthDate.trim() || !job.trim() || !phoneNumber.trim() || !email.trim()) {
      setErrorMsg('성명, 생년월일, 직업, 연락처, 이메일은 모두 필수 입력 사항입니다.');
      return;
    }

    if (!agreeTerms) {
      setErrorMsg('개인정보 수집 및 활용에 동의해 주셔야 가입이 가능합니다.');
      return;
    }

    setLoading(true);
    try {
      // 1. 반려된 회원의 정보 수정 재신청 (PATCH)
      if (editingUser) {
        const res = await fetch('/api/auth', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: editingUser.id,
            name: name.trim(),
            birthDate: birthDate.trim(),
            job: job.trim(),
            phoneNumber: phoneNumber.trim(),
            email: email.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || '정보 수정 및 재신청에 실패했습니다.');
        } else {
          setSuccessMsg(
            '🎉 가입 정보가 수정되어 [승인 대기] 상태로 재신청되었습니다!\n관리자 검토 후 승인 완료 메일이 발송됩니다.'
          );
          setEditingUser(null);
          setCurrentUser(data.user);
          if (onAuthSuccess) {
            onAuthSuccess(data.user);
          } else {
            setTimeout(() => window.location.reload(), 1500);
          }
        }
        return;
      }

      // 2. 신규 회원가입 신청 (POST)
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          birthDate: birthDate.trim(),
          job: job.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // 이미 반려된 회원인 경우 안내 및 수정 모드로 전환 유도
        if (data.isRejected && data.user) {
          setRejectionNotice({
            user: data.user,
            reason: data.user.rejectionReason || '가입 정보 확인 필요',
          });
        }
        setErrorMsg(data.error || '회원가입에 실패했습니다.');
      } else {
        // 클라이언트 측 구글 시트 웹훅 직접 백업 전송 (설정된 경우)
        try {
          const clientGasUrl = localStorage.getItem('DR_J_GAS_URL');
          if (clientGasUrl) {
            fetch(clientGasUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'addUser',
                data: {
                  id: data.user?.id || `user_${Date.now()}`,
                  name: name.trim(),
                  phoneNumber: phoneNumber.trim(),
                  birthDate: birthDate.trim(),
                  job: job.trim(),
                  email: email.trim(),
                  role: 'guest',
                  status: 'pending',
                  joinedAt: new Date().toISOString().split('T')[0],
                  note: '웹 신규 가입 회원',
                },
              }),
            }).catch(() => {});
          }
        } catch (_) {}

        setSuccessMsg(
          '🎉 회원가입 신청이 완료되었습니다! (아이디: 성명 / 비밀번호: 연락처)\n모임장 승인 대기 상태로 등록되었습니다.'
        );
        setCurrentUser(data.user);
        if (onAuthSuccess) {
          onAuthSuccess(data.user);
        } else {
          setTimeout(() => window.location.reload(), 1200);
        }
      }
    } catch (e) {
      setErrorMsg('가입 처리 중 네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 로그인 제출 (성명=아이디, 연락처=비밀번호)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setRejectionNotice(null);

    if (!loginName.trim() || !loginPhone.trim()) {
      setErrorMsg('성명(아이디)과 연락처(비밀번호)를 모두 입력하세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/auth?name=${encodeURIComponent(loginName.trim())}&phoneNumber=${encodeURIComponent(
          loginPhone.trim()
        )}`
      );
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || '성명 또는 연락처가 일치하지 않습니다.');
      } else {
        // [요구사항 2 해결]: 회원이 반려/거절 상태인 경우, 거절 사유를 명확히 보여주고 가입란 수정 가능하게 유도
        if (data.user.status === 'rejected') {
          setRejectionNotice({
            user: data.user,
            reason: data.user.rejectionReason || '가입 정보 확인 및 보완이 필요합니다.',
          });
          return;
        }

        setCurrentUser(data.user);
        setSuccessMsg(`${data.user.name}님, 환영합니다!`);
        if (onAuthSuccess) {
          onAuthSuccess(data.user);
        } else {
          setTimeout(() => window.location.reload(), 800);
        }
      }
    } catch (e) {
      setErrorMsg('로그인 중 네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 반려 사유 확인 후 가입 정보 수정 폼으로 전환
  const startEditRejectedInfo = (targetUser: MemberUser) => {
    setEditingUser(targetUser);
    setName(targetUser.name);
    setBirthDate(targetUser.birthDate || '');
    setJob(targetUser.job || '');
    setPhoneNumber(targetUser.phoneNumber);
    setEmail(targetUser.email);
    setRejectionNotice(null);
    setErrorMsg('');
    setMode('register');
  };

  const handleLogout = () => {
    clearCurrentUser();
    window.location.reload();
  };

  // [중요 요구사항 1 해결]: 로그인을 완료했을 때는 로그인 입력 폼이 완전히 사라지고, 깔끔한 회원 카드만 표시됩니다!
  if (currentUser) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 animate-fadeIn">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-carrot shrink-0 shadow-sm">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl font-bold text-gray-900">
                {currentUser.name} 회원님
              </span>
              <RoleBadge role={currentUser.role} size="md" />
              {currentUser.status === 'approved' ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ● 승인 완료
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  ● 승인 대기 중
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              아이디: <strong className="text-gray-700">{currentUser.name}</strong> | 연락처: <span className="text-gray-700">{currentUser.phoneNumber}</span> | 직업: <span className="text-gray-700">{currentUser.job || '회원'}</span>
            </p>
          </div>
        </div>

        {/* 바로가기 액션 버튼 */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <Link
            href="/lectures"
            className="flex-1 md:flex-none px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span>강의 및 자료실</span>
          </Link>
          <Link
            href="/chat"
            className="flex-1 md:flex-none px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <MessageSquare className="w-4 h-4 text-carrot" />
            <span>채팅방</span>
          </Link>
          {/* 모임장/운영자 관리자 센터 버튼 */}
          <Link
            href="/admin"
            className="flex-1 md:flex-none px-4 py-2.5 bg-carrot hover:bg-orange-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>관리자 센터</span>
          </Link>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-600 transition"
            title="로그아웃"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 비로그인 상태일 때: 회원가입 폼이 먼저 최상단에 노출됩니다!
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
      {/* 탭 헤더: 회원가입이 먼저 나옴 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-carrot" />
            <h2 className="text-lg font-bold text-gray-950 tracking-tight">
              {mode === 'register' ? "Dr. J's 회원가입 신청" : "Dr. J's 로그인"}
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'register'
              ? '가입 후 모임장 승인을 거쳐 전용 강의 시청 및 자료 다운로드가 가능합니다.'
              : '가입하신 성명(아이디)과 연락처(비밀번호)로 로그인하세요.'}
          </p>
        </div>

        {/* 모드 전환 탭 */}
        <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl text-xs w-full sm:w-64 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-carrot" />
            <span>회원가입 신청</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>로그인</span>
          </button>
        </div>
      </div>

      {/* 알림 메시지 */}
      {errorMsg && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 whitespace-pre-line">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* [요구사항 2 해결]: 반려된 회원 알림 및 가입 정보 수정 버튼 */}
      {rejectionNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-bold text-amber-900">
                가입 신청이 반려되었습니다 ({rejectionNotice.user.name} 회원님)
              </h4>
              <p className="text-xs text-amber-800 font-medium">
                <strong>반려 사유:</strong> {rejectionNotice.reason}
              </p>
              <p className="text-[11px] text-amber-700">
                아래 버튼을 눌러 반려 사유에 맞게 가입 정보를 수정한 후 다시 승인을 신청하실 수 있습니다.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => startEditRejectedInfo(rejectionNotice.user)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <span>가입 정보 수정 및 재신청하기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 1. 회원가입 폼 (기본 첫 화면) */}
      {mode === 'register' ? (
        <form onSubmit={handleRegister} className="space-y-4">
          {/* 수정 모드 배너 */}
          {editingUser ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between">
              <div>
                <strong>✏️ 가입 정보 수정 모드:</strong> {editingUser.name}님의 이전 반려 사유를 보완하여 수정 중입니다.
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setName('');
                  setBirthDate('');
                  setJob('');
                  setPhoneNumber('');
                  setEmail('');
                }}
                className="text-[11px] text-blue-600 hover:underline font-semibold"
              >
                신규 가입으로 변경
              </button>
            </div>
          ) : (
            /* [요구사항 5 & 6 해결]: 정회원 및 VIP 회원 기준 명확한 안내 */
            <div className="p-3.5 bg-orange-50/80 border border-orange-200 rounded-xl text-xs space-y-1">
              <p className="font-bold text-gray-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-carrot" />
                <span>회원 가입 자격 및 등급 안내</span>
              </p>
              <p className="text-gray-700">
                • <strong>정회원:</strong> 당근 모임의 정회원이 가입 가능합니다. (가입 신청 후 모임장 확인 및 승인)
              </p>
              <p className="text-gray-700">
                • <strong>VIP 회원:</strong> 관리자(모임장)의 승인으로 가능합니다.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                성명 (아이디로 사용) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 홍길동"
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                생년월일 *
              </label>
              <input
                type="text"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                placeholder="예: 1990-01-15 또는 900115"
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                직업 *
              </label>
              <input
                type="text"
                required
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder="예: 회사원, 마케터, 개발자, 자영업 등"
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                연락처 (비밀번호로 사용) *
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="예: 010-1234-5678"
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              이메일 (승인/반려 안내 수신용) *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="예: gildong@example.com"
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot transition"
            />
          </div>

          {/* 약관 동의 */}
          <div className="pt-2">
            <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-gray-700">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 accent-carrot rounded"
              />
              <span>
                (필수) 하단에 기재된 <strong>[개인정보 수집·이용 및 관리에 관한 약관]</strong>에 동의합니다.
                <span className="text-gray-500 block text-[11px] mt-0.5">
                  * 수집 항목: 성명(아이디), 연락처(비밀번호), 생년월일, 직업, 이메일
                </span>
              </span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-carrot hover:bg-carrot-hover text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>
                {loading
                  ? '처리 중...'
                  : editingUser
                  ? '가입 정보 수정 및 재신청 완료'
                  : '회원가입 신청하기'}
              </span>
            </button>
          </div>
        </form>
      ) : (
        /* 2. 로그인 폼 (아이디: 성명 / 비밀번호: 연락처) */
        <form onSubmit={handleLogin} className="space-y-4 max-w-lg mx-auto">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600">
            💡 <strong>로그인 안내:</strong> 아이디는 가입하신 <strong>성명</strong>이며, 비밀번호는 <strong>연락처(휴대폰 번호)</strong>입니다.
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              성명 (아이디) *
            </label>
            <input
              type="text"
              required
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder="가입하신 성명을 입력하세요"
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              연락처 (비밀번호) *
            </label>
            <input
              type="tel"
              required
              value={loginPhone}
              onChange={(e) => setLoginPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot transition"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gray-900 text-white hover:bg-black text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? '로그인 중...' : '로그인'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
