'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { initialUsers } from '@/lib/mockData';
import { setCurrentUser } from '@/lib/auth';
import { RoleBadge } from '@/components/common/RoleBadge';
import { PrivacyPolicy } from '@/components/common/PrivacyPolicy';
import { LogIn, UserPlus, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  // 사용자의 요청대로 회원가입란이 기본으로 먼저 나옵니다.
  const [tab, setTab] = useState<'register' | 'login'>('register');

  // 로그인 폼 상태: 성명(아이디), 연락처(비밀번호)
  const [loginName, setLoginName] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginError, setLoginError] = useState('');

  // 회원가입 폼 상태: 성명, 생년월일, 직업, 연락처, 이메일
  const [regName, setRegName] = useState('');
  const [regBirthDate, setRegBirthDate] = useState('');
  const [regJob, setRegJob] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAgreeTerms, setRegAgreeTerms] = useState(true);

  const [regSuccess, setRegSuccess] = useState('');
  const [regError, setRegError] = useState('');
  const [loading, setLoading] = useState(false);

  // 일반 로그인 처리 (아이디=성명, 비밀번호=연락처)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginName.trim() || !loginPhone.trim()) {
      setLoginError('성명(아이디)과 연락처(비밀번호)를 모두 입력하세요.');
      return;
    }

    try {
      const res = await fetch(
        `/api/auth?name=${encodeURIComponent(loginName.trim())}&phoneNumber=${encodeURIComponent(
          loginPhone.trim()
        )}`
      );
      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || '일치하는 회원을 찾을 수 없습니다.');
        return;
      }

      setCurrentUser(data.user);
      router.push('/lectures');
    } catch (err) {
      setLoginError('로그인 처리 중 네트워크 오류가 발생했습니다.');
    }
  };

  // 회원가입 처리 (성명, 생년월일, 직업, 연락처, 이메일)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (
      !regName.trim() ||
      !regBirthDate.trim() ||
      !regJob.trim() ||
      !regPhone.trim() ||
      !regEmail.trim()
    ) {
      setRegError('성명, 생년월일, 직업, 연락처, 이메일은 모두 필수 항목입니다.');
      return;
    }

    if (!regAgreeTerms) {
      setRegError('개인정보 수집 및 활용에 동의해 주셔야 가입이 가능합니다.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          birthDate: regBirthDate.trim(),
          job: regJob.trim(),
          phoneNumber: regPhone.trim(),
          email: regEmail.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || '가입 실패');
      } else {
        setRegSuccess('🎉 회원가입 신청 완료! 모임장 승인 대기 상태로 등록되었습니다.');
        setCurrentUser(data.user);
        setTimeout(() => {
          router.push('/lectures');
        }, 1200);
      }
    } catch (err) {
      setRegError('가입 신청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 빠른 데모 계정 로그인
  const handleFastLogin = (user: (typeof initialUsers)[0]) => {
    setCurrentUser(user);
    router.push('/lectures');
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex w-10 h-10 rounded-full bg-carrot items-center justify-center text-white font-bold text-lg mb-2 shadow-sm">
          당
        </div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight">
          당근 AI 모임 회원 센터
        </h1>
        <p className="text-xs text-gray-500">
          강의 시청, 자료 다운로드 및 승인 채팅을 위한 전용 공간입니다.
        </p>
      </div>

      {/* 탭 버튼: 회원가입이 먼저 위치 */}
      <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl text-xs">
        <button
          onClick={() => setTab('register')}
          className={`py-2.5 rounded-lg font-bold transition ${
            tab === 'register'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          신규 회원가입 신청
        </button>
        <button
          onClick={() => setTab('login')}
          className={`py-2.5 rounded-lg font-bold transition ${
            tab === 'login'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          기존 회원 로그인
        </button>
      </div>

      {/* 카드 본체 */}
      <div className="p-6 sm:p-8 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {tab === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4">
            {regError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{regError}</span>
              </div>
            )}
            {regSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{regSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  성명 (아이디로 사용) *
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  생년월일 *
                </label>
                <input
                  type="text"
                  required
                  value={regBirthDate}
                  onChange={(e) => setRegBirthDate(e.target.value)}
                  placeholder="예: 1990-01-15 또는 900115"
                  className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  직업 *
                </label>
                <input
                  type="text"
                  required
                  value={regJob}
                  onChange={(e) => setRegJob(e.target.value)}
                  placeholder="예: 회사원, 마케터, 프리랜서 등"
                  className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  연락처 (비밀번호로 사용) *
                </label>
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="예: 010-1234-5678"
                  className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                이메일 *
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="gildong@example.com"
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={regAgreeTerms}
                  onChange={(e) => setRegAgreeTerms(e.target.checked)}
                  className="mt-0.5 accent-carrot rounded"
                />
                <span>
                  (필수) 하단에 기재된 <strong>[개인정보 수집·이용 및 관리에 관한 약관]</strong>에 동의합니다.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-carrot hover:bg-carrot-hover text-white font-bold text-xs rounded-xl transition disabled:opacity-50 mt-2 shadow-sm"
            >
              {loading ? '신청 중...' : '회원가입 신청하기'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600">
              💡 아이디는 가입하신 <strong>성명</strong>이며, 비밀번호는 <strong>연락처(휴대폰 번호)</strong>입니다.
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                성명 (아이디) *
              </label>
              <input
                type="text"
                required
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="예: 홍길동"
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot"
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
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gray-900 text-white hover:bg-black font-bold text-xs rounded-xl transition shadow-sm"
            >
              로그인
            </button>
          </form>
        )}

        {/* 빠른 테스트 계정 체험 섹션 */}
        <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
          <p className="text-[11px] font-semibold text-gray-400">
            ⚡ 빠른 테스트 로그인:
          </p>
          <div className="space-y-1.5">
            {initialUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => handleFastLogin(u)}
                className="w-full p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs flex items-center justify-between transition border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{u.name}</span>
                  <span className="text-gray-400 text-[11px]">ID:{u.name} / PW:{u.phoneNumber}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <RoleBadge role={u.role} size="sm" />
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 개인정보 약관 컴포넌트 */}
      <PrivacyPolicy />
    </div>
  );
}
