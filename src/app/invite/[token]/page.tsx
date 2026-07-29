'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { BookOpenCheck, UserPlus, AlertCircle, Loader2, ArrowRight, Home } from 'lucide-react';
import Link from 'next/link';

interface InviteData {
  projectName: string;
  projectCover: string | null;
  inviterName: string;
  inviterImage: string | null;
  role: string;
  expiresAt: string;
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // 解開 Promise 取得 token (對齊 Next.js 最新規範)
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [inviteStatus, setInviteStatus] = useState<'valid' | 'used' | 'expired' | 'error'>('valid');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);

  // 📥 1. 頁面載入時，先去查詢這張邀請函的狀態
  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const res = await fetch(`/api/invitations/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setInviteStatus('error');
          setErrorMessage(data.error || '無法讀取邀請資訊');
          return;
        }

        setInviteStatus(data.status);
        if (data.status === 'valid') {
          setInviteData(data.data);
        } else {
          setErrorMessage(data.error);
        }
      } catch (err) {
        setInviteStatus('error');
        setErrorMessage('伺服器連線異常，請稍後再試');
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchInvitation();
  }, [token]);

  // 🚀 2. 點擊接受邀請的處理邏輯
  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      
      const data = await res.json();

      if (!res.ok) {
        setInviteStatus('error');
        setErrorMessage(data.error || '加入專案失敗');
        setIsAccepting(false);
        return;
      }

      // 成功加入！將使用者導向該專案的後台
      router.push(`/novel_list/${data.projectId}`);
    } catch (err) {
      setInviteStatus('error');
      setErrorMessage('系統發生錯誤，無法完成加入手續');
      setIsAccepting(false);
    }
  };

  // 🎨 畫面 A：載入中
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // 🎨 畫面 B：邀請函已失效或發生錯誤
  if (inviteStatus !== 'valid') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center animate-in zoom-in-95 duration-300">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 mb-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">無法使用此邀請</h2>
          <p className="text-slate-500 mb-8">{errorMessage}</p>
          <Link href="/" className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
            <Home size={16} /> 返回首頁大廳
          </Link>
        </div>
      </div>
    );
  }

  // 🎨 畫面 C：邀請函有效，顯示精美邀請卡
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 bg-[url('/grid-pattern.svg')] bg-center">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
        
        {/* 頂部品牌區 */}
        <div className="bg-slate-900 px-8 py-6 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
          <BookOpenCheck className="h-10 w-10 text-white mx-auto mb-3 relative z-10" />
          <h1 className="text-lg font-bold text-white relative z-10">Writer's Haven</h1>
        </div>

        {/* 邀請內容區 */}
        <div className="p-8 text-center">
          {/* 邀請人頭像 */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 mb-4 ring-4 ring-white shadow-sm -mt-12 relative z-20 overflow-hidden">
            {inviteData?.inviterImage ? (
              <img src={inviteData.inviterImage} alt="Inviter" className="h-full w-full object-cover" />
            ) : (
              <UserPlus className="h-8 w-8 text-indigo-600" />
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-800 mb-2">
            <span className="text-indigo-600">{inviteData?.inviterName}</span> 邀請您加入
          </h2>
          <p className="text-2xl font-black text-slate-900 mb-6 line-clamp-2">
            《{inviteData?.projectName}》
          </p>

          <div className="inline-flex items-center justify-center gap-2 bg-slate-100 rounded-lg px-4 py-2 mb-8">
            <span className="text-sm font-semibold text-slate-600">賦予身分：</span>
            <span className="text-sm font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
              {inviteData?.role === 'EDITOR' ? '✍️ 協作寫手' : '👀 檢視者'}
            </span>
          </div>

          {/* 動作按鈕區 */}
          <div className="space-y-3">
            {status === 'authenticated' ? (
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-base font-bold text-white hover:bg-indigo-700 transition-all disabled:opacity-70 shadow-lg shadow-indigo-200"
              >
                {isAccepting ? <Loader2 className="h-5 w-5 animate-spin" /> : '接受邀請並加入專案'}
              </button>
            ) : (
              <button
                onClick={() => signIn(undefined, { callbackUrl: `/invite/${token}` })}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-base font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                請先登入以接受邀請 <ArrowRight size={18} />
              </button>
            )}

            <Link href="/" className="block w-full text-center text-sm font-semibold text-slate-400 hover:text-slate-600 py-2 transition-colors">
              婉拒並返回首頁
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}