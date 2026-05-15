import React, { useCallback, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MiniMap,
  Connection,
  addEdge,
} from "reactflow";
import "reactflow/dist/style.css";
import { NeuralNetwork, NeuralNode, NeuralEdge } from "@/lib/neuralNodeTree";

interface NeuralGraphViewProps {
  network: NeuralNetwork;
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  readOnly?: boolean;
}

/**
 * NeuralGraphView Component
 * 
 * Renders a React Flow graph visualization of the neural network.
 * Displays nodes (folders/files) and edges (connections) in an
 * Obsidian-style spatial layout.
 */
export default function NeuralGraphView({
  network,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  readOnly = false,
}: NeuralGraphViewProps) {
  // Convert neural nodes to React Flow nodes
  const initialNodes: Node[] = useMemo(
    () =>
      network.nodes.map((neuralNode) => ({
        id: neuralNode.id,
        data: {
          label: neuralNode.label,
          type: neuralNode.type,
          fileCount: neuralNode.data.fileCount,
        },
        position: neuralNode.position,
        style: {
          ...neuralNode.style,
          padding: "12px 16px",
          borderRadius: "8px",
          fontSize: "12px",
          fontWeight: neuralNode.type === "project" ? "bold" : "500",
          minWidth: "100px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s ease",
        },
      })),
    [network.nodes]
  );

  // Convert neural edges to React Flow edges
  const initialEdges: Edge[] = useMemo(
    () =>
      network.edges.map((neuralEdge) => ({
        id: neuralEdge.id,
        source: neuralEdge.source,
        target: neuralEdge.target,
        type: "smoothstep",
        animated: neuralEdge.type === "folder-connection",
        style: {
          stroke:
            neuralEdge.type === "folder-connection"
              ? "oklch(0.65 0.15 260 / 0.6)"
              : "oklch(0.65 0.15 260 / 0.3)",
          strokeWidth: neuralEdge.type === "folder-connection" ? 2 : 1,
        },
        label: neuralEdge.data?.label,
      })),
    [network.edges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!readOnly) {
        setEdges((eds) => addEdge(connection, eds));
      }
    },
    [readOnly, setEdges]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeDoubleClick?.(node.id);
    },
    [onNodeDoubleClick]
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      onEdgeClick?.(edge.id);
    },
    [onEdgeClick]
  );

  return (
    <div className="w-full h-full bg-background rounded-lg overflow-hidden border border-border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onEdgeClick={handleEdgeClick}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="oklch(0.20 0.01 240)" gap={16} size={0.5} />
        <Controls />
        <MiniMap
          style={{
            backgroundColor: "oklch(0.16 0.01 240)",
            border: "1px solid oklch(0.22 0.01 240)",
          }}
          maskColor="oklch(0.65 0.15 260 / 0.3)"
        />
      </ReactFlow>
    </div>
  );
}
