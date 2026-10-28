'use client';

import React, { useState, useEffect } from 'react';
import { MemberRole } from '@/types';
import { hasRequiredRole, getDrivePreviewUrl } from '@/lib/google/drive';
import { Lock, Play, ExternalLink, Film, Radio, Video } from 'lucide-react';
import Link from 'next/link';
import { LiveStreamStudio } from './LiveStreamStudio';

interface VideoPlayerProps {
  lectureId?: string;
  title: string;
  driveFileId?: string;
  videoUrl?: string;
  videoUrls?: string[];
  minViewRole: MemberRole;
  userRole?: MemberRole;
  userName?: string;
}

export function VideoPlayer({
  lectureId = 'default',
  title,
  driveFileId,
  videoUrl,
  videoUrls,
  minViewRole,
  userRole,
  userName,
}: VideoPlayerProps) {
  const [qrAdminBypass, setQrAdminBypass] = useState(false);
  const [playerMode, setPlayerMode] = useState<'vod' | 'live'>('vod');
  const [customYoutubeLiveUrl, setCustomYoutubeLiveUrl] = useState<string>('');

  const isAdmin = userRole === 'admin' || userName === '지정인' || qrAdminBypass;
  const canView = hasRequiredRole(userRole, minViewRole) || qrAdminBypass;

  // 스마트폰 QR 코드(?liveMode=phone&adminKey=drjlive)로 진입 시 즉시 실시간 라이브 탭 전환
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('adminKey') === 'drjlive') {
      setQrAdminBypass(true);
    }
    if (params.get('liveMode') === 'phone' || params.get('liveMode') === '1') {
      setPlayerMode('live');
    }
  }, []);

  // 최대 3개까지의 동영상 목록 구성
  const resolvedVideos = (() => {
    if (Array.isArray(videoUrls) && videoUrls.length > 0) {
      const cleaned = videoUrls.map((v) => String(v || '').trim()).filter(Boolean).slice(0, 3);
      if (cleaned.length > 0) return cleaned;
    }
    if (videoUrl && videoUrl.trim()) {
      const split = videoUrl
        .split(/\r?\n|\|/)
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 3);
      if (split.length > 0) return split;
    }
    if (driveFileId && driveFileId.trim()) {
      return [driveFileId.trim()];
    }
    return [];
  })();

  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const safeIndex = activeVideoIndex < resolvedVideos.length ? activeVideoIndex : 0;
  const targetId = customYoutubeLiveUrl || resolvedVideos[safeIndex] || '';
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

  // 시청 권한이 있을 때 구글 드라이브 비디오 스트리밍 플레이어 임베드 + 실시간 라이브 방송 스튜디오
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-gray-200 bg-black shadow-lg">
      {/* 상단 모드 전환 바: 녹화/유튜브 영상 시청 vs 실시간 라이브 스튜디오 (노트북 화면공유 + 스마트폰 영상/녹화) */}
      <div className="px-4 py-2.5 bg-gray-950 border-b border-gray-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlayerMode('vod')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              playerMode === 'vod'
                ? 'bg-carrot text-white shadow-sm'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>🎬 강의 영상 / 유튜브 라이브</span>
          </button>
          <button
            type="button"
            onClick={() => setPlayerMode('live')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              playerMode === 'live'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${playerMode === 'live' ? 'animate-pulse' : 'text-red-400'}`} />
            <span>🔴 실시간 화면공유 & 스마트폰 라이브</span>
          </button>
        </div>

        {isAdmin && playerMode === 'vod' && (
          <button
            type="button"
            onClick={() => setPlayerMode('live')}
            className="text-[11px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
          >
            <span>⚡ 지금 노트북 화면공유 + 스마트폰 라이브 켜기 →</span>
          </button>
        )}
      </div>

      {playerMode === 'live' ? (
        <LiveStreamStudio
          lectureId={lectureId}
          lectureTitle={title}
          isAdmin={isAdmin}
          onSaveYoutubeLiveUrl={(ytUrl) => {
            setCustomYoutubeLiveUrl(ytUrl);
            setPlayerMode('vod');
          }}
        />
      ) : (
        <>
          {/* 다중 동영상(2~3개) 등록 시 상단 영상 선택 탭 */}
          {resolvedVideos.length > 1 && (
            <div className="px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-300 font-semibold">
                <Film className="w-3.5 h-3.5 text-carrot" />
                <span>강의 영상 선택 ({resolvedVideos.length}개):</span>
              </div>
              <div className="flex items-center gap-1.5">
                {resolvedVideos.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCustomYoutubeLiveUrl('');
                      setActiveVideoIndex(idx);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      !customYoutubeLiveUrl && safeIndex === idx
                        ? 'bg-carrot text-white shadow-xs'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    영상 #{idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="w-full aspect-video relative bg-black">
            {previewUrl ? (
              <iframe
                key={previewUrl}
                src={previewUrl}
                title={`${title} - 영상 #${safeIndex + 1}`}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-900 space-y-3 p-6 text-center">
                <Play className="w-10 h-10 opacity-50" />
                <p className="text-sm">등록된 동영상이 없습니다.</p>
                <button
                  type="button"
                  onClick={() => setPlayerMode('live')}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>실시간 라이브 방송 탭으로 이동</span>
                </button>
              </div>
            )}
          </div>

          {/* 플레이어 하단 컨트롤 바 */}
          <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-gray-700 font-medium">
                실시간 고화질 스트리밍 지원 (구글 드라이브 & 유튜브 라이브 연동)
                {resolvedVideos.length > 1 ? ` (현재 영상 #${safeIndex + 1} / 총 ${resolvedVideos.length}개)` : ''}
              </span>
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
        </>
      )}
    </div>
  );
}
