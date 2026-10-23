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
  Sparkles,
} from 'lucide-react';
import { GOOGLE_SHEET_URL } from '@/lib/constants';

// 구글 시트에 붙여넣을 완성형 Google Apps Script 코드
export const GAS_SCRIPT_CODE = `// ==========================================
// [당근 모임] 구글 스프레드시트 자동 연동 스크립트
// - 성명 + 연락처 뒤 4자리 중복 회원 자동 정리
// - 연락처(010-0000-0000) 및 생년월일(0000-00-00) 서식 정규화
// - 회원 승인/반려 실시간 업데이트 및 이메일 발송
// - [회원 로그인 현황] 자동 기록 (회원명 / 접속일 / 강의실 입장 현황 / 자료 다운로드 현황)
// ==========================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🥕 당근 모임 관리')
    .addItem('✨ 중복 회원 정리 및 서식 일괄 정규화', 'deduplicateAndFormatSheet')
    .addItem('📋 [회원 로그인 현황] 시트 생성 및 확인', 'setupLoginStatusSheet')
    .addToUi();
}

// [회원 로그인 현황] 시트 생성 및 헤더 서식 설정 함수
function setupLoginStatusSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("회원 로그인 현황");
  if (!sheet) {
    sheet = ss.insertSheet("회원 로그인 현황");
  }
  var headers = ["회원명", "접속일", "강의실 입장 현황", "자료 다운로드 현황"];
  var currentHeader = "";
  if (sheet.getLastRow() > 0) {
    currentHeader = String(sheet.getRange(1, 1).getValue() || "").trim();
  }
  if (currentHeader !== "회원명") {
    sheet.getRange(1, 1, 1, 4).setValues([headers]);
    sheet.getRange(1, 1, 1, 4)
      .setBackground("#EBF3FA")
      .setFontColor("#1E3A8A")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 120); // 회원명
    sheet.setColumnWidth(2, 180); // 접속일 (시간 포함)
    sheet.setColumnWidth(3, 280); // 강의실 입장 현황
    sheet.setColumnWidth(4, 280); // 자료 다운로드 현황
  }
  return sheet;
}

// 전화번호 정규화 (010-0000-0000)
function formatPhoneGAS(input) {
  if (!input) return "";
  var digits = String(input).replace(/\\D/g, "");
  if (digits.indexOf("82") === 0 && digits.length >= 11) digits = "0" + digits.slice(2);
  if (digits.indexOf("10") === 0 && digits.length === 10) digits = "0" + digits;
  if (digits.length === 11) return digits.slice(0, 3) + "-" + digits.slice(3, 7) + "-" + digits.slice(7);
  if (digits.length === 10) {
    if (digits.indexOf("02") === 0) return digits.slice(0, 2) + "-" + digits.slice(2, 6) + "-" + digits.slice(6);
    return digits.slice(0, 3) + "-" + digits.slice(3, 6) + "-" + digits.slice(6);
  }
  return digits;
}

// 생년월일 정규화 (0000-00-00)
function formatBirthGAS(input) {
  if (!input) return "";
  var str = String(input).trim();
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(str)) return str;
  if (str.indexOf("T") !== -1) {
    try {
      var d = new Date(str);
      var kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      var y = kst.getUTCFullYear();
      var m = ("0" + (kst.getUTCMonth() + 1)).slice(-2);
      var day = ("0" + kst.getUTCDate()).slice(-2);
      return y + "-" + m + "-" + day;
    } catch (e) {}
  }
  var digits = str.replace(/\\D/g, "");
  if (digits.length === 5) digits = "0" + digits;
  if (digits.length >= 8) return digits.slice(0, 4) + "-" + digits.slice(4, 6) + "-" + digits.slice(6, 8);
  if (digits.length === 6) {
    var yy = parseInt(digits.slice(0, 2), 10);
    var prefix = yy > 30 ? "19" : "20";
    return prefix + digits.slice(0, 2) + "-" + digits.slice(2, 4) + "-" + digits.slice(4, 6);
  }
  return str;
}

// 중복 회원 삭제 및 서식 정규화 실행 함수 (상단 메뉴 또는 웹훅 실행)
function deduplicateAndFormatSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { deleted: 0, updated: 0 };

  var seen = {};
  var rowsToDelete = [];
  var updatedCount = 0;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var name = String(row[0] || "").trim();
    if (!name || name === "test") {
      rowsToDelete.push(i + 1);
      continue;
    }
    var phoneDigits = String(row[1] || "").replace(/\\D/g, "");
    var last4 = phoneDigits.slice(-4);
    var key = name + "_" + last4;

    if (seen[key]) {
      var prevRowIdx = seen[key];
      var prevStatus = String(data[prevRowIdx - 1][6] || "").toLowerCase();
      var currentStatus = String(row[6] || "").toLowerCase();
      if (currentStatus === "approved" && prevStatus !== "approved") {
        sheet.getRange(prevRowIdx, 7).setValue("approved");
      }
      rowsToDelete.push(i + 1);
    } else {
      seen[key] = i + 1;
      var formattedPhone = formatPhoneGAS(row[1]);
      var formattedBirth = formatBirthGAS(row[2]);
      if (formattedPhone && formattedPhone !== String(row[1])) {
        sheet.getRange(i + 1, 2).setValue("'" + formattedPhone);
        updatedCount++;
      }
      if (formattedBirth && formattedBirth !== String(row[2])) {
        sheet.getRange(i + 1, 3).setValue(formattedBirth);
        updatedCount++;
      }
    }
  }

  // 중복 행 아래에서부터 삭제
  rowsToDelete.sort(function(a, b) { return b - a; });
  for (var d = 0; d < rowsToDelete.length; d++) {
    sheet.deleteRow(rowsToDelete[d]);
  }

  return { deleted: rowsToDelete.length, updated: updatedCount };
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

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

    // [ACTION 0]: 중복 회원 정리 및 서식 정규화
    if (action === "cleanDuplicates" || action === "deduplicate") {
      var result = deduplicateAndFormatSheet();
      return ContentService.createTextOutput(JSON.stringify({ result: "success", deleted: result.deleted, updated: result.updated }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // [ACTION 1]: 회원 권한 및 승인 상태 업데이트
    if (action === "updateUserRole" || action === "updateUser") {
      var sheet = ss.getActiveSheet();
      var rows = sheet.getDataRange().getValues();
      var targetName = String(data.name || "").trim();
      var targetPhone = String(data.phoneNumber || "").replace(/\\D/g, "");
      var targetLast4 = targetPhone.slice(-4);
      var found = false;

      for (var r = 1; r < rows.length; r++) {
        var rowName = String(rows[r][0] || "").trim();
        var rowPhone = String(rows[r][1] || "").replace(/\\D/g, "");
        var rowLast4 = rowPhone.slice(-4);

        if (rowName === targetName && (rowLast4 === targetLast4 || !targetLast4)) {
          if (data.role) sheet.getRange(r + 1, 6).setValue(data.role);
          if (data.status) sheet.getRange(r + 1, 7).setValue(data.status);
          if (data.rejectionReason !== undefined) sheet.getRange(r + 1, 9).setValue(data.rejectionReason);
          found = true;
          break;
        }
      }

      if (found) {
        return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({ result: "not_found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // [ACTION 2]: Dr. J에게 물어봐 질문함 저장
    if (action === "askDrJ") {
      var questionSheet = ss.getSheetByName("DrJ_질문함");
      if (!questionSheet) {
        questionSheet = ss.insertSheet("DrJ_질문함");
        var qHeaders = ["접수일시", "성명", "연락처", "답변이메일", "질문제목", "질문내용"];
        questionSheet.appendRow(qHeaders);
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
      return ContentService.createTextOutput(JSON.stringify({ result: "success", action: "askDrJ" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // [ACTION 3]: Dr. J 질문함 끝

    // [ACTION 4]: 회원 로그인 기록 (시간 포함 자동 저장)
    if (action === "recordLogin") {
      var logSheet = setupLoginStatusSheet();
      var userName = String(data.name || data.userName || "").trim();
      if (!userName) {
        return ContentService.createTextOutput(JSON.stringify({ result: "error", message: "회원명 누락" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var nowStr = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
      var loginTime = data.time || data.loginTime || nowStr;

      var newRow = [userName, loginTime, "-", "-"];
      logSheet.appendRow(newRow);

      return ContentService.createTextOutput(JSON.stringify({ result: "success", action: "recordLogin", row: newRow }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // [ACTION 5]: 강의실 입장 현황 기록 (시간 및 강의명 포함)
    if (action === "recordRoomEntry") {
      var logSheet = setupLoginStatusSheet();
      var userName = String(data.name || data.userName || "").trim();
      var lectureTitle = String(data.lectureTitle || data.title || "실시간 강의실").trim();
      var nowStr = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
      var entryTime = data.time || nowStr;
      var entryText = entryTime + " [" + lectureTitle + "] 입장";

      var dataRange = logSheet.getDataRange().getValues();
      var foundRowIdx = -1;
      for (var i = dataRange.length - 1; i >= 1; i--) {
        if (String(dataRange[i][0] || "").trim() === userName) {
          foundRowIdx = i + 1;
          break;
        }
      }

      if (foundRowIdx !== -1) {
        var prevText = String(logSheet.getRange(foundRowIdx, 3).getValue() || "").trim();
        if (prevText && prevText !== "-") {
          logSheet.getRange(foundRowIdx, 3).setValue(prevText + " \n" + entryText);
        } else {
          logSheet.getRange(foundRowIdx, 3).setValue(entryText);
        }
      } else {
        logSheet.appendRow([userName, nowStr, entryText, "-"]);
      }

      return ContentService.createTextOutput(JSON.stringify({ result: "success", action: "recordRoomEntry", text: entryText }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // [ACTION 6]: 자료 다운로드 현황 기록 (시간 및 파일명 포함)
    if (action === "recordDownload") {
      var logSheet = setupLoginStatusSheet();
      var userName = String(data.name || data.userName || "").trim();
      var materialName = String(data.materialName || data.name || "강의 자료").trim();
      var nowStr = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
      var downloadTime = data.time || nowStr;
      var downloadText = downloadTime + " [" + materialName + "] 다운로드";

      var dataRange = logSheet.getDataRange().getValues();
      var foundRowIdx = -1;
      for (var i = dataRange.length - 1; i >= 1; i--) {
        if (String(dataRange[i][0] || "").trim() === userName) {
          foundRowIdx = i + 1;
          break;
        }
      }

      if (foundRowIdx !== -1) {
        var prevText = String(logSheet.getRange(foundRowIdx, 4).getValue() || "").trim();
        if (prevText && prevText !== "-") {
          logSheet.getRange(foundRowIdx, 4).setValue(prevText + " \n" + downloadText);
        } else {
          logSheet.getRange(foundRowIdx, 4).setValue(downloadText);
        }
      } else {
        logSheet.appendRow([userName, nowStr, "-", downloadText]);
      }

      return ContentService.createTextOutput(JSON.stringify({ result: "success", action: "recordDownload", text: downloadText }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // [ACTION 7]: 로그인 현황 시트 초기화 및 확인
    if (action === "setupLoginStatusSheet") {
      var sheet = setupLoginStatusSheet();
      return ContentService.createTextOutput(JSON.stringify({ result: "success", message: "회원 로그인 현황 시트 준비 완료" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // [ACTION 7-1]: 강의 등록 / 수정 / 삭제 / 일괄 동기화 (동영상 업로드 현황 시트)
    if (action === "addLecture" || action === "updateLecture") {
      var lecSheet = ss.getSheetByName("동영상 업로드 현황");
      if (!lecSheet) {
        lecSheet = ss.insertSheet("동영상 업로드 현황");
        lecSheet.appendRow(["강의 번호", "강의 제목", "카테고리", "시청 가능 등급", "자료 다운로드 등급", "동영상 링크 (구글드라이브)", "재생시간", "등록일시", "강의 설명", "첨부자료 JSON", "입장 정원"]);
      }
      var lRows = lecSheet.getDataRange().getValues();
      var targetId = String(data.id || "").trim();
      var targetTitle = String(data.title || "").trim();
      var matStr = typeof data.materials === "string" ? data.materials : JSON.stringify(data.materials || []);
      var rowValues = [
        targetId,
        targetTitle,
        data.category || "프롬프트 & 업무활용",
        data.minViewRole || "guest",
        data.minDownloadRole || "guest",
        data.videoUrl || "",
        data.duration || "45분",
        data.createdAt || Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd"),
        data.description || "",
        matStr,
        data.maxAttendees !== undefined ? data.maxAttendees : 30
      ];
      var updatedLec = false;
      for (var lr = 1; lr < lRows.length; lr++) {
        if (String(lRows[lr][0] || "").trim() === targetId) {
          lecSheet.getRange(lr + 1, 1, 1, rowValues.length).setValues([rowValues]);
          updatedLec = true;
          break;
        }
      }
      if (!updatedLec) {
        lecSheet.appendRow(rowValues);
      }
      return ContentService.createTextOutput(JSON.stringify({ result: "success", action: action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "deleteLecture") {
      var delSheet = ss.getSheetByName("동영상 업로드 현황");
      var delId = String(requestData.id || data.id || "").trim();
      if (delSheet && delId) {
        var dRows = delSheet.getDataRange().getValues();
        for (var dr = dRows.length - 1; dr >= 1; dr--) {
          if (String(dRows[dr][0] || "").trim() === delId) {
            delSheet.deleteRow(dr + 1);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ result: "success", action: "deleteLecture" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "syncLectures") {
      var syncSheet = ss.getSheetByName("동영상 업로드 현황");
      if (!syncSheet) {
        syncSheet = ss.insertSheet("동영상 업로드 현황");
      }
      syncSheet.clear();
      syncSheet.appendRow(["강의 번호", "강의 제목", "카테고리", "시청 가능 등급", "자료 다운로드 등급", "동영상 링크 (구글드라이브)", "재생시간", "등록일시", "강의 설명", "첨부자료 JSON", "입장 정원"]);
      var lecturesList = requestData.lectures || [];
      for (var li = 0; li < lecturesList.length; li++) {
        var item = lecturesList[li];
        syncSheet.appendRow([
          item.id || "",
          item.title || "",
          item.category || "",
          item.minViewRole || "guest",
          item.minDownloadRole || "guest",
          item.videoUrl || "",
          item.duration || "45분",
          item.createdAt || "",
          item.description || "",
          JSON.stringify(item.materials || []),
          item.maxAttendees !== undefined ? item.maxAttendees : 30
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ result: "success", action: "syncLectures" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // [ACTION 8]: 기본 회원 가입 행 추가
    if (action === "addUser" || (data.name && data.phoneNumber && !action)) {
      var sheet = ss.getSheetByName("Users") || ss.getActiveSheet();
      if (sheet.getLastRow() === 0) {
        var headers = ["성명(아이디)", "연락처(비밀번호)", "생년월일", "직업", "이메일", "회원등급", "승인상태", "가입일시", "비고"];
        sheet.appendRow(headers);
      }

      var phoneFormatted = formatPhoneGAS(data.phoneNumber);
      var birthFormatted = formatBirthGAS(data.birthDate);

      var newRow = [
        data.name || "",
        "'" + (phoneFormatted || data.phoneNumber || ""),
        birthFormatted || data.birthDate || "",
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
    }

    return ContentService.createTextOutput(JSON.stringify({ result: "ignored", message: "미처리 액션: " + action }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetParam = (e && e.parameter && e.parameter.sheet) || "";
  var sheet;
  if (sheetParam === "login_status" || sheetParam === "회원 로그인 현황") {
    sheet = ss.getSheetByName("회원 로그인 현황");
    if (!sheet) {
      sheet = setupLoginStatusSheet();
    }
  } else if (sheetParam === "lectures" || sheetParam === "동영상 업로드 현황") {
    sheet = ss.getSheetByName("동영상 업로드 현황") || ss.getActiveSheet();
  } else {
    sheet = ss.getSheetByName("Users") || ss.getActiveSheet();
  }
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify({ status: "ok", sheet: sheet.getName(), count: data.length, rows: data }))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export function GoogleSheetConnector() {
  const [gasUrl, setGasUrl] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleSetupLoginStatusSheet = async () => {
    const url = gasUrl.trim() || (typeof window !== 'undefined' ? localStorage.getItem('DR_J_GAS_URL') : '') || '';
    if (!url) {
      alert('Google Apps Script 웹 앱 URL이 설정되지 않았습니다.');
      return;
    }

    setSetupLoading(true);
    setSetupResult(null);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setupLoginStatusSheet' }),
      });
      const data = await res.json();
      if (res.ok && data.result === 'success') {
        setSetupResult({
          success: true,
          message: '구글 시트에 [회원 로그인 현황] 탭이 성공적으로 생성 및 연결되었습니다! (회원명 / 접속일 / 강의실 입장 현황 / 자료 다운로드 현황)',
        });
      } else {
        setSetupResult({
          success: false,
          message: 'Apps Script에 최신 스크립트 코드를 반영 후 [배포 > 새 배포]를 진행해 주세요.',
        });
      }
    } catch (e: any) {
      setSetupResult({
        success: false,
        message: '통신 오류: 상단 최신 스크립트 코드를 복사하여 구글 시트 Apps Script에 저장 후 새 배포를 진행해 주세요.',
      });
    } finally {
      setSetupLoading(false);
    }
  };

  const handleCleanDuplicates = async () => {
    const url = gasUrl.trim() || (typeof window !== 'undefined' ? localStorage.getItem('DR_J_GAS_URL') : '') || '';
    if (!url) {
      alert('Google Apps Script 웹 앱 URL이 설정되지 않았습니다.');
      return;
    }

    setCleaning(true);
    setCleanResult(null);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deduplicate' }),
      });
      const data = await res.json();
      if (res.ok && data.result === 'success') {
        setCleanResult({
          success: true,
          message: `구글 시트 중복 데이터 정리 완료! (중복 삭제: ${data.deleted || 0}건, 서식 정규화: ${data.updated || 0}건)`,
        });
      } else {
        setCleanResult({
          success: false,
          message: 'Apps Script에 최신 코드가 아직 반영되지 않았습니다. 상단 스크립트 코드를 구글 시트 Apps Script에 붙여넣고 저장해 주세요.',
        });
      }
    } catch (e: any) {
      setCleanResult({
        success: false,
        message: '통신 오류: 구글 시트 상단 메뉴 [데이터 ➔ 데이터 정리 ➔ 중복 항목 삭제]를 이용하시거나 상단 스크립트를 재배포해 주세요.',
      });
    } finally {
      setCleaning(false);
    }
  };

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

        {/* [요구사항 4]: 구글 시트 중복 데이터 원클릭 정리 및 서식 정규화 박스 */}
        <div className="mt-4 p-4 rounded-xl border border-blue-200 bg-blue-50/70 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-carrot" />
              <h3 className="font-bold text-gray-900">
                구글 시트 중복 회원 정리 &amp; 서식 정규화 (성명 + 연락처 뒤 4자리 일치 삭제)
              </h3>
            </div>
            <button
              type="button"
              disabled={cleaning}
              onClick={handleCleanDuplicates}
              className="px-3.5 py-1.5 bg-carrot hover:bg-carrot-hover text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50 shrink-0"
            >
              {cleaning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>정리 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>웹훅으로 중복 데이터 정리 실행</span>
                </>
              )}
            </button>
          </div>

          <div className="text-gray-600 leading-relaxed text-[11px] space-y-1">
            <p>
              • <strong>자동 기능:</strong> 이름과 연락처 뒤 4자리가 일치하는 중복 행을 자동 정리하며, 연락처는 <code>010-0000-0000</code>, 생년월일은 <code>0000-00-00</code> 형태로 일괄 정규화합니다.
            </p>
            <p>
              • <strong>구글 시트 상단 메뉴 직접 실행:</strong> 상단 스크립트를 Apps Script에 복사해 넣으시면 구글 시트 상단 메뉴에 <strong>[🥕 당근 모임 관리] ➔ [✨ 중복 회원 정리 및 서식 일괄 정규화]</strong>가 자동 생성되어 시트 화면에서 원클릭으로 정리하실 수 있습니다.
            </p>
          </div>

          {cleanResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                cleanResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {cleanResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{cleanResult.message}</span>
            </div>
          )}
        </div>

        {/* [회원 로그인 현황]: 구글 시트 회원 로그인 및 활동 기록 자동 연동 박스 */}
        <div className="mt-4 p-4 rounded-xl border border-indigo-200 bg-indigo-50/60 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="font-bold text-gray-900">
                구글 시트 [회원 로그인 현황] 자동 저장 (회원명 / 접속일 / 강의실 입장 현황 / 자료 다운로드 현황)
              </h3>
            </div>
            <button
              type="button"
              disabled={setupLoading}
              onClick={handleSetupLoginStatusSheet}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50 shrink-0"
            >
              {setupLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>연동 확인 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>[회원 로그인 현황] 시트 생성 및 연동 확인</span>
                </>
              )}
            </button>
          </div>

          <div className="text-gray-600 leading-relaxed text-[11px] space-y-1">
            <p>
              • <strong>자동 기록 항목:</strong> 회원 로그인(접속) 시 <code>접속일</code>에 초 단위 시간(<code>YYYY-MM-DD HH:mm:ss</code>)이 기록되며, 실시간 강의실 입장 시 <code>강의실 입장 현황</code>, 자료 다운로드 시 <code>자료 다운로드 현황</code>에 시간과 함께 자동 누적 저장됩니다.
            </p>
            <p>
              • <strong>시트 자동 관리:</strong> 시트에 [회원 로그인 현황] 탭이 없더라도 첫 로그인이나 위 버튼 클릭 시 자동 생성되며 파스텔 블루 헤더 서식이 적용됩니다.
            </p>
          </div>

          {setupResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                setupResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {setupResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{setupResult.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
