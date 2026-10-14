'use client';

import React, { useEffect, useState } from 'react';
import { MemberUser } from '@/types';
import { getCurrentUser, setCurrentUser as saveCurrentUser } from '@/lib/auth';
import { LiveChatRoom } from '@/components/chat/LiveChatRoom';
import { MessageSquare } from 'lucide-react';

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<MemberUser | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    const syncUser = async () => {
      const user = getCurrentUser();
      setCurrentUser(user);

      // 최신 승인 상태 및 등급을 서버에서 동기화
      if (user) {
        try {
          const res = await fetch('/api/auth', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            const list: MemberUser[] = data.users || data.members || [];
            const found = list.find(
              (m: MemberUser) => m.id === user.id || m.name === user.name
            );
            if (found && (found.status !== user.status || found.role !== user.role)) {
              const updated = { ...user, status: found.status, role: found.role };
              saveCurrentUser(updated);
              setCurrentUser(updated);
            }
          }
        } catch (_) {}
      }
    };

    syncUser();
    window.addEventListener('storage', syncUser);
    window.addEventListener('authChange', syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('authChange', syncUser);
    };
  }, []);

  return (
    <div className="space-y-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-carrot" />
            Dr. J&apos;s 회원 승인 채팅방
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            승인된 Dr. J&apos;s 회원들만 참여할 수 있는 실시간 정보 교류 및 질문 공간입니다.
          </p>
        </div>
      </div>

      <LiveChatRoom currentUser={currentUser} />
    </div>
  );
}
