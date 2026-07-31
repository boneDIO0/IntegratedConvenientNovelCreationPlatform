'use client';

import React, { useState, useEffect } from 'react';
import { X, Link as LinkIcon, Copy, CheckCircle2, UserPlus, Users } from 'lucide-react';

interface ManageMembersModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  joinedAt: string;
}

export default function ManageMembersModal({ projectId, isOpen, onClose }: ManageMembersModalProps) {
  const [activeTab, setActiveTab] = useState<'invite' | 'members'>('invite');
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [inviteLink, setInviteLink] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // 開啟 Modal 時，自動撈取成員資料
  useEffect(() => {
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

    fetchMembers();
  }, [projectId, isOpen]);

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    setError('');
    setInviteLink('');
    setCopied(false);

    try {
      const res = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '產生連結失敗');
      }

      setInviteLink(data.data.inviteLink);
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
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            👥 專案成員管理
          </h2>
          <button 
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('invite')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'invite' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <UserPlus size={16} /> 邀請新成員
          </button>
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
          {activeTab === 'invite' ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">賦予權限身分</label>
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

              {inviteLink && (
                <div className="mt-4 animate-in slide-in-from-bottom-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">邀請連結 (7天內有效，單次使用)</label>
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
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {members.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50/80 transition-colors"
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
                  <div className="shrink-0 ml-2">
                    <RoleBadge roleName={member.role} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}