import Image from 'next/image'

// 定義這個元件需要接收的資料格式
export interface NovelCardProps {
  project: {
    id: string;
    title: string;
    createdAt: string;
    coverUrl?: string;
    status?: string; 
    // 📍 新增：接收可選的作者資訊 (讓創作後台跟大廳都可以共用這個卡片)
    owner?: {
      name: string | null;
      image?: string | null;
    };
  };
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void; // 設定為可選，大廳可能不需要右鍵選單
}

export default function NovelCard({ project, onClick, onContextMenu }: NovelCardProps) {
  // 將原本放在主頁面的日期格式化函式移進來
  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
  }

  // 狀態樣式對應表
  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return { text: '已完結', className: 'bg-green-50 text-green-600 border-green-200' };
      case 'SERIALIZING':
        return { text: '連載中', className: 'bg-blue-50 text-blue-600 border-blue-200' };
      case 'DRAFT':
      default:
        return { text: '未公開', className: 'bg-gray-50 text-gray-500 border-gray-200' };
    }
  }

  const statusDisplay = getStatusDisplay(project.status);

  return (
    <div 
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer group flex flex-col overflow-hidden"
    >
      <div className="w-full aspect-[3/4] relative bg-gray-100 border-b border-gray-100 overflow-hidden flex items-center justify-center">
        {project.coverUrl ? (
          <Image 
            src={project.coverUrl} 
            alt={project.title}
            fill
            unoptimized
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <span className="text-gray-400 font-medium tracking-widest">NO COVER</span>
        )}
      </div>
      
      <div className="p-4 flex flex-col flex-1 bg-white">
        {/* 🌟 優化 1：加入 title 屬性，滑鼠懸浮時顯示完整名稱 */}
        <h2 
          className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1"
          title={project.title}
        >
          {project.title}
        </h2>

        {/* 🌟 優化 2：如果有作者資訊，就顯示出來 (創作後台可能沒有傳，所以加個判斷) */}
        {project.owner && (
          <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600 font-medium">
            <span className="text-gray-400 text-xs">✏️</span>
            <span className="truncate" title={project.owner.name || '匿名作者'}>
              {project.owner.name || '匿名作者'}
            </span>
          </div>
        )}

        <div className="mt-auto pt-3 flex justify-between items-center">
          <span className="text-xs text-gray-400">建立於：{formatDate(project.createdAt)}</span>
          
          <span className={`text-[10px] px-2 py-0.5 rounded border font-medium tracking-wide ${statusDisplay.className}`}>
            {statusDisplay.text}
          </span>
        </div>
      </div>
    </div>
  )
}