import { NextResponse } from 'next/server';
import { getRuntimeGasUrl, setRuntimeGasUrl } from '@/lib/google/sheets';

// 구글 시트 연동 설정 조회
export async function GET() {
  const currentUrl = getRuntimeGasUrl();
  return NextResponse.json({
    hasUrl: !!currentUrl,
    url: currentUrl ? `${currentUrl.slice(0, 35)}...` : '',
  });
}

// 구글 시트 연동 설정 저장 및 테스트 전송
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scriptUrl, testSend } = body;

    if (scriptUrl) {
      setRuntimeGasUrl(scriptUrl);
    }

    const targetUrl = scriptUrl || getRuntimeGasUrl();

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Google Apps Script 웹 앱 URL이 입력되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 테스트 전송 요청인 경우
    if (testSend) {
      const testData = {
        action: 'addUser',
        data: {
          id: `test_${Date.now()}`,
          name: '테스트회원',
          phoneNumber: '010-0000-0000',
          birthDate: '1990-01-01',
          job: 'AI 교육생',
          email: 'test@example.com',
          carrotNickname: '당근테스터',
          role: 'regular',
          status: 'approved',
          joinedAt: new Date().toISOString().split('T')[0],
          note: '관리자 연동 테스트 데이터',
        },
      };

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: `스프레드시트 전송 응답 실패: HTTP ${res.status}` },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '구글 스프레드시트에 테스트 데이터가 성공적으로 저장되었습니다! 구글 시트 창을 새로고침하여 확인해보세요.',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Google Apps Script URL이 성공적으로 등록되었습니다.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `구글 시트 연동 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}
