'use client';

import React, { useState, useEffect } from 'react';
import { X, Link as LinkIcon, Copy, CheckCircle2, UserPlus, Users, Trash2 } from 'lucide-react';

interface ManageMembersModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: string; 
  currentUserId: string;
}

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  joinedAt: string;
}

export default function ManageMembersModal({ projectId, isOpen, onClose, currentUserRole, currentUserId}: ManageMembersModalProps) {
  const normalizedUserRole = currentUserRole?.toUpperCase() || 'VIEWER';
  const [activeTab, setActiveTab] = useState<'invite' | 'members'>(normalizedUserRole === 'OWNER' ? 'invite' : 'members');
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [inviteLink, setInviteLink] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 開啟 Modal 時，自動撈取成員資料
  useEffect(() => {
    if (isOpen) {
      if (normalizedUserRole !== 'OWNER' && activeTab === 'invite') {
        setActiveTab('members'); // 如果不是 OWNER 卻在邀請頁，強制趕走
      } else if (normalizedUserRole === 'OWNER' && members.length === 0) {
        setActiveTab('invite'); // 如果是 OWNER 且剛打開，預設去邀請頁
      }
      fetchMembers();
    }
  }, [isOpen, normalizedUserRole]);

    const fetchMembers = async () => {
      if (!isOpen) return;
      
      setIsLoadingMembers(true);
      setFetchError('');
      
      try {
        const res = await fetch(`/api/projects/${projectId}/members`);
        const data = await res.json();
        
        if (res.ok) {
          setMembers(data.members);
        } else {
          setFetchError(data.error || '無法取得成員資料');
        }
      } catch (err) {
        setFetchError('發生錯誤，請稍後再試');
      } finally {
        setIsLoadingMembers(false);
      }
    };

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    setError('');
    setInviteLink('');
    setSuccessMessage('');
    setCopied(false);

    // 用逗號或半形空白切開字串，並過濾掉空字串
    const rawEmails = targetEmail
      .split(/[, ]+/)
      .map(e => e.trim())
      .filter(Boolean);
    
    // Email 格式防呆
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = rawEmails.filter(e => !emailRegex.test(e));

    if (invalidEmails.length > 0) {
      setError(`包含無效的信箱格式：${invalidEmails.join(', ')}`);
      setIsGenerating(false);
      return;
    }

    if (rawEmails.length > 5) {
      setError('為防止系統濫用，一次最多只能發送 5 筆邀請喔！');
      setIsGenerating(false);
      return;
    }

    try {
      // 產生一組供複製的通用網址連結
      const genericRes = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const genericData = await genericRes.json();
      if (!genericRes.ok) throw new Error(genericData.error || '產生連結失敗');

      setInviteLink(genericData.data.inviteLink);
      
      if (rawEmails.length === 0) {
        setSuccessMessage('通用邀請連結產生成功！');
      } else {
        // 如果有填寫 Email，額外發送專屬通知給這些人
        let messages: string[] = [];
        let latestLink = '';

        for (const email of rawEmails) {
          const res = await fetch(`/api/projects/${projectId}/invitations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, email }),
          });
          const data = await res.json();
          
          if (!res.ok) {
            throw new Error(`${email} 發送失敗：${data.error}`);
          }
          if (data.message) messages.push(data.message);
          latestLink = data.data.inviteLink; // 記錄剛產生的專屬連結
        }

        setTargetEmail('');
        setSuccessMessage(`通用連結已產生！\n${messages.join('\n')}`);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('複製失敗:', err);
    }
  };

  // --- API 呼叫：修改成員身分 ---
  const handleUpdateRole = async (memberId: string, newRole: string) => {
    setIsProcessingId(memberId);
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRole }),
      });
      if (res.ok) {
        // 更新本地端畫面，不需要重新 fetch 整個列表
        setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole as any } : m));
      } else {
        const data = await res.json();
        alert(`更新失敗: ${data.error}`);
      }
    } catch (err) {
      alert('發生錯誤，請稍後再試');
    } finally {
      setIsProcessingId(null);
    }
  };

  // --- API 呼叫：踢除成員 ---
  const handleRemoveMember = async (memberId: string, memberName: string | null) => {
    if (!confirm(`確定要將 ${memberName || '該成員'} 移出專案嗎？此動作無法復原。`)) return;
    
    setIsProcessingId(memberId);
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        // 更新本地端畫面，直接把人移除
        setMembers(members.filter(m => m.id !== memberId));
      } else {
        const data = await res.json();
        alert(`移除失敗: ${data.error}`);
      }
    } catch (err) {
      alert('發生錯誤，請稍後再試');
    } finally {
      setIsProcessingId(null);
    }
  };

  // 渲染身分標籤
  const RoleBadge = ({ roleName }: { roleName: string }) => {
    const normalizedRole = roleName?.toUpperCase() || 'VIEWER';
    switch (normalizedRole) {
      case 'OWNER':
        return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-xs font-bold border border-amber-200">管理員</span>;
      case 'EDITOR':
        return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-xs font-bold border border-blue-200">協作寫手</span>;
      case 'VIEWER':
        return <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-bold border border-slate-200">檢視者</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-bold">{roleName}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-1 bg-slate-50">
          <div className="flex items-center gap-2"></div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {normalizedUserRole === 'OWNER' && (
            <button
              onClick={() => setActiveTab('invite')}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'invite' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <UserPlus size={16} /> 邀請新成員
            </button>
          )}
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'members' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Users size={16} /> 現有成員
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {activeTab === 'invite' && normalizedUserRole === 'OWNER' ? (
            <div className="space-y-5">
              <div>
                <div className="mt-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">傳送邀請至 Email (選填，可輸入多個)</label>
                  <input
                    type="text"
                    placeholder="例如: abc@example.com, def@test.com (用逗號分隔)"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">如果留空，將僅產生邀請連結供您手動複製分享。</p>
                </div>
                
                <label className="block text-sm font-bold text-slate-700 mb-2 mt-3">賦予權限身分</label>
                <div className="grid grid-cols-2 gap-3">                  
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${role === 'EDITOR' ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="role" value="EDITOR" checked={role === 'EDITOR'} onChange={() => setRole('EDITOR')} className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                    <div>
                      <div className="text-sm font-bold text-slate-800">✍️ 協作寫手</div>
                      <div className="text-xs text-slate-500 mt-0.5">可編輯章節與設定集</div>
                    </div>
                  </label>
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${role === 'VIEWER' ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="role" value="VIEWER" checked={role === 'VIEWER'} onChange={() => setRole('VIEWER')} className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                    <div>
                      <div className="text-sm font-bold text-slate-800">👀 檢視者</div>
                      <div className="text-xs text-slate-500 mt-0.5">僅能觀看與留言</div>
                    </div>
                  </label>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerateLink}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {isGenerating ? '正在產生金鑰...' : <><LinkIcon size={16} /> 產生專屬邀請連結</>}
              </button>

              {successMessage && (
                <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 border border-emerald-100 flex items-center gap-2 font-medium">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              {inviteLink && (
                <div className="mt-4 animate-in slide-in-from-bottom-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">或手動複製邀請連結 (7天內有效)</label>
                    <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 p-1.5 pl-3">
                      <input 
                        type="text" 
                        readOnly 
                        value={inviteLink} 
                        className="flex-1 bg-transparent text-sm text-indigo-900 focus:outline-none truncate"
                      />
                      <button
                        onClick={handleCopy}
                        className={`flex shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-white transition-all ${
                          copied ? 'bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        {copied ? <><CheckCircle2 size={14} /> 已複製</> : <><Copy size={14} /> 複製</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // 現有成員列表
            <div className="space-y-3">
              {isLoadingMembers ? (
                <div className="py-10 flex flex-col items-center justify-center text-slate-400 animate-pulse">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-3"></div>
                  <p className="text-sm font-medium">載入成員名單中...</p>
                </div>
              ) : fetchError ? (
                <div className="py-8 text-center text-sm font-medium text-red-500 bg-red-50 rounded-xl border border-red-100">
                  {fetchError}
                </div>
              ) : members.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <Users size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">目前專案還沒有其他成員</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {members.map((member) => {
                    const isMe = member.id === currentUserId;
                    // 判斷是否顯示管理選單：我是房主 + 對方不是房主 + 對方不是我
                    const canManage = normalizedUserRole === 'OWNER' && member.role?.toUpperCase() !== 'OWNER' && !isMe;

                    return(
                    <div 
                      key={member.id} 
                      className="group flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {/* 頭像 */}
                        {member.image ? (
                          <img src={member.image} alt={member.name || 'User'} className="w-10 h-10 rounded-full border border-slate-200 shrink-0 object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold shrink-0">
                            {member.name?.charAt(0) || '?'}
                          </div>
                        )}
                        
                        {/* 姓名與信箱 */}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {member.name || '未知使用者'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {member.email || '無提供信箱'}
                          </p>
                        </div>
                      </div>

                      {/* 權限標籤 */}
                      <div className="shrink-0 ml-2 flex items-center gap-2">
                        {canManage ? (
                          <>
                            <div className="relative">
                              <select
                                value={member.role?.toUpperCase()}
                                onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                                disabled={isProcessingId === member.id}
                                className="appearance-none text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-md py-1 pl-2.5 pr-7 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer disabled:opacity-50 transition-colors"
                              >
                                <option value="EDITOR">協作者</option>
                                <option value="VIEWER">檢視者</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 text-slate-500">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
                                </svg>
                              </div>
                            </div>

                            <button 
                              onClick={() => handleRemoveMember(member.id, member.name)}
                              disabled={isProcessingId === member.id}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 opacity-100"
                              title="移出專案"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <RoleBadge roleName={member.role} />
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}