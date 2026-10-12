'use client';

import React, { useState } from 'react';
import { LectureMaterial, MemberRole } from '@/types';
import { hasRequiredRole } from '@/lib/google/drive';
import { RoleBadge } from '../common/RoleBadge';
import { FileText, Download, Lock, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { getDriveViewerUrl } from '@/lib/google/drive';

interface MaterialListProps {
  materials: LectureMaterial[];
  userRole?: MemberRole;
  userName?: string;
}

export function MaterialList({ materials, userRole, userName }: MaterialListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const handleDownload = async (material: LectureMaterial) => {
    if (!userRole) {
      setAlertMessage({ text: '로그인 후 다운로드할 수 있습니다.', type: 'error' });
      return;
    }

    if (!hasRequiredRole(userRole, material.minDownloadRole)) {
      setAlertMessage({
        text: `이 자료는 [${material.minDownloadRole.toUpperCase()}] 등급 이상만 다운로드할 수 있습니다.`,
        type: 'error',
      });
      return;
    }

    setDownloadingId(material.id);
    setAlertMessage(null);

    try {
      const res = await fetch('/api/materials/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userRole,
          minDownloadRole: material.minDownloadRole,
          driveFileId: material.driveFileId,
          fileUrl: material.fileUrl,
          materialName: material.name,
          userName: userName || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAlertMessage({ text: data.error || '다운로드 권한이 없습니다.', type: 'error' });
      } else {
        setAlertMessage({ text: `${material.name} 다운로드를 시작합니다.`, type: 'success' });
        // 다운로드 링크 열기
        window.open(data.downloadUrl, '_blank');
      }
    } catch (e) {
      setAlertMessage({ text: '다운로드 요청 중 네트워크 오류가 발생했습니다.', type: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };

  if (!materials || materials.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
        등록된 첨부 강의 자료가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alertMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
            alertMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {alertMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{alertMessage.text}</span>
        </div>
      )}

      <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        {materials.map((mat) => {
          const canDownload = hasRequiredRole(userRole, mat.minDownloadRole);

          return (
            <div
              key={mat.id}
              className="p-4 flex flex-col gap-3 hover:bg-gray-50/80 transition"
            >
              {/* 파일 메타 정보 */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-carrot">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 leading-snug break-all line-clamp-2" title={mat.name}>
                    {mat.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-gray-500">
                    {mat.fileSize && (
                      <span className="text-gray-400">{mat.fileSize}</span>
                    )}
                    {mat.fileSize && <span className="text-gray-300">•</span>}
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-gray-400">권한:</span>
                      <RoleBadge role={mat.minDownloadRole} size="sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 액션 버튼 그룹 */}
              <div className="flex items-center gap-2 pt-0.5">
                {canDownload && (
                  <a
                    href={getDriveViewerUrl(mat.driveFileId || mat.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-1.5 transition shadow-xs"
                    title="웹 브라우저에서 바로 열기"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-carrot shrink-0" />
                    <span className="whitespace-nowrap">바로보기</span>
                  </a>
                )}
                <button
                  onClick={() => handleDownload(mat)}
                  disabled={downloadingId === mat.id}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs ${
                    canDownload
                      ? 'flex-1 bg-gray-900 hover:bg-black text-white'
                      : 'w-full bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title={canDownload ? '자료 다운로드' : '다운로드 권한 필요'}
                >
                  {canDownload ? (
                    <>
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span className="whitespace-nowrap">{downloadingId === mat.id ? '준비 중...' : '다운로드'}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="whitespace-nowrap">다운로드 잠김</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
