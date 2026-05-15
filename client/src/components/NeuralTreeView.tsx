import React, { useState } from "react";
import { TreeNode, convertNetworkToTreeStructure, NeuralNetwork } from "@/lib/neuralNodeTree";
import { ChevronRight, ChevronDown, Folder, File } from "lucide-react";
import { cn } from "@/lib/utils";

interface NeuralTreeViewProps {
  network: NeuralNetwork;
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  readOnly?: boolean;
}

/**
 * NeuralTreeView Component
 * 
 * Renders the neural network as a hierarchical folder-tree structure.
 * Allows collapsing/expanding folders and clicking on files.
 */
export default function NeuralTreeView({
  network,
  onNodeClick,
  onNodeDoubleClick,
  readOnly = false,
}: NeuralTreeViewProps) {
  const treeStructure = convertNetworkToTreeStructure(network);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(network.nodes.filter((n) => n.data.isExpanded !== false).map((n) => n.id))
  );

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleNodeClick = (nodeId: string) => {
    onNodeClick?.(nodeId);
  };

  const handleNodeDoubleClick = (nodeId: string) => {
    onNodeDoubleClick?.(nodeId);
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer",
            "text-sm text-foreground"
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => {
            handleNodeClick(node.id);
            if (hasChildren) {
              toggleExpanded(node.id);
            }
          }}
          onDoubleClick={() => handleNodeDoubleClick(node.id)}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(node.id);
              }}
              className="p-0 hover:bg-muted-foreground/20 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {/* File/Folder Icon */}
          {node.type === "folder" ? (
            <Folder className="w-4 h-4 text-accent flex-shrink-0" />
          ) : (
            <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}

          {/* Label */}
          <span className="flex-1 truncate font-medium text-foreground">
            {node.label}
          </span>

          {/* File Count Badge */}
          {node.type === "folder" && node.children && node.children.length > 0 && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
              {node.children.length}
            </span>
          )}
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-background rounded-lg border border-border p-4 overflow-auto">
      {treeStructure.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>No files in this network</p>
        </div>
      ) : (
        <div className="space-y-1">
          {treeStructure.map((node) => renderTreeNode(node))}
        </div>
      )}
    </div>
  );
}
