'use client';

import React, { useState } from 'react';
import { MemberRole, Lecture } from '@/types';
import { LECTURE_CATEGORIES } from '@/lib/constants';
import { PlusCircle, Video, CheckCircle2 } from 'lucide-react';

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
  const [minViewRole, setMinViewRole] = useState<MemberRole>('guest');
  const [minDownloadRole, setMinDownloadRole] = useState<MemberRole>('guest');

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
    const materials = materialName.trim()
      ? [
          {
            id: `mat-${Date.now()}`,
            name: materialName.trim(),
            driveFileId: materialDriveId.trim(),
            fileSize: '자료',
            minDownloadRole,
          },
        ]
      : [];

    const newLectureData: Lecture = {
      id: `lec-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category,
      videoUrl: videoUrl.trim(),
      duration: duration.trim(),
      minViewRole,
      minDownloadRole,
      materials,
      createdAt: new Date().toISOString().split('T')[0],
      isPublished: true,
    };

    try {
      const res = await fetch('/api/lectures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newLectureData.title,
          description: newLectureData.description,
          category: newLectureData.category,
          videoUrl: newLectureData.videoUrl,
          duration: newLectureData.duration,
          minViewRole: newLectureData.minViewRole,
          minDownloadRole: newLectureData.minDownloadRole,
          materials: newLectureData.materials,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const finalLecture = data.lecture || newLectureData;
        const { saveStoredLecture } = await import('@/lib/lecturesStorage');
        saveStoredLecture(finalLecture);

        alert('새 강의가 성공적으로 등록되었습니다.');
        setTitle('');
        setDescription('');
        setVideoUrl('');
        setMaterialName('');
        setMaterialDriveId('');
        setIsOpen(false);
        if (onSuccess) {
          onSuccess(finalLecture);
        } else {
          window.location.reload();
        }
      } else {
        // 서버 응답 지연/에러 시에도 로컬에 안전하게 저장
        const { saveStoredLecture } = await import('@/lib/lecturesStorage');
        saveStoredLecture(newLectureData);
        alert('새 강의가 등록되었습니다 (로컬 보존 완료).');
        setIsOpen(false);
        if (onSuccess) {
          onSuccess(newLectureData);
        } else {
          window.location.reload();
        }
      }
    } catch (e) {
      // 네트워크 예외 발생 시 로컬 보존
      const { saveStoredLecture } = await import('@/lib/lecturesStorage');
      saveStoredLecture(newLectureData);
      alert('새 강의가 등록되었습니다.');
      setIsOpen(false);
      if (onSuccess) {
        onSuccess(newLectureData);
      } else {
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-gray-900 font-bold text-base flex items-center gap-2">
            <Video className="w-5 h-5 text-carrot" />
            강의 및 교육 자료 업로드 등록 (관리자)
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            강의 영상 링크를 등록하여 회원들에게 스트리밍하고 자료를 제공합니다.
          </p>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-carrot hover:bg-carrot-hover text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isOpen ? '닫기' : '새 강의 등록'}</span>
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t border-gray-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                강의 제목 *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: [4강] AI 툴을 활용한 10분 마케팅 콘텐츠 제작"
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                카테고리 *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-carrot"
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
            <label className="block text-xs font-bold text-gray-700 mb-1">
              강의 설명 및 요약 *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="수강생들을 위한 강의 핵심 내용과 실습 가이드를 작성하세요."
              className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                동영상 링크 or 파일 ID
              </label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/... 또는 파일ID"
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                입장 회원 등급 *
              </label>
              <select
                value={minViewRole}
                onChange={(e) => setMinViewRole(e.target.value as MemberRole)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-carrot"
              >
                <option value="guest">누구나 입장 가능 (비회원/준회원 포함)</option>
                <option value="regular">정회원 이상 입장 가능</option>
                <option value="vip">VIP 회원 전용 입장</option>
                <option value="admin">관리자 전용 비공개</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                자료 다운로드 최소 등급
              </label>
              <select
                value={minDownloadRole}
                onChange={(e) => setMinDownloadRole(e.target.value as MemberRole)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-carrot"
              >
                <option value="guest">준회원 이상 (누구나 다운로드 가능)</option>
                <option value="regular">정회원 이상 다운로드</option>
                <option value="vip">VIP 회원만 다운로드 가능</option>
                <option value="admin">관리자만 다운로드</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                첨부 강의자료 파일명
              </label>
              <input
                type="text"
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                placeholder="예: 04강_실습_프롬프트_템플릿.pdf"
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                첨부자료 드라이브 파일 ID / 링크
              </label>
              <input
                type="text"
                value={materialDriveId}
                onChange={(e) => setMaterialDriveId(e.target.value)}
                placeholder="파일 공유 링크 또는 ID"
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-gray-900 text-white hover:bg-black text-xs font-bold rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
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
