'use client';

import React, { useState } from 'react';
import { MemberRole, Lecture } from '@/types';
import { LECTURE_CATEGORIES } from '@/lib/constants';
import { PlusCircle, Video, CheckCircle2, Plus, Trash2 } from 'lucide-react';

const MAX_MATERIALS = 20;
const MAX_VIDEOS = 3;

interface MaterialInputItem {
  id: string;
  name: string;
  driveId: string;
}

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
  const [videoUrls, setVideoUrls] = useState<string[]>(['']);
  const [duration, setDuration] = useState('45분');
  const [minViewRole, setMinViewRole] = useState<MemberRole>('guest');
  const [minDownloadRole, setMinDownloadRole] = useState<MemberRole>('guest');
  const [maxAttendees, setMaxAttendees] = useState<number>(30); // [요구사항 4]: 입장 가능한 회원 수 설정 (0은 무제한)

  // 동영상 링크 추가/삭제/변경 핸들러 (최대 3개)
  const handleAddVideoRow = () => {
    if (videoUrls.length >= MAX_VIDEOS) {
      alert(`동영상 링크는 최대 ${MAX_VIDEOS}개까지 추가할 수 있습니다.`);
      return;
    }
    setVideoUrls((prev) => [...prev, '']);
  };

  const handleRemoveVideoRow = (index: number) => {
    setVideoUrls((prev) => {
      if (prev.length <= 1) {
        return [''];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleVideoChange = (index: number, value: string) => {
    setVideoUrls((prev) => prev.map((v, idx) => (idx === index ? value : v)));
  };

  // Materials (최대 20개까지 첨부 가능)
  const [materialItems, setMaterialItems] = useState<MaterialInputItem[]>([
    { id: `mat-temp-${Date.now()}-0`, name: '', driveId: '' },
  ]);

  const handleAddMaterialRow = () => {
    if (materialItems.length >= MAX_MATERIALS) {
      alert(`첨부 강의자료는 최대 ${MAX_MATERIALS}개까지 등록할 수 있습니다.`);
      return;
    }
    setMaterialItems((prev) => [
      ...prev,
      { id: `mat-temp-${Date.now()}-${prev.length}`, name: '', driveId: '' },
    ]);
  };

  const handleRemoveMaterialRow = (index: number) => {
    setMaterialItems((prev) => {
      if (prev.length <= 1) {
        return [{ id: `mat-temp-${Date.now()}-0`, name: '', driveId: '' }];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleMaterialChange = (index: number, field: 'name' | 'driveId', value: string) => {
    setMaterialItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      alert('제목과 강의 설명을 입력하세요.');
      return;
    }

    setLoading(true);
    const materials = materialItems
      .filter((item) => item.name.trim() || item.driveId.trim())
      .slice(0, MAX_MATERIALS)
      .map((item, idx) => ({
        id: `mat-${Date.now()}-${idx}`,
        name: item.name.trim() || `첨부자료_${idx + 1}`,
        driveFileId: item.driveId.trim(),
        fileUrl: item.driveId.trim(),
        fileSize: '자료',
        minDownloadRole,
      }));

    const cleanedVideos = videoUrls
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, MAX_VIDEOS);

    const newLectureData: Lecture = {
      id: `lec-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category,
      videoUrl: cleanedVideos[0] || '',
      videoUrls: cleanedVideos,
      duration: duration.trim(),
      minViewRole,
      minDownloadRole,
      maxAttendees: Number(maxAttendees) >= 0 ? Number(maxAttendees) : 30,
      materials,
      createdAt: new Date().toISOString().split('T')[0],
      isPublished: true,
    };

    try {
      const res = await fetch('/api/lectures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newLectureData.id,
          title: newLectureData.title,
          description: newLectureData.description,
          category: newLectureData.category,
          videoUrl: newLectureData.videoUrl,
          videoUrls: newLectureData.videoUrls,
          duration: newLectureData.duration,
          minViewRole: newLectureData.minViewRole,
          minDownloadRole: newLectureData.minDownloadRole,
          maxAttendees: newLectureData.maxAttendees,
          materials: newLectureData.materials,
          createdAt: newLectureData.createdAt,
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
        setVideoUrls(['']);
        setMaterialItems([{ id: `mat-temp-${Date.now()}-0`, name: '', driveId: '' }]);
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
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot"
                title="초과 시 대기열로 등록되며 퇴장 발생 시 자동 입장됩니다 (0은 무제한)"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">0 입력 시 무제한</span>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-gray-800">
                  강의 동영상 링크 목록 ({videoUrls.length}/{MAX_VIDEOS}개)
                </label>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  구글 드라이브 동영상 공유 링크 또는 파일 ID를 최대 {MAX_VIDEOS}개까지 추가할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddVideoRow}
                disabled={videoUrls.length >= MAX_VIDEOS}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-carrot border border-blue-200 text-xs font-bold rounded-xl flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>동영상 추가 ({videoUrls.length}/{MAX_VIDEOS})</span>
              </button>
            </div>

            <div className="space-y-2">
              {videoUrls.map((vUrl, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-gray-50/70 border border-gray-200/80 rounded-xl p-2.5"
                >
                  <span className="px-2 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-bold text-gray-700 shrink-0">
                    영상 #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={vUrl}
                    onChange={(e) => handleVideoChange(idx, e.target.value)}
                    placeholder="https://drive.google.com/file/d/... 또는 파일ID"
                    className="flex-1 bg-white border border-gray-300 rounded-xl p-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveVideoRow(idx)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition shrink-0"
                    title={videoUrls.length > 1 ? '이 동영상 칸 삭제' : '입력 내용 비우기'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
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
                      placeholder={`예: ${String(idx + 1).padStart(2, '0')}강_실습_프롬프트_템플릿.pdf`}
                      className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot"
                    />
                  </div>

                  <div className="md:col-span-6">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      첨부자료 드라이브 파일 ID / 링크 #{idx + 1}
                    </label>
                    <input
                      type="text"
                      value={item.driveId}
                      onChange={(e) => handleMaterialChange(idx, 'driveId', e.target.value)}
                      placeholder="파일 공유 링크 또는 ID"
                      className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot"
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
