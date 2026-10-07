'use client';

import React, { useState } from 'react';
import { MemberUser } from '@/types';
import { setCurrentUser } from '@/lib/auth';
import { initialUsers } from '@/lib/mockData';
import { RoleBadge } from '../common/RoleBadge';
import {
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

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

  // 로그인 폼 필드: 성명(아이디), 연락처(비밀번호)
  const [loginName, setLoginName] = useState('');
  const [loginPhone, setLoginPhone] = useState('');

  // 상태 메시지
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // 회원가입 제출
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
        setErrorMsg(data.error || '회원가입에 실패했습니다.');
      } else {
        setSuccessMsg(
          '🎉 회원가입 신청이 완료되었습니다! (아이디: 성명 / 비밀번호: 연락처)\n모임장 승인 대기 상태로 등록되었습니다.'
        );
        setCurrentUser(data.user);
        if (onAuthSuccess) {
          onAuthSuccess(data.user);
        } else {
          setTimeout(() => window.location.reload(), 1500);
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

  // 이미 로그인된 사용자인 경우 안내 카드
  if (currentUser) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-carrot/10 border border-carrot/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-carrot" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base">
                {currentUser.name} 회원님
              </span>
              <RoleBadge role={currentUser.role} size="sm" />
              {currentUser.status === 'approved' ? (
                <span className="text-[11px] text-emerald-400 font-medium">● 승인 완료</span>
              ) : (
                <span className="text-[11px] text-amber-400 font-medium">● 승인 대기 중</span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              연락처: {currentUser.phoneNumber} | 직업: {currentUser.job || '회원'} | 가입일: {currentUser.joinedAt}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <a
            href="/lectures"
            className="flex-1 sm:flex-none px-4 py-2 bg-white text-black hover:bg-zinc-200 text-xs font-bold rounded-lg text-center transition"
          >
            강의실 바로가기
          </a>
          <a
            href="/chat"
            className="flex-1 sm:flex-none px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg text-center transition"
          >
            채팅방 참여
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* 장식용 글로우 효과 */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-carrot/5 rounded-full blur-3xl pointer-events-none" />

      {/* 탭 헤더: 회원가입이 먼저 나옴 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-carrot" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              {mode === 'register' ? '당근 AI 모임 회원가입 신청' : '당근 AI 모임 로그인'}
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {mode === 'register'
              ? '가입 후 모임장 승인을 거쳐 전용 강의 시청 및 자료 다운로드가 가능합니다.'
              : '가입하신 성명(아이디)과 연락처(비밀번호)로 로그인하세요.'}
          </p>
        </div>

        {/* 모드 전환 탭 */}
        <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-xs w-full sm:w-64 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-white'
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
            className={`py-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>로그인</span>
          </button>
        </div>
      </div>

      {/* 알림 메시지 */}
      {errorMsg && (
        <div className="mb-5 p-3.5 bg-red-950/40 border border-red-900 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-5 p-3.5 bg-emerald-950/40 border border-emerald-900 rounded-xl text-xs text-emerald-300 flex items-center gap-2 whitespace-pre-line">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. 회원가입 폼 (기본 첫 화면) */}
      {mode === 'register' ? (
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                성명 (아이디로 사용) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 홍길동"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                생년월일 *
              </label>
              <input
                type="text"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                placeholder="예: 1990-01-15 또는 900115"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                직업 *
              </label>
              <input
                type="text"
                required
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder="예: 회사원, 마케터, 개발자, 자영업 등"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                연락처 (비밀번호로 사용) *
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="예: 010-1234-5678"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              이메일 *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="예: gildong@example.com"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* 약관 동의 */}
          <div className="pt-2">
            <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 accent-carrot rounded"
              />
              <span>
                (필수) 하단에 명시된 <strong>[개인정보 수집·이용 및 관리에 관한 약관]</strong>에 동의합니다.
                <span className="text-zinc-500 block text-[11px] mt-0.5">
                  * 수집 항목: 성명(아이디), 연락처(비밀번호), 생년월일, 직업, 이메일
                </span>
              </span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-carrot hover:bg-carrot-hover text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-lg disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? '가입 신청 처리 중...' : '회원가입 신청하기'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* 2. 로그인 폼 (아이디: 성명 / 비밀번호: 연락처) */
        <form onSubmit={handleLogin} className="space-y-4 max-w-lg mx-auto">
          <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-850 text-xs text-zinc-400">
            💡 <strong>로그인 안내:</strong> 아이디는 가입하신 <strong>성명</strong>이며, 비밀번호는 <strong>연락처(휴대폰 번호)</strong>입니다.
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              성명 (아이디) *
            </label>
            <input
              type="text"
              required
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder="가입하신 성명을 입력하세요"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              연락처 (비밀번호) *
            </label>
            <input
              type="tel"
              required
              value={loginPhone}
              onChange={(e) => setLoginPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black hover:bg-zinc-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
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
