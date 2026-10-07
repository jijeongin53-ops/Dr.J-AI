'use client';

import React, { useEffect, useState } from 'react';
import { Lecture, MemberUser } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { initialLectures } from '@/lib/mockData';
import { LectureCard } from '@/components/lecture/LectureCard';
import { LectureUploader } from '@/components/admin/LectureUploader';
import { LECTURE_CATEGORIES } from '@/lib/constants';
import { Search, BookOpen } from 'lucide-react';

export default function LecturesPage() {
  const [currentUser, setCurrentUser] = useState<MemberUser | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>(initialLectures);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);

    fetch('/api/lectures')
      .then((res) => res.json())
      .then((data) => {
        if (data.lectures) setLectures(data.lectures);
      })
      .catch(() => {});
  }, []);

  const filteredLectures = lectures.filter((l) => {
    const matchesCategory =
      selectedCategory === '전체' || l.category === selectedCategory;
    const matchesSearch =
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 py-4">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-950 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-carrot" />
            강의 및 교육 자료실
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Dr. J&apos;s 회원들을 위해 정기적으로 업로드되는 AI 실무 강의 및 구글 드라이브 자료 저장소입니다.
          </p>
        </div>

        {/* 검색 인풋 */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="강의명 또는 키워드 검색..."
            className="w-full bg-white border border-gray-300 rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-carrot focus:ring-1 focus:ring-carrot transition"
          />
        </div>
      </div>

      {/* 관리자(Admin)인 경우 강의 업로더 표시 */}
      {currentUser?.role === 'admin' && (
        <LectureUploader
          onSuccess={(newLecture) => setLectures((prev) => [newLecture, ...prev])}
        />
      )}

      {/* 카테고리 필터 태그 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {LECTURE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 강의 카드 그리드 */}
      {filteredLectures.length === 0 ? (
        <div className="py-24 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          조건에 일치하는 강의가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLectures.map((lecture) => (
            <LectureCard
              key={lecture.id}
              lecture={lecture}
              userRole={currentUser?.role}
            />
          ))}
        </div>
      )}
    </div>
  );
}
