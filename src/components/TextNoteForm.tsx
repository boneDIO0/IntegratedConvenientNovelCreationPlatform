'use client';

import { useState, useEffect } from "react";
import { SettingItem } from "@/types";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Heading2, History } from 'lucide-react';
import { VersionHistory } from "./VersionHistory";

interface TextNoteFormProps {
  item: SettingItem;
  onSave: (updatedItem: SettingItem) => Promise<void>;
  onRefresh: () => Promise<void>;
  isEditable?: boolean;
  onDirty?: () => void;
}

export default function TextNoteForm({ item, onSave, onRefresh, onDirty, isEditable = true }: TextNoteFormProps) {
  const [title, setTitle] = useState(item.name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const versions = (item as any).versions || (item as any).content?.versions || [];

  // 初始化 Tiptap 編輯器
  const editor = useEditor({
    extensions: [StarterKit],
    content: item.description || "",
    editable: isEditable,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      if (currentEditor.isFocused) {
        onDirty?.();
      }
    },
    editorProps: {
      attributes: {
        // 設定編輯器的外觀與最小高度
        class: 'prose max-w-none focus:outline-none min-h-[300px] p-4 text-slate-700 leading-relaxed',
      },
    },
  });

  // 當選擇的 item 改變時，同步更新標題與編輯器內容
  useEffect(() => {
    setTitle(item.name || "");
    if (editor && item.description !== editor.getHTML()) {
      editor.commands.setContent(item.description || "");
    }
  }, [item, editor]);

  // 監聽權限變化，鎖死或解鎖編輯器
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditable);
    }
  }, [isEditable, editor]);

  const handleSave = async () => {
    if (!editor || !isEditable) return;
    setIsSaving(true);
    
    // 取得編輯器內的 HTML 格式字串
    const htmlContent = editor.getHTML();
    
    const updatedItem = {
      ...item,
      name: title,
      description: htmlContent, // 存入 HTML 格式
      content: {
        ...((item as any).content || {}),
        description: htmlContent,
      }
    };
    await onSave(updatedItem);
    setIsSaving(false);
  };

  // 還原版本 API
  const handleRestoreVersion = async (ts: number) => {
    if (!confirm("確定要還原到此歷史版本嗎？\n目前未儲存的變更將會遺失。")) return;
    try {
      const res = await fetch(`/api/notes/${item.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: ts })
      });
      if (res.ok) {
        setShowHistory(false);
        await onRefresh();
        alert("🎉 筆記已成功還原！");
      }
    } catch (e) {
      console.error(e);
      alert("還原失敗");
    }
  };

  // 刪除版本 API
  const handleDeleteVersion = async (ts: number) => {
    if (!confirm("確定要刪除此條歷史備份嗎？此動作無法復原。")) return;
    try {
      const res = await fetch(`/api/notes/${item.id}/versions/${ts}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative flex flex-col h-full space-y-4 animate-in fade-in duration-300">
      
      {!isEditable && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50/50 border border-amber-200 p-3 text-sm text-amber-800 shrink-0">
          🔒 <span className="font-medium">唯讀模式</span>：您目前正在檢視大綱，沒有編輯權限。
        </div>
      )}

      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          onDirty?.(); // 改標題時觸發防呆
        }}
        placeholder="筆記標題..."
        disabled={!isEditable}
        className="text-2xl font-bold border-b border-transparent hover:border-amber-200 focus:border-amber-400 focus:outline-none bg-transparent px-2 py-1 transition-colors text-slate-800 placeholder-slate-300 w-full disabled:opacity-80 disabled:cursor-not-allowed shrink-0"
      />
      
      {/* 輕量級 Tiptap 編輯器區塊 */}
      <div className={`flex-1 flex flex-col w-full rounded-xl border transition-all overflow-hidden ${
        isEditable ? 'border-amber-200 bg-amber-50/30 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-400' : 'border-slate-200 bg-slate-50 opacity-80'
      }`}>
        
        {/* 工具列 (僅在可編輯狀態下顯示) */}
        {isEditable && editor && (
          <div className="flex items-center gap-1 p-2 border-b border-amber-200 bg-amber-100/50 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-amber-300 text-amber-900' : 'text-amber-700 hover:bg-amber-200'}`}
              title="大標題"
            >
              <Heading2 size={18} />
            </button>
            <div className="w-px h-5 bg-amber-300 mx-1"></div>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-amber-300 text-amber-900' : 'text-amber-700 hover:bg-amber-200'}`}
              title="粗體"
            >
              <Bold size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-amber-300 text-amber-900' : 'text-amber-700 hover:bg-amber-200'}`}
              title="斜體"
            >
              <Italic size={18} />
            </button>
            <div className="w-px h-5 bg-amber-300 mx-1"></div>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-amber-300 text-amber-900' : 'text-amber-700 hover:bg-amber-200'}`}
              title="無序清單"
            >
              <List size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('orderedList') ? 'bg-amber-300 text-amber-900' : 'text-amber-700 hover:bg-amber-200'}`}
              title="有序清單"
            >
              <ListOrdered size={18} />
            </button>
          </div>
        )}

        {/* 編輯器內容區 */}
        <div className="flex-1 overflow-y-auto cursor-text" onClick={() => editor?.commands.focus()}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {isEditable && (
        <div className="flex items-center justify-end gap-3 pt-2 shrink-0">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all border ${
              showHistory
                ? "bg-purple-600 border-purple-600 text-white hover:bg-purple-700 shadow-sm"
                : "bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100"
            }`}
          >
            <History size={16} /> 歷史紀錄
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {isSaving ? "儲存中..." : "💾 儲存筆記"}
          </button>
          
          {showHistory && (
            <VersionHistory 
              versions={versions} 
              onRestore={handleRestoreVersion} 
              onDelete={handleDeleteVersion} 
              onClose={() => setShowHistory(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}