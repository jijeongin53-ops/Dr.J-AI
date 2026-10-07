import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AttendancePushAlert } from '@/components/attendance/AttendancePushAlert';
import { AskDrJModal } from '@/components/common/AskDrJModal';
import { NetflixIntro } from '@/components/common/NetflixIntro';

export const metadata: Metadata = {
  title: "Dr. J's 교육 & 모임 플랫폼",
  description: "Dr. J's 회원 전용 강의 시청, 등급별 자료 다운로드 및 승인 채팅 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col bg-white text-gray-900 antialiased selection:bg-carrot selection:text-white">
        {/* 접속 시 넷플릭스 효과음과 함께 Dr. J 로고가 극적으로 등장하는 시네마틱 인트로 */}
        <NetflixIntro />
        <Navbar />
        {/* 실시간 강의 출석 체크 푸시 알림 배너 */}
        <AttendancePushAlert />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        {/* [요구사항 8 해결]: Dr. J에게 물어봐! 플로팅 버튼 및 질문 팝업 창 */}
        <AskDrJModal />
        <Footer />
      </body>
    </html>
  );
}
