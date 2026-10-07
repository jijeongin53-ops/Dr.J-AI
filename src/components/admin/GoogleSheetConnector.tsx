'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { GOOGLE_SHEET_URL } from '@/lib/constants';

// 구글 시트에 붙여넣을 완성형 Google Apps Script 코드
export const GAS_SCRIPT_CODE = `// ==========================================
// [당근 모임] 구글 스프레드시트 자동 연동 스크립트
// (회원 가입 동기화 + Dr. J 질문 시트 저장 및 jguy12@hanmail.net 자동 메일 발송 지원)
// ==========================================

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. 전달된 데이터 추출
    var requestData = {};
    if (e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (err) {
        requestData = e.parameter || {};
      }
    } else {
      requestData = e.parameter || {};
    }

    var action = requestData.action || "addUser";
    var data = requestData.data || requestData;

    // [ACTION 1]: Dr. J에게 물어봐 (시트 자동 기록 + jguy12@hanmail.net 즉시 메일 발송)
    if (action === "askDrJ") {
      var questionSheet = ss.getSheetByName("DrJ_질문함");
      if (!questionSheet) {
        questionSheet = ss.insertSheet("DrJ_질문함");
        var qHeaders = ["접수일시", "성명", "연락처", "답변이메일", "질문제목", "질문내용"];
        questionSheet.appendRow(qHeaders);
        var qHeaderRange = questionSheet.getRange(1, 1, 1, qHeaders.length);
        qHeaderRange.setBackground("#EA580C");
        qHeaderRange.setFontColor("#FFFFFF");
        qHeaderRange.setFontWeight("bold");
        qHeaderRange.setHorizontalAlignment("center");
        questionSheet.setFrozenRows(1);
      }

      var nowStr = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
      var qRow = [
        data.createdAt || nowStr,
        data.userName || data.name || "",
        data.phoneNumber || "",
        data.email || "",
        data.title || "",
        data.content || ""
      ];
      questionSheet.appendRow(qRow);

      // 모임장 이메일(jguy12@hanmail.net)로 구글 메일 서비스 즉시 발송
      try {
        var emailSubject = "[Dr. J에게 물어봐] " + (data.userName || "회원") + "님의 새로운 질문: " + (data.title || "");
        var emailHtml = '<div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #fed7aa; border-radius: 12px; background: #fff;">'
          + '<h2 style="color: #ea580c; margin-top:0;">Dr. J에게 새로운 질문이 도착했습니다!</h2>'
          + '<p><strong>질문자 성명:</strong> ' + (data.userName || "") + '</p>'
          + '<p><strong>연락처:</strong> ' + (data.phoneNumber || "") + '</p>'
          + '<p><strong>답변 회신 이메일:</strong> <a href="mailto:' + (data.email || "") + '">' + (data.email || "") + '</a></p>'
          + '<hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;">'
          + '<h3 style="color: #111;">제목: ' + (data.title || "") + '</h3>'
          + '<div style="background: #f9fafb; padding: 15px; border-radius: 8px; white-space: pre-wrap; line-height: 1.6;">' + (data.content || "") + '</div>'
          + '<p style="color: #888; font-size: 12px; margin-top: 20px;">* 회원의 이메일로 바로 회신하시려면 <a href="mailto:' + (data.email || "") + '">여기</a>를 클릭하세요.</p>'
          + '</div>';

        MailApp.sendEmail({
          to: "jguy12@hanmail.net",
          subject: emailSubject,
          htmlBody: emailHtml,
          name: "Dr. J 질문 알림"
        });
      } catch (mailErr) {
        // 메일 발송 로그 기록
        Logger.log("Mail send error: " + mailErr);
      }

      return ContentService.createTextOutput(JSON.stringify({ result: "success", action: "askDrJ", row: qRow }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // [ACTION 2]: 범용 이메일 발송 (회원 승인/반려 안내 등)
    if (action === "sendEmail") {
      try {
        MailApp.sendEmail({
          to: data.to,
          subject: data.subject,
          htmlBody: data.html,
          body: data.body || "",
          name: "Dr. J's AI 커뮤니티"
        });
        return ContentService.createTextOutput(JSON.stringify({ result: "success", action: "sendEmail", to: data.to }))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // [ACTION 3]: 기본 회원 가입 / 회원 정보 등록
    var sheet = ss.getActiveSheet();

    // 1. 헤더가 없는 경우 첫 번째 행에 자동 생성
    if (sheet.getLastRow() === 0) {
      var headers = [
        "성명(아이디)",
        "연락처(비밀번호)",
        "생년월일",
        "직업",
        "이메일",
        "회원등급",
        "승인상태",
        "가입일시",
        "비고"
      ];
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#111827");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // 3. 스프레드시트에 새 행 추가
    var newRow = [
      data.name || "",
      data.phoneNumber || "",
      data.birthDate || "",
      data.job || "",
      data.email || "",
      data.role || "guest",
      data.status || "pending",
      data.joinedAt || Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss"),
      data.note || "웹 신규 가입"
    ];

    sheet.appendRow(newRow);

    return ContentService.createTextOutput(JSON.stringify({ result: "success", row: newRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify({ status: "ok", count: data.length, rows: data }))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export function GoogleSheetConnector() {
  const [gasUrl, setGasUrl] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // 로컬 스토리지에 캐시된 URL 복원
  useEffect(() => {
    const saved = localStorage.getItem('DR_J_GAS_URL');
    if (saved) {
      setGasUrl(saved);
      // 서버에도 동기화
      fetch('/api/admin/sheets-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptUrl: saved }),
      }).catch(() => {});
    }
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GAS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAndTest = async () => {
    if (!gasUrl.trim()) {
      alert('Google Apps Script 웹 앱 URL을 먼저 입력해 주세요.');
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      localStorage.setItem('DR_J_GAS_URL', gasUrl.trim());

      const res = await fetch('/api/admin/sheets-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl: gasUrl.trim(),
          testSend: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult({
          success: true,
          message: '연동 성공! 구글 스프레드시트에 테스트 회원 데이터가 즉시 기록되었습니다.',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || '연동 실패: URL 권한을 확인해주세요.',
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: '통신 중 오류가 발생했습니다: ' + (e.message || ''),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-950 flex items-center gap-2">
              구글 스프레드시트 1분 자동 연동 설정
            </h2>
            <p className="text-xs text-gray-500">
              회원 가입 신청 데이터가 구글 시트에 1초 만에 자동 저장되도록 연결합니다.
            </p>
          </div>
        </div>

        <a
          href={GOOGLE_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-carrot font-medium flex items-center gap-1 hover:underline"
        >
          <span>내 스프레드시트 열기</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 단계별 연동 가이드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 space-y-1.5">
          <span className="font-bold text-gray-900 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-black text-white text-[11px] flex items-center justify-center font-bold">1</span>
            스크립트 복사 및 붙여넣기
          </span>
          <p className="text-gray-500 leading-relaxed text-[11px]">
            구글 시트 상단 메뉴 <strong>[확장 프로그램] ➔ [Apps Script]</strong>를 누르고 아래 스크립트 코드를 붙여넣습니다.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 space-y-1.5">
          <span className="font-bold text-gray-900 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-black text-white text-[11px] flex items-center justify-center font-bold">2</span>
            웹 앱으로 배포
          </span>
          <p className="text-gray-500 leading-relaxed text-[11px]">
            우측 상단 <strong>[배포] ➔ [새 배포] ➔ [웹 앱]</strong>을 선택하고 액세스 권한을 <strong>[모든 사용자]</strong>로 설정 후 배포합니다.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 space-y-1.5">
          <span className="font-bold text-gray-900 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-black text-white text-[11px] flex items-center justify-center font-bold">3</span>
            배포 URL 등록 &amp; 테스트
          </span>
          <p className="text-gray-500 leading-relaxed text-[11px]">
            발급된 웹 앱 URL을 아래 입력창에 넣고 [테스트 전송]을 누르면 시트에 즉시 1행부터 자동 기록됩니다.
          </p>
        </div>
      </div>

      {/* 스크립트 코드 확인 및 원클릭 복사 버튼 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="text-xs font-semibold text-gray-700 hover:text-black flex items-center gap-1.5 transition"
          >
            <span>Apps Script 연동 코드 보기</span>
            {showCode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-800 hover:bg-gray-100 flex items-center gap-1.5 transition shadow-sm"
          >
            <Copy className="w-3.5 h-3.5 text-carrot" />
            <span>{copied ? '코드 복사 완료!' : '스크립트 코드 전체 복사'}</span>
          </button>
        </div>

        {showCode && (
          <div className="relative">
            <pre className="p-4 rounded-xl bg-gray-900 text-gray-100 text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed border border-gray-800">
              {GAS_SCRIPT_CODE}
            </pre>
          </div>
        )}
      </div>

      {/* URL 입력 및 테스트 버튼 */}
      <div className="space-y-3 pt-2">
        <label className="block text-xs font-bold text-gray-800">
          Google Apps Script 배포 웹 앱 URL
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-black placeholder-gray-400 font-mono"
          />
          <button
            type="button"
            disabled={loading}
            onClick={handleSaveAndTest}
            className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>연동 확인 중...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-carrot" />
                <span>URL 저장 및 테스트 전송</span>
              </>
            )}
          </button>
        </div>

        {/* 연동 결과 알림 */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs transition ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-semibold">{testResult.message}</p>
              {testResult.success && (
                <p className="text-[11px] text-emerald-700">
                  이제 모든 신규 회원의 가입 정보가 구글 시트에 실시간으로 기록됩니다.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
