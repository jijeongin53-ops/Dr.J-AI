'use client';

import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, FileText } from 'lucide-react';

export function PrivacyPolicy() {
  // 기본적으로 닫힌 버튼 형태이며, 클릭 시에만 상세 내용이 보입니다.
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition">
      {/* 버튼식 헤더 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 group-hover:bg-carrot/10 group-hover:text-carrot transition">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 group-hover:text-carrot transition">
              개인정보 수집·이용 및 관리에 관한 약관
            </h3>
            <p className="text-[11px] text-gray-500">
              {isOpen ? '클릭 시 약관 내용을 접습니다.' : '클릭하여 약관 상세 내용 보기'}
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1 group-hover:bg-gray-100 transition">
          <span>{isOpen ? '상세 닫기' : '약관 보기'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* 클릭 시 펼쳐지는 상세 내용 */}
      {isOpen && (
        <div className="mt-5 pt-5 border-t border-gray-100 space-y-4 text-xs text-gray-600 leading-relaxed animate-fadeIn">
          <p className="text-gray-700">
            당근 AI 모임(이하 &apos;모임&apos;)은 회원의 소중한 개인정보를 보호하며, 『개인정보 보호법』 등 관련 법령을 준수합니다.
            안전한 회원 관리 및 교육 자료 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
              <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-carrot" />
                1. 수집하는 개인정보 항목
              </h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600 text-[11px]">
                <li><strong>성명</strong> (플랫폼 로그인 아이디로 활용)</li>
                <li><strong>연락처</strong> (플랫폼 로그인 비밀번호로 활용)</li>
                <li><strong>생년월일</strong> (회원 식별 및 연령 확인)</li>
                <li><strong>직업</strong> (수강생 맞춤형 AI 실무 교육 안내)</li>
                <li><strong>이메일</strong> (교육 자료 발송 및 중요 공지 안내)</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
              <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-carrot" />
                2. 개인정보 수집 및 이용 목적
              </h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600 text-[11px]">
                <li>회원 가입 의사 확인 및 본인 식별 (성명=아이디, 연락처=비밀번호)</li>
                <li>회원 등급(정회원, VIP) 부여 및 강의/자료실 접근 권한 제어</li>
                <li>승인된 회원 전용 실시간 채팅방 참여 및 불량 회원 차단</li>
                <li>신규 AI 강의 업로드 알림 및 오프라인 모임 일정 안내</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
              <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-carrot" />
                3. 보유 및 이용 기간
              </h4>
              <p className="text-[11px] text-gray-600">
                수집된 정보는 회원 자격 유지 기간 동안 안전하게 보관되며, <strong>회원 탈퇴 요청 시 또는 모임 운영 종료 시 지체 없이 영구 파기</strong>됩니다.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
              <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-carrot" />
                4. 개인정보의 안전성 관리 대책
              </h4>
              <p className="text-[11px] text-gray-600">
                모든 개인정보는 구글 클라우드 보안 데이터베이스에 안전하게 보관되며, 모임장(관리자) 외 제3자에게 제공하거나 상업적 용도로 일절 사용하지 않습니다.
              </p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-[11px] text-gray-500">
            ※ 정보주체는 개인정보 수집·이용 동의를 거부할 권리가 있습니다. 단, 필수 항목 동의 거부 시 회원가입 및 자료 열람이 제한될 수 있습니다.
          </div>
        </div>
      )}
    </section>
  );
}
