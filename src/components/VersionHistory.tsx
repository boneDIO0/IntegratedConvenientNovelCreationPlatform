import { RotateCcw, Trash2, X } from "lucide-react";

interface VersionHistoryProps {
  versions: any[];
  onRestore: (ts: number) => void;
  onDelete: (ts: number) => void;
  onClose: () => void;
}

export function VersionHistory({ versions, onRestore, onDelete, onClose }: VersionHistoryProps) {
  // 讓最新的歷史存檔排在最上面
  const displayVersions = [...versions].reverse();

  return (
    <div className="absolute right-0 top-14 w-72 bg-white shadow-2xl border border-slate-200 rounded-xl z-50 animate-in fade-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
      
      {/* 頂部標題與關閉按鈕 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/50">
        <h4 className="text-xs font-bold text-slate-600 flex items-center gap-1.5">⏳ 項目歷史快照</h4>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors">
          <X size={14} />
        </button>
      </div>

      {displayVersions.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-6">尚無歷史紀錄</div>
      ) : (
        <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
          {displayVersions.map((v: any) => {
            const ts = v.timestamp || v.id || v.time;
            const displayName = v.versionName || v.name || "歷史存檔點";
            const authorName = v.authorName || "未知寫手";

            return (
              <div key={ts} className="flex items-center justify-between p-2 hover:bg-amber-50 border border-transparent hover:border-amber-100 rounded-lg text-sm transition-colors group">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="font-bold text-slate-700 truncate" title={displayName}>{displayName}</div>
                  <div className="text-[10px] font-medium text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
                    <span className="text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded shadow-sm">{authorName}</span>
                    {new Date(Number(ts)).toLocaleString('zh-TW', { hour12: true })}
                  </div>
                </div>
                
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onRestore(ts)} 
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-100 rounded-md transition-colors"
                    title="還原至此版本"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button 
                    onClick={() => onDelete(ts)} 
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="刪除此版本"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}