'use client';

import React, { useState, useEffect } from 'react';
import { MemberUser, MemberRole, MemberStatus, ROLE_HIERARCHY } from '@/types';
import { getCurrentUser, setCurrentUser } from '@/lib/auth';
import { RoleBadge } from '../common/RoleBadge';
import {
  UserCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Mail,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

type SortField = 'name' | 'job' | 'joinedAt' | 'role' | 'status';
type SortOrder = 'asc' | 'desc';

interface MemberManagerProps {
  initialUsers: MemberUser[];
}

export function MemberManager({ initialUsers }: MemberManagerProps) {
  const [users, setUsers] = useState<MemberUser[]>(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  // 반려/거절 사유 작성 모달 상태
  const [rejectModalUser, setRejectModalUser] = useState<MemberUser | null>(null);
  const [rejectReason, setRejectReason] = useState('당근 모임 정회원 확인이 필요합니다.');

  // 각 항목별 정렬 상태 (회원 정보 가나다순, 직업/생년월일, 가입일, 현재 등급, 승인 상태)
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 opacity-70" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-carrot" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-carrot" />
    );
  };

  // 정렬이 적용된 회원 목록 계산
  const sortedUsers = [...users].sort((a, b) => {
    const dir = sortOrder === 'asc' ? 1 : -1;

    if (sortField === 'name') {
      const cmp = (a.name || '').localeCompare(b.name || '', 'ko');
      if (cmp !== 0) return cmp * dir;
    } else if (sortField === 'job') {
      const cmp = (a.job || '').localeCompare(b.job || '', 'ko');
      if (cmp !== 0) return cmp * dir;
      const birthCmp = (a.birthDate || '').localeCompare(b.birthDate || '');
      if (birthCmp !== 0) return birthCmp * dir;
    } else if (sortField === 'joinedAt') {
      const cmp = (a.joinedAt || '').localeCompare(b.joinedAt || '');
      if (cmp !== 0) return cmp * dir;
    } else if (sortField === 'role') {
      const rankA = ROLE_HIERARCHY[a.role] ?? 0;
      const rankB = ROLE_HIERARCHY[b.role] ?? 0;
      if (rankA !== rankB) return (rankA - rankB) * dir;
    } else if (sortField === 'status') {
      const statusWeight: Record<string, number> = {
        pending: 1,
        approved: 2,
        rejected: 3,
        blocked: 4,
      };
      const weightA = statusWeight[a.status] ?? 99;
      const weightB = statusWeight[b.status] ?? 99;
      if (weightA !== weightB) return (weightA - weightB) * dir;
    }

    return (a.name || '').localeCompare(b.name || '', 'ko');
  });

  // 부모 컴포넌트의 initialUsers 변경 시 동기화
  useEffect(() => {
    if (initialUsers && initialUsers.length > 0) {
      setUsers(initialUsers);
    }
  }, [initialUsers]);

  // 최신 구글 시트 회원 데이터 불러오기
  const refreshUsers = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/auth', { cache: 'no-store' });
      const data = await res.json();
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (e) {
      console.warn('회원 새로고침 실패:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // 컴포넌트 마운트 시 최신 데이터 자동 동기화
  useEffect(() => {
    refreshUsers();
  }, []);

  const handleUpdate = async (
    userId: string,
    role: MemberRole,
    status: MemberStatus,
    rejectionReason?: string
  ) => {
    setLoadingId(userId);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role, status, rejectionReason }),
      });

      const data = await res.json();

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, role, status, rejectionReason } : u
          )
        );

        // [요구사항 5]: 관리자 센터에서 승인 완료 시 회원에게 실시간 즉시 반영
        try {
          const channel = new BroadcastChannel('daangn_auth_sync');
          channel.postMessage({ type: 'USER_UPDATED', userId, role, status });
          channel.close();
        } catch (_) {}

        const currentLocal = getCurrentUser();
        if (currentLocal && (currentLocal.id === userId || currentLocal.name === data.user?.name)) {
          setCurrentUser({ ...currentLocal, role, status });
        }

        setFeedbackMsg({
          id: userId,
          text: data.message || '등급 및 승인 상태가 구글 시트에 즉시 반영되었습니다.',
          ok: true,
        });
        setTimeout(() => setFeedbackMsg(null), 4000);
      } else {
        setFeedbackMsg({
          id: userId,
          text: data.error || '변경 처리에 실패했습니다.',
          ok: false,
        });
      }
    } catch (e) {
      setFeedbackMsg({
        id: userId,
        text: '네트워크 통신 오류가 발생했습니다.',
        ok: false,
      });
    } finally {
      setLoadingId(null);
      setRejectModalUser(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더 및 새로고침 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-gray-900 font-bold text-sm flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-carrot" />
            <span>Dr. J&apos;s 회원 승인 및 등급 관리 ({users.length}명)</span>
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            신규 가입 신청자 및 전체 회원의 등급(준회원, 정회원, VIP, 관리자)을 부여하고 승인 상태를 조정합니다.
          </p>
        </div>

        <button
          onClick={refreshUsers}
          disabled={refreshing}
          className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm self-start sm:self-auto disabled:opacity-50"
          title="구글 스프레드시트의 최신 회원 정보 가져오기"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-carrot ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? '동기화 중...' : '최신 회원 새로고침'}</span>
        </button>
      </div>

      {/* 회원 목록 테이블 */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-gray-700">
          <thead className="bg-gray-50 border-b border-gray-200 text-[11px] text-gray-500 uppercase select-none">
            <tr>
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-4 cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition"
                title="성명 가나다순 오름차순/내림차순 정렬"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'name' ? 'text-carrot font-extrabold' : ''}>
                    회원 정보 (성명/연락처)
                  </span>
                  {renderSortIcon('name')}
                </div>
              </th>
              <th
                onClick={() => handleSort('job')}
                className="py-3 px-4 cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition"
                title="직업/생년월일 오름차순/내림차순 정렬"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'job' ? 'text-carrot font-extrabold' : ''}>
                    직업 / 생년월일
                  </span>
                  {renderSortIcon('job')}
                </div>
              </th>
              <th
                onClick={() => handleSort('joinedAt')}
                className="py-3 px-4 cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition"
                title="가입일 오름차순/내림차순 정렬"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'joinedAt' ? 'text-carrot font-extrabold' : ''}>
                    가입일
                  </span>
                  {renderSortIcon('joinedAt')}
                </div>
              </th>
              <th
                onClick={() => handleSort('role')}
                className="py-3 px-4 cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition"
                title="현재 등급순 오름차순/내림차순 정렬"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'role' ? 'text-carrot font-extrabold' : ''}>
                    현재 등급
                  </span>
                  {renderSortIcon('role')}
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="py-3 px-4 cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition"
                title="승인 상태순 오름차순/내림차순 정렬"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'status' ? 'text-carrot font-extrabold' : ''}>
                    승인 상태
                  </span>
                  {renderSortIcon('status')}
                </div>
              </th>
              <th className="py-3 px-4 text-right">등급 변경 및 승인 조정</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400 text-xs">
                  등록된 회원이 없습니다.
                </td>
              </tr>
            ) : (
              sortedUsers.map((u) => {
                const isPending = u.status === 'pending';
                const isLoading = loadingId === u.id;
                const isFeedback = feedbackMsg?.id === u.id;

                return (
                  <tr key={u.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900 flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {u.name === '지정인' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-black text-white font-bold">
                            모임장
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-600">{u.phoneNumber} (PW)</p>
                      <p className="text-[10px] text-gray-400">{u.email}</p>
                      {isFeedback && (
                        <p className={`text-[10px] mt-1 font-semibold ${feedbackMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                          {feedbackMsg.text}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-800 font-medium">{u.job || '-'}</p>
                      <p className="text-[10px] text-gray-400">{u.birthDate || '-'}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{u.joinedAt || '-'}</td>
                    <td className="py-3 px-4">
                      <RoleBadge role={u.role} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      {u.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
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
                        <div>
                          <span className="text-[11px] text-red-500 font-semibold">거절됨</span>
                          {u.rejectionReason && (
                            <p className="text-[10px] text-gray-500 truncate max-w-[120px]" title={u.rejectionReason}>
                              사유: {u.rejectionReason}
                            </p>
                          )}
                        </div>
                      )}
                      {u.status === 'blocked' && (
                        <span className="text-[11px] text-gray-400">차단됨</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {/* 빠른 원클릭 승인 (대기 회원인 경우) */}
                        {isPending && (
                          <div className="flex items-center gap-1 mr-1">
                            <button
                              onClick={() => handleUpdate(u.id, 'regular', 'approved')}
                              disabled={isLoading}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition shadow-sm disabled:opacity-50"
                              title="정회원 즉시 승인 및 축하 메일 발송"
                            >
                              정회원 즉시 승인
                            </button>
                            <button
                              onClick={() => {
                                setRejectModalUser(u);
                                setRejectReason('당근 모임 정회원 확인이 필요합니다.');
                              }}
                              disabled={isLoading}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[11px] transition disabled:opacity-50"
                              title="반려 사유 작성 후 메일 발송"
                            >
                              반려
                            </button>
                          </div>
                        )}

                        {/* 등급 직접 변경 드롭다운 */}
                        <div className="flex items-center gap-1">
                          <select
                            value={u.role}
                            disabled={isLoading}
                            onChange={(e) =>
                              handleUpdate(u.id, e.target.value as MemberRole, u.status)
                            }
                            className="bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-2 py-1 font-medium focus:outline-none focus:border-black disabled:opacity-50"
                            title="회원 등급 변경"
                          >
                            <option value="guest">준회원/대기</option>
                            <option value="regular">정회원</option>
                            <option value="vip">VIP 회원</option>
                            <option value="admin">관리자</option>
                          </select>

                          {/* 승인 상태 직접 변경 드롭다운 */}
                          <select
                            value={u.status}
                            disabled={isLoading}
                            onChange={(e) => {
                              const newStatus = e.target.value as MemberStatus;
                              if (newStatus === 'rejected') {
                                setRejectModalUser(u);
                                setRejectReason('가입 정보 확인 및 보완이 필요합니다.');
                              } else {
                                handleUpdate(u.id, u.role, newStatus);
                              }
                            }}
                            className="bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-2 py-1 font-medium focus:outline-none focus:border-black disabled:opacity-50"
                            title="승인 상태 변경"
                          >
                            <option value="approved">승인 완료</option>
                            <option value="pending">승인 대기</option>
                            <option value="rejected">반려/거절</option>
                          </select>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 반려 사유 입력 모달 */}
      {rejectModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>회원 가입 반려 및 사유 작성</span>
              </div>
              <button
                onClick={() => setRejectModalUser(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
              <p>
                <strong>회원명:</strong> {rejectModalUser.name} ({rejectModalUser.phoneNumber})
              </p>
              <p>
                <strong>발송 이메일:</strong> {rejectModalUser.email}
              </p>
              <p className="text-[11px] text-gray-500">
                * 반려 처리 시 위 이메일로 거절 사유와 함께 수정 안내 메일이 발송됩니다.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 block">
                반려/거절 사유 입력
              </label>

              {/* 빠른 사유 칩 */}
              <div className="flex flex-wrap gap-1.5 pb-1">
                {[
                  '당근 모임 정회원 확인 필요',
                  '연락처를 정확히 입력해 주세요',
                  '성명/생년월일 확인 필요',
                  '당근 닉네임 불일치',
                ].map((txt) => (
                  <button
                    key={txt}
                    type="button"
                    onClick={() => setRejectReason(txt)}
                    className="text-[10px] px-2 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition"
                  >
                    {txt}
                  </button>
                ))}
              </div>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="회원에게 전달될 구체적인 반려 사유를 작성하세요."
                rows={4}
                className="w-full text-xs border border-gray-300 rounded-xl p-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalUser(null)}
                className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                취소
              </button>
              <button
                type="button"
                disabled={loadingId === rejectModalUser.id || !rejectReason.trim()}
                onClick={() =>
                  handleUpdate(rejectModalUser.id, 'guest', 'rejected', rejectReason.trim())
                }
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>반려 처리 및 사유 메일 발송</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
