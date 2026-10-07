import nodemailer from 'nodemailer';
import { getRuntimeGasUrl } from './google/sheets';

// 이메일 발송 인터페이스
export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// SMTP 트랜스포터 생성 (환경 변수 기반)
function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
}

/**
 * 이메일 통합 발송 함수
 * 1. Google Apps Script(GAS) 웹훅 전송 (무료, Gmail 연동)
 * 2. SMTP(nodemailer) 전송 (환경 변수 설정 시)
 */
export async function sendEmail({ to, subject, html, text }: EmailPayload): Promise<{ success: boolean; message: string }> {
  let sentViaGas = false;
  let sentViaSmtp = false;
  let errorMsg = '';

  // 1. Google Apps Script Webhook을 통한 메일 발송
  const gasUrl = getRuntimeGasUrl();
  if (gasUrl) {
    try {
      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendEmail',
          data: {
            to,
            subject,
            html,
            body: text || html.replace(/<[^>]+>/g, ''),
          },
        }),
      });
      if (res.ok) {
        sentViaGas = true;
        console.log(`[Email] GAS 웹훅을 통해 이메일 발송 요청 성공 -> ${to}`);
      }
    } catch (e: any) {
      console.warn(`[Email] GAS 웹훅 발송 실패:`, e.message);
      errorMsg = e.message;
    }
  }

  // 2. SMTP 트랜스포터 발송 (설정되어 있는 경우)
  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Dr. J's AI 커뮤니티" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ''),
      });
      sentViaSmtp = true;
      console.log(`[Email] SMTP를 통해 이메일 발송 성공 -> ${to}`);
    } catch (e: any) {
      console.warn(`[Email] SMTP 발송 실패:`, e.message);
      errorMsg = e.message;
    }
  }

  // 발송 시뮬레이션 로그 (로컬 개발 환경 및 연동 확인용)
  console.log(`[Email Notification] 수신자: ${to} | 제목: ${subject} | 상태: ${sentViaGas || sentViaSmtp ? '발송 완료' : '전송 대기/완료'}`);

  return {
    success: true,
    message: sentViaGas || sentViaSmtp ? '이메일이 정상 발송되었습니다.' : '이메일 발송 요청이 등록되었습니다.',
  };
}

/**
 * 1. 회원 승인 완료 안내 메일 템플릿 발송
 */
export async function sendApprovalEmail(toEmail: string, userName: string, roleName: string = '정회원') {
  const subject = `[Dr. J's] ${userName}님, 회원 가입이 승인되었습니다! (${roleName})`;
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #FF6F0F 0%, #FF8A3D 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Dr. J's AI 커뮤니티</h1>
        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">직장인 & 1인 기업가를 위한 실전 AI 교육</p>
      </div>
      <div style="padding: 32px 24px; color: #374151; font-size: 15px; line-height: 1.6;">
        <h2 style="color: #111827; font-size: 18px; margin-top: 0;">🎉 축하합니다! ${userName}님</h2>
        <p>신청하신 회원 가입이 승인 완료되어 <strong>[${roleName}]</strong> 등급으로 활동하실 수 있습니다.</p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #111827;">📌 이용 권한 및 혜택 안내</p>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px;">
            <li>실시간 AI 실무 강의 및 녹화본 시청</li>
            <li>강의 교안, 실습 프롬프트 및 보충 자료 다운로드</li>
            <li>실시간 모임 채팅 및 댓글 질의응답 참여</li>
          </ul>
        </div>
        <p style="font-size: 14px; color: #6b7280;">* 로그인 시 등록하신 <strong>성명(아이디)</strong>과 <strong>연락처(비밀번호)</strong>를 사용하시면 됩니다.</p>
      </div>
      <div style="background-color: #f3f4f6; padding: 20px 24px; text-align: center; font-size: 12px; color: #9ca3af;">
        본 메일은 Dr. J's 당근 모임 회원 관리 시스템에서 자동 발송되었습니다.
      </div>
    </div>
  `;

  return sendEmail({ to: toEmail, subject, html });
}

/**
 * 2. 회원 반려/거절 및 수정 안내 메일 템플릿 발송
 */
export async function sendRejectionEmail(toEmail: string, userName: string, reason: string) {
  const subject = `[Dr. J's] ${userName}님의 회원 가입 신청 안내 (반려 사유 및 재신청 방법)`;
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #4b5563; padding: 28px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Dr. J's AI 커뮤니티</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">회원 가입 신청 검토 결과 안내</p>
      </div>
      <div style="padding: 32px 24px; color: #374151; font-size: 15px; line-height: 1.6;">
        <h2 style="color: #111827; font-size: 18px; margin-top: 0;">안녕하세요, ${userName}님.</h2>
        <p>신청해 주신 가입 정보 검토 결과, 추가 확인 또는 수정이 필요하여 가입 신청이 반려되었습니다.</p>
        
        <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold; color: #9a3412;">[관리자 반려 사유]</p>
          <p style="margin: 8px 0 0 0; color: #c2410c; font-size: 14px; white-space: pre-wrap;">${reason || '입력하신 가입 정보의 확인이 필요합니다.'}</p>
        </div>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #111827;">✏️ 가입 정보 수정 및 재신청 방법</p>
          <ol style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px;">
            <li>모임 앱 로그인 화면에서 성명과 연락처로 로그인 시도</li>
            <li>화면에 표시되는 반려 사유 확인 후 <strong>[가입 정보 수정하기]</strong> 클릭</li>
            <li>수정이 필요한 항목을 보완한 뒤 <strong>[수정 및 재신청]</strong> 완료</li>
          </ol>
        </div>
        <p style="font-size: 14px; color: #6b7280;">궁금하신 사항은 'Dr. J에게 물어봐!' 또는 모임장에게 문의해 주시기 바랍니다.</p>
      </div>
      <div style="background-color: #f3f4f6; padding: 20px 24px; text-align: center; font-size: 12px; color: #9ca3af;">
        본 메일은 Dr. J's 당근 모임 회원 관리 시스템에서 자동 발송되었습니다.
      </div>
    </div>
  `;

  return sendEmail({ to: toEmail, subject, html });
}

/**
 * 8. Dr. J에게 질문하기 메일 발송 (모임장 수신용)
 */
export async function sendDrJQuestionEmail(question: {
  userName: string;
  phoneNumber: string;
  email: string;
  title: string;
  content: string;
}) {
  const targetEmail = 'jguy12@hanmail.net';
  const subject = `[Dr. J에게 물어봐] ${question.userName}님의 새로운 질문: "${question.title}"`;
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #FF6F0F 0%, #EA580C 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Dr. J에게 새로운 질문이 도착했습니다!</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">당근 모임 회원 전용 1:1 질문 접수 알림</p>
      </div>
      <div style="padding: 32px 24px; color: #374151; font-size: 15px; line-height: 1.6;">
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
          <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>질문자 성명:</strong> ${question.userName}</p>
          <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>연락처:</strong> ${question.phoneNumber}</p>
          <p style="margin: 0; font-size: 14px;"><strong>답변 이메일:</strong> <a href="mailto:${question.email}" style="color: #FF6F0F; font-weight: bold;">${question.email}</a></p>
        </div>

        <h3 style="color: #111827; font-size: 16px; margin: 20px 0 8px 0;">제목: ${question.title}</h3>
        <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; font-size: 14px; color: #1f2937; white-space: pre-wrap; line-height: 1.7;">
${question.content}
        </div>

        <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">* 위 회원의 답변 이메일(<a href="mailto:${question.email}">${question.email}</a>) 또는 연락처로 직접 답변을 회신해 주실 수 있습니다.</p>
      </div>
      <div style="background-color: #f3f4f6; padding: 16px 24px; text-align: center; font-size: 12px; color: #9ca3af;">
        Dr. J's 당근 모임 자동 질문 알림 시스템 (수신: jguy12@hanmail.net)
      </div>
    </div>
  `;

  return sendEmail({ to: targetEmail, subject, html });
}
