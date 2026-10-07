'use client';

import React, { useEffect, useState } from 'react';
import { MemberUser } from '@/types';
import { initialUsers } from '@/lib/mockData';
import { RoleBadge } from './RoleBadge';
import { Users, X, CheckCircle2, Clock, ShieldCheck, UserCheck } from 'lucide-react';

interface MemberStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MemberStatusModal({ isOpen, onClose }: MemberStatusModalProps) {
  const [users, setUsers] = useState<MemberUser[]>(initialUsers);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/auth')
        .then((res) => res.json())
        .then((data) => {
          if (data.users) setUsers(data.users);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalCount = users.length;
  const approvedCount = users.filter((u) => u.status === 'approved').length;
  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const vipCount = users.filter((u) => u.role === 'vip').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-carrot/10 flex items-center justify-center text-carrot">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Dr. J&apos;s 회원 현황</h3>
              <p className="text-xs text-gray-500">현재 등록된 회원 및 등급/승인 상태입니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 요약 뱃지 그리드 */}
        <div className="grid grid-cols-4 gap-3 p-5 border-b border-gray-100 bg-white">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
            <span className="text-[11px] text-gray-500 block">전체 회원</span>
            <span className="text-lg font-bold text-gray-900">{totalCount}명</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
            <span className="text-[11px] text-emerald-700 block">승인 완료</span>
            <span className="text-lg font-bold text-emerald-800">{approvedCount}명</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
            <span className="text-[11px] text-amber-700 block">승인 대기</span>
            <span className="text-lg font-bold text-amber-800">{pendingCount}명</span>
          </div>
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-100 text-center">
            <span className="text-[11px] text-orange-700 block">VIP 회원</span>
            <span className="text-lg font-bold text-carrot">{vipCount}명</span>
          </div>
        </div>

        {/* 회원 목록 테이블 */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">회원 현황 불러오는 중...</div>
          ) : (
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] text-gray-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3">성명 (아이디)</th>
                  <th className="py-2.5 px-3">직업</th>
                  <th className="py-2.5 px-3">가입일</th>
                  <th className="py-2.5 px-3">등급</th>
                  <th className="py-2.5 px-3 text-right">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition">
                    <td className="py-2.5 px-3 font-semibold text-gray-900">
                      {u.name}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">
                      {u.job || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-[11px]">
                      {u.joinedAt}
                    </td>
                    <td className="py-2.5 px-3">
                      <RoleBadge role={u.role} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {u.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          승인완료
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                          <Clock className="w-3 h-3" />
                          승인대기
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
