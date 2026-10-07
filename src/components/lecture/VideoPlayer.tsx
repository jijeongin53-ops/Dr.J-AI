'use client';

import React from 'react';
import { MemberRole } from '@/types';
import { hasRequiredRole, getDrivePreviewUrl } from '@/lib/google/drive';
import { Lock, Play, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface VideoPlayerProps {
  title: string;
  driveFileId?: string;
  videoUrl?: string;
  minViewRole: MemberRole;
  userRole?: MemberRole;
}

export function VideoPlayer({
  title,
  driveFileId,
  videoUrl,
  minViewRole,
  userRole,
}: VideoPlayerProps) {
  const canView = hasRequiredRole(userRole, minViewRole);
  const targetId = driveFileId || videoUrl;
  const previewUrl = targetId ? getDrivePreviewUrl(targetId) : '';

  // 권한 부족 시 잠금 안내 화면
  if (!canView) {
    return (
      <div className="w-full aspect-video bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col items-center justify-center p-6 text-center shadow-inner relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,111,15,0.06)_0,_transparent_70%)]" />
        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mb-4 text-zinc-400">
          <Lock className="w-6 h-6 text-carrot" />
        </div>
        <h3 className="text-white font-semibold text-lg mb-1">
          열람 권한이 제한된 강의입니다
        </h3>
        <p className="text-zinc-400 text-xs sm:text-sm max-w-md mb-5 leading-relaxed">
          이 강의는 <span className="text-carrot font-semibold uppercase">{minViewRole}</span> 등급 이상 회원만 실시간 시청할 수 있습니다.
          모임장 승인 또는 등급 업그레이드를 요청하세요.
        </p>
        <Link
          href="/chat"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg text-xs font-medium transition"
        >
          모임장에게 승인 문의하기
        </Link>
      </div>
    );
  }

  // 시청 권한이 있을 때 구글 드라이브 비디오 스트리밍 플레이어 임베드
  return (
    <div className="w-full rounded-xl overflow-hidden border border-zinc-800 bg-black shadow-2xl">
      <div className="w-full aspect-video relative bg-black">
        {previewUrl ? (
          <iframe
            src={previewUrl}
            title={title}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
            <Play className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">등록된 구글 드라이브 영상이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 플레이어 하단 컨트롤 바 */}
      <div className="px-4 py-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>구글 드라이브 실시간 스트리밍 지원</span>
        </div>
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-white transition"
          >
            <span>드라이브 뷰어로 열기</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
