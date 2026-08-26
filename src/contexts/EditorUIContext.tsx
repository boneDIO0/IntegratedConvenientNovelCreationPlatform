"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import { SettingItem } from '@/types'

type EditorUIContextType = {
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  activeOverlay: 'none' | 'version';
  setActiveOverlay: (val: 'none' | 'version') => void;

  // 1. 版本管理相關狀態與方法
  versions: any[];
  setVersions: React.Dispatch<React.SetStateAction<any[]>>;
  latestRestoredContent: any;
  setLatestRestoredContent: (content: any) => void;
  fetchVersions: (projectId: string, chapterId: string) => Promise<void>;
  isLoadingVersions: boolean;

  // 🌟 預覽特定版本
  previewVersion: any | null;
  setPreviewVersion: (version: any | null) => void;

  // 🛡️ 權限管理
  role: string | null;
  setRole: (role: string | null) => void;
  isEditable: boolean;

  // ✨ 選取設定即時連動（供 Tooltip 與 Popover 聯動開啟詳情）
  selectedSettingItem: SettingItem | null;
  setSelectedSettingItem: (item: SettingItem | null) => void;
  openSettingDetail: (item: SettingItem) => void;
}

const EditorUIContext = createContext<EditorUIContextType | undefined>(undefined);

export function EditorUIProvider({ children }: { children: React.ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'version'>('none');

  // 版本管理的 React State
  const [versions, setVersions] = useState<any[]>([]);
  const [latestRestoredContent, setLatestRestoredContent] = useState<any>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  // 預覽特定版本的 State
  const [previewVersion, setPreviewVersion] = useState<any | null>(null);

  // 權限管理狀態
  const [role, setRole] = useState<string | null>(null);
  const isEditable = role === 'owner' || role === 'editor';

  // 集中管理被點擊選中的設定項目
  const [selectedSettingItem, setSelectedSettingItem] = useState<SettingItem | null>(null);

  const openSettingDetail = useCallback((item: SettingItem) => {
    setSelectedSettingItem(item);
    setIsSettingsOpen(true);
  }, []);

  // 🌟 核心修正：加入 useCallback，避免函數參照改變導致無限重繪
  const fetchVersions = useCallback(async (projectId: string, chapterId: string) => {
    if (!projectId || !chapterId) return;

    setIsLoadingVersions(true);
    try {
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
  }, []); // 👈 依賴陣列保持為空，確保函數實體永遠唯一

  return (
    <EditorUIContext.Provider value={{
      isSettingsOpen,
      toggleSettings: () => setIsSettingsOpen(prev => !prev),
      activeOverlay,
      setActiveOverlay,

      versions,
      setVersions,
      latestRestoredContent,
      setLatestRestoredContent,
      fetchVersions,
      isLoadingVersions,

      previewVersion,
      setPreviewVersion,

      role,
      setRole,
      isEditable,

      selectedSettingItem,
      setSelectedSettingItem,
      openSettingDetail
    }}>
      {children}
    </EditorUIContext.Provider>
  );
}

export const useEditorUI = () => {
  const context = useContext(EditorUIContext);
  if (!context) throw new Error("useEditorUI 必須在 EditorUIProvider 內使用");
  return context;
};