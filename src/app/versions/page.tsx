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

export default function Home() {
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
//if (newDoc.content.blocks.length==0) newDoc.content.blocks=[{ type: 'paragraph', data: { text: ''}}]
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
      const res = await fetch(`/api/documents/${currentDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentDoc, content, saveVersion: false })
      });
      const updatedDoc = await res.json();
      // Keep versions and updatedAt in sync but content comes from editor
      //setCurrentDoc(prev => prev ? { ...prev, versions: updatedDoc.versions, updatedAt: updatedDoc.updatedAt } : null);
      //setCurrentDoc(updatedDoc);
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
      // loadDoc(updatedDoc.id);
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
    <div className={`app-container ${isFocusMode ? 'focus-mode' : ''} ${isSidebarOpen ? '' : 'sidebar-closed'} ${isHistoryOpen ? 'history-open' : ''}`}>
      <aside className="sidebar">
        <header className="sidebar-header">
          <h2>Writer'S Haven</h2>
          <button onClick={createDoc} title="New Document">
            <Plus size={20} />
          </button>
        </header>
        <div className="doc-list">
          {docs.map(doc => (
            <div 
              key={doc.id} 
              className={`doc-item ${currentDoc?.id === doc.id ? 'active' : ''}`}
              onClick={() => loadDoc(doc.id)}
            >
              <span className="doc-title">{doc.title}</span>
              <button onClick={(e) => deleteDoc(doc.id, e)} className="delete-btn">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <main className="main-content">
        <nav className="toolbar">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="toggle-sidebar">
            <Menu size={20} />
          </button>
          
          {currentDoc && (
            <input 
              className="title-input"
              value={currentDoc.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Title..."
            />
          )}

          <div className="toolbar-right">
            <span className={`save-indicator ${isSaving ? 'saving' : ''}`}>
              {isSaving ? 'Saving...' : 'Saved'}
            </span>
            {currentDoc && (
              <button onClick={createManualVersion} title="Save Version">
                <Save size={20} />
              </button>
            )}
            <button onClick={() => setIsFocusMode(!isFocusMode)} title="Toggle Focus Mode">
              {isFocusMode ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {currentDoc && (
              <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} title="Version History">
                <History size={20} />
              </button>
            )}
          </div>
        </nav>

        <section className="editor-wrapper">
          {currentDoc ? (
            <Editor 
              key={`${currentDoc.id}-${currentDoc.updatedAt || 'initial'}`}
              data={currentDoc.content}
              onChange={saveDoc}
            />
          ) : (
            <div className="no-doc">
              <p>Select a document or create a new one to start writing.</p>
              <button onClick={createDoc}>Create First Story</button>
            </div>
          )}
        </section>
      </main>

      <aside className="history-sidebar">
        <header className="sidebar-header">
          <h3>History</h3>
          <button onClick={() => setIsHistoryOpen(false)}>
            <X size={20} />
          </button>
        </header>
        <div className="history-list">
          {!currentDoc?.versions?.length && (
            <p className="no-versions">No previous versions available.</p>
          )}
          {currentDoc?.versions?.slice().reverse().map((version) => (
            <div key={version.timestamp} className="history-item">
              <div className="history-info">
                <span className="history-date">
                  {new Date(version.timestamp).toLocaleString()}
                </span>
                <span className="history-blocks">
                  {version.content.blocks?.length || 0} blocks
                </span>
              </div>
              <div className="history-actions">
                <button 
                  onClick={() => restoreVersion(version.timestamp)}
                  className="restore-btn"
                  title="Restore this version"
                >
                  <RotateCcw size={16} />
                </button>
                <button 
                  onClick={() => deleteVersion(version.timestamp)}
                  className="delete-version-btn"
                  title="Delete this version"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
