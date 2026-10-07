'use client';

import React from 'react';
import Link from 'next/link';
import { Lecture, MemberRole } from '@/types';
import { hasRequiredRole } from '@/lib/google/drive';
import { RoleBadge } from '../common/RoleBadge';
import { PlayCircle, Lock, FileText, Clock, ChevronRight } from 'lucide-react';

interface LectureCardProps {
  lecture: Lecture;
  userRole?: MemberRole;
}

export function LectureCard({ lecture, userRole }: LectureCardProps) {
  const canView = hasRequiredRole(userRole, lecture.minViewRole);

  return (
    <Link
      href={`/lectures/${lecture.id}`}
      className="group block rounded-xl border border-zinc-800 bg-zinc-950 p-5 hover:border-zinc-700 transition hover:shadow-lg relative overflow-hidden"
    >
      {/* 상단: 카테고리 & 시청 필요 등급 */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-medium text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">
          {lecture.category}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500">시청 권한:</span>
          <RoleBadge role={lecture.minViewRole} size="sm" />
        </div>
      </div>

      {/* 제목 & 설명 */}
      <div className="mb-4">
        <h3 className="text-base font-bold text-white group-hover:text-carrot transition-colors line-clamp-1 mb-1.5">
          {lecture.title}
        </h3>
        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
          {lecture.description}
        </p>
      </div>

      {/* 하단 메타 정보 */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-900 text-xs text-zinc-500">
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
            <span className="flex items-center gap-1 text-white font-medium group-hover:translate-x-0.5 transition-transform">
              <PlayCircle className="w-4 h-4 text-carrot" />
              <span>시청하기</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-zinc-500">
              <Lock className="w-3.5 h-3.5 text-zinc-500" />
              <span>잠김</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
