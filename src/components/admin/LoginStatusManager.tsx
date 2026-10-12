'use client';

import React, { useState, useEffect } from 'react';
import { MemberLoginLog } from '@/types';
import {
  FileSpreadsheet,
  RefreshCw,
  Search,
  ExternalLink,
  Clock,
  Video,
  Download,
  UserCheck,
} from 'lucide-react';
import { GOOGLE_SHEET_URL } from '@/lib/constants';

export function LoginStatusManager() {
  const [logs, setLogs] = useState<MemberLoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activity', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.logs) {
        setLogs(data.logs);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      log.userName.toLowerCase().includes(term) ||
      log.loginAt.toLowerCase().includes(term) ||
      log.roomStatus.toLowerCase().includes(term) ||
      log.downloadStatus.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h2 className="text-base font-bold text-gray-900">
              구글 시트 [회원 로그인 현황] 실시간 모니터링
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            회원 접속일시, 강의실 입장 시간, 자료 다운로드 내역이 초 단위로 자동 저장됩니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>새로고침</span>
          </button>

          <a
            href={GOOGLE_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>구글 시트 바로가기</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* 검색 바 */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="회원명, 강의명, 자료명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="text-xs text-gray-500 font-medium">
          총 <strong className="text-gray-900">{logs.length}</strong>건의 기록
        </div>
      </div>

      {/* 테이블 */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#EBF3FA] text-[#1E3A8A] font-bold border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 w-32 whitespace-nowrap">회원명</th>
                <th className="py-3 px-4 w-48 whitespace-nowrap">접속일 (시간 포함)</th>
                <th className="py-3 px-4 min-w-[200px]">강의실 입장 현황</th>
                <th className="py-3 px-4 min-w-[200px]">자료 다운로드 현황</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-gray-400">
                    {loading ? '현황 데이터를 불러오는 중입니다...' : '아직 기록된 로그인 현황이 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-blue-50/40 transition">
                    <td className="py-3 px-4 font-bold text-gray-950 whitespace-nowrap flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>{log.userName}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{log.loginAt || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {log.roomStatus && log.roomStatus !== '-' ? (
                        <div className="flex items-start gap-1.5">
                          <Video className="w-3.5 h-3.5 text-carrot shrink-0 mt-0.5" />
                          <span className="text-[11px] text-gray-800">{log.roomStatus}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {log.downloadStatus && log.downloadStatus !== '-' ? (
                        <div className="flex items-start gap-1.5">
                          <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-[11px] text-gray-800">{log.downloadStatus}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
