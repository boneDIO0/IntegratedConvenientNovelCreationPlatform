"use client";

import { useEffect } from "react";
import { useEditorUI } from "@/contexts/EditorUIContext";

export default function RoleInitializer({ serverRole }: { serverRole: string }) {
  const { setRole } = useEditorUI();

  useEffect(() => {
    // 當元件載入時，把後端查到的權限寫入全域 Context
    setRole(serverRole);
    
    // 當離開這個專案時，把權限清空，避免狀態污染
    return () => setRole(null);
  }, [serverRole, setRole]);

  return null; // 隱形元件，不渲染任何畫面
}