'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, MemberUser } from '@/types';
import { RoleBadge } from '../common/RoleBadge';
import { Send, Pin, AlertCircle, ShieldCheck } from 'lucide-react';

interface LiveChatRoomProps {
  currentUser: MemberUser | null;
}

export function LiveChatRoom({ currentUser }: LiveChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isNotice, setIsNotice] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChats = async () => {
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.chats || []);
      }
    } catch (e) {
      console.error('채팅 불러오기 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
    // 4초마다 새 메시지 자동 동기화
    const interval = setInterval(fetchChats, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser) return;

    if (currentUser.status !== 'approved') {
      alert('관리자의 승인을 받은 회원만 채팅에 참여할 수 있습니다.');
      return;
    }

    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          carrotNickname: currentUser.carrotNickname,
          content: inputText.trim(),
          isNotice: isNotice && currentUser.role === 'admin',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.chat]);
        setInputText('');
        setIsNotice(false);
      }
    } catch (e) {
      console.error('메시지 전송 실패:', e);
    }
  };

  const isApproved = currentUser?.status === 'approved';

  return (
    <div className="flex flex-col h-[700px] max-w-4xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
      {/* 채팅 헤더 */}
      <div className="px-6 py-4 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-white font-bold text-sm tracking-tight">
            당근 모임 회원 승인 채팅방
          </h2>
          <span className="text-xs text-zinc-500 font-mono">
            ({messages.length}개 대화)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {currentUser ? (
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span>내 닉네임:</span>
              <span className="font-semibold text-white">{currentUser.carrotNickname}</span>
              <RoleBadge role={currentUser.role} size="sm" />
            </div>
          ) : (
            <span className="text-zinc-500">로그인 필요</span>
          )}
        </div>
      </div>

      {/* 미승인 회원 알림 배너 */}
      {currentUser && !isApproved && (
        <div className="bg-amber-950/40 border-b border-amber-900/60 p-3 px-6 flex items-center gap-2 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-carrot" />
          <span>
            현재 <strong>[승인 대기]</strong> 상태입니다. 모임장의 승인 후 실시간 대화 전송이 가능합니다. (대화 열람은 가능)
          </span>
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="text-center py-20 text-xs text-zinc-500">
            대화 목록을 불러오는 중...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 text-xs text-zinc-500">
            아직 나눈 대화가 없습니다. 첫 인사를 건네보세요!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = currentUser?.id === msg.authorId;

            // 관리자 공지 메시지
            if (msg.isNotice) {
              return (
                <div
                  key={msg.id}
                  className="p-3.5 rounded-xl bg-zinc-900 border border-carrot/40 text-xs space-y-1 my-3 shadow"
                >
                  <div className="flex items-center gap-1.5 text-carrot font-bold">
                    <Pin className="w-3.5 h-3.5" />
                    <span>모임장 공식 공지</span>
                    <span className="text-[10px] text-zinc-500 font-normal ml-auto">
                      {msg.createdAt}
                    </span>
                  </div>
                  <p className="text-white whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-zinc-400">
                  <span className="font-semibold text-zinc-200">
                    {msg.carrotNickname}
                  </span>
                  <RoleBadge role={msg.authorRole} size="sm" />
                  <span className="text-zinc-600 text-[10px]">{msg.createdAt}</span>
                </div>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    isMe
                      ? 'bg-zinc-100 text-black font-medium rounded-tr-none'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        {currentUser ? (
          <form onSubmit={handleSendMessage} className="space-y-2">
            {currentUser.role === 'admin' && (
              <div className="flex items-center gap-2 mb-1">
                <label className="flex items-center gap-1.5 text-xs text-carrot cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={isNotice}
                    onChange={(e) => setIsNotice(e.target.checked)}
                    className="accent-carrot rounded"
                  />
                  <span>관리자 공식 공지로 등록</span>
                </label>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={!isApproved}
                placeholder={
                  isApproved
                    ? '승인된 모임원들과 대화를 나눠보세요. (Enter 전송)'
                    : '승인 대기 중인 회원은 대화를 전송할 수 없습니다.'
                }
                className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isApproved || !inputText.trim()}
                className="px-5 py-2.5 bg-carrot hover:bg-carrot-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">전송</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-2 text-xs text-zinc-500">
            채팅에 참여하려면 로그인이 필요합니다.
          </div>
        )}
      </div>
    </div>
  );
}
