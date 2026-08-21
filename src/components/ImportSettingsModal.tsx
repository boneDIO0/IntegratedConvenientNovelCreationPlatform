'use client'
import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

interface ImportSettingsModalProps {
  currentProjectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportSettingsModal({ currentProjectId, onClose, onSuccess }: ImportSettingsModalProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          // 過濾掉自己，不讓自己匯入自己
          setProjects(data.filter((p: any) => p.id !== currentProjectId));
        }
      } catch (error) {
        console.error("無法取得作品列表", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, [currentProjectId]);

  const handleImport = async () => {
    if (!selectedProjectId) return;
    
    if (!confirm("確定要匯入嗎？這將會把所選作品的設定集全數複製過來。")) return;

    setIsImporting(true);
    try {
      const res = await fetch(`/api/settings/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          targetProjectId: currentProjectId,
          sourceProjectId: selectedProjectId 
        })
      });

      if (res.ok) {
        alert("🎉 匯入成功！");
        onSuccess(); 
        onClose();   
      } else {
        const err = await res.json();
        alert(err.error || "匯入失敗");
      }
    } catch (error) {
      alert("網路連線錯誤");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col slide-in-from-bottom-4 animate-in duration-300">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
            <Download size={20} className="text-blue-500" /> 從現有作品匯入設定
          </h2>
        </div>
        
        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="text-center py-6 text-slate-400 text-sm">載入作品列表中...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm font-medium">
              您目前沒有其他可供匯入的作品。
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 leading-relaxed">
                請選擇要複製設定集的來源作品。<br/>
                <span className="text-amber-600 font-semibold text-xs">⚠️ 系統將會複製來源作品的「世界觀曆法」與「所有設定實體」。</span>
              </p>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              >
                <option value="" disabled>-- 請選擇來源作品 --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-semibold transition-colors text-sm"
          >
            取消
          </button>
          <button 
            onClick={handleImport}
            disabled={!selectedProjectId || isImporting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
          >
            {isImporting ? '匯入中...' : '確認匯入'}
          </button>
        </div>
      </div>
    </div>
  );
}