// src/components/RelationGraph.tsx
import { useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, MarkerType, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { mockSettings, SettingItem } from '@/lib/mockSettings';
import dagre from 'dagre';

interface RelationGraphProps {
  highlightedIds?: string[] | null;
  onNodeSelect?: (nodeId: string) => void;
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// 🌟 建立自動排版函式：計算出不打結的最佳 x, y 座標
const getLayoutedElements = (nodes: any[], edges: any[], direction = 'LR') => {
  // LR 代表 Left to Right (由左至右排版)，也可以換成 TB (Top to Bottom)
  dagreGraph.setGraph({ rankdir: direction, ranksep: 200, nodesep: 100 });

  // 把節點尺寸告訴引擎，方便它計算佔用空間 (假設我們的卡片大約是寬 150, 高 50)
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 150, height: 50 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // 執行排版魔法！
  dagre.layout(dagreGraph);

  // 把算好的座標寫回我們原本的節點中
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 75, // 扣除一半的寬度以置中
        y: nodeWithPosition.y - 25, // 扣除一半的高度以置中
      },
    };
  });

  return { layoutedNodes, layoutedEdges: edges };
};

export default function RelationGraph({ highlightedIds, onNodeSelect }: RelationGraphProps) {
  
  // 🌟 第一塊：計算 Nodes 和 Edges 的 useMemo
  const { nodes, edges } = useMemo(() => {
    const characters = (mockSettings.find(g => g.category === "人物 (Characters)")?.items || []) as SettingItem[];
    
    // 1. 計算節點 (Nodes)
    const initialNodes = characters.map((char, index) => {
      const isHighlighted = highlightedIds ? highlightedIds.includes(char.id) : true;
      const opacity = isHighlighted ? 1 : 0.2;

      return {
        id: char.id,
        position: { x: 300 * index, y: 150 + (index % 2 === 0 ? -50 : 50) },
        data: { label: char.name },
        style: {
          background: char.faction === 'golden-horde' ? '#ea580c' : char.faction === 'observers' ? '#2563eb' : '#fff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          opacity: opacity,
          transition: 'opacity 0.3s ease',
        }
      };
    });

    // 2. 計算連線 (Edges)
    const edgeMap = new Map();

    characters.forEach(char => {
      (char.relations || []).forEach(rel => {
        const pair = [char.id, rel.targetId].sort();
        const edgeId = `e-${pair[0]}-${pair[1]}`;
        
        const isEdgeHighlighted = highlightedIds 
          ? (highlightedIds.includes(char.id) || highlightedIds.includes(rel.targetId)) 
          : true;
        const edgeOpacity = isEdgeHighlighted ? 1 : 0.1;

        if (edgeMap.has(edgeId)) {
          const existingEdge = edgeMap.get(edgeId);
          existingEdge.label = `${existingEdge.label} ↔ ${rel.type}`;
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

    // 🌟 最終大招：把節點跟連線丟給 dagre 去算最佳位置！
    const { layoutedNodes, layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      'LR' // 試試看 'LR' (由左至右)，對於關係圖來說通常最漂亮
    );

    return { nodes: layoutedNodes, edges: layoutedEdges };
  }, [highlightedIds]);


  // 🌟 第二塊：將 handleNodeClick 放在 useMemo 外面、return JSX 的前面
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (onNodeSelect) {
      onNodeSelect(node.id);
    }
  }, [onNodeSelect]);


  // 🌟 第三塊：渲染畫面
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