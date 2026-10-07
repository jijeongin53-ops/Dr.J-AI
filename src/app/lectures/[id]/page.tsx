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
import { LectureEditModal } from '@/components/admin/LectureEditModal';
import { mergeLectures, deleteStoredLecture } from '@/lib/lecturesStorage';
import { ArrowLeft, Clock, Calendar, FileText, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function LectureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lectureId = params.id as string;

  const [currentUser, setCurrentUser] = useState<MemberUser | null>(null);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);

    // 로컬스토리지 병합 데이터에서 먼저 조회
    const localLectures = mergeLectures(initialLectures);
    const localFound = localLectures.find((l) => l.id === lectureId);
    if (localFound) {
      setLecture(localFound);
      setLoading(false);
    }

    // 강의 정보 서버 조회
    fetch('/api/lectures')
      .then((res) => res.json())
      .then((data) => {
        const merged = mergeLectures(data.lectures || initialLectures);
        const found = merged.find((l: Lecture) => l.id === lectureId);
        if (found) setLecture(found);
      })
      .catch(() => {
        if (!localFound) {
          const found = initialLectures.find((l) => l.id === lectureId);
          setLecture(found || null);
        }
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

  const handleDelete = async () => {
    if (!lecture) return;
    if (!confirm(`'${lecture.title}' 강의를 정말 삭제하시겠습니까?`)) {
      return;
    }

    setDeleting(true);
    try {
      await fetch(`/api/lectures?id=${lecture.id}`, { method: 'DELETE' });
      deleteStoredLecture(lecture.id);
      router.push('/lectures');
    } catch (err) {
      deleteStoredLecture(lecture.id);
      router.push('/lectures');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-gray-400">
        강의 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="py-24 text-center space-y-4">
        <p className="text-gray-500 text-sm">존재하지 않거나 삭제된 강의입니다.</p>
        <Link
          href="/lectures"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>목록으로 돌아가기</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4 max-w-5xl mx-auto">
      {/* 뒤로가기 버튼 및 관리자 액션 */}
      <div className="flex items-center justify-between">
        <Link
          href="/lectures"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>강의 및 자료실 전체 목록</span>
        </Link>

        {currentUser?.role === 'admin' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              <Edit2 className="w-3.5 h-3.5 text-carrot" />
              <span>강의 수정</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deleting ? '삭제 중...' : '강의 삭제'}</span>
            </button>
          </div>
        )}
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
      <section className="space-y-4 border-b border-gray-200 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-700">
            {lecture.category}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
            <span>시청 권한:</span>
            <RoleBadge role={lecture.minViewRole} size="sm" />
          </div>
        </div>

        <h1 className="text-xl sm:text-3xl font-extrabold text-gray-950 leading-tight">
          {lecture.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
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
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">
              강의 개요 및 학습 가이드
            </h2>
            <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
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
            <h3 className="text-sm font-bold text-gray-900">강의 실습 & 보충 자료</h3>
            <span className="text-[11px] text-gray-400">
              {lecture.materials?.length || 0}개 파일
            </span>
          </div>

          <MaterialList
            materials={lecture.materials}
            userRole={currentUser?.role}
          />

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-500 leading-relaxed">
            💡 <strong>안내:</strong> 고화질 자료 및 소스코드는 VIP 회원 등급에 따라 다운로드가 허용됩니다. 권한이 필요한 경우 모임장에게 요청해주세요.
          </div>
        </div>
      </div>

      {/* 강의 수정 모달 */}
      {isEditOpen && lecture && (
        <LectureEditModal
          lecture={lecture}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSuccess={(updated) => {
            setLecture(updated);
          }}
        />
      )}
    </div>
  );
}
