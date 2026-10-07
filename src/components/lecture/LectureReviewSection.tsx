'use client';

import React, { useState, useEffect } from 'react';
import { LectureReview, MemberUser } from '@/types';
import { RoleBadge } from '../common/RoleBadge';
import { Star, MessageSquarePlus, CheckCircle2, AlertCircle } from 'lucide-react';

interface LectureReviewSectionProps {
  lectureId: string;
  currentUser: MemberUser | null;
}

export function LectureReviewSection({
  lectureId,
  currentUser,
}: LectureReviewSectionProps) {
  const [reviews, setReviews] = useState<LectureReview[]>([]);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // 후기 목록 불러오기
  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/lectures/${lectureId}/reviews`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchReviews();
  }, [lectureId]);

  // 후기 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setAlertMsg({ text: '후기 작성은 로그인 후 이용하실 수 있습니다.', ok: false });
      return;
    }

    if (!content.trim()) {
      setAlertMsg({ text: '후기 내용을 입력해 주세요.', ok: false });
      return;
    }

    setSubmitting(true);
    setAlertMsg(null);

    try {
      const res = await fetch(`/api/lectures/${lectureId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          carrotNickname: currentUser.carrotNickname || currentUser.name,
          rating,
          content: content.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setReviews((prev) => [data.review, ...prev]);
        setContent('');
        setRating(5);
        setAlertMsg({ text: '소중한 수강 후기가 등록되었습니다!', ok: true });
        setTimeout(() => setAlertMsg(null), 3000);
      } else {
        setAlertMsg({ text: data.error || '후기 등록 실패', ok: false });
      }
    } catch (_) {
      setAlertMsg({ text: '통신 오류가 발생했습니다.', ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  // 평균 별점 계산
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, cur) => acc + cur.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* 헤더 및 평점 통계 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-950 flex items-center gap-2">
            <Star className="w-5 h-5 text-carrot fill-carrot" />
            <span>수강생 생생 후기 & 평점</span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            강의를 수강하신 회원님들의 실제 만족도와 실무 적용 후기입니다.
          </p>
        </div>

        {/* 평점 배지 */}
        <div className="flex items-center gap-3 bg-orange-50/70 border border-orange-200/80 px-4 py-2.5 rounded-2xl self-start sm:self-auto shadow-sm">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(Number(avgRating))
                    ? 'text-carrot fill-carrot'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <div className="text-right">
            <span className="text-base font-black text-carrot">{avgRating}</span>
            <span className="text-xs text-gray-500"> / 5.0 ({reviews.length}개)</span>
          </div>
        </div>
      </div>

      {/* 후기 작성 폼 */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-gray-700">작성자:</span>
              <strong className="text-gray-900">{currentUser.name}</strong>
              <RoleBadge role={currentUser.role} size="sm" />
            </div>

            {/* 별점 선택 UI */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-600 mr-1">평점 선택:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition hover:scale-110"
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= (hoverRating || rating)
                        ? 'text-carrot fill-carrot'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-carrot ml-1">{rating}점</span>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="강의 수강 소감, 실무 적용 팁, 느낀 점을 자유롭게 남겨주세요."
            rows={3}
            className="w-full bg-white border border-gray-300 rounded-xl p-3 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot transition resize-none"
          />

          {alertMsg && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-1.5 ${
                alertMsg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
              }`}
            >
              {alertMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{alertMsg.text}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-4 py-2 bg-carrot hover:bg-orange-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm disabled:opacity-40"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>{submitting ? '등록 중...' : '후기 등록하기'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center text-xs text-gray-500">
          강의 후기를 작성하시려면 로그인이 필요합니다.
        </div>
      )}

      {/* 후기 목록 */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
            아직 등록된 강의 후기가 없습니다. 첫 번째 수강 후기를 남겨보세요!
          </div>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 rounded-xl bg-white border border-gray-100 hover:border-gray-200 transition space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-gray-900">{rev.authorName}</span>
                  <RoleBadge role={rev.authorRole} size="sm" />
                  <div className="flex items-center gap-0.5 ml-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rev.rating ? 'text-carrot fill-carrot' : 'text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-[11px] text-gray-400">{rev.createdAt}</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {rev.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
