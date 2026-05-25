'use client'

import { useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, MarkerType, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { SettingItem } from '@/lib/mockSettings';
import dagre from 'dagre';

interface ColorStyle {
  bg: string;
  border: string;
  text: string;
}

interface RelationGraphProps {
  highlightedIds?: string[] | null;
  onNodeSelect?: (nodeId: string) => void;
  // 核心升級：直接把當前全域的設定資料傳進來，實現即時反應
  allSettings: { category: string; items: SettingItem[] }[]; 
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// 建立自動排版函式：計算出不打結的最佳 x, y 座標
const getLayoutedElements = (nodes: any[], edges: any[], direction = 'LR') => {
  dagreGraph.setGraph({ rankdir: direction, ranksep: 200, nodesep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 160, height: 50 }); // 稍微增加寬度相容中文字
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 80, 
        y: nodeWithPosition.y - 25, 
      },
    };
  });

  return { layoutedNodes, layoutedEdges: edges };
};

// 🌟 1. 移入外部函式：純原生 Hex 擴充，將全作品的組織色彩轉化為關係圖 Style Map
const generateDynamicFactionColors = (
  settingsData: { category: string; items: SettingItem[] }[]
): Record<string, ColorStyle> => {
  const map: Record<string, ColorStyle> = {};
  
  const factions = settingsData
    .flatMap((g) => g.items)
    .filter((i) => i.category === 'faction');
  
  factions.forEach((f) => {
    const userColor = f.color || "#64748b"; // 優先拿你在 FactionForm 存進資料庫的顏色
    
    map[f.id] = {
      bg: `${userColor}15`, // 莫蘭迪柔和透光底色 (15 代表 8% 透明度)
      border: userColor,    // 飽和陣營實色邊框
      text: userColor       // 文字顏色
    };
  });
  
  return map;
};

export default function RelationGraph({ highlightedIds, onNodeSelect, allSettings = [] }: RelationGraphProps) {
  
  // 第一塊：計算 Nodes 和 Edges 的 useMemo (將 allSettings 納入監聽項目)
  const { nodes, edges } = useMemo(() => {
    // 動態抓取全作品的所有「人物」
    const characters = allSettings.flatMap(group => 
      group.items.filter(i => i.category === 'character' || i.id?.startsWith('char-'))
    );

    // 🌟 2. 核心技術點：在 useMemo 內部生成當前資料庫最即時的陣營色彩對照表
    const factionColorMap = generateDynamicFactionColors(allSettings);

    // 計算節點 (Nodes)
    const initialNodes = characters.map((char) => {
      const isHighlighted = highlightedIds ? highlightedIds.includes(char.id) : true;
      const opacity = isHighlighted ? 1 : 0.2;

      // 🌟 3. 動態變色引擎：查表取出該角色陣營在資料庫中儲存的色彩設定
      const colors = (char.faction && factionColorMap[char.faction]) || { 
        bg: "#f8fafc",      // 無所屬散人背景
        border: "#cbd5e1",  // 散人邊框
        text: "#475569"     // 散人文字
      };

      return {
        id: char.id,
        position: { x: 0, y: 0 }, // 初始座標會被 dagre 自動排版覆蓋
        data: { label: char.name },
        // 🌟 4. 將對稱、高質感的動態莫蘭迪色系直接渲染進 React Flow 節點中
        style: {
          background: colors.bg,
          color: colors.text,
          border: `2px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '10px 18px',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
          opacity: opacity,
          transition: 'opacity 0.3s ease, background-color 0.3s ease, border-color 0.3s ease',
        }
      };
    });

    // 計算連線 (Edges)
    const edgeMap = new Map();

    characters.forEach(char => {
      (char.relations || []).forEach(rel => {
        if (!characters.some(c => c.id === rel.targetId)) return;

        const pair = [char.id, rel.targetId].sort();
        const edgeId = `e-${pair[0]}-${pair[1]}`;
        
        const isEdgeHighlighted = highlightedIds 
          ? (highlightedIds.includes(char.id) || highlightedIds.includes(rel.targetId)) 
          : true;
        const edgeOpacity = isEdgeHighlighted ? 1 : 0.1;

        if (edgeMap.has(edgeId)) {
          const existingEdge = edgeMap.get(edgeId);
          if (!existingEdge.label.includes(rel.type)) {
            existingEdge.label = `${existingEdge.label} ↔ ${rel.type}`;
          }
          existingEdge.markerStart = { type: MarkerType.ArrowClosed };
        } else {
          edgeMap.set(edgeId, {
            id: edgeId,
            source: char.id,
            target: rel.targetId,
            label: rel.type,
            type: 'default',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { 
              stroke: '#94a3b8', 
              strokeWidth: 2,
              opacity: edgeOpacity,
              transition: 'opacity 0.3s ease',
            },
            labelBgStyle: { fill: '#ffffff', fillOpacity: edgeOpacity, rx: 5 }, 
            labelStyle: { fontWeight: 700, fill: '#475569', opacity: edgeOpacity, fontSize: '11px' }
          });
        }
      });
    });

    const initialEdges = Array.from(edgeMap.values());

    // 執行排版魔法
    const { layoutedNodes, layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      'LR' 
    );

    return { nodes: layoutedNodes, edges: layoutedEdges };
  }, [highlightedIds, allSettings]);

  // 第二塊：事件處理
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (onNodeSelect) {
      onNodeSelect(node.id);
    }
  }, [onNodeSelect]);

  // 第三塊：渲染畫面
  return (
    <div className="h-full w-full rounded-lg border border-slate-200 bg-white min-h-[550px]">
      <ReactFlow nodes={nodes} edges={edges} onNodeClick={handleNodeClick} fitView>
        <Background gap={16} size={1.5} color="#cbd5e1" />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}