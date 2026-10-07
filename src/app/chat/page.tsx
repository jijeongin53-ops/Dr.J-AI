'use client';

import React, { useEffect, useState } from 'react';
import { MemberUser } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { LiveChatRoom } from '@/components/chat/LiveChatRoom';
import { MessageSquare, Users } from 'lucide-react';

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<MemberUser | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);
  }, []);

  return (
    <div className="space-y-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between border-b border-zinc-900 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-carrot" />
            당근 모임 회원 승인 채팅방
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            승인된 당근 AI 모임 회원들만 참여할 수 있는 실시간 정보 교류 및 질문 공간입니다.
          </p>
        </div>
      </div>

      <LiveChatRoom currentUser={currentUser} />
    </div>
  );
}
