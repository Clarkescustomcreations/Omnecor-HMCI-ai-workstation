/**
 * Hierarchical Context Manager
 * 
 * Manages context with three levels:
 * 1. Permanent "Goal & Plan" buffer - NEVER pruned
 * 2. Conversation history - Pruned when context exceeds limits
 * 3. Rolling terminal log - Auto-summarizes at 50 lines
 */

export interface GoalAndPlan {
  id: string;
  goal: string;
  plan: string[];
  createdAt: Date;
  updatedAt: Date;
  priority: "high" | "medium" | "low";
}

export interface TerminalLogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "warning" | "error" | "debug";
  message: string;
  context?: Record<string, unknown>;
}

export interface ContextSummary {
  id: string;
  timestamp: Date;
  originalLineCount: number;
  summaryLineCount: number;
  summary: string;
}

export interface HierarchicalContext {
  id: string;
  goalAndPlan: GoalAndPlan;
  terminalLog: TerminalLogEntry[];
  logSummaries: ContextSummary[];
  totalTokensUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

const TERMINAL_LOG_THRESHOLD = 50;

/**
 * Create a Goal & Plan buffer
 */
export function createGoalAndPlan(
  goal: string,
  plan: string[],
  priority: "high" | "medium" | "low" = "high"
): GoalAndPlan {
  return {
    id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    goal,
    plan,
    createdAt: new Date(),
    updatedAt: new Date(),
    priority,
  };
}

/**
 * Update Goal & Plan
 */
export function updateGoalAndPlan(
  goalAndPlan: GoalAndPlan,
  updates: Partial<Omit<GoalAndPlan, "id" | "createdAt">>
): GoalAndPlan {
  return {
    ...goalAndPlan,
    ...updates,
    updatedAt: new Date(),
  };
}

/**
 * Create a terminal log entry
 */
export function createTerminalLogEntry(
  level: "info" | "warning" | "error" | "debug",
  message: string,
  context?: Record<string, unknown>
): TerminalLogEntry {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    level,
    message,
    context,
  };
}

/**
 * Add entry to terminal log
 */
export function addTerminalLogEntry(
  context: HierarchicalContext,
  entry: TerminalLogEntry
): HierarchicalContext {
  const updatedLog = [...context.terminalLog, entry];

  // Check if we need to summarize
  if (updatedLog.length > TERMINAL_LOG_THRESHOLD) {
    return summarizeTerminalLog(context, updatedLog);
  }

  return {
    ...context,
    terminalLog: updatedLog,
    updatedAt: new Date(),
  };
}

/**
 * Summarize terminal log when it exceeds threshold
 * 
 * Keeps the most recent entries and summarizes older ones.
 * Threshold is exactly 50 lines as specified in requirements.
 */
export function summarizeTerminalLog(
  context: HierarchicalContext,
  log: TerminalLogEntry[]
): HierarchicalContext {
  if (log.length <= TERMINAL_LOG_THRESHOLD) {
    return { ...context, terminalLog: log, updatedAt: new Date() };
  }

  // Keep last 25 entries, summarize first entries
  const entriesToSummarize = log.slice(0, log.length - 25);
  const recentEntries = log.slice(log.length - 25);

  // Generate summary
  const errorCount = entriesToSummarize.filter((e) => e.level === "error").length;
  const warningCount = entriesToSummarize.filter((e) => e.level === "warning").length;
  const infoCount = entriesToSummarize.filter((e) => e.level === "info").length;

  const summary = `Auto-summarized ${entriesToSummarize.length} log entries: ${errorCount} errors, ${warningCount} warnings, ${infoCount} info messages. Time range: ${entriesToSummarize[0]?.timestamp.toLocaleString()} to ${entriesToSummarize[entriesToSummarize.length - 1]?.timestamp.toLocaleString()}`;

  const summaryRecord: ContextSummary = {
    id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    originalLineCount: entriesToSummarize.length,
    summaryLineCount: 1,
    summary,
  };

  return {
    ...context,
    terminalLog: recentEntries,
    logSummaries: [...context.logSummaries, summaryRecord],
    updatedAt: new Date(),
  };
}

/**
 * Create a hierarchical context
 */
