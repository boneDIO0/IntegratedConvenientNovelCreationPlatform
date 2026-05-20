'use client'

import { useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, MarkerType, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { SettingItem } from '@/lib/mockSettings';
import dagre from 'dagre';

interface RelationGraphProps {
  highlightedIds?: string[] | null;
  onNodeSelect?: (nodeId: string) => void;
  // 🌟 1. 核心升級：直接把當前全域的設定資料傳進來，實現即時反應
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

export default function RelationGraph({ highlightedIds, onNodeSelect, allSettings = [] }: RelationGraphProps) {
  
  // 🌟 第一塊：計算 Nodes 和 Edges 的 useMemo (將 allSettings 納入監聽項目)
  const { nodes, edges } = useMemo(() => {
    // 🌟 2. 依照你提議的方法，動態抓取全作品的所有「人物」
    // 支援可能被歸類在 "character" 或是原本分類名稱中的 items
    const characters = allSettings.flatMap(group => 
      group.items.filter(i => i.category === 'character' || i.id?.startsWith('char-'))
    );
    
    // 🌟 3. 動態抓取所有陣營 (Faction)，好讓下方可以比對並套用色系
    const factions = allSettings.flatMap(group => 
      group.items.filter(i => i.category === 'faction')
    );

    // 計算節點 (Nodes)
    const initialNodes = characters.map((char, index) => {
      const isHighlighted = highlightedIds ? highlightedIds.includes(char.id) : true;
      const opacity = isHighlighted ? 1 : 0.2;

      // 🌟 4. 動態決定節點顏色，如果角色有陣營，你可以給他不同主題色 (這裡給幾個質感現代色)
      let nodeBg = '#64748b'; // 預設無所屬： slate 色
      if (char.faction && char.faction !== 'independent') {
        // 這邊你可以根據 faction 的 id 做 hash 或者寫死你喜歡的專屬勢力色
        if (char.faction.includes('horde') || char.faction === 'golden-horde') nodeBg = '#ea580c'; // 橘
        else if (char.faction.includes('observer') || char.faction === 'observers') nodeBg = '#2563eb'; // 藍
        else nodeBg = '#059669'; // 其他陣營預設：翡翠綠
      }

      return {
        id: char.id,
        // 初始座標會被 dagre 魔法覆蓋，但還是留著當防呆
        position: { x: 0, y: 0 }, 
        data: { label: char.name },
        style: {
          background: nodeBg,
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          opacity: opacity,
          transition: 'opacity 0.3s ease, background-color 0.3s ease',
        }
      };
    });

    // 計算連線 (Edges)
    const edgeMap = new Map();

    characters.forEach(char => {
      (char.relations || []).forEach(rel => {
        // 防呆：確認目標角色確實在目前的列表裡，避免連線指向不存在的幽靈 ID
        if (!characters.some(c => c.id === rel.targetId)) return;

        const pair = [char.id, rel.targetId].sort();
        const edgeId = `e-${pair[0]}-${pair[1]}`;
        
        const isEdgeHighlighted = highlightedIds 
          ? (highlightedIds.includes(char.id) || highlightedIds.includes(rel.targetId)) 
          : true;
        const edgeOpacity = isEdgeHighlighted ? 1 : 0.1;

        if (edgeMap.has(edgeId)) {
          const existingEdge = edgeMap.get(edgeId);
          // 如果雙向都有定義，顯示雙向關係文字
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
            labelStyle: { fontWeight: 700, fill: '#334155', opacity: edgeOpacity }
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
    // 🌟 5. 核心關鍵：將 allSettings 放入依賴陣列。一旦表單存檔，這裡會瞬間被觸發更新！
  }, [highlightedIds, allSettings]);


  // 第二塊：事件處理
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (onNodeSelect) {
      onNodeSelect(node.id);
    }
  }, [onNodeSelect]);


  // 第三塊：渲染畫面
  return (
    <div className="h-full w-full rounded-lg border border-slate-200 bg-white">
      <ReactFlow nodes={nodes} edges={edges} onNodeClick={handleNodeClick} fitView>
        <Background gap={16} size={1.5} color="#cbd5e1" />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}