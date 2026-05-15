import CortexDashboardLayout from "@/components/CortexDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Plus, Grid3x3, List } from "lucide-react";
import { useState, useMemo } from "react";
import NeuralGraphView from "@/components/NeuralGraphView";
import NeuralTreeView from "@/components/NeuralTreeView";
import { convertFileSystemToNeuralNetwork, generateMockFileSystem } from "@/lib/neuralNodeTree";

/**
 * Neural Brain Map Page
 * 
 * Features:
 * - Spatial graph view with nodes and edges
 * - Folder-to-node conversion
 * - File-to-branch rendering
 * - Toggle between graph and folder-tree views
 * - Per-project sub-networks
 * - Global master network view
 * - Drag-and-drop file organization
 */
export default function BrainMap() {
  const [viewMode, setViewMode] = useState<"graph" | "tree">("graph");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Generate mock file system and convert to neural network
  const mockFiles = useMemo(() => generateMockFileSystem("My Project"), []);
  const neuralNetwork = useMemo(
    () => convertFileSystemToNeuralNetwork(mockFiles, "My Project"),
    [mockFiles]
  );

  const selectedNode = neuralNetwork.nodes.find((n) => n.id === selectedNodeId);

  return (
    <CortexDashboardLayout>
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-accent" />
              <div>
                <h1 className="text-xl font-bold">Neural Brain Map</h1>
                <p className="text-sm text-muted-foreground">
                  Spatial project organization with interactive node-based visualization
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant={viewMode === "graph" ? "default" : "outline"}
                onClick={() => setViewMode("graph")}
                title="Graph view"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant={viewMode === "tree" ? "default" : "outline"}
                onClick={() => setViewMode("tree")}
                title="Tree view"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Graph/Tree View Area */}
          <div className="flex-1 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {viewMode === "graph" ? "Graph View" : "Tree View"}
                    </CardTitle>
                    <CardDescription>
                      {viewMode === "graph"
                        ? "Spatial organization of projects and files"
                        : "Hierarchical folder structure"}
                    </CardDescription>
                  </div>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex overflow-hidden">
                {viewMode === "graph" ? (
                  <NeuralGraphView
                    network={neuralNetwork}
                    onNodeClick={setSelectedNodeId}
                    readOnly={false}
                  />
                ) : (
                  <NeuralTreeView
                    network={neuralNetwork}
                    onNodeClick={setSelectedNodeId}
                    readOnly={false}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Properties Panel */}
          <div className="w-80 flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Master Network</CardTitle>
                <CardDescription className="text-xs">
                  Global project overview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Projects:</span>
                    <span className="font-mono">1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Files:</span>
                    <span className="font-mono">{neuralNetwork.nodes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Network Edges:</span>
                    <span className="font-mono">{neuralNetwork.edges.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Selected Node</CardTitle>
                <CardDescription className="text-xs">
                  Node properties and details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedNode ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-mono truncate">{selectedNode.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-mono capitalize">{selectedNode.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Path:</span>
                      <span className="font-mono text-xs truncate">{selectedNode.data.path}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Depth:</span>
                      <span className="font-mono">{selectedNode.data.depth}</span>
                    </div>
                    {selectedNode.data.fileCount !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Files:</span>
                        <span className="font-mono">{selectedNode.data.fileCount}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground text-sm">
                    Click a node to view details
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CortexDashboardLayout>
  );
}
