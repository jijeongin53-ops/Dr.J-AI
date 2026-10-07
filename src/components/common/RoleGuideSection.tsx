'use client';

import React, { useState } from 'react';
import { RoleBadge } from './RoleBadge';
import { ShieldCheck, ChevronDown, ChevronUp, CheckCircle, Lock } from 'lucide-react';

export function RoleGuideSection() {
  // 클릭 시에 상세 내용 보기로 전환되도록 기본 상태는 접힘 또는 펼침 토글 가능
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-carrot">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 group-hover:text-carrot transition">
              회원 등급
            </h2>
            <p className="text-xs text-gray-500">
              {isOpen ? '클릭 시 등급별 상세 혜택을 접습니다.' : '클릭하여 등급별 상세 혜택 및 입장 권한 보기'}
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1 group-hover:bg-gray-100 transition">
          <span>{isOpen ? '상세 닫기' : '등급 안내 보기'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* 클릭 시 상세 내용 보기 전환 */}
      {isOpen && (
        <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fadeIn">
          {/* 준회원/대기 */}
          <div className="p-5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <RoleBadge role="guest" size="md" />
              <span className="text-xs text-gray-500">가입 직후</span>
            </div>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
                맛보기 기초 오리엔테이션 시청
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <Lock className="w-3.5 h-3.5" />
                심화 강의 및 실습 자료 다운로드 제한
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <Lock className="w-3.5 h-3.5" />
                채팅 읽기 전용 (전송은 승인 대기)
              </li>
            </ul>
          </div>

          {/* 정회원 */}
          <div className="p-5 rounded-xl border border-gray-200 bg-white space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <RoleBadge role="regular" size="md" />
              <span className="text-xs text-gray-700 font-semibold">승인 정회원</span>
            </div>
            <ul className="space-y-2 text-xs text-gray-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                모든 기본 실무 강의 실시간 스트리밍
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                기본 강의자료 및 요약 PDF 다운로드
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                실시간 승인 채팅 참여 및 댓글 작성
              </li>
            </ul>
          </div>

          {/* VIP 회원 */}
          <div className="p-5 rounded-xl border border-orange-200 bg-orange-50/30 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <RoleBadge role="vip" size="md" />
              <span className="text-xs text-carrot font-bold">우수/VIP</span>
            </div>
            <ul className="space-y-2 text-xs text-gray-800">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-carrot" />
                비공개 심화/바이브 코딩 강의 전편 시청
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-carrot" />
                모든 소스코드/엑셀 템플릿 무제한 다운로드
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-carrot" />
                오프라인 밋업 우선 참여 & 질의응답
              </li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
