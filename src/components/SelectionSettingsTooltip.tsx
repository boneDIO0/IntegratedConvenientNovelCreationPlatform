'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SettingItem } from '@/types';
import { Badge } from '@/components/ui/badge';

interface SelectionSettingsTooltipProps {
  allSettings: SettingItem[];
  containerRef?: React.RefObject<HTMLElement | null>;
  onOpenDetail?: (item: SettingItem) => void;
}

export function SelectionSettingsTooltip({
  allSettings,
  containerRef,
  onOpenDetail,
}: SelectionSettingsTooltipProps) {
  const [matchedItems, setMatchedItems] = useState<SettingItem[]>([]);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);

  // 拍平並標準化設定清單
  const flatSettings = useMemo(() => {
    if (!Array.isArray(allSettings)) return [];
    const extractItems = (list: any[]): SettingItem[] => {
      return list.flatMap(item => {
        if (!item) return [];
        if (item.id && (item.name || item.title)) return [item];
        const nested = item.items || item.entities || item.settingItems || item.data || item.groups;
        if (Array.isArray(nested)) return extractItems(nested);
        return [];
      });
    };
    return extractItems(allSettings);
  }, [allSettings]);

  useEffect(() => {
    const handleSelectionChange = () => {
      // 🌟 若正在點擊或拖曳氣泡內部，暫不重置
      if (isInteractingRef.current) return;

      const selection = window.getSelection();

      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setPosition(null);
        setMatchedItems([]);
        return;
      }

      const text = selection.toString().trim();

      // 限制 1 ~ 30 個字
      if (!text || text.length < 1 || text.length > 30) {
        setPosition(null);
        setMatchedItems([]);
        return;
      }

      // 如果有指定 containerRef，確認選取範圍是否在該容器內
      if (containerRef && containerRef.current) {
        const anchorNode = selection.anchorNode;
        if (anchorNode && !containerRef.current.contains(anchorNode)) {
          setPosition(null);
          return;
        }
      }

      const query = text.toLowerCase();

      // 比對設定項目
      const results = flatSettings.filter((item) => {
        const itemAny = item as any;
        const itemName = (item.name || item.title || '').toLowerCase();

        // 1. 名稱比對 (完全或子字串)
        if (itemName && (itemName.includes(query) || query.includes(itemName))) {
          return true;
        }

        // 2. 別名與稱號比對
        const content = itemAny.content || {};
        const titles: string[] = [
          ...(Array.isArray(itemAny.titles) ? itemAny.titles : []),
          ...(Array.isArray(content.titles) ? content.titles : []),
          ...(Array.isArray(itemAny.aliases) ? itemAny.aliases : []),
          ...(Array.isArray(content.aliases) ? content.aliases : []),
          itemAny.title,
          content.title,
        ].filter(Boolean);

        if (titles.some((t) => String(t).toLowerCase().includes(query) || query.includes(String(t).toLowerCase()))) {
          return true;
        }

        return false;
      });

      if (results.length > 0) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          // 避免在非視覺區域或隱藏範圍時計算錯誤
          if (rect.width === 0 && rect.height === 0) return;

          const tooltipWidth = 280;
          let x = rect.left + rect.width / 2;
          let y = rect.top - 12;

          // 左右防溢出
          if (x - tooltipWidth / 2 < 16) x = tooltipWidth / 2 + 16;
          if (x + tooltipWidth / 2 > window.innerWidth - 16) x = window.innerWidth - tooltipWidth / 2 - 16;

          // 上方防溢出
          if (y < 120) {
            y = rect.bottom + 12;
          }

          setSelectedText(text);
          setMatchedItems(results.slice(0, 3));
          setPosition({ x, y });
        } catch (e) {
          setPosition(null);
        }
      } else {
        setPosition(null);
        setMatchedItems([]);
      }
    };

    let timer: NodeJS.Timeout;
    const debouncedHandler = () => {
      clearTimeout(timer);
      timer = setTimeout(handleSelectionChange, 120);
    };

    // 🌟 在全域 mousedown 時，如果點擊不在氣泡內，確保主動重置 isInteractingRef
    const handleGlobalMouseDown = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        isInteractingRef.current = false;
      }
    };

    document.addEventListener('selectionchange', debouncedHandler);
    document.addEventListener('mouseup', debouncedHandler);
    document.addEventListener('mousedown', handleGlobalMouseDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('selectionchange', debouncedHandler);
      document.removeEventListener('mouseup', debouncedHandler);
      document.removeEventListener('mousedown', handleGlobalMouseDown);
    };
  }, [flatSettings, containerRef]);

  if (!position || matchedItems.length === 0) return null;

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case 'character':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0">👤 人物</Badge>;
      case 'faction':
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0">🏛️ 組織</Badge>;
      case 'location':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0">📍 地點</Badge>;
      case 'item':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0">⚔️ 物品</Badge>;
      case 'event':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">📜 事件</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] px-1.5 py-0">⚙️ 設定</Badge>;
    }
  };

  return (
    <div
      ref={tooltipRef}
      onMouseEnter={() => { isInteractingRef.current = true; }}
      onMouseLeave={() => { isInteractingRef.current = false; }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: position.y < 120 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
        zIndex: 99999,
      }}
      className="animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1.5 p-2 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-slate-700/60 min-w-[260px] max-w-[320px] pointer-events-auto select-none"
    >
      <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[11px] text-slate-400">
        <span>✨ 找到相關設定 ({matchedItems.length})</span>
        <span className="font-mono text-slate-500 truncate max-w-[100px]">"{selectedText}"</span>
      </div>

      <div className="space-y-1.5">
        {matchedItems.map((item) => {
          const itemAny = item as any;
          const content = itemAny.content || {};
          const desc = item.description || content.description || '暫無詳細描述';

          return (
            <div
              key={item.id}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // 🌟 核心修正：點擊觸發時，務必將 isInteracting 設回 false，並收起氣泡
                isInteractingRef.current = false;
                onOpenDetail?.(item);
                setPosition(null);
                setMatchedItems([]);
              }}
              className="group p-1.5 rounded-lg bg-slate-800/60 hover:bg-blue-600/30 border border-slate-700/40 hover:border-blue-400/50 transition-all cursor-pointer flex flex-col gap-0.5 active:scale-[0.98]"
            >
              <div className="flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-slate-100 group-hover:text-blue-300 transition-colors truncate">
                    {item.name || item.title}
                  </span>
                  {getCategoryBadge(item.category)}
                </div>
                <span className="text-[10px] text-blue-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 font-medium">
                  詳情 →
                </span>
              </div>

              <p className="text-[10px] text-slate-400 line-clamp-1 leading-relaxed pointer-events-none">
                {String(desc)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}