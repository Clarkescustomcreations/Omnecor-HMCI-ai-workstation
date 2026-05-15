import { describe, it, expect } from "vitest";
import {
  generateActionHash,
  createActionRecord,
  detectLoop,
  createHITLAlert,
  resolveHITLAlert,
  formatActionForDisplay,
  getLoopStatistics,
  mockActionHistory,
} from "./actionHashDetector";

describe("Action Hash Loop Detector", () => {
  describe("Hash Generation", () => {
    it("should generate consistent hashes for identical actions", () => {
      const hash1 = generateActionHash("search", { query: "test" }, { context: "initial" });
      const hash2 = generateActionHash("search", { query: "test" }, { context: "initial" });

      expect(hash1).toBe(hash2);
    });

    it("should generate different hashes for different actions", () => {
      const hash1 = generateActionHash("search", { query: "test1" }, { context: "initial" });
      const hash2 = generateActionHash("search", { query: "test2" }, { context: "initial" });

      expect(hash1).not.toBe(hash2);
    });

    it("should generate different hashes for different tools", () => {
      const hash1 = generateActionHash("search", { query: "test" }, { context: "initial" });
      const hash2 = generateActionHash("analyze", { query: "test" }, { context: "initial" });

      expect(hash1).not.toBe(hash2);
    });

    it("should generate different hashes for different state", () => {
      const hash1 = generateActionHash("search", { query: "test" }, { context: "initial" });
      const hash2 = generateActionHash("search", { query: "test" }, { context: "modified" });

      expect(hash1).not.toBe(hash2);
    });

    it("should handle nested objects in args and state", () => {
      const hash1 = generateActionHash(
        "process",
        { data: { nested: { value: 1 } } },
        { state: { nested: { value: 1 } } }
      );
      const hash2 = generateActionHash(
        "process",
        { data: { nested: { value: 1 } } },
        { state: { nested: { value: 1 } } }
      );

      expect(hash1).toBe(hash2);
    });
  });

  describe("Action Record Creation", () => {
    it("should create valid action records", () => {
      const record = createActionRecord("search", { query: "test" }, { context: "initial" }, 1);

      expect(record.hash).toBeDefined();
      expect(record.tool).toBe("search");
      expect(record.args).toEqual({ query: "test" });
      expect(record.state).toEqual({ context: "initial" });
      expect(record.timestamp).toBeInstanceOf(Date);
      expect(record.sequenceNumber).toBe(1);
    });
  });

  describe("Loop Detection", () => {
    it("should detect no loop with insufficient history", () => {
      const records = [
        createActionRecord("search", { query: "test" }, { context: "initial" }, 1),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 2),
      ];

      const result = detectLoop(records);

      expect(result.isLoopDetected).toBe(false);
      expect(result.consecutiveCount).toBe(0); // Only 2 records, need 3 for threshold
    });

    it("should detect loop with 3 identical consecutive actions", () => {
      const records = [
        createActionRecord("search", { query: "test" }, { context: "initial" }, 1),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 2),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 3),
      ];

      const result = detectLoop(records);

      expect(result.isLoopDetected).toBe(true);
      expect(result.consecutiveCount).toBe(3);
    });

    it("should detect loop with more than 3 identical actions", () => {
      const records = [
        createActionRecord("search", { query: "test" }, { context: "initial" }, 1),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 2),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 3),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 4),
      ];

      const result = detectLoop(records);

      expect(result.isLoopDetected).toBe(true);
    });

    it("should not detect loop if sequence is broken", () => {
      const records = [
        createActionRecord("search", { query: "test" }, { context: "initial" }, 1),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 2),
        createActionRecord("analyze", { data: "test" }, { context: "initial" }, 3),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 4),
      ];

      const result = detectLoop(records);

      expect(result.isLoopDetected).toBe(false);
    });

    it("should return correct recommendation for loops", () => {
      const records = [
        createActionRecord("search", { query: "test" }, { context: "initial" }, 1),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 2),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 3),
      ];

      const result = detectLoop(records);

      expect(result.recommendation).toContain("Loop detected");
    });
  });

  describe("HITL Alert Creation", () => {
    it("should create valid HITL alert", () => {
      const records = [
        createActionRecord("search", { query: "test" }, { context: "initial" }, 1),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 2),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 3),
      ];

      const loopDetection = detectLoop(records);
      const alert = createHITLAlert(loopDetection);

      expect(alert.id).toBeDefined();
      expect(alert.severity).toBe("critical");
      expect(alert.title).toContain("Loop Detected");
      expect(alert.resolved).toBe(false);
      expect(alert.userActions.retry).toBe(true);
      expect(alert.userActions.modify).toBe(true);
      expect(alert.userActions.abort).toBe(true);
    });
  });

  describe("HITL Alert Resolution", () => {
    it("should resolve alert with retry decision", () => {
      const records = [
        createActionRecord("search", { query: "test" }, { context: "initial" }, 1),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 2),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 3),
      ];

      const loopDetection = detectLoop(records);
      let alert = createHITLAlert(loopDetection);

      alert = resolveHITLAlert(alert, "retry");

      expect(alert.resolved).toBe(true);
      expect(alert.userDecision).toBe("retry");
    });

    it("should resolve alert with modify decision", () => {
      const records = [
        createActionRecord("search", { query: "test" }, { context: "initial" }, 1),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 2),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 3),
      ];

      const loopDetection = detectLoop(records);
      let alert = createHITLAlert(loopDetection);

      alert = resolveHITLAlert(alert, "modify");

      expect(alert.resolved).toBe(true);
      expect(alert.userDecision).toBe("modify");
    });

    it("should resolve alert with abort decision", () => {
      const records = [
        createActionRecord("search", { query: "test" }, { context: "initial" }, 1),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 2),
        createActionRecord("search", { query: "test" }, { context: "initial" }, 3),
      ];

      const loopDetection = detectLoop(records);
      let alert = createHITLAlert(loopDetection);

      alert = resolveHITLAlert(alert, "abort");

      expect(alert.resolved).toBe(true);
      expect(alert.userDecision).toBe("abort");
    });
  });

  describe("Action Formatting", () => {
    it("should format action for display", () => {
      const record = createActionRecord("search", { query: "test" }, { context: "initial" }, 1);
      const formatted = formatActionForDisplay(record);

      expect(formatted).toContain("Tool: search");
      expect(formatted).toContain("Hash:");
    });
  });

  describe("Loop Statistics", () => {
    it("should calculate correct statistics", () => {
      const stats = getLoopStatistics(mockActionHistory);

      expect(stats.totalActions).toBeGreaterThan(0);
      expect(stats.uniqueActions).toBeGreaterThan(0);
      expect(stats.uniqueActions).toBeLessThanOrEqual(stats.totalActions);
      expect(stats.mostRepeatedAction).toBeDefined();
      expect(stats.loopsDetected).toBeGreaterThanOrEqual(0);
    });

    it("should identify most repeated action", () => {
      const stats = getLoopStatistics(mockActionHistory);

      expect(stats.mostRepeatedAction?.tool).toBe("search");
      expect(stats.mostRepeatedAction?.count).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Mock Data", () => {
    it("should have valid mock action history", () => {
      expect(mockActionHistory.length).toBeGreaterThan(0);

      mockActionHistory.forEach((record) => {
        expect(record.hash).toBeDefined();
        expect(record.tool).toBeDefined();
        expect(record.timestamp).toBeInstanceOf(Date);
      });
    });

    it("should detect loop in mock history", () => {
      const result = detectLoop(mockActionHistory);

      expect(result.isLoopDetected).toBe(true);
    });
  });
});
