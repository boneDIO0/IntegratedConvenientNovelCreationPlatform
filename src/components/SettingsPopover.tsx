// src/components/SettingsPopover.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { SettingItem } from "@/types";

interface SettingsPopoverProps {
  projectId?: string;
  chapterId?: string;
}

const CATEGORY_TABS = [
  { id: 'chapter', label: '🎬 本章登場' },
  { id: 'all', label: '✨ 全部' },
  { id: 'character', label: '👤 人物' },
  { id: 'faction', label: '🏛️ 組織' },
  { id: 'item', label: '⚔️ 物品' },
  { id: 'event', label: '📜 事件' },
  { id: 'location', label: '📍 地點' },
  { id: 'custom', label: '⚙️ 通用' },
];

export function SettingsPopover({ projectId: propProjectId, chapterId: propChapterId }: SettingsPopoverProps) {
  const params = useParams();
  const projectId = propProjectId || (params?.novelId as string) || (params?.projectId as string);
  const chapterId = propChapterId || (params?.chapterId as string);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SettingItem[]>([]);
  
  const [activeTab, setActiveTab] = useState('chapter');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [detailItem, setDetailItem] = useState<SettingItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 🎯 即時編輯狀態管理
  const [editingContent, setEditingContent] = useState<Record<string, any>>({});
  const [isSavingField, setIsSavingField] = useState(false);

  // 當選擇的詳情項目改變時，初始化可編輯內容
  useEffect(() => {
    if (detailItem) {
      const content = (detailItem as any).content && typeof (detailItem as any).content === 'object'
        ? (detailItem as any).content
        : detailItem;
      setEditingContent({ ...content });
    }
  }, [detailItem]);

  // 🎯 1. 健壯的 API 讀取與解包邏輯
  const fetchPopoverSettings = async () => {
    if (!projectId) {
      console.warn("SettingsPopover 缺少 projectId，取消請求");
      return;
    }

    try {
      setLoading(true);
      let url = `/api/settings?projectId=${projectId}`;
      if (chapterId) url += `&chapterId=${chapterId}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("無法讀取設定");
      const responseData = await res.json();

      let rawList: any[] = [];
      if (Array.isArray(responseData)) {
        rawList = responseData;
      } else if (responseData && typeof responseData === 'object') {
        rawList = responseData.groups || responseData.settingGroups || responseData.data || responseData.items || [];
      }

      let flatItems: SettingItem[] = [];
      if (rawList.length > 0 && ('items' in rawList[0] || 'entities' in rawList[0] || 'settingItems' in rawList[0])) {
        flatItems = rawList.flatMap((group: any) => group.items || group.entities || group.settingItems || []);
      } else {
        flatItems = rawList;
      }

      setSettings(flatItems);

      // 🎯 提取本章登場 ID (多重相容性防禦)
      const initialAssigned = new Set<string>();
      flatItems.forEach((item: any) => {
        const isAssignedFlag = item.isChapterAssigned || item.isAssigned;
        
        const hasChapterRelation = Array.isArray(item.chapters) && item.chapters.some((c: any) => {
          if (typeof c === 'string') return c === chapterId;
          return c.id === chapterId;
        });

        if (isAssignedFlag || hasChapterRelation) {
          initialAssigned.add(item.id);
        }
      });
      setAssignedIds(initialAssigned);
    } catch (err) {
      console.error("Popover 設定載入失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🎯 開啟時自動撈取，關閉時清除搜尋紀錄
  useEffect(() => {
    if (isOpen) {
      fetchPopoverSettings();
    } else {
      setDetailItem(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  // 🎯 2. 切換登場狀態（對齊後端 PATCH 路由）
  const handleToggleChapterAssign = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!chapterId || !projectId || togglingId) return;

    const isAssigned = assignedIds.has(itemId);
    const newAssigned = new Set(assignedIds);
    
    if (isAssigned) {
      newAssigned.delete(itemId);
    } else {
      newAssigned.add(itemId);
    }
    setAssignedIds(newAssigned);
    setTogglingId(itemId);

    try {
      const res = await fetch(`/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: isAssigned ? 'disconnect_chapter' : 'connect_chapter', 
          chapterId, 
          entityId: itemId 
        }),
      });

      if (!res.ok) throw new Error("更新登場狀態失敗");
    } catch (err) {
      console.error(err);
      setAssignedIds(assignedIds); // 失敗時倒滾狀態
    } finally {
      setTogglingId(null);
    }
  };

  // 🎯 3. 失焦即時自動儲存表單欄位（方案 B：自動校正、背景創建組織、複數關聯與 Color #號補全）
  const handleSaveField = async (updatedContent: Record<string, any>) => {
    if (!detailItem || isSavingField) return;

    try {
      setIsSavingField(true);
      const safeContent: Record<string, any> = { ...updatedContent };

      for (const key of Object.keys(safeContent)) {
        const rawVal = safeContent[key];
        const rawItemAny = detailItem as any;
        const originalVal = rawItemAny.content?.[key] || rawItemAny[key];

        // 🎯 1. 關聯角色 (relations) 物件陣列語意解析與 ID 更新
        if (key === 'relations' && typeof rawVal === 'string') {
          const lines = rawVal
            .split(/[\n,，]/)
            .map(s => s.trim())
            .filter(Boolean);

          safeContent[key] = lines.map(line => {
            const match = line.match(/(?:•\s*)?(?:\[(.*?)\])?\s*(.*)/);
            const relationType = match && match[1] ? match[1].trim() : '關聯';
            const targetName = match && match[2] ? match[2].trim() : line.trim();

            const matchedTarget = settings.find(
              s => s.name.trim().toLowerCase() === targetName.toLowerCase() || s.id === targetName
            );

            return {
              type: relationType,
              relation: relationType,
              targetId: matchedTarget ? matchedTarget.id : targetName,
              targetName: targetName,
              name: targetName
            };
          });
        }
        // 🎯 2. 普通字串陣列型別還原（如 titles, abilities）
        else if (Array.isArray(originalVal) && typeof rawVal === 'string') {
          safeContent[key] = rawVal
            .split(/[\n,，]/)
            .map(s => s.trim())
            .filter(Boolean);
        }

        // 🎯 3. 方案 B 核心：所屬勢力外鍵映射（組織名稱 -> 自動匹配或背景建立新組織）
        if ((key === 'faction' || key === 'alliances') && typeof rawVal === 'string' && rawVal.trim()) {
          const inputName = rawVal.trim();
          
          let matchedFaction = settings.find(
            s => s.id === inputName || (s.category === 'faction' && s.name.trim().toLowerCase() === inputName.toLowerCase())
          );

          if (!matchedFaction && projectId) {
            try {
              const createCatRes = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  categoryName: '組織',
                  type: 'faction',
                  projectId: projectId,
                  item: { name: inputName }
                })
              });

              if (createCatRes.ok) {
                const newFactionEntity = await createCatRes.json();
                matchedFaction = {
                  id: newFactionEntity.id,
                  name: newFactionEntity.name || inputName,
                  category: 'faction'
                } as SettingItem;
              }
            } catch (createErr) {
              console.error("背景自動建立新組織失敗:", createErr);
            }
          }

          if (matchedFaction) {
            safeContent[key] = matchedFaction.id;
          }
        }

        // 🎯 4. 色彩 Hex 格式自動校正 (補上 # 號)
        if (key === 'color' && typeof rawVal === 'string' && rawVal.trim()) {
          let hex = rawVal.trim();
          if (!hex.startsWith('#')) {
            hex = `#${hex}`;
          }
          const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(hex);
          safeContent[key] = isValidHex ? hex : '#64748b';
        }
      }

      const updatedItem = {
        ...detailItem,
        content: safeContent,
      };

      const res = await fetch(`/api/settings/${detailItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedItem, saveVersion: false }),
      });

      if (!res.ok) throw new Error("儲存修改失敗");

      setSettings(prev => prev.map(item => item.id === detailItem.id ? (updatedItem as any) : item));
      setDetailItem(updatedItem as any);

      // 背景同步 Popover 列表，讓自動建立的新組織立即出現在選單中
      fetchPopoverSettings();
    } catch (err) {
      console.error("即時儲存欄位出錯:", err);
    } finally {
      setIsSavingField(false);
    }
  };

  // 🎯 4. 過濾邏輯
  const filteredSettings = useMemo(() => {
    return settings.filter(item => {
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery = !query || 
        item.name?.toLowerCase().includes(query) || 
        JSON.stringify((item as any).content || item || '').toLowerCase().includes(query);

      if (activeTab === 'chapter') {
        return matchesQuery;
      }

      const isAssigned = assignedIds.has(item.id);
      const matchesCategory = activeTab === 'all' || item.category === activeTab;

      return isAssigned && matchesCategory && matchesQuery;
    });
  }, [settings, activeTab, searchQuery, assignedIds]);

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const ITEM_TYPE_OPTIONS = [
    { value: 'weapon', label: '常規武器' },
    { value: 'relic', label: '古代遺物 / 聖物' },
    { value: 'consumable', label: '消耗品' },
    { value: 'skill', label: '特殊技能' },
    { value: 'custom', label: '其他 / 自訂' },
  ];

  const FIELD_LABEL_MAP: Record<string, string> = {
    description: '詳細說明',
    summary: '摘要說明',
    notes: '備註與註記',
    date: '發生時間',
    location: '發生地點',
    relations: '關聯角色 / 要素',
    participants: '參與人員',
    impact: '影響與結果',
    titles: '頭銜 / 稱號',
    age: '年齡',
    gender: '性別',
    identity: '身分',
    appearance: '外貌特徵',
    personality: '性格特點',
    background: '背景故事',
    abilities: '能力 / 技能',
    alliances: '所屬組織',
    faction: '所屬勢力',
    leader: '首領 / 領導者',
    headquarters: '據點 / 總部',
    goals: '組織目標',
    rarity: '稀有度',
    owner: '持有者',
    effect: '效果 / 功能',
    itemType: '物品類型',
    resonanceEffect: '共鳴效果 / 特殊機制',
    climate: '氣候特徵',
    geography: '地理環境',
    color: '關係圖專屬色彩',
    hierarchy: '組織架構 / 階級',
    territory: '勢力範圍 / 領地',
  };

  // 🎯 5. 渲染可編輯且對齊顯示的詳情欄位
  const renderDetailFields = (item: SettingItem) => {
    const content = editingContent;
    
    const excludeKeys = [
      'id', 'projectId', 'category', 'formType', 'type', 'versions', 
      'createdAt', 'updatedAt', 'name', 'title', 'deletedAt', 
      'isChapterAssigned', 'isAssigned', 'chapters'
    ];

    const entries = Object.entries(content).filter(([k]) => !excludeKeys.includes(k));

    if (entries.length === 0) return <p className="text-xs text-slate-400 py-4 text-center">尚無詳細內容</p>;

    return entries.map(([key, value]) => {
      const label = FIELD_LABEL_MAP[key] || (key.charAt(0).toUpperCase() + key.slice(1));
      
      let displayValue = value;
      if ((key === 'faction' || key === 'alliances') && typeof value === 'string') {
        const foundFaction = settings.find(s => s.id === value);
        if (foundFaction) {
          displayValue = foundFaction.name;
        }
      }

      // 🎯 關聯格式化展示修復：優先顯字，若是 UUID 則拿 settings 進行反查
      let valStr = '';
      if (key === 'relations' && Array.isArray(displayValue)) {
        valStr = displayValue.map((r: any) => {
          if (typeof r === 'object' && r !== null) {
            const relType = r.type || r.relation || '關聯';
            
            const rawTarget = r.targetName || r.name || r.targetId || '';
            const matchedChar = settings.find(s => s.id === rawTarget || s.name === rawTarget);
            const target = matchedChar ? matchedChar.name : (r.targetName || r.name || rawTarget || '未知');

            return `• [${relType}] ${target}`;
          }
          return `• ${r}`;
        }).join('\n');
      } else if (Array.isArray(displayValue)) {
        valStr = displayValue.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ');
      } else if (typeof displayValue === 'object' && displayValue !== null) {
        valStr = JSON.stringify(displayValue);
      } else {
        valStr = String(displayValue || '');
      }

      const isMultiLine = valStr.length > 35 || valStr.includes('\n');

      return (
        <div key={key} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 space-y-1 transition-all focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-sm">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-500 tracking-wide">
              {label}
            </label>
            <button
              type="button"
              onClick={() => handleCopyText(valStr, key)}
              className="text-[10px] text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer"
            >
              {copiedKey === key ? "✓ 已複製" : "複製"}
            </button>
          </div>

          {/* 🎯 色彩欄位特化 UI */}
          {key === 'color' ? (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={valStr.startsWith('#') ? valStr : `#${valStr}`}
                onChange={(e) => {
                  const nextContent = { ...editingContent, [key]: e.target.value };
                  setEditingContent(nextContent);
                  handleSaveField(nextContent);
                }}
                className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white flex-shrink-0"
                title="點擊選擇顏色"
              />
              <input
                type="text"
                value={valStr}
                placeholder="#64748b"
                onChange={(e) => {
                  const nextContent = { ...editingContent, [key]: e.target.value };
                  setEditingContent(nextContent);
                }}
                onBlur={() => handleSaveField(editingContent)}
                className="flex-1 text-xs text-slate-800 bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 focus:bg-white rounded-lg px-1.5 py-1 focus:outline-none transition-all font-mono font-medium"
              />
            </div>
          ) : key === 'itemType' ? (
            /* 🎯 物品類型下拉選單特化 UI */
            <select
              value={String(value || 'weapon')}
              onChange={(e) => {
                const nextContent = { ...editingContent, [key]: e.target.value };
                setEditingContent(nextContent);
                handleSaveField(nextContent);
              }}
              className="w-full text-xs text-slate-800 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-400 rounded-lg px-2 py-1.5 focus:outline-none transition-all font-medium cursor-pointer"
            >
              {ITEM_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : isMultiLine ? (
            <textarea
              value={valStr}
              placeholder="請輸入內容..."
              onChange={(e) => {
                const nextContent = { ...editingContent, [key]: e.target.value };
                setEditingContent(nextContent);
              }}
              onBlur={() => handleSaveField(editingContent)}
              rows={Math.min(valStr.split('\n').length + 1, 5)}
              className="w-full text-xs text-slate-800 bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 focus:bg-white rounded-lg p-1.5 focus:outline-none transition-all resize-y leading-relaxed"
            />
          ) : (
            <input
              type="text"
              value={valStr}
              placeholder="請輸入內容..."
              onChange={(e) => {
                const nextContent = { ...editingContent, [key]: e.target.value };
                setEditingContent(nextContent);
              }}
              onBlur={() => handleSaveField(editingContent)}
              className="w-full text-xs text-slate-800 bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 focus:bg-white rounded-lg px-1.5 py-1 focus:outline-none transition-all font-medium"
            />
          )}
        </div>
      );
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <span>◀</span>
          <span>打開設定集</span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="flex flex-col max-h-[520px] h-[520px] overflow-hidden p-0 shadow-2xl rounded-2xl border-slate-200 w-[380px]">
        
        {detailItem ? (
          <div className="flex flex-col h-full animate-in slide-in-from-right duration-200">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <button
                onClick={() => setDetailItem(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                ← 返回列表
              </button>
              <span className="text-xs font-bold text-slate-400">{detailItem.category?.toUpperCase()}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">{detailItem.name}</h3>
                {detailItem.description && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{detailItem.description}</p>
                )}
              </div>
              {renderDetailFields(detailItem)}
            </div>
          </div>
        ) : (

          <div className="flex flex-col h-full animate-in slide-in-from-left duration-200">
            
            <div className="p-3 border-b border-slate-100 space-y-2 bg-slate-50/50">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'chapter' ? "🔍 勾選本章要登場的要素..." : "🔍 搜尋登場要素..."}
                className="w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-800 text-xs rounded-lg px-3 py-1.5 border border-transparent focus:border-blue-400 focus:outline-none transition-all placeholder:text-slate-400"
              />

              <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
                {CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-slate-900 text-white shadow-sm font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-700 mb-2" />
                  載入設定集中...
                </div>
              ) : filteredSettings.length > 0 ? (
                filteredSettings.map((item) => {
                  const itemAny = item as any;
                  const isAssigned = assignedIds.has(item.id);
                  const desc = item.description || 
                    (itemAny.content && typeof itemAny.content === 'object' 
                      ? Object.values(itemAny.content).find(v => typeof v === 'string') 
                      : '') ||
                    '暫無詳細說明';

                  return (
                    <div
                      key={item.id}
                      onClick={() => setDetailItem(item)}
                      className="group p-2.5 rounded-xl border border-slate-100 bg-white hover:bg-blue-50/40 hover:border-blue-200 transition-all cursor-pointer flex items-center justify-between shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {activeTab === 'chapter' && (
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={(e) => handleToggleChapterAssign(e as any, item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                            title={isAssigned ? "取消本章登場" : "勾選為本章登場"}
                          />
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              item.category === 'character' ? 'bg-blue-500' :
                              item.category === 'faction' ? 'bg-orange-500' :
                              item.category === 'location' ? 'bg-purple-500' : 'bg-emerald-500'
                            }`} />
                            
                            <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                              {item.name}
                            </h4>
                          </div>

                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 pl-3">
                            {String(desc)}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-semibold text-blue-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                        詳情 →
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl p-4 text-center">
                  {settings.length === 0 ? (
                    <>
                      <span className="font-semibold text-slate-700 text-sm mb-1">作品尚未建立任何設定集</span>
                      <p className="text-[11px] text-slate-400 mb-3">請先前往作品後台建立人物或物品設定。</p>
                    </>
                  ) : activeTab !== 'chapter' ? (
                    <>
                      <span className="font-semibold text-slate-700 text-sm mb-1">本章尚未登場任何此類別設定</span>
                      <p className="text-[11px] text-slate-400 mb-3">請切換至「🎬 本章登場」Tab 勾選需要的要素！</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('chapter')}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-all shadow-sm cursor-pointer active:scale-95"
                      >
                        🎬 前往勾選登場要素
                      </button>
                    </>
                  ) : (
                    <>
                      <span>找不到匹配的設定項目</span>
                      <p className="text-[10px] text-slate-400 mt-1">（請嘗試搜尋關鍵字或前往後台建立設定）</p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-2.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[11px] text-slate-500 px-3">
              <span>找不到想要的角色或設定？</span>
              {projectId && (
                <Link 
                  href={`/novel_list/${projectId}/settings`}
                  target="_blank"
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5 hover:underline"
                >
                  ⚙️ 管理設定集 ↗
                </Link>
              )}
            </div>

          </div>
        )}

      </PopoverContent>
    </Popover>
  );
}