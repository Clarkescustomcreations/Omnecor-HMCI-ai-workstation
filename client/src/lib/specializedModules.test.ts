import { describe, it, expect } from "vitest";
import {
  createLoRAConfig,
  createLLMBuilderSession,
  addLoRAConfig,
  updateTrainingMetrics,
  createBlenderProject,
  addBlenderObject,
  executeBlenderCommand,
  createPCBProject,
  addPCBComponent,
  addPCBNet,
  executePCBCommand,
  createSpecializedModule,
  getModuleInfo,
  createMockLLMBuilderSession,
  createMockBlenderProject,
  createMockPCBProject,
} from "./specializedModules";

describe("Specialized Modules", () => {
  describe("LoRA Configuration", () => {
    it("should create LoRA config with defaults", () => {
      const config = createLoRAConfig("Test LoRA", "mistral-7b", "/data/dataset");

      expect(config.id).toBeDefined();
      expect(config.name).toBe("Test LoRA");
      expect(config.baseModel).toBe("mistral-7b");
      expect(config.rank).toBe(16);
      expect(config.alpha).toBe(32);
      expect(config.epochs).toBe(3);
    });

    it("should create LoRA config with custom values", () => {
      const config = createLoRAConfig("Custom LoRA", "llama-13b", "/data/dataset", {
        rank: 32,
        alpha: 64,
        epochs: 5,
      });

      expect(config.rank).toBe(32);
      expect(config.alpha).toBe(64);
      expect(config.epochs).toBe(5);
    });
  });

  describe("LLM Builder Session", () => {
    it("should create LLM builder session", () => {
      const session = createLLMBuilderSession("Test Session", "mistral-7b");

      expect(session.id).toBeDefined();
      expect(session.name).toBe("Test Session");
      expect(session.baseModel).toBe("mistral-7b");
      expect(session.status).toBe("idle");
      expect(session.progress).toBe(0);
    });

    it("should add LoRA config to session", () => {
      let session = createLLMBuilderSession("Test", "mistral-7b");
      const config = createLoRAConfig("LoRA1", "mistral-7b", "/data");

      session = addLoRAConfig(session, config);

      expect(session.loraConfigs).toHaveLength(1);
      expect(session.loraConfigs[0].name).toBe("LoRA1");
    });

    it("should add multiple LoRA configs", () => {
      let session = createLLMBuilderSession("Test", "mistral-7b");
      const config1 = createLoRAConfig("LoRA1", "mistral-7b", "/data1");
      const config2 = createLoRAConfig("LoRA2", "mistral-7b", "/data2");

      session = addLoRAConfig(session, config1);
      session = addLoRAConfig(session, config2);

      expect(session.loraConfigs).toHaveLength(2);
    });

    it("should update training metrics", () => {
      let session = createLLMBuilderSession("Test", "mistral-7b");

      session = updateTrainingMetrics(session, {
        epoch: 1,
        loss: 2.5,
        valLoss: 2.6,
        accuracy: 0.65,
        timestamp: new Date(),
      });

      expect(session.trainingMetrics).toHaveLength(1);
      expect(session.trainingMetrics[0].epoch).toBe(1);
      expect(session.progress).toBeGreaterThan(0);
    });
  });

  describe("Blender Project", () => {
    it("should create Blender project", () => {
      const project = createBlenderProject("Test Project", "/path/to/file.blend", "Test description");

      expect(project.id).toBeDefined();
      expect(project.name).toBe("Test Project");
      expect(project.filePath).toBe("/path/to/file.blend");
      expect(project.status).toBe("idle");
    });

    it("should add objects to Blender project", () => {
      let project = createBlenderProject("Test", "/path/file.blend");

      project = addBlenderObject(project, "Cube", "mesh");
      project = addBlenderObject(project, "Camera", "camera", [5, 5, 5]);

      expect(project.objects).toHaveLength(2);
      expect(project.objects[0].name).toBe("Cube");
      expect(project.objects[1].name).toBe("Camera");
    });

    it("should set object properties correctly", () => {
      let project = createBlenderProject("Test", "/path/file.blend");

      project = addBlenderObject(
        project,
        "Object",
        "mesh",
        [1, 2, 3],
        [0.5, 0.5, 0.5],
        [2, 2, 2]
      );

      const obj = project.objects[0];
      expect(obj.position).toEqual([1, 2, 3]);
      expect(obj.rotation).toEqual([0.5, 0.5, 0.5]);
      expect(obj.scale).toEqual([2, 2, 2]);
    });

    it("should execute Blender command", () => {
      const project = createBlenderProject("Test", "/path/file.blend");

      const command = executeBlenderCommand(
        project,
        "bpy.ops.mesh.primitive_cube_add()",
        "Add cube"
      );

      expect(command.id).toBeDefined();
      expect(command.command).toContain("cube_add");
      expect(command.description).toBe("Add cube");
    });
  });

  describe("PCB Project", () => {
    it("should create PCB project", () => {
      const project = createPCBProject("Test PCB", "/path/to/file.kicad_pcb", "Test board");

      expect(project.id).toBeDefined();
      expect(project.name).toBe("Test PCB");
      expect(project.filePath).toBe("/path/to/file.kicad_pcb");
      expect(project.status).toBe("idle");
    });

    it("should add components to PCB project", () => {
      let project = createPCBProject("Test", "/path/file.kicad_pcb");

      project = addPCBComponent(project, "U1", "STM32", "LQFP144");
      project = addPCBComponent(project, "R1", "10k", "0805");

      expect(project.components).toHaveLength(2);
      expect(project.components[0].reference).toBe("U1");
      expect(project.components[1].value).toBe("10k");
    });

    it("should set component properties correctly", () => {
      let project = createPCBProject("Test", "/path/file.kicad_pcb");

      project = addPCBComponent(project, "C1", "100uF", "1206", [10, 20], 90);

      const comp = project.components[0];
      expect(comp.position).toEqual([10, 20]);
      expect(comp.rotation).toBe(90);
    });

    it("should add nets to PCB project", () => {
      let project = createPCBProject("Test", "/path/file.kicad_pcb");

      project = addPCBNet(project, "GND", ["U1.GND", "R1.2"]);
      project = addPCBNet(project, "VCC", ["U1.VCC", "R1.1"]);

      expect(project.nets).toHaveLength(2);
      expect(project.nets[0].name).toBe("GND");
      expect(project.nets[0].connections).toHaveLength(2);
    });

    it("should execute PCB command", () => {
      const project = createPCBProject("Test", "/path/file.kicad_pcb");

      const command = executePCBCommand(
        project,
        "pcbnew.LoadBoard(path)",
        "Load board"
      );

      expect(command.id).toBeDefined();
      expect(command.description).toBe("Load board");
    });
  });

  describe("Specialized Module", () => {
    it("should create specialized module", () => {
      const module = createSpecializedModule("llm-builder", "Test Module", "Test description");

      expect(module.id).toBeDefined();
      expect(module.type).toBe("llm-builder");
      expect(module.name).toBe("Test Module");
      expect(module.isActive).toBe(false);
    });

    it("should get module info for LLM Builder", () => {
      const info = getModuleInfo("llm-builder");

      expect(info.title).toContain("LLM");
      expect(info.description).toBeDefined();
      expect(info.icon).toBeDefined();
    });

    it("should get module info for 3D Modeler", () => {
      const info = getModuleInfo("3d-modeler");

      expect(info.title).toContain("3D");
      expect(info.description).toBeDefined();
    });

    it("should get module info for PCB Designer", () => {
      const info = getModuleInfo("pcb-designer");

      expect(info.title).toContain("PCB");
      expect(info.description).toBeDefined();
    });
  });

  describe("Mock Data", () => {
    it("should create mock LLM builder session", () => {
      const session = createMockLLMBuilderSession();

      expect(session.loraConfigs.length).toBeGreaterThan(0);
      expect(session.trainingMetrics.length).toBeGreaterThan(0);
      expect(session.status).toBe("completed");
      expect(session.progress).toBe(100);
    });

    it("should create mock Blender project", () => {
      const project = createMockBlenderProject();

      expect(project.objects.length).toBeGreaterThan(0);
      expect(project.status).toBe("completed");
    });

    it("should create mock PCB project", () => {
      const project = createMockPCBProject();

      expect(project.components.length).toBeGreaterThan(0);
      expect(project.nets.length).toBeGreaterThan(0);
      expect(project.status).toBe("completed");
    });
  });
});
