import Image from 'next/image'

// 定義這個元件需要接收的資料格式
export interface NovelCardProps {
  project: {
    id: string;
    title: string;
    createdAt: string;
    coverUrl?: string;
    status?: string; // 📍 新增：接收從資料庫來的狀態
  };
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export default function NovelCard({ project, onClick, onContextMenu }: NovelCardProps) {
  // 將原本放在主頁面的日期格式化函式移進來
  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
  }

  // 📍 新增：狀態樣式對應表
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
        <h2 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1">
          {project.title}
        </h2>
        {/* 📍 修改：使用 flex justify-between 讓日期靠左，標籤靠右 */}
        <div className="mt-auto pt-3 flex justify-between items-center">
          <span className="text-xs text-gray-400">建立於：{formatDate(project.createdAt)}</span>
          
          {/* 📍 新增：狀態標籤 */}
          <span className={`text-[10px] px-2 py-0.5 rounded border font-medium tracking-wide ${statusDisplay.className}`}>
            {statusDisplay.text}
          </span>
        </div>
      </div>
    </div>
  )
}