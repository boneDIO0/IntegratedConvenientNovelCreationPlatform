import Image from 'next/image'

// 定義這個元件需要接收的資料格式
export interface NovelCardProps {
  project: {
    id: string;
    title: string;
    createdAt: string;
    coverUrl?: string;
  };
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export default function NovelCard({ project, onClick, onContextMenu }: NovelCardProps) {
  // 將原本放在主頁面的日期格式化函式移進來，因為這屬於卡片的視覺呈現邏輯
  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
  }

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
        <div className="mt-auto pt-2">
          <span className="text-xs text-gray-400">建立於：{formatDate(project.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}