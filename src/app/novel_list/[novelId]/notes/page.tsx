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