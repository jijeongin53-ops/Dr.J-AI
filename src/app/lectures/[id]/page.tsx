'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Lecture, MemberUser, Comment } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { initialLectures, initialComments } from '@/lib/mockData';
import { VideoPlayer } from '@/components/lecture/VideoPlayer';
import { MaterialList } from '@/components/lecture/MaterialList';
import { CommentSection } from '@/components/lecture/CommentSection';
import { RoleBadge } from '@/components/common/RoleBadge';
import { ArrowLeft, Clock, Calendar, FileText, Share2 } from 'lucide-react';
import Link from 'next/link';

export default function LectureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lectureId = params.id as string;

  const [currentUser, setCurrentUser] = useState<MemberUser | null>(null);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);

    // 강의 정보 조회
    fetch('/api/lectures')
      .then((res) => res.json())
      .then((data) => {
        const found = (data.lectures || initialLectures).find(
          (l: Lecture) => l.id === lectureId
        );
        setLecture(found || null);
      })
      .catch(() => {
        const found = initialLectures.find((l) => l.id === lectureId);
        setLecture(found || null);
      })
      .finally(() => setLoading(false));

    // 댓글 조회
    fetch(`/api/comments?lectureId=${lectureId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.comments) setComments(data.comments);
      })
      .catch(() => {
        setComments(initialComments.filter((c) => c.lectureId === lectureId));
      });
  }, [lectureId]);

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-zinc-500">
        강의 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="py-24 text-center space-y-4">
        <p className="text-zinc-400 text-sm">존재하지 않거나 삭제된 강의입니다.</p>
        <Link
          href="/lectures"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>목록으로 돌아가기</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4 max-w-5xl mx-auto">
      {/* 뒤로가기 버튼 */}
      <div>
        <Link
          href="/lectures"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>강의 및 자료실 전체 목록</span>
        </Link>
      </div>

      {/* 1. 구글 드라이브 비디오 플레이어 */}
      <section>
        <VideoPlayer
          title={lecture.title}
          driveFileId={lecture.driveFileId}
          videoUrl={lecture.videoUrl}
          minViewRole={lecture.minViewRole}
          userRole={currentUser?.role}
        />
      </section>

      {/* 2. 강의 제목 및 메타 헤더 */}
      <section className="space-y-4 border-b border-zinc-900 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            {lecture.category}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 ml-auto">
            <span>시청 최소 등급:</span>
            <RoleBadge role={lecture.minViewRole} size="sm" />
          </div>
        </div>

        <h1 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">
          {lecture.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            등록일: {lecture.createdAt}
          </span>
          {lecture.duration && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              강의 시간: {lecture.duration}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            첨부 자료: {lecture.materials?.length || 0}개
          </span>
        </div>
      </section>

      {/* 3. 강의 내용 설명 & 첨부자료 2컬럼 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* 강의 상세 설명 */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-zinc-300">
              강의 개요 및 학습 가이드
            </h2>
            <div className="p-5 rounded-2xl border border-zinc-850 bg-zinc-950 text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {lecture.description}
            </div>
          </div>

          {/* 댓글 및 질의응답 */}
          <CommentSection
            lectureId={lecture.id}
            initialComments={comments}
            currentUser={currentUser}
          />
        </div>

        {/* 우측 사이드바: 첨부 파일 다운로드 섹션 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">강의 실습 & 보충 자료</h3>
            <span className="text-[11px] text-zinc-500">
              {lecture.materials?.length || 0}개 파일
            </span>
          </div>

          <MaterialList
            materials={lecture.materials}
            userRole={currentUser?.role}
          />

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 text-xs text-zinc-500 leading-relaxed">
            💡 <strong>안내:</strong> 고화질 자료 및 소스코드는 VIP 회원 등급에 따라 다운로드가 허용됩니다. 권한이 필요한 경우 모임장에게 요청해주세요.
          </div>
        </div>
      </div>
    </div>
  );
}
