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

      // 🎯 補強解包 key：相容 entities / items / settingItems
      let flatItems: SettingItem[] = [];
      if (rawList.length > 0 && ('items' in rawList[0] || 'entities' in rawList[0] || 'settingItems' in rawList[0])) {
        flatItems = rawList.flatMap((group: any) => group.items || group.entities || group.settingItems || []);
      } else {
        flatItems = rawList;
      }

      setSettings(flatItems);

      // 提取本章登場 ID
      const initialAssigned = new Set<string>();
      flatItems.forEach((item: any) => {
        if (item.isChapterAssigned || item.isAssigned || item.chapters?.some((c: any) => c.id === chapterId)) {
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

  useEffect(() => {
    if (isOpen) {
      fetchPopoverSettings();
    } else {
      setDetailItem(null);
      setSearchQuery('');
    }
  }, [isOpen, projectId, chapterId]);

  // 🎯 2. 切換登場狀態（已對齊後端 PATCH 路由與 payload）
  const handleToggleChapterAssign = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!chapterId || !projectId || togglingId) return;

    const isAssigned = assignedIds.has(itemId);
    const newAssigned = new Set(assignedIds);
    
    // 樂觀 UI 更新
    if (isAssigned) {
      newAssigned.delete(itemId);
    } else {
      newAssigned.add(itemId);
    }
    setAssignedIds(newAssigned);
    setTogglingId(itemId);

    try {
      // 🎯 發送 PATCH 請求給 /api/settings
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

  // 🎯 3. 過濾邏輯
  const filteredSettings = useMemo(() => {
    return settings.filter(item => {
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery = !query || 
        item.name?.toLowerCase().includes(query) || 
        JSON.stringify((item as any).content || item || '').toLowerCase().includes(query);

      // 「🎬 本章登場」Tab：秀出全專案項目供勾選
      if (activeTab === 'chapter') {
        return matchesQuery;
      }

      // 其他 Tab：只秀有勾選登場且符合類別的項目
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

  const FIELD_LABEL_MAP: Record<string, string> = {
    // 通用欄位
    description: '詳細說明',
    summary: '摘要說明',
    notes: '備註與註記',
    
    // 事件 (Event) 欄位
    date: '發生時間',
    location: '發生地點',
    relations: '關聯角色 / 要素',
    participants: '參與人員',
    impact: '影響與結果',
    
    // 人物 (Character) 欄位
    age: '年齡',
    gender: '性別',
    identity: '身分 / 稱號',
    appearance: '外貌特徵',
    personality: '性格特點',
    background: '背景故事',
    abilities: '能力 / 技能',
    alliances: '所屬組織',

    // 組織 (Faction) 欄位
    leader: '首領 / 領導者',
    headquarters: '據點 / 總部',
    goals: '組織目標',

    // 物品 (Item) 欄位
    rarity: '稀有度',
    owner: '持有者',
    effect: '效果 / 功能',

    // 地點 (Location) 欄位
    climate: '氣候特徵',
    geography: '地理環境',
  };

  const renderDetailFields = (item: SettingItem) => {
    const itemAny = item as any;
    const content = itemAny.content && typeof itemAny.content === 'object' ? itemAny.content : item;
    
    // 🎯 需要隱藏的系統內部 Key
    const excludeKeys = [
      'id', 'projectId', 'category', 'formType', 'type', 'versions', 
      'createdAt', 'updatedAt', 'name', 'title', 'deletedAt', 
      'isChapterAssigned', 'isAssigned', 'chapters'
    ];

    const entries = Object.entries(content).filter(([k]) => !excludeKeys.includes(k));

    if (entries.length === 0) return <p className="text-xs text-slate-400 py-4 text-center">尚無詳細內容</p>;

    return entries.map(([key, value]) => {
      if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) return null;

      // 1. 取得友善的中文 Label（找不到就以首字大寫顯示）
      const label = FIELD_LABEL_MAP[key] || (key.charAt(0).toUpperCase() + key.slice(1));

      // 2. 特殊格式化：如果是關聯對象 (relations) 且為陣列，轉成好讀的文字
      let valStr = '';
      if (key === 'relations' && Array.isArray(value)) {
        valStr = value.map((r: any) => {
          if (typeof r === 'object') {
            const relType = r.type || r.relation || '關聯';
            const target = r.targetId || r.targetName || r.name || '未知';
            return `• [${relType}] ${target}`;
          }
          return `• ${r}`;
        }).join('\n');
      } else if (typeof value === 'object') {
        valStr = JSON.stringify(value, null, 2);
      } else {
        valStr = String(value);
      }

      return (
        <div key={key} className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between">
            {/* 顯示轉譯後的中文名稱 */}
            <span className="text-[11px] font-bold text-slate-600 tracking-wide">
              {label}
            </span>
            <button
              onClick={() => handleCopyText(valStr, key)}
              className="text-[10px] text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer"
            >
              {copiedKey === key ? "✓ 已複製" : "複製"}
            </button>
          </div>
          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed select-text font-normal">
            {valStr}
          </p>
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
            
            {/* 搜尋與 Tab 標籤 */}
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

            {/* 卡片列表 */}
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

            {/* Bottom Footer */}
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