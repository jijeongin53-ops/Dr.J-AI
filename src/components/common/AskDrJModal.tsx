'use client';

import React, { useState, useEffect } from 'react';
import { MemberUser } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import {
  MessageCircleQuestion,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Mail,
} from 'lucide-react';

export function AskDrJModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<MemberUser | null>(null);

  // Form states
  const [userName, setUserName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setUserName(user.name);
      setPhoneNumber(user.phoneNumber);
      setEmail(user.email);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openAskDrJ', handleOpen);
    return () => window.removeEventListener('openAskDrJ', handleOpen);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !phoneNumber.trim() || !email.trim() || !title.trim() || !content.trim()) {
      setAlertMsg({ text: '모든 항목을 입력해 주세요.', ok: false });
      return;
    }

    setLoading(true);
    setAlertMsg(null);

    try {
      const res = await fetch('/api/ask-dr-j', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: userName.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
          title: title.trim(),
          content: content.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAlertMsg({
          text: '🎉 질문이 모임장 Dr. J에게 전송되었습니다! (수신: jguy12@hanmail.net)',
          ok: true,
        });
        setTitle('');
        setContent('');
        setTimeout(() => {
          setAlertMsg(null);
          setIsOpen(false);
        }, 2500);
      } else {
        setAlertMsg({ text: data.error || '질문 전송에 실패했습니다.', ok: false });
      }
    } catch (_) {
      setAlertMsg({ text: '네트워크 통신 오류가 발생했습니다.', ok: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 1. 화면 우측 하단 고정 플로팅 버튼: 'Dr. J에게 물어봐!' */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-orange-500 via-carrot to-amber-500 hover:from-orange-600 hover:to-carrot text-white font-bold text-xs sm:text-sm rounded-full shadow-lg hover:shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all duration-300"
          title="Dr. J에게 질문하기 (구글 시트 저장 및 이메일 발송)"
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
            <MessageCircleQuestion className="w-4 h-4 text-white" />
          </div>
          <span>Dr. J에게 물어봐!</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-200 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-300" />
          </span>
        </button>
      </div>

      {/* 2. 팝업 창 (모달) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scaleUp">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-orange-500 to-carrot p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">
                    Dr. J에게 물어봐!
                  </h3>
                  <p className="text-[11px] text-orange-100 mt-0.5">
                    궁금한 실무 AI 질문, 프롬프트 고민, 모임 건의사항을 남겨주세요.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 폼 본문 */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 text-xs text-orange-950 flex items-center gap-2">
                <Mail className="w-4 h-4 text-carrot shrink-0" />
                <span>
                  질문이 남겨지면 <strong>구글 시트에 자동 저장</strong>되며 모임장 메일(<strong>jguy12@hanmail.net</strong>)로 즉시 발송됩니다.
                </span>
              </div>

              {/* 작성자 정보 3열 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    성명 *
                  </label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white focus:outline-none focus:border-carrot"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    연락처 *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white focus:outline-none focus:border-carrot"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    답변 수신 이메일 *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white focus:outline-none focus:border-carrot"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  질문 제목 *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 업무 자동화 엑셀 파이썬 연동 질문드립니다."
                  className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white focus:outline-none focus:border-carrot"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  질문 내용 상세 *
                </label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="궁금하신 내용이나 상황을 상세히 적어주시면 더 정확한 답변을 드릴 수 있습니다."
                  className="w-full text-xs border border-gray-300 rounded-xl p-3 bg-white focus:outline-none focus:border-carrot resize-none"
                />
              </div>

              {alertMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    alertMsg.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {alertMsg.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{alertMsg.text}</span>
                </div>
              )}

              {/* 하단 액션 버튼 */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-carrot hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? '질문 발송 중...' : '질문 남기기'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
