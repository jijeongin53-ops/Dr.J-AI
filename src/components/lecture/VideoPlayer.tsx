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
    const roleNameMap: Record<string, string> = {
      regular: '정회원 이상',
      vip: 'VIP 회원 전용',
      admin: '관리자 전용',
      guest: '준회원 이상',
    };
    const requiredRoleText = roleNameMap[minViewRole] || `${minViewRole} 등급 이상`;

    return (
      <div className="w-full aspect-video bg-gray-50 rounded-2xl border border-gray-200 flex flex-col items-center justify-center p-6 text-center shadow-inner relative overflow-hidden">
        <div className="w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 text-carrot shadow-sm">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-gray-900 font-bold text-lg mb-1">
          입장 권한이 제한된 강의실입니다
        </h3>
        <p className="text-gray-500 text-xs sm:text-sm max-w-md mb-5 leading-relaxed">
          이 강의실은 <span className="text-carrot font-bold">{requiredRoleText}</span> 회원만 입장하여 시청할 수 있습니다.
          로그인이 필요하거나 승인/등급 조정이 필요한 경우 모임장에게 문의해주세요.
        </p>
        <Link
          href="/chat"
          className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition shadow-sm"
        >
          모임장에게 승인 문의하기
        </Link>
      </div>
    );
  }

  // 시청 권한이 있을 때 구글 드라이브 비디오 스트리밍 플레이어 임베드
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-gray-200 bg-black shadow-lg">
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
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-900">
            <Play className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">등록된 동영상이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 플레이어 하단 컨트롤 바 */}
      <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-gray-700 font-medium">실시간 고화질 스트리밍 지원</span>
        </div>
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 font-medium transition"
          >
            <span>전체화면 새창으로 열기</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
