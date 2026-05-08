'use client';

import { useState, useEffect } from 'react';
import { Menu, Plus, Trash2, Eye, EyeOff, History, X, RotateCcw, Save } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import Editor to avoid SSR issues with EditorJS
const Editor = dynamic(() => import('@/components/EditorJS'), { ssr: false });

interface DocMetadata {
  id: string;
  title: string;
}

interface Version {
  timestamp: number;
  content: any;
}

interface Document extends DocMetadata {
  content: any;
  versions?: Version[];
  updatedAt?: number;
}

export default function VersionsPage() {
  const [docs, setDocs] = useState<DocMetadata[]>([]);
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      setDocs(data);
      if (data.length > 0 && !currentDoc) {
        loadDoc(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  const loadDoc = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      const data = await res.json();
      setCurrentDoc(data);
    } catch (err) {
      console.error('Failed to load document', err);
    }
  };

  const createDoc = async () => {
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Story' })
      });
      const newDoc = await res.json();
      setDocs([...docs, { id: newDoc.id, title: newDoc.title }]);
      console.log('create: ', newDoc);
      setCurrentDoc(newDoc);
    } catch (err) {
      console.error('Failed to create document', err);
    }
  };

  const deleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      const newDocs = docs.filter(d => d.id !== id);
      setDocs(newDocs);
      if (currentDoc?.id === id) {
        if (newDocs.length > 0) loadDoc(newDocs[0].id);
        else setCurrentDoc(null);
      }
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  };

  const saveDoc = async (content: any) => {
    if (!currentDoc) return;
    setIsSaving(true);
    try {
      await fetch(`/api/documents/${currentDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentDoc, content, saveVersion: false })
      });
    } catch (err) {
      console.error('Failed to save document', err);
    } finally {
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  const createManualVersion = async () => {
    if (!currentDoc) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/documents/${currentDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentDoc, saveVersion: true })
      });
      const updatedDoc = await res.json();
      setCurrentDoc(updatedDoc);
    } catch (err) {
      console.error('Failed to save version', err);
    } finally {
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  const restoreVersion = async (timestamp: number) => {
    if (!currentDoc) return;
    if (!confirm('Are you sure you want to restore this version? Your current changes will be saved as a new version.')) return;
    
    try {
      const res = await fetch(`/api/documents/${currentDoc.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp })
      });
      const updatedDoc = await res.json();
      setCurrentDoc(updatedDoc);
      setIsHistoryOpen(false);
    } catch (err) {
      console.error('Failed to restore version', err);
    }
  };

  const deleteVersion = async (timestamp: number) => {
    if (!currentDoc) return;
    if (!confirm('Are you sure you want to delete this version? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/documents/${currentDoc.id}/versions/${timestamp}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        const updatedVersions = currentDoc.versions?.filter(v => v.timestamp !== timestamp) || [];
        setCurrentDoc(prev => prev ? { ...prev, versions: updatedVersions } : null);
      }
    } catch (err) {
      console.error('Failed to delete version', err);
    }
  };

  const handleTitleChange = async (newTitle: string) => {
    if (!currentDoc) return;
    const updatedDoc = { ...currentDoc, title: newTitle };
    setCurrentDoc(updatedDoc);
    setDocs(docs.map(d => d.id === currentDoc.id ? { ...d, title: newTitle } : d));
    
    try {
      await fetch(`/api/documents/${currentDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDoc)
      });
    } catch (err) {
      console.error('Failed to update title', err);
    }
  };

  return (
    <div className={`flex h-screen w-full bg-[#FAFAFA] font-sans text-slate-800 ${isFocusMode ? 'bg-white' : ''}`}>
      
      {/* 🌟 左側：文件列表 (還原米色背景質感) */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 flex flex-col bg-[#F4F4F0] border-r border-slate-200 overflow-hidden`}>
        <header className="flex items-center justify-between p-4 border-b border-slate-200/50">
          <h2 className="font-bold text-slate-700 whitespace-nowrap">Writer's Haven</h2>
          <button onClick={createDoc} className="p-1 text-slate-500 hover:bg-slate-200 rounded transition-colors" title="New Document">
            <Plus size={18} />
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {docs.map(doc => (
            <div 
              key={doc.id} 
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                currentDoc?.id === doc.id ? 'bg-white shadow-sm font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-200/50'
              }`}
              onClick={() => loadDoc(doc.id)}
            >
              <span className="truncate">{doc.title}</span>
              <button 
                onClick={(e) => deleteDoc(doc.id, e)} 
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* 🌟 中間：編輯器主要區域 */}
      <main className="flex-1 flex flex-col relative min-w-0">
        
        {/* 頂部工具列 */}
        <nav className={`flex items-center justify-between p-4 transition-opacity ${isFocusMode ? 'opacity-0 hover:opacity-100 absolute w-full top-0 z-10' : ''}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors">
              <Menu size={20} />
            </button>
            
            {currentDoc && (
              <input 
                className="text-lg font-medium bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-300"
                value={currentDoc.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="輸入標題..."
              />
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span className={`text-sm mr-2 transition-opacity ${isSaving ? 'opacity-100 text-emerald-500' : 'opacity-0'}`}>
              儲存中...
            </span>
            {currentDoc && (
              <button onClick={createManualVersion} className="p-2 hover:bg-slate-100 rounded-md transition-colors" title="儲存為新版本">
                <Save size={18} />
              </button>
            )}
            <button onClick={() => setIsFocusMode(!isFocusMode)} className="p-2 hover:bg-slate-100 rounded-md transition-colors" title="切換專注模式">
              {isFocusMode ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {currentDoc && (
              <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className={`p-2 rounded-md transition-colors ${isHistoryOpen ? 'bg-slate-200 text-slate-800' : 'hover:bg-slate-100'}`} title="版本歷史紀錄">
                <History size={18} />
              </button>
            )}
          </div>
        </nav>

        {/* 編輯器容器 */}
        <section className={`flex-1 overflow-y-auto px-8 py-10 transition-all ${isFocusMode ? 'max-w-3xl mx-auto w-full pt-20' : 'lg:px-24'}`}>
          {currentDoc ? (
            <Editor 
              key={`${currentDoc.id}-${currentDoc.updatedAt || 'initial'}`}
              data={currentDoc.content}
              onChange={saveDoc}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <p>選擇一個文件，或建立新的故事來開始寫作。</p>
              <button onClick={createDoc} className="px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors">
                建立新故事
              </button>
            </div>
          )}
        </section>
      </main>

      {/* 🌟 右側：版本紀錄側邊欄 (還原原本的樣式與滑出動畫) */}
      <aside className={`fixed right-0 top-0 h-full w-80 bg-[#FAFAFA] border-l border-slate-200 shadow-2xl transform transition-transform duration-300 z-50 flex flex-col ${
        isHistoryOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <header className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <h3 className="font-bold text-slate-700">歷史紀錄</h3>
          <button onClick={() => setIsHistoryOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
            <X size={18} />
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!currentDoc?.versions?.length && (
            <p className="text-sm text-slate-400 text-center mt-4">目前尚無歷史版本。</p>
          )}
          {currentDoc?.versions?.slice().reverse().map((version) => (
            <div key={version.timestamp} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-700">
                    {new Date(version.timestamp).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    {version.content.blocks?.length || 0} 個區塊
                  </span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => restoreVersion(version.timestamp)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                    title="還原此版本"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button 
                    onClick={() => deleteVersion(version.timestamp)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="刪除此紀錄"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
      
    </div>
  );
}