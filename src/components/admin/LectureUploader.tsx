'use client';

import React, { useState } from 'react';
import { MemberRole, Lecture } from '@/types';
import { LECTURE_CATEGORIES, GOOGLE_DRIVE_FOLDER_URL } from '@/lib/constants';
import { PlusCircle, ExternalLink, Video, FileText, CheckCircle2 } from 'lucide-react';

interface LectureUploaderProps {
  onSuccess?: (newLecture: Lecture) => void;
}

export function LectureUploader({ onSuccess }: LectureUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(LECTURE_CATEGORIES[1]);
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState('45분');
  const [minViewRole, setMinViewRole] = useState<MemberRole>('regular');
  const [minDownloadRole, setMinDownloadRole] = useState<MemberRole>('vip');

  // Materials
  const [materialName, setMaterialName] = useState('');
  const [materialDriveId, setMaterialDriveId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      alert('제목과 강의 설명을 입력하세요.');
      return;
    }

    setLoading(true);
    try {
      const materials = materialName.trim()
        ? [
            {
              name: materialName.trim(),
              driveFileId: materialDriveId.trim(),
              fileSize: '자료',
              minDownloadRole,
            },
          ]
        : [];

      const res = await fetch('/api/lectures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          videoUrl,
          duration,
          minViewRole,
          minDownloadRole,
          materials,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert('새 강의가 성공적으로 등록되었습니다.');
        setTitle('');
        setDescription('');
        setVideoUrl('');
        setMaterialName('');
        setMaterialDriveId('');
        setIsOpen(false);
        if (onSuccess) {
          onSuccess(data.lecture);
        } else {
          window.location.reload();
        }
      } else {
        alert('강의 등록에 실패했습니다.');
      }
    } catch (e) {
      alert('등록 중 네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <Video className="w-5 h-5 text-carrot" />
            강의 및 교육 자료 업로드 등록 (관리자)
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            구글 드라이브 폴더에 영상을 업로드한 후 링크를 등록하여 회원들에게 스트리밍합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={GOOGLE_DRIVE_FOLDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-xs text-zinc-300 flex items-center gap-1.5 transition"
          >
            <span>드라이브 폴더 열기</span>
            <ExternalLink className="w-3.5 h-3.5 text-carrot" />
          </a>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-4 py-1.5 bg-carrot hover:bg-carrot-hover text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isOpen ? '닫기' : '새 강의 등록'}</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t border-zinc-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                강의 제목 *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: [4강] AI 툴을 활용한 10분 마케팅 콘텐츠 제작"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                카테고리 *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-zinc-600"
              >
                {LECTURE_CATEGORIES.filter((c) => c !== '전체').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              강의 설명 및 요약 *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="수강생들을 위한 강의 핵심 내용과 실습 가이드를 작성하세요."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                구글 드라이브 동영상 링크 or 파일 ID
              </label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/... 또는 파일ID"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                시청 최소 등급 (입장 제어)
              </label>
              <select
                value={minViewRole}
                onChange={(e) => setMinViewRole(e.target.value as MemberRole)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-zinc-600"
              >
                <option value="guest">준회원 이상 (누구나 시청 가능)</option>
                <option value="regular">정회원 이상 시청 가능</option>
                <option value="vip">VIP 회원 전용</option>
                <option value="admin">관리자 전용 비공개</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                자료 다운로드 최소 등급
              </label>
              <select
                value={minDownloadRole}
                onChange={(e) => setMinDownloadRole(e.target.value as MemberRole)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-zinc-600"
              >
                <option value="regular">정회원 이상 다운로드</option>
                <option value="vip">VIP 회원만 다운로드 가능</option>
                <option value="admin">관리자만 다운로드</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-850">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                첨부 강의자료 파일명
              </label>
              <input
                type="text"
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                placeholder="예: 04강_실습_프롬프트_템플릿.pdf"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                첨부자료 드라이브 파일 ID / 링크
              </label>
              <input
                type="text"
                value={materialDriveId}
                onChange={(e) => setMaterialDriveId(e.target.value)}
                placeholder="구글 드라이브 파일 공유 링크 또는 ID"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs rounded-lg transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-white text-black hover:bg-zinc-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-carrot" />
              <span>{loading ? '등록 중...' : '강의 등록 완료'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
