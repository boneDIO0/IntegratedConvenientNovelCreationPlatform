'use client'

import { useParams, useRouter } from 'next/navigation'
import { NotesPanel } from '@/components/NotesPanel' // ⚠️ 請確認你的 NotesPanel 引入路徑是否正確
import { ArrowLeft } from 'lucide-react'

export default function NotesPage() {
  const params = useParams()
  const router = useRouter()
  const novelId = params.novelId as string

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">  
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push(`/novel_list/${novelId}`)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            <span className="font-semibold text-sm">返回章節列表</span>
          </button>
        </div>
        
        <div className="text-sm font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-md border border-amber-100">
          💡 全域故事大綱
        </div>
      </header>
      
      <div className="flex-1 min-h-0 w-full">
        <NotesPanel 
          projectId={novelId} 
          isWidget={false} 
          isEditable={true} 
        />
      </div> 
    </div>
  )
}