'use client';

import React, { useState } from 'react';
import { Lecture, MemberRole } from '@/types';
import { LECTURE_CATEGORIES } from '@/lib/constants';
import { updateStoredLecture } from '@/lib/lecturesStorage';
import { X, CheckCircle2, Edit3, Plus, Trash2 } from 'lucide-react';

const MAX_MATERIALS = 20;

interface MaterialInputItem {
  id: string;
  name: string;
  driveId: string;
  fileSize?: string;
}

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
  const [startTime, setStartTime] = useState(lecture.startTime || '');
  const [minViewRole, setMinViewRole] = useState<MemberRole>(lecture.minViewRole || 'guest');
  const [minDownloadRole, setMinDownloadRole] = useState<MemberRole>(
    lecture.minDownloadRole || 'guest'
  );
  const [maxAttendees, setMaxAttendees] = useState<number>(
    typeof lecture.maxAttendees === 'number' ? lecture.maxAttendees : 30
  );

  // Materials (최대 20개까지 첨부 가능)
  const initialMaterial = lecture.materials?.[0];
  const [materialItems, setMaterialItems] = useState<MaterialInputItem[]>(() => {
    if (lecture.materials && lecture.materials.length > 0) {
      return lecture.materials.slice(0, MAX_MATERIALS).map((m, idx) => ({
        id: m.id || `mat-init-${idx}`,
        name: m.name || '',
        driveId: m.driveFileId || m.fileUrl || '',
        fileSize: m.fileSize || '자료',
      }));
    }
    return [
      {
        id: initialMaterial?.id || `mat-temp-${Date.now()}-0`,
        name: initialMaterial?.name || '',
        driveId: initialMaterial?.driveFileId || initialMaterial?.fileUrl || '',
        fileSize: initialMaterial?.fileSize || '자료',
      },
    ];
  });

  const handleAddMaterialRow = () => {
    if (materialItems.length >= MAX_MATERIALS) {
      alert(`첨부 강의자료는 최대 ${MAX_MATERIALS}개까지 등록할 수 있습니다.`);
      return;
    }
    setMaterialItems((prev) => [
      ...prev,
      {
        id: `mat-temp-${Date.now()}-${prev.length}`,
        name: '',
        driveId: '',
        fileSize: '자료',
      },
    ]);
  };

  const handleRemoveMaterialRow = (index: number) => {
    setMaterialItems((prev) => {
      if (prev.length <= 1) {
        return [{ id: `mat-temp-${Date.now()}-0`, name: '', driveId: '', fileSize: '자료' }];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleMaterialChange = (index: number, field: 'name' | 'driveId', value: string) => {
    setMaterialItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('제목과 강의 설명을 입력하세요.');
      return;
    }

    setLoading(true);

    const updatedMaterials = materialItems
      .filter((item) => item.name.trim() || item.driveId.trim())
      .slice(0, MAX_MATERIALS)
      .map((item, idx) => ({
        id: item.id && !item.id.startsWith('mat-temp-') ? item.id : `mat-${Date.now()}-${idx}`,
        name: item.name.trim() || `첨부자료_${idx + 1}`,
        driveFileId: item.driveId.trim(),
        fileUrl: item.driveId.trim(),
        fileSize: item.fileSize || '자료',
        minDownloadRole,
      }));

    const updatedPayload: Lecture = {
      ...lecture,
      title: title.trim(),
      description: description.trim(),
      category,
      videoUrl: videoUrl.trim(),
      startTime: startTime.trim(),
      duration: duration.trim(),
      minViewRole,
      minDownloadRole,
      maxAttendees: Number(maxAttendees) >= 0 ? Number(maxAttendees) : 30,
      materials: updatedMaterials,
    };

    try {
      // 1. 서버 API 호출
      const res = await fetch('/api/lectures', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload),
      });

      let finalLecture = updatedPayload;
      if (res.ok) {
        const data = await res.json();
        if (data?.lecture) {
          finalLecture = data.lecture;
        }
      }

      // 2. 로컬스토리지 영구 저장
      updateStoredLecture(finalLecture);

      alert('강의 정보가 성공적으로 수정되었습니다.');
      onSuccess(finalLecture);
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                강의 시작 시간 (라이브/세미나)
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="예: 19:30 or 2026-10-12 19:30"
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-carrot font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                강의 시간 (소요시간)
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="예: 45분"
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-carrot font-medium"
              />
            </div>

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

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                입장 정원 수 (명) *
              </label>
              <input
                type="number"
                min="0"
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(parseInt(e.target.value, 10) || 0)}
                placeholder="예: 30 (0은 무제한)"
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-carrot"
                title="초과 시 대기열로 등록되며 퇴장 발생 시 자동 입장됩니다 (0은 무제한)"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">0 입력 시 무제한</span>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-gray-800">
                  첨부 강의자료 목록 ({materialItems.length}/{MAX_MATERIALS}개)
                </label>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  구글 드라이브 공유 링크 또는 파일 ID를 최대 {MAX_MATERIALS}개까지 추가할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddMaterialRow}
                disabled={materialItems.length >= MAX_MATERIALS}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-carrot border border-blue-200 text-xs font-bold rounded-xl flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>자료 추가 ({materialItems.length}/{MAX_MATERIALS})</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {materialItems.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end bg-gray-50/70 border border-gray-200/80 rounded-xl p-3"
                >
                  <div className="md:col-span-5">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      첨부 강의자료 파일명 #{idx + 1}
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleMaterialChange(idx, 'name', e.target.value)}
                      placeholder={`예: ${String(idx + 1).padStart(2, '0')}강_실습_자료.pdf`}
                      className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs text-gray-900 focus:outline-none focus:border-carrot"
                    />
                  </div>

                  <div className="md:col-span-6">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      첨부자료 드라이브 링크 / ID #{idx + 1}
                    </label>
                    <input
                      type="text"
                      value={item.driveId}
                      onChange={(e) => handleMaterialChange(idx, 'driveId', e.target.value)}
                      placeholder="파일 공유 링크 또는 ID"
                      className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs text-gray-900 focus:outline-none focus:border-carrot"
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveMaterialRow(idx)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition"
                      title={materialItems.length > 1 ? '이 자료 칸 삭제' : '입력 내용 비우기'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
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
