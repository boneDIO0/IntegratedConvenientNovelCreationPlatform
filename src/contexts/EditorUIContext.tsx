"use client"
import { createContext, useContext, useState } from 'react'

type EditorUIContextType = {
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  activeOverlay: 'none' | 'version';
  setActiveOverlay: (val: 'none' | 'version') => void;

  // 1. 新增：版本管理相關狀態與方法
    versions: any[];                                       // 儲存從後端撈出來的 Checkpoint 列表
    setVersions: React.Dispatch<React.SetStateAction<any[]>>;
    latestRestoredContent: any;                            // 存放剛還原成功的 Tiptap JSON 內容
    setLatestRestoredContent: (content: any) => void;
    fetchVersions: (projectId: string, chapterId: string) => Promise<void>; // 撈取 DB 歷史紀錄的函式
    isLoadingVersions: boolean;                            // 載入狀態動畫提示用
}

const EditorUIContext = createContext<EditorUIContextType | undefined>(undefined);

export function EditorUIProvider({ children }: { children: React.ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'version'>('none');

  // 2. 新增：版本管理的 React State
  const [versions, setVersions] = useState<any[]>([]);
  const [latestRestoredContent, setLatestRestoredContent] = useState<any>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

// 3. 新增：非同步撈取後端 Prisma Checkpoint 列表的函式
  const fetchVersions = async (projectId: string, chapterId: string) => {
    if (!projectId || !chapterId) return;

    setIsLoadingVersions(true);
    try {
      // 呼叫我們剛剛規劃好的巢狀路由 GET API
      const res = await fetch(`/api/projects/${projectId}/chapters/${chapterId}/versions`);

      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      } else {
        console.error("後端拒絕提供版本清單");
      }
    } catch (err) {
      console.error("網路錯誤，無法載入版本歷史紀錄:", err);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  return (
    <EditorUIContext.Provider value={{
      isSettingsOpen,
      toggleSettings: () => setIsSettingsOpen(!isSettingsOpen),
      activeOverlay,
      setActiveOverlay,

      // 4. 將新增的狀態與方法注入 Provider 傳遞給全專案
      versions,
      setVersions,
      latestRestoredContent,
      setLatestRestoredContent,
      fetchVersions,
      isLoadingVersions
    }}>
      {children}
    </EditorUIContext.Provider>
  )
}

export const useEditorUI = () => {
  const context = useContext(EditorUIContext);
  if (!context) throw new Error("useEditorUI 必須在 EditorUIProvider 內使用");
  return context;
}