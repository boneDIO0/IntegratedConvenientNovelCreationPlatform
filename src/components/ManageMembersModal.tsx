'use client';

import React, { useState } from 'react';
import { X, Link as LinkIcon, Copy, CheckCircle2, UserPlus, Users } from 'lucide-react';

interface ManageMembersModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageMembersModal({ projectId, isOpen, onClose }: ManageMembersModalProps) {
  const [activeTab, setActiveTab] = useState<'invite' | 'members'>('invite');
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [inviteLink, setInviteLink] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

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
            <div className="h-40 flex flex-col items-center justify-center text-slate-400">
              <Users size={32} className="mb-2 opacity-20" />
              <p className="text-sm">現有成員清單即將開放...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}