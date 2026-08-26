import Image from 'next/image'

// 定義這個元件需要接收的資料格式
export interface NovelCardProps {
  project: {
    id: string;
    title: string;
    createdAt: string;
    publishedAt?: string | null; 
    coverUrl?: string;
    description?: string | null;
    status?: string; 
    tags?: string[];
    owner?: {
      name: string | null;
      image?: string | null;
    };
  };
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void; 
  showPublishDate?: boolean; // 🌟 新增：由父層決定是否要顯示發布日期
}

export default function NovelCard({ project, onClick, onContextMenu, showPublishDate }: NovelCardProps) {
  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
  }

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
        <h2 
          className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1"
          title={project.title}
        >
          {project.title}
        </h2>

        {project.owner && (
          <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600 font-medium">
            <span className="text-gray-400 text-xs">✏️</span>
            <span className="truncate" title={project.owner.name || '匿名作者'}>
              {project.owner.name || '匿名作者'}
            </span>
          </div>
        )}

        {project.description?.trim() && (
          <p
            className="mt-2 text-sm text-gray-500 leading-relaxed line-clamp-2"
            title={project.description}
          >
            {project.description}
          </p>
        )}

        {project.tags && project.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full border border-blue-100 bg-blue-50 text-blue-600"
              >
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="text-xs px-2 py-0.5 text-gray-400">
                +{project.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto pt-3 flex justify-between items-center">
          {/* 🌟 核心修改：如果是探索大廳 (showPublishDate=true)，就顯示發布於 (相容舊資料無發布時間的狀況) */}
          <span className="text-xs text-gray-400">
            {showPublishDate 
              ? project.publishedAt
                ? `發布於：${formatDate(project.publishedAt)}`
                : '尚未發布章節'
              : `建立於：${formatDate(project.createdAt)}`
            }
          </span>
          
          <span className={`text-[10px] px-2 py-0.5 rounded border font-medium tracking-wide ${statusDisplay.className}`}>
            {statusDisplay.text}
          </span>
        </div>
      </div>
    </div>
  )
}