import { describe, it, expect } from "vitest";
import {
  convertFileSystemToNeuralNetwork,
  generateMockFileSystem,
  convertNetworkToTreeStructure,
  FileSystemNode,
} from "./neuralNodeTree";

describe("Neural Node Tree Utilities", () => {
  describe("generateMockFileSystem", () => {
    it("should generate a mock file system with folders and files", () => {
      const files = generateMockFileSystem("TestProject");
      
      expect(files).toBeDefined();
      expect(files.length).toBeGreaterThan(0);
      
      // Check for folders
      const folders = files.filter((f) => f.type === "folder");
      expect(folders.length).toBeGreaterThan(0);
      
      // Check for files
      const fileNodes = files.filter((f) => f.type === "file");
      expect(fileNodes.length).toBeGreaterThan(0);
    });

    it("should have proper parent-child relationships", () => {
      const files = generateMockFileSystem("TestProject");
      
      // Find a file with a parent
      const fileWithParent = files.find((f) => f.parent);
      expect(fileWithParent).toBeDefined();
      
      if (fileWithParent) {
        // Verify parent exists
        const parent = files.find((f) => f.id === fileWithParent.parent);
        expect(parent).toBeDefined();
        expect(parent?.type).toBe("folder");
      }
    });
  });

  describe("convertFileSystemToNeuralNetwork", () => {
    it("should convert file system to neural network", () => {
      const files = generateMockFileSystem("TestProject");
      const network = convertFileSystemToNeuralNetwork(files, "TestProject");
      
      expect(network).toBeDefined();
      expect(network.id).toContain("network-");
      expect(network.name).toBe("TestProject");
      expect(network.type).toBe("project");
    });

    it("should create nodes for all files and folders", () => {
      const files = generateMockFileSystem("TestProject");
      const network = convertFileSystemToNeuralNetwork(files, "TestProject");
      
      // Should have nodes for project root + all files
      expect(network.nodes.length).toBeGreaterThanOrEqual(files.length + 1);
    });

    it("should create edges connecting parent and child nodes", () => {
      const files = generateMockFileSystem("TestProject");
      const network = convertFileSystemToNeuralNetwork(files, "TestProject");
      
      // Should have edges for parent-child relationships
      expect(network.edges.length).toBeGreaterThan(0);
      
      // Verify edges have valid source and target
      network.edges.forEach((edge) => {
        const sourceNode = network.nodes.find((n) => n.id === edge.source);
        const targetNode = network.nodes.find((n) => n.id === edge.target);
        
        expect(sourceNode).toBeDefined();
        expect(targetNode).toBeDefined();
      });
    });

    it("should assign proper node types", () => {
      const files = generateMockFileSystem("TestProject");
      const network = convertFileSystemToNeuralNetwork(files, "TestProject");
      
      // Check for project node
      const projectNode = network.nodes.find((n) => n.type === "project");
      expect(projectNode).toBeDefined();
      
      // Check for folder nodes
      const folderNodes = network.nodes.filter((n) => n.type === "folder");
      expect(folderNodes.length).toBeGreaterThan(0);
      
      // Check for file nodes
      const fileNodes = network.nodes.filter((n) => n.type === "file");
      expect(fileNodes.length).toBeGreaterThan(0);
    });

    it("should assign positions to all nodes", () => {
      const files = generateMockFileSystem("TestProject");
      const network = convertFileSystemToNeuralNetwork(files, "TestProject");
      
      network.nodes.forEach((node) => {
        expect(node.position).toBeDefined();
        expect(typeof node.position.x).toBe("number");
        expect(typeof node.position.y).toBe("number");
      });
    });
  });

  describe("convertNetworkToTreeStructure", () => {
    it("should convert network to tree structure", () => {
      const files = generateMockFileSystem("TestProject");
      const network = convertFileSystemToNeuralNetwork(files, "TestProject");
      const tree = convertNetworkToTreeStructure(network);
      
      expect(tree).toBeDefined();
      expect(Array.isArray(tree)).toBe(true);
      expect(tree.length).toBeGreaterThan(0);
    });

    it("should preserve node properties in tree structure", () => {
      const files = generateMockFileSystem("TestProject");
      const network = convertFileSystemToNeuralNetwork(files, "TestProject");
      const tree = convertNetworkToTreeStructure(network);
      
      tree.forEach((node) => {
        expect(node.id).toBeDefined();
        expect(node.label).toBeDefined();
        expect(node.type).toBeDefined();
        expect(node.path).toBeDefined();
      });
    });

    it("should create parent-child relationships in tree", () => {
      const files = generateMockFileSystem("TestProject");
      const network = convertFileSystemToNeuralNetwork(files, "TestProject");
      const tree = convertNetworkToTreeStructure(network);
      
      // Find a node with children
      const nodeWithChildren = tree.find((n) => n.children && n.children.length > 0);
      
      if (nodeWithChildren) {
        expect(nodeWithChildren.children).toBeDefined();
        expect(nodeWithChildren.children!.length).toBeGreaterThan(0);
        
        // Verify children have correct parent reference
        nodeWithChildren.children!.forEach((child) => {
          expect(child).toBeDefined();
          expect(child.id).toBeDefined();
        });
      }
    });
  });

  describe("Network metadata", () => {
    it("should include metadata in network", () => {
      const files = generateMockFileSystem("TestProject");
      const network = convertFileSystemToNeuralNetwork(files, "TestProject");
      
      expect(network.metadata).toBeDefined();
      expect(network.metadata?.created).toBeDefined();
      expect(network.metadata?.modified).toBeDefined();
      expect(network.metadata?.description).toBeDefined();
    });

    it("should assign depth to nodes", () => {
      const files = generateMockFileSystem("TestProject");
      const network = convertFileSystemToNeuralNetwork(files, "TestProject");
      
      network.nodes.forEach((node) => {
        expect(typeof node.data.depth).toBe("number");
        expect(node.data.depth).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
