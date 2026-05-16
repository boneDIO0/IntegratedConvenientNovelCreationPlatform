"use client"
import { createContext, useContext, useState } from 'react'

type EditorUIContextType = {
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  activeOverlay: 'none' | 'version';
  setActiveOverlay: (val: 'none' | 'version') => void;
}

const EditorUIContext = createContext<EditorUIContextType | undefined>(undefined);

export function EditorUIProvider({ children }: { children: React.ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'version'>('none');

  return (
    <EditorUIContext.Provider value={{ 
      isSettingsOpen, 
      toggleSettings: () => setIsSettingsOpen(!isSettingsOpen), 
      activeOverlay, 
      setActiveOverlay 
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