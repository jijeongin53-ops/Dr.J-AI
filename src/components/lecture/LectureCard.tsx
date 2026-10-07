'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lecture, MemberRole } from '@/types';
import { hasRequiredRole } from '@/lib/google/drive';
import { RoleBadge } from '../common/RoleBadge';
import { LectureEditModal } from '../admin/LectureEditModal';
import { deleteStoredLecture } from '@/lib/lecturesStorage';
import { PlayCircle, Lock, FileText, Clock, Edit2, Trash2 } from 'lucide-react';

interface LectureCardProps {
  lecture: Lecture;
  userRole?: MemberRole;
  onUpdated?: (updated: Lecture) => void;
  onDeleted?: (id: string) => void;
}

export function LectureCard({ lecture, userRole, onUpdated, onDeleted }: LectureCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canView = hasRequiredRole(userRole, lecture.minViewRole);
  const isAdmin = userRole === 'admin';

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`'${lecture.title}' 강의를 정말 삭제하시겠습니까?`)) {
      return;
    }

    setDeleting(true);
    try {
      await fetch(`/api/lectures?id=${lecture.id}`, { method: 'DELETE' });
      deleteStoredLecture(lecture.id);
      if (onDeleted) {
        onDeleted(lecture.id);
      } else {
        window.location.reload();
      }
    } catch (err) {
      deleteStoredLecture(lecture.id);
      if (onDeleted) onDeleted(lecture.id);
    } finally {
      setDeleting(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditOpen(true);
  };

  return (
    <>
      <Link
        href={`/lectures/${lecture.id}`}
        className="group block rounded-2xl border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-md transition relative overflow-hidden"
      >
        {/* 상단: 카테고리 & 입장 회원 등급 & 관리자 액션 */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
            {lecture.category}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400">입장 등급:</span>
            {lecture.minViewRole === 'guest' ? (
              <span className="inline-flex items-center font-semibold rounded-full px-2 py-0.5 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                누구나 입장
              </span>
            ) : (
              <RoleBadge role={lecture.minViewRole} size="sm" />
            )}

            {/* 관리자 수정/삭제 버튼 */}
            {isAdmin && (
              <div className="flex items-center gap-1 ml-2 border-l border-gray-200 pl-2">
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="p-1 text-gray-400 hover:text-carrot hover:bg-orange-50 rounded transition"
                  title="강의 수정"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                  title="강의 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 제목 & 설명 */}
        <div className="mb-4">
          <h3 className="text-base font-bold text-gray-900 group-hover:text-carrot transition-colors line-clamp-1 mb-1.5">
            {lecture.title}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {lecture.description}
          </p>
        </div>

        {/* 하단 메타 정보 */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {lecture.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {lecture.duration}
              </span>
            )}
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              자료 {lecture.materials?.length || 0}개
            </span>
          </div>

          <div className="flex items-center gap-1">
            {canView ? (
              <span className="flex items-center gap-1 text-gray-900 font-semibold group-hover:translate-x-0.5 transition-transform">
                <PlayCircle className="w-4 h-4 text-carrot" />
                <span>입장하기</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-400">
                <Lock className="w-3.5 h-3.5" />
                <span>입장 제한</span>
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* 강의 수정 모달 */}
      {isEditOpen && (
        <LectureEditModal
          lecture={lecture}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSuccess={(updated) => {
            if (onUpdated) onUpdated(updated);
          }}
        />
      )}
    </>
  );
}
