import { describe, it, expect } from "vitest";
import {
  createGoalAndPlan,
  updateGoalAndPlan,
  createTerminalLogEntry,
  addTerminalLogEntry,
  summarizeTerminalLog,
  createHierarchicalContext,
  getContextStatistics,
  getContextHealthStatus,
  exportContext,
  createMockHierarchicalContext,
} from "./contextManager";

describe("Hierarchical Context Manager", () => {
  describe("Goal & Plan Management", () => {
    it("should create a goal and plan", () => {
      const goalAndPlan = createGoalAndPlan("Build Omnecor", ["Step 1", "Step 2"], "high");

      expect(goalAndPlan.id).toBeDefined();
      expect(goalAndPlan.goal).toBe("Build Omnecor");
      expect(goalAndPlan.plan).toHaveLength(2);
      expect(goalAndPlan.priority).toBe("high");
      expect(goalAndPlan.createdAt).toBeInstanceOf(Date);
    });

    it("should update goal and plan", () => {
      const goalAndPlan = createGoalAndPlan("Build Omnecor", ["Step 1"], "high");
      const updated = updateGoalAndPlan(goalAndPlan, {
        goal: "Build Omnecor v2",
        plan: ["Step 1", "Step 2", "Step 3"],
      });

      expect(updated.goal).toBe("Build Omnecor v2");
      expect(updated.plan).toHaveLength(3);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(goalAndPlan.createdAt.getTime());
    });

    it("should preserve ID when updating", () => {
      const goalAndPlan = createGoalAndPlan("Build Omnecor", ["Step 1"], "high");
      const updated = updateGoalAndPlan(goalAndPlan, { goal: "Updated Goal" });

      expect(updated.id).toBe(goalAndPlan.id);
    });
  });

  describe("Terminal Log Management", () => {
    it("should create terminal log entries", () => {
      const entry = createTerminalLogEntry("info", "Test message");

      expect(entry.id).toBeDefined();
      expect(entry.level).toBe("info");
      expect(entry.message).toBe("Test message");
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it("should create entries with different levels", () => {
      const levels = ["info", "warning", "error", "debug"] as const;

      levels.forEach((level) => {
        const entry = createTerminalLogEntry(level, "Test");
        expect(entry.level).toBe(level);
      });
    });

    it("should add entries to context", () => {
      const context = createHierarchicalContext("Goal", ["Plan"]);
      const entry = createTerminalLogEntry("info", "Test message");

      const updated = addTerminalLogEntry(context, entry);

      expect(updated.terminalLog).toHaveLength(1);
      expect(updated.terminalLog[0].message).toBe("Test message");
    });

    it("should trigger summarization at threshold", () => {
      let context = createHierarchicalContext("Goal", ["Plan"]);

      // Add entries up to threshold
      for (let i = 0; i < 51; i++) {
        const entry = createTerminalLogEntry("info", `Message ${i}`);
        context = addTerminalLogEntry(context, entry);
      }

      // Should have triggered summarization
      expect(context.terminalLog.length).toBeLessThanOrEqual(50);
      expect(context.logSummaries.length).toBeGreaterThan(0);
    });
  });

  describe("Terminal Log Summarization", () => {
    it("should not summarize when below threshold", () => {
      let context = createHierarchicalContext("Goal", ["Plan"]);
      const entries = [];

      for (let i = 0; i < 30; i++) {
        entries.push(createTerminalLogEntry("info", `Message ${i}`));
      }

      const updated = summarizeTerminalLog(context, entries);

      expect(updated.terminalLog).toHaveLength(30);
      expect(updated.logSummaries).toHaveLength(0);
    });

    it("should summarize when above threshold", () => {
      let context = createHierarchicalContext("Goal", ["Plan"]);
      const entries = [];

      for (let i = 0; i < 60; i++) {
        entries.push(createTerminalLogEntry(i % 10 === 0 ? "error" : "info", `Message ${i}`));
      }

      const updated = summarizeTerminalLog(context, entries);

      expect(updated.terminalLog.length).toBeLessThanOrEqual(50);
      expect(updated.logSummaries.length).toBeGreaterThan(0);
      expect(updated.logSummaries[0].summary).toContain("Auto-summarized");
    });

    it("should preserve recent entries during summarization", () => {
      let context = createHierarchicalContext("Goal", ["Plan"]);
      const entries = [];

      for (let i = 0; i < 60; i++) {
        entries.push(createTerminalLogEntry("info", `Message ${i}`));
      }

      const updated = summarizeTerminalLog(context, entries);

      // Recent entries should be preserved
      const lastMessage = updated.terminalLog[updated.terminalLog.length - 1];
      expect(lastMessage.message).toContain("Message 5");
    });

    it("should count errors and warnings in summary", () => {
      let context = createHierarchicalContext("Goal", ["Plan"]);
      const entries = [];

      for (let i = 0; i < 60; i++) {
        const level = i < 5 ? "error" : i < 15 ? "warning" : "info";
        entries.push(createTerminalLogEntry(level, `Message ${i}`));
      }

      const updated = summarizeTerminalLog(context, entries);

      expect(updated.logSummaries[0].summary).toContain("5 errors");
      expect(updated.logSummaries[0].summary).toContain("10 warnings");
    });
  });

  describe("Hierarchical Context Creation", () => {
    it("should create hierarchical context", () => {
      const context = createHierarchicalContext("Build Omnecor", ["Step 1", "Step 2"]);

      expect(context.id).toBeDefined();
      expect(context.goalAndPlan.goal).toBe("Build Omnecor");
      expect(context.terminalLog).toHaveLength(0);
      expect(context.logSummaries).toHaveLength(0);
      expect(context.totalTokensUsed).toBe(0);
    });
  });

  describe("Context Statistics", () => {
    it("should calculate context statistics", () => {
      const context = createHierarchicalContext("Goal", ["Plan 1", "Plan 2"]);

      const stats = getContextStatistics(context);

      expect(stats.goalAndPlanSize).toBeGreaterThan(0);
      expect(stats.terminalLogSize).toBe(0);
      expect(stats.summariesSize).toBe(0);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it("should include log entries in statistics", () => {
      let context = createHierarchicalContext("Goal", ["Plan"]);
      const entry = createTerminalLogEntry("info", "Test message");
      context = addTerminalLogEntry(context, entry);

      const stats = getContextStatistics(context);

      expect(stats.terminalLogSize).toBeGreaterThan(0);
      expect(stats.logEntriesCount).toBe(1);
    });
  });

  describe("Context Health Status", () => {
    it("should report healthy status for new context", () => {
      const context = createHierarchicalContext("Goal", ["Plan"]);

      const health = getContextHealthStatus(context);

      expect(health.status).toBe("healthy");
    });

    it("should report warning status when approaching threshold", () => {
      let context = createHierarchicalContext("Goal", ["Plan"]);

      // Add entries close to threshold
      for (let i = 0; i < 42; i++) {
        const entry = createTerminalLogEntry("info", `Message ${i}`);
        context = addTerminalLogEntry(context, entry);
      }

      const health = getContextHealthStatus(context);

      expect(health.recommendations.length).toBeGreaterThan(0);
    });

    it("should report critical status with high errors", () => {
      let context = createHierarchicalContext("Goal", ["Plan"]);

      // Add many error entries
      for (let i = 0; i < 10; i++) {
        const entry = createTerminalLogEntry("error", `Error ${i}`);
        context = addTerminalLogEntry(context, entry);
      }

      const health = getContextHealthStatus(context);

      expect(health.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Context Export", () => {
    it("should export context as JSON", () => {
      const context = createHierarchicalContext("Goal", ["Plan"]);

      const exported = exportContext(context);

      expect(typeof exported).toBe("string");
      const parsed = JSON.parse(exported);
      expect(parsed.id).toBe(context.id);
      expect(parsed.goalAndPlan.goal).toBe("Goal");
    });
  });

  describe("Mock Context", () => {
    it("should create valid mock context", () => {
      const context = createMockHierarchicalContext();

      expect(context.id).toBeDefined();
      expect(context.goalAndPlan.goal).toContain("Omnecor");
      expect(context.goalAndPlan.plan.length).toBeGreaterThan(0);
      expect(context.terminalLog.length).toBeGreaterThan(0);
    });

    it("should have valid terminal log entries in mock", () => {
      const context = createMockHierarchicalContext();

      context.terminalLog.forEach((entry) => {
        expect(entry.id).toBeDefined();
        expect(entry.timestamp).toBeInstanceOf(Date);
        expect(["info", "warning", "error", "debug"]).toContain(entry.level);
      });
    });
  });

  describe("Goal & Plan Permanence", () => {
    it("should never modify goal and plan during context operations", () => {
      const context = createHierarchicalContext("Original Goal", ["Plan 1", "Plan 2"]);
      const originalGoal = context.goalAndPlan.goal;

      // Add many log entries
      let updated = context;
      for (let i = 0; i < 60; i++) {
        const entry = createTerminalLogEntry("info", `Message ${i}`);
        updated = addTerminalLogEntry(updated, entry);
      }

      // Goal & Plan should remain unchanged
      expect(updated.goalAndPlan.goal).toBe(originalGoal);
      expect(updated.goalAndPlan.plan).toEqual(context.goalAndPlan.plan);
    });
  });
});
