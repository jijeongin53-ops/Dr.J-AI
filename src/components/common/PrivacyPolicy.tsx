import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, FileText } from 'lucide-react';

export function PrivacyPolicy() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-carrot" />
          <h3 className="text-sm font-bold text-white tracking-tight">
            개인정보 수집·이용 및 관리에 관한 약관
          </h3>
          <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
            (당근 AI 모임 회원 전용)
          </span>
        </div>
        <button
          type="button"
          className="text-zinc-500 hover:text-white transition p-1"
          aria-label="약관 펼치기/접기"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="pt-2 border-t border-zinc-900 space-y-4 text-xs text-zinc-400 leading-relaxed">
          <p className="text-zinc-300">
            당근 AI 모임(이하 &apos;모임&apos;)은 회원의 소중한 개인정보를 보호하며, 『개인정보 보호법』 등 관련 법령을 준수합니다.
            모임은 안전한 서비스 제공 및 강의·자료 접근 권한 관리를 위해 아래와 같이 개인정보를 수집·이용합니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850 space-y-1.5">
              <h4 className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-carrot" />
                1. 수집하는 개인정보 항목
              </h4>
              <ul className="list-disc list-inside space-y-0.5 text-zinc-400 text-[11px]">
                <li><strong>성명</strong> (플랫폼 로그인 아이디로 활용)</li>
                <li><strong>연락처</strong> (플랫폼 로그인 비밀번호로 활용)</li>
                <li><strong>생년월일</strong> (회원 식별 및 연령 확인)</li>
                <li><strong>직업</strong> (수강생 맞춤형 AI 실무 커리큘럼 제공)</li>
                <li><strong>이메일</strong> (교육 자료 발송 및 중요 공지 안내)</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850 space-y-1.5">
              <h4 className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-carrot" />
                2. 개인정보 수집 및 이용 목적
              </h4>
              <ul className="list-disc list-inside space-y-0.5 text-zinc-400 text-[11px]">
                <li>회원 가입 의사 확인 및 본인 식별 (성명=아이디, 연락처=비밀번호)</li>
                <li>회원 등급(정회원, VIP) 부여 및 강의/자료실 접근 권한 제어</li>
                <li>승인된 회원 전용 실시간 채팅방 참여 및 스팸 차단</li>
                <li>신규 AI 강의 업로드 알림 및 오프라인 밋업 일정 안내</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850 space-y-1.5">
              <h4 className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-carrot" />
                3. 보유 및 이용 기간
              </h4>
              <p className="text-[11px] text-zinc-400">
                수집된 개인정보는 회원 자격 유지 기간 동안 안전하게 보관되며, <strong>회원 탈퇴 요청 시 또는 모임 운영 종료 시 지체 없이 영구 파기</strong>됩니다.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850 space-y-1.5">
              <h4 className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-carrot" />
                4. 개인정보의 안전성 관리 대책
              </h4>
              <p className="text-[11px] text-zinc-400">
                모든 개인정보는 구글 보안 클라우드 데이터베이스에 엄격히 분리 보관되며, 모임장(관리자) 이외의 제3자에게 제공하거나 상업적 용도로 일절 사용하지 않습니다.
              </p>
            </div>
          </div>

          <div className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-850 text-[11px] text-zinc-500">
            ※ 귀하는 개인정보 수집 및 이용에 동의하지 않을 권리가 있습니다. 단, 필수 항목 동의 거부 시 회원가입 및 강의 열람, 자료 다운로드 서비스 이용이 제한될 수 있습니다.
          </div>
        </div>
      )}
    </section>
  );
}
