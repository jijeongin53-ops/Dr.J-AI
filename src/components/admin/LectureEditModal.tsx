'use client';

import React, { useState } from 'react';
import { Lecture, MemberRole } from '@/types';
import { LECTURE_CATEGORIES } from '@/lib/constants';
import { updateStoredLecture } from '@/lib/lecturesStorage';
import { X, CheckCircle2, Edit3 } from 'lucide-react';

interface LectureEditModalProps {
  lecture: Lecture;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Lecture) => void;
}

export function LectureEditModal({
  lecture,
  isOpen,
  onClose,
  onSuccess,
}: LectureEditModalProps) {
  const [loading, setLoading] = useState(false);

  // Form states initialized with existing lecture values
  const [title, setTitle] = useState(lecture.title);
  const [description, setDescription] = useState(lecture.description);
  const [category, setCategory] = useState<string>(lecture.category || LECTURE_CATEGORIES[1]);
  const [videoUrl, setVideoUrl] = useState(lecture.videoUrl || '');
  const [duration, setDuration] = useState(lecture.duration || '45분');
  const [minViewRole, setMinViewRole] = useState<MemberRole>(lecture.minViewRole || 'guest');
  const [minDownloadRole, setMinDownloadRole] = useState<MemberRole>(
    lecture.minDownloadRole || 'guest'
  );

  // Materials
  const initialMaterial = lecture.materials?.[0];
  const [materialName, setMaterialName] = useState(initialMaterial?.name || '');
  const [materialDriveId, setMaterialDriveId] = useState(
    initialMaterial?.driveFileId || initialMaterial?.fileUrl || ''
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('제목과 강의 설명을 입력하세요.');
      return;
    }

    setLoading(true);

    const updatedMaterials = materialName.trim()
      ? [
          {
            id: initialMaterial?.id || `mat-${Date.now()}`,
            name: materialName.trim(),
            driveFileId: materialDriveId.trim(),
            fileSize: initialMaterial?.fileSize || '자료',
            minDownloadRole,
          },
        ]
      : [];

    const updatedPayload: Lecture = {
      ...lecture,
      title: title.trim(),
      description: description.trim(),
      category,
      videoUrl: videoUrl.trim(),
      duration: duration.trim(),
      minViewRole,
      minDownloadRole,
      materials: updatedMaterials,
    };

    try {
      // 1. 서버 API 호출
      const res = await fetch('/api/lectures', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload),
      });

      // 2. 로컬스토리지 영구 저장
      updateStoredLecture(updatedPayload);

      alert('강의 정보가 성공적으로 수정되었습니다.');
      onSuccess(updatedPayload);
      onClose();
    } catch (err) {
      // 오프라인/서버 에러 시에도 로컬스토리지 우선 갱신
      updateStoredLecture(updatedPayload);
      alert('강의 정보가 수정되었습니다 (로컬 저장 완료).');
      onSuccess(updatedPayload);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-200 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-carrot" />
            <h3 className="text-base sm:text-lg font-bold text-gray-950">
              강의 및 교육 자료 수정 (관리자)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
                placeholder="강의 제목을 입력하세요"
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot"
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
              placeholder="강의 요약 및 설명을 입력하세요"
              className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot resize-none"
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
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-carrot"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                시청 최소 등급
              </label>
              <select
                value={minViewRole}
                onChange={(e) => setMinViewRole(e.target.value as MemberRole)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-carrot"
              >
                <option value="guest">준회원 이상 (누구나 시청 가능)</option>
                <option value="regular">정회원 이상 시청 가능</option>
                <option value="vip">VIP 회원 전용</option>
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
                placeholder="예: 04강_실습_자료.pdf"
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-carrot"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                첨부자료 드라이브 링크 / ID
              </label>
              <input
                type="text"
                value={materialDriveId}
                onChange={(e) => setMaterialDriveId(e.target.value)}
                placeholder="파일 공유 링크 또는 ID"
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-carrot"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-carrot hover:bg-carrot-hover text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? '수정 중...' : '수정 내용 저장'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