export function createHierarchicalContext(
  goal: string,
  plan: string[]
): HierarchicalContext {
  return {
    id: `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    goalAndPlan: createGoalAndPlan(goal, plan),
    terminalLog: [],
    logSummaries: [],
    totalTokensUsed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get context statistics
 */
export function getContextStatistics(context: HierarchicalContext): {
  goalAndPlanSize: number;
  terminalLogSize: number;
  summariesSize: number;
  totalSize: number;
  logEntriesCount: number;
  summariesCount: number;
} {
  // Estimate sizes (in characters, not bytes)
  const goalAndPlanSize =
    context.goalAndPlan.goal.length +
    context.goalAndPlan.plan.reduce((sum, p) => sum + p.length, 0);

  const terminalLogSize = context.terminalLog.reduce((sum, entry) => sum + entry.message.length, 0);

  const summariesSize = context.logSummaries.reduce((sum, summary) => sum + summary.summary.length, 0);

  const totalSize = goalAndPlanSize + terminalLogSize + summariesSize;

  return {
    goalAndPlanSize,
    terminalLogSize,
    summariesSize,
    totalSize,
    logEntriesCount: context.terminalLog.length,
    summariesCount: context.logSummaries.length,
  };
}

/**
 * Get context health status
 */
export function getContextHealthStatus(context: HierarchicalContext): {
  status: "healthy" | "warning" | "critical";
  message: string;
  recommendations: string[];
} {
  const stats = getContextStatistics(context);
  const recommendations: string[] = [];

  if (context.terminalLog.length > TERMINAL_LOG_THRESHOLD) {
    return {
      status: "critical",
      message: "Terminal log exceeds threshold and needs immediate summarization",
      recommendations: ["Manually trigger log summarization", "Review recent errors"],
    };
  }

  if (context.terminalLog.length > TERMINAL_LOG_THRESHOLD * 0.8) {
    recommendations.push("Terminal log approaching threshold - consider summarization soon");
  }

  const errorCount = context.terminalLog.filter((e) => e.level === "error").length;
  if (errorCount > 5) {
    recommendations.push(`High error count (${errorCount}) - review error logs`);
  }

  if (stats.totalSize > 100000) {
    recommendations.push("Context size is large - consider pruning or archiving");
  }

  const status =
    recommendations.length === 0
      ? "healthy"
      : recommendations.length <= 2
        ? "warning"
        : "critical";

  return {
    status,
    message:
      status === "healthy"
        ? "Context is healthy"
        : status === "warning"
          ? "Context needs attention"
          : "Context requires immediate action",
    recommendations,
  };
}

/**
 * Export context for backup
 */
export function exportContext(context: HierarchicalContext): string {
  return JSON.stringify(
    {
      id: context.id,
      goalAndPlan: context.goalAndPlan,
      terminalLogCount: context.terminalLog.length,
      summariesCount: context.logSummaries.length,
      totalTokensUsed: context.totalTokensUsed,
      createdAt: context.createdAt.toISOString(),
      updatedAt: context.updatedAt.toISOString(),
      terminalLog: context.terminalLog,
      logSummaries: context.logSummaries,
    },
    null,
    2
  );
}

/**
 * Mock hierarchical context for demo
 */
export function createMockHierarchicalContext(): HierarchicalContext {
  const context = createHierarchicalContext(
    "Build Omnecor: The Ultimate All-in-One AI Workstation",
    [
      "Phase 1: Design system and dashboard layout",
      "Phase 2: Implement Neural Node-Tree UI",
      "Phase 3: Build Hybrid AI Engine panel",
      "Phase 4: Implement AI Chat interface",
      "Phase 5: Implement Action Hash loop detector",
      "Phase 6: Build specialized module launchers",
      "Phase 7: Implement third-party integrations",
      "Phase 8: Implement settings panel",
      "Phase 9: Polish and deliver",
    ]
  );

  // Add mock terminal log entries
  const mockEntries = [
    createTerminalLogEntry("info", "Starting Omnecor initialization"),
    createTerminalLogEntry("info", "Loading configuration files"),
    createTerminalLogEntry("info", "Initializing database connection"),
    createTerminalLogEntry("info", "Setting up AI model providers"),
    createTerminalLogEntry("warning", "Ollama service not detected - using API models only"),
    createTerminalLogEntry("info", "Loading Neural Node-Tree data"),
    createTerminalLogEntry("info", "Initializing chat interface"),
    createTerminalLogEntry("info", "Omnecor ready for use"),
  ];

  let updatedContext = context;
  mockEntries.forEach((entry) => {
    updatedContext = addTerminalLogEntry(updatedContext, entry);
  });

  return updatedContext;
}
