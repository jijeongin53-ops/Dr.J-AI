'use client';

import React, { useEffect, useState } from 'react';
import { MemberUser } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { LiveChatRoom } from '@/components/chat/LiveChatRoom';
import { MessageSquare } from 'lucide-react';

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<MemberUser | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);
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
