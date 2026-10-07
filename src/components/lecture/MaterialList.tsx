'use client';

import React, { useState } from 'react';
import { LectureMaterial, MemberRole } from '@/types';
import { hasRequiredRole } from '@/lib/google/drive';
import { RoleBadge } from '../common/RoleBadge';
import { FileText, Download, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface MaterialListProps {
  materials: LectureMaterial[];
  userRole?: MemberRole;
}

export function MaterialList({ materials, userRole }: MaterialListProps) {
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
          materialName: material.name,
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
          className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
            alertMessage.type === 'error'
              ? 'bg-red-950/40 border-red-900 text-red-300'
              : 'bg-emerald-950/40 border-emerald-900 text-emerald-300'
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

      <div className="divide-y divide-zinc-800/80 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
        {materials.map((mat) => {
          const canDownload = hasRequiredRole(userRole, mat.minDownloadRole);

          return (
            <div
              key={mat.id}
              className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-900/60 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-zinc-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{mat.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                    {mat.fileSize && <span>{mat.fileSize}</span>}
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      다운로드 권한: <RoleBadge role={mat.minDownloadRole} size="sm" />
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <button
                  onClick={() => handleDownload(mat)}
                  disabled={downloadingId === mat.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                    canDownload
                      ? 'bg-zinc-100 hover:bg-white text-black font-semibold'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }`}
                  title={canDownload ? '구글 드라이브에서 다운로드' : '다운로드 권한 필요'}
                >
                  {canDownload ? (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadingId === mat.id ? '준비 중...' : '다운로드'}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>다운로드 잠김</span>
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
