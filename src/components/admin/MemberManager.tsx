'use client';

import React, { useState } from 'react';
import { MemberUser, MemberRole, MemberStatus } from '@/types';
import { RoleBadge } from '../common/RoleBadge';
import { UserCheck } from 'lucide-react';

interface MemberManagerProps {
  initialUsers: MemberUser[];
}

export function MemberManager({ initialUsers }: MemberManagerProps) {
  const [users, setUsers] = useState<MemberUser[]>(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleUpdate = async (userId: string, role: MemberRole, status: MemberStatus) => {
    setLoadingId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role, status }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role, status } : u))
        );
      } else {
        alert('회원 상태 변경에 실패했습니다.');
      }
    } catch (e) {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900 font-bold text-sm flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-carrot" />
          당근 모임 회원 승인 및 등급 관리 ({users.length}명)
        </h3>
        <span className="text-xs text-gray-400">
          * 변경 사항은 구글 스프레드시트에 자동 연동됩니다.
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-gray-700">
          <thead className="bg-gray-50 border-b border-gray-200 text-[11px] text-gray-500 uppercase">
            <tr>
              <th className="py-3 px-4">회원 정보 (아이디/비번)</th>
              <th className="py-3 px-4">직업 / 생년월일</th>
              <th className="py-3 px-4">가입일</th>
              <th className="py-3 px-4">현재 등급</th>
              <th className="py-3 px-4">상태</th>
              <th className="py-3 px-4 text-right">등급 변경 & 승인</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => {
              const isPending = u.status === 'pending';
              const isLoading = loadingId === u.id;

              return (
                <tr key={u.id} className="hover:bg-gray-50/70 transition">
                  <td className="py-3 px-4">
                    <p className="font-bold text-gray-900">{u.name}</p>
                    <p className="text-[11px] text-gray-600">{u.phoneNumber} (PW)</p>
                    <p className="text-[10px] text-gray-400">{u.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-gray-800 font-medium">{u.job || '-'}</p>
                    <p className="text-[10px] text-gray-400">{u.birthDate || '-'}</p>
                  </td>
                  <td className="py-3 px-4 text-gray-400">{u.joinedAt}</td>
                  <td className="py-3 px-4">
                    <RoleBadge role={u.role} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    {u.status === 'approved' && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        승인 완료
                      </span>
                    )}
                    {u.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        승인 대기
                      </span>
                    )}
                    {u.status === 'rejected' && (
                      <span className="text-[11px] text-red-500">거절됨</span>
                    )}
                    {u.status === 'blocked' && (
                      <span className="text-[11px] text-gray-400">차단됨</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isPending ? (
                        <>
                          <button
                            onClick={() => handleUpdate(u.id, 'regular', 'approved')}
                            disabled={isLoading}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition shadow-sm"
                          >
                            정회원 승인
                          </button>
                          <button
                            onClick={() => handleUpdate(u.id, 'guest', 'rejected')}
                            disabled={isLoading}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[11px] transition"
                          >
                            반려
                          </button>
                        </>
                      ) : (
                        <select
                          value={u.role}
                          disabled={isLoading || u.id === 'user_admin'}
                          onChange={(e) =>
                            handleUpdate(u.id, e.target.value as MemberRole, u.status)
                          }
                          className="bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-carrot"
                        >
                          <option value="guest">준회원/대기</option>
                          <option value="regular">정회원</option>
                          <option value="vip">VIP 회원</option>
                          <option value="admin">관리자</option>
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
