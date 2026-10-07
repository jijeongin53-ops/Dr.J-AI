'use client';

import React, { useState } from 'react';
import { Comment, MemberUser } from '@/types';
import { RoleBadge } from '../common/RoleBadge';
import { MessageSquare, Send } from 'lucide-react';

interface CommentSectionProps {
  lectureId: string;
  initialComments: Comment[];
  currentUser: MemberUser | null;
}

export function CommentSection({
  lectureId,
  initialComments,
  currentUser,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectureId,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          carrotNickname: currentUser.carrotNickname,
          content: content.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments([...comments, data.comment]);
        setContent('');
      }
    } catch (e) {
      console.error('댓글 전송 실패:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <MessageSquare className="w-4 h-4 text-carrot" />
        <h3 className="text-white font-semibold text-sm">
          수강생 댓글 & 질의응답 ({comments.length})
        </h3>
      </div>

      {/* 댓글 작성 폼 */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>작성자:</span>
            <span className="font-semibold text-white">{currentUser.carrotNickname}</span>
            <RoleBadge role={currentUser.role} size="sm" />
          </div>
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="강의 내용에 대한 질문이나 수강 소감을 남겨주세요."
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="px-4 py-2 bg-zinc-100 hover:bg-white text-black text-xs font-semibold rounded-lg flex items-center gap-1.5 transition disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '등록 중...' : '댓글 등록'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-center text-xs text-zinc-400">
          댓글을 작성하려면 로그인이 필요합니다.
        </div>
      )}

      {/* 댓글 목록 */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-6">
            첫 번째 댓글을 남겨보세요!
          </p>
        ) : (
          comments.map((comm) => (
            <div
              key={comm.id}
              className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-850 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{comm.carrotNickname}</span>
                  <RoleBadge role={comm.authorRole} size="sm" />
                </div>
                <span className="text-[11px] text-zinc-500">{comm.createdAt}</span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {comm.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
