'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, MemberUser } from '@/types';
import { RoleBadge } from '../common/RoleBadge';
import { Send, Pin, AlertCircle } from 'lucide-react';

interface LiveChatRoomProps {
  currentUser: MemberUser | null;
}

export function LiveChatRoom({ currentUser }: LiveChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isNotice, setIsNotice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);

  const isApproved =
    currentUser?.status === 'approved' ||
    currentUser?.role === 'admin' ||
    currentUser?.name === '지정인';

  const fetchChats = async () => {
    try {
      const res = await fetch('/api/chats', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.chats)) {
          setMessages((prev) => {
            const merged = new Map<string, ChatMessage>();
            data.chats.forEach((m: ChatMessage) => merged.set(m.id, m));
            prev.forEach((m) => {
              if (!merged.has(m.id)) merged.set(m.id, m);
            });
            return Array.from(merged.values());
          });
        }
      }
    } catch (e) {
      console.error('채팅 불러오기 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
    // 4초마다 새 메시지 자동 동기화 -> 15초 주기로 완화 및 백그라운드 탭 일시정지
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchChats();
    }, 15000);
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchChats();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // 새 메시지가 추가되었을 때만 채팅창 내부 스크롤을 하단으로 이동 (전체 브라우저 화면 스크롤 점프 방지)
    if (messages.length > prevMessageCountRef.current) {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || sending) return;

    if (!isApproved) {
      alert('관리자의 승인을 받은 회원만 채팅에 참여할 수 있습니다.');
      return;
    }

    const textToSend = inputText.trim();
    setSending(true);
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          carrotNickname: currentUser.carrotNickname || currentUser.name,
          content: textToSend,
          isNotice: isNotice && currentUser.role === 'admin',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.chat.id)) return prev;
          return [...prev, data.chat];
        });
        setInputText('');
        setIsNotice(false);
      }
    } catch (e) {
      console.error('메시지 전송 실패:', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-w-4xl mx-auto rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* 채팅 헤더 */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-gray-900 font-bold text-sm tracking-tight">
            당근 모임 회원 승인 채팅방
          </h2>
          <span className="text-xs text-gray-500 font-mono">
            ({messages.length}개 대화)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {currentUser ? (
            <div className="flex items-center gap-1.5 text-gray-600">
              <span>내 성명:</span>
              <span className="font-bold text-gray-900">{currentUser.name}</span>
              <RoleBadge role={currentUser.role} size="sm" />
            </div>
          ) : (
            <span className="text-gray-400">로그인 필요</span>
          )}
        </div>
      </div>

      {/* 미승인 회원 알림 배너 */}
      {currentUser && !isApproved && (
        <div className="bg-amber-50 border-b border-amber-200 p-3 px-6 flex items-center gap-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            현재 <strong>[승인 대기]</strong> 상태입니다. 모임장의 승인 후 실시간 대화 전송이 가능합니다. (대화 열람은 가능)
          </span>
        </div>
      )}

      {/* 메시지 영역 */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
        {loading ? (
          <div className="text-center py-20 text-xs text-gray-400">
            대화 목록을 불러오는 중...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 text-xs text-gray-400">
            아직 나눈 대화가 없습니다. 첫 인사를 건네보세요!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe =
              currentUser?.id === msg.authorId ||
              Boolean(currentUser?.name && currentUser.name === msg.authorName);

            // 관리자 공지 메시지
            if (msg.isNotice) {
              return (
                <div
                  key={msg.id}
                  className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs space-y-1.5 my-3 shadow-sm"
                >
                  <div className="flex items-center gap-1.5 text-carrot font-bold">
                    <Pin className="w-3.5 h-3.5" />
                    <span>모임장 공식 공지</span>
                    <span className="text-[10px] text-gray-400 font-normal ml-auto">
                      {msg.createdAt}
                    </span>
                  </div>
                  <p className="text-gray-900 whitespace-pre-wrap leading-relaxed font-medium">
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
                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-gray-500">
                  <span className="font-bold text-gray-800">
                    {msg.authorName || msg.carrotNickname}
                  </span>
                  <RoleBadge role={msg.authorRole} size="sm" />
                  <span className="text-gray-400 text-[10px]">{msg.createdAt}</span>
                </div>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    isMe
                      ? 'bg-gray-900 text-white font-medium rounded-tr-none'
                      : 'bg-gray-100 border border-gray-200 text-gray-900 rounded-tl-none'
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
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        {currentUser ? (
          <form onSubmit={handleSendMessage} className="space-y-2">
            {currentUser.role === 'admin' && (
              <div className="flex items-center gap-2 mb-1">
                <label className="flex items-center gap-1.5 text-xs text-carrot cursor-pointer font-bold">
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
                className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot transition disabled:bg-gray-100 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!isApproved || !inputText.trim()}
                className="px-5 py-2.5 bg-carrot hover:bg-carrot-hover text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-40 shrink-0 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">전송</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-2 text-xs text-gray-500">
            채팅에 참여하려면 로그인이 필요합니다.
          </div>
        )}
      </div>
    </div>
  );
}
