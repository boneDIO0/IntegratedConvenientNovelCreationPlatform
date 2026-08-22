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
  allSettings: { category: string; items: SettingItem[] }[]; 
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// 自動排版：計算不打結的最佳節點座標
const getLayoutedElements = (nodes: any[], edges: any[], direction = 'LR') => {
  dagreGraph.setGraph({ rankdir: direction, ranksep: 200, nodesep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 160, height: 50 });
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

// 色彩映射：將組織色彩轉化為關係圖樣式
const generateDynamicFactionColors = (
  settingsData: { category: string; items: SettingItem[] }[]
): Record<string, ColorStyle> => {
  const map: Record<string, ColorStyle> = {};
  
  const factions = settingsData
    .flatMap((g) => g.items)
    .filter((i) => i.category === 'faction' || (i as any).type === 'faction');
  
  factions.forEach((f) => {
    const rawColor = f.color || (f as any).content?.color || "#64748b";
    const userColor = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;
    
    map[f.id] = {
      bg: `${userColor}15`,
      border: userColor,
      text: userColor
    };
  });
  
  return map;
};

export default function RelationGraph({ highlightedIds, onNodeSelect, allSettings = [] }: RelationGraphProps) {
  
  const { nodes, edges } = useMemo(() => {
    // 1. 動態抓取全作品的所有角色
    const characters = allSettings.flatMap(group => 
      group.items.filter(i => i.category === 'character' || i.id?.startsWith('char-') || (i as any).type === 'character')
    );

    const factionColorMap = generateDynamicFactionColors(allSettings);

    // 2. 計算節點 (Nodes)
    const initialNodes = characters.map((char) => {
      const isHighlighted = highlightedIds ? highlightedIds.includes(char.id) : true;
      const opacity = isHighlighted ? 1 : 0.2;

      const factionId = char.faction || (char as any).content?.faction;
      const colors = (factionId && factionColorMap[factionId]) || { 
        bg: "#f8fafc",
        border: "#cbd5e1",
        text: "#475569"
      };

      return {
        id: char.id,
        position: { x: 0, y: 0 },
        data: { label: char.name || (char as any).title || "未命名人物" },
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

    // 3. 計算連線 (Edges)
    const edgeMap = new Map();

    characters.forEach(char => {
      // 雙向相容：讀取根屬性 relations 或 content.relations
      const rawRelations = char.relations || (char as any).content?.relations || [];
      const safeRelations = Array.isArray(rawRelations) ? rawRelations : [];

      safeRelations.forEach(rel => {
        if (!rel) return;

        const rawTarget = rel.targetId || rel.targetName || rel.name || (typeof rel === 'string' ? rel : '');
        const relType = rel.type || rel.relation || '關聯';

        // 雙向反查目標角色節點（相容 UUID、名稱與 Title）
        const targetNode = characters.find(
          c => c.id === rawTarget || c.name === rawTarget || (c as any).title === rawTarget
        );

        if (!targetNode || targetNode.id === char.id) return;

        const pair = [char.id, targetNode.id].sort();
        const edgeId = `e-${pair[0]}-${pair[1]}`;
        
        const isEdgeHighlighted = highlightedIds 
          ? (highlightedIds.includes(char.id) || highlightedIds.includes(targetNode.id)) 
          : true;
        const edgeOpacity = isEdgeHighlighted ? 1 : 0.1;

        if (edgeMap.has(edgeId)) {
          const existingEdge = edgeMap.get(edgeId);
          if (!existingEdge.label.includes(relType)) {
            existingEdge.label = `${existingEdge.label} ↔ ${relType}`;
          }
          existingEdge.markerStart = { type: MarkerType.ArrowClosed };
        } else {
          edgeMap.set(edgeId, {
            id: edgeId,
            source: char.id,
            target: targetNode.id,
            label: relType,
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

    const { layoutedNodes, layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      'LR' 
    );

    return { nodes: layoutedNodes, edges: layoutedEdges };
  }, [highlightedIds, allSettings]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (onNodeSelect) {
      onNodeSelect(node.id);
    }
  }, [onNodeSelect]);

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