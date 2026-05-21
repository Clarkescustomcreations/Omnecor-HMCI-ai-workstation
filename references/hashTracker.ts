/**
 * @file hashTracker.ts
 * @description Omnecor — Action Hash Tracker & AI Loop Detector
 *
 * Provides two cooperating utilities:
 *
 *  1. `generateActionHash(toolName, args, state)` — Deterministically hashes
 *     the complete "action snapshot" using SHA-256, so two identical AI steps
 *     always produce the same digest regardless of object key ordering.
 *
 *  2. `LoopDetector` — Maintains a rolling history of action hashes and
 *     exposes `checkLoop(hash)` to identify when the agent is stuck in a
 *     repeated action cycle.
 */

import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single entry in the `LoopDetector` history ring-buffer.
 */
export interface HistoryEntry {
  /** The SHA-256 hex digest of the action snapshot. */
  hash: string;
  /** ISO-8601 timestamp of when this action was recorded. */
  recordedAt: string;
}

/**
 * Snapshot of the current detector state — useful for logging / persistence.
 */
export interface LoopDetectorSnapshot {
  /** Ordered history from oldest → newest. */
  history: HistoryEntry[];
  /** The maximum number of entries the ring-buffer holds. */
  maxHistorySize: number;
  /** How many consecutive identical hashes trigger a loop signal. */
  loopThreshold: number;
}

// ---------------------------------------------------------------------------
// 1. Hash generation
// ---------------------------------------------------------------------------

/**
 * Recursively sorts an object's keys so that two semantically identical
 * objects with differently-ordered keys produce the same JSON string.
 *
 * Arrays preserve their order; only plain-object keys are sorted.
 */
function deterministicReplacer(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    // Return a new object whose keys are in sorted order.
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
        a.localeCompare(b)
      )
    );
  }
  return value;
}

/**
 * Generates a deterministic SHA-256 hash from the complete action snapshot.
 *
 * The hash encodes:
 *  - `toolName`  — which tool the AI is invoking
 *  - `args`      — the exact arguments being passed
 *  - `state`     — the agent's current observable state
 *
 * Key ordering within `args` and `state` is normalised, so
 * `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` hash identically.
 *
 * @param toolName - Name of the AI tool / action being executed.
 * @param args     - Arguments object passed to the tool.
 * @param state    - Current agent / world state at the time of invocation.
 * @returns        Lowercase hex SHA-256 digest (64 characters).
 *
 * @example
 * ```ts
 * const hash = generateActionHash('writeFile', { path: '/tmp/x' }, { step: 3 });
 * // => 'a3f9...' (64-char hex string)
 * ```
 */
export function generateActionHash(
  toolName: string,
  args: object,
  state: object
): string {
  // Build a canonical snapshot object.
  const snapshot = {
    toolName,
    args,
    state,
  };

  // JSON.stringify with our replacer sorts every nested object's keys,
  // producing a stable byte sequence regardless of insertion order.
  const canonical = JSON.stringify(snapshot, deterministicReplacer);

  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// 2. LoopDetector
// ---------------------------------------------------------------------------

export interface LoopDetectorOptions {
  /**
   * Number of consecutive identical hashes that constitute a loop.
   * Defaults to 3.
   */
  loopThreshold?: number;
  /**
   * Maximum number of entries to retain in history.
   * Older entries are evicted once the buffer is full.
   * Defaults to 100.
   */
  maxHistorySize?: number;
}

const DEFAULT_LOOP_DETECTOR_OPTIONS: Required<LoopDetectorOptions> = {
  loopThreshold: 3,
  maxHistorySize: 100,
};

/**
 * Tracks a rolling history of AI action hashes to detect infinite loops.
 *
 * A loop is declared when the **last N hashes in the history are all
 * identical**, where N equals `loopThreshold` (default 3).
 *
 * @example
 * ```ts
 * const detector = new LoopDetector();
 *
 * for (const action of agentActions) {
 *   const hash = generateActionHash(action.tool, action.args, action.state);
 *
 *   if (detector.checkLoop(hash)) {
 *     throw new Error(`Infinite loop detected on action "${action.tool}"`);
 *   }
 *
 *   detector.record(hash); // record AFTER the check if you want to inspect
 *                          // before committing, or use checkAndRecord().
 * }
 * ```
 */
export class LoopDetector {
  private readonly loopThreshold: number;
  private readonly maxHistorySize: number;

  /**
   * Internal ring-buffer.  New entries are pushed to the end; when the
   * buffer exceeds `maxHistorySize` the oldest entry is shifted off.
   */
  private history: HistoryEntry[] = [];

  constructor(options: LoopDetectorOptions = {}) {
    const resolved = { ...DEFAULT_LOOP_DETECTOR_OPTIONS, ...options };

    if (resolved.loopThreshold < 2) {
      throw new RangeError("loopThreshold must be ≥ 2");
    }
    if (resolved.maxHistorySize < resolved.loopThreshold) {
      throw new RangeError(
        "maxHistorySize must be ≥ loopThreshold so a loop can actually be detected"
      );
    }

    this.loopThreshold = resolved.loopThreshold;
    this.maxHistorySize = resolved.maxHistorySize;
  }

  // -------------------------------------------------------------------------
  // Core API
  // -------------------------------------------------------------------------

  /**
   * Checks whether adding `hash` to the history would create a loop — i.e.
   * the last `(loopThreshold - 1)` recorded hashes are all equal to `hash`.
   *
   * **Does not mutate history.**  Call `record()` separately, or use the
   * convenience method `checkAndRecord()`.
   *
   * @param hash - A hex digest produced by `generateActionHash`.
   * @returns `true` if a loop is detected, `false` otherwise.
   */
  checkLoop(hash: string): boolean {
    if (this.history.length < this.loopThreshold - 1) {
      // Not enough history yet to form a full loop window.
      return false;
    }

    // Examine the last (loopThreshold - 1) recorded hashes.  If every one
    // of them equals `hash`, then recording `hash` again would complete a
    // run of `loopThreshold` identical consecutive hashes.
    const tail = this.history.slice(-(this.loopThreshold - 1));
    return tail.every((entry) => entry.hash === hash);
  }

  /**
   * Appends `hash` to the rolling history.
   *
   * If the buffer has reached `maxHistorySize`, the oldest entry is evicted
   * before the new one is added (FIFO ring-buffer semantics).
   *
   * @param hash - A hex digest produced by `generateActionHash`.
   */
  record(hash: string): void {
    if (this.history.length >= this.maxHistorySize) {
      this.history.shift(); // evict oldest
    }

    this.history.push({
      hash,
      recordedAt: new Date().toISOString(),
    });
  }

  /**
   * Convenience method that combines `checkLoop` and `record` in a single
   * call.  The check is performed **before** recording so that the returned
   * value reflects the state *prior* to the new entry being committed.
   *
   * @param hash - A hex digest produced by `generateActionHash`.
   * @returns `true` if a loop was detected (hash was **not** recorded),
   *          `false` if no loop — the hash **was** recorded.
   *
   * @example
   * ```ts
   * const hash = generateActionHash(tool, args, state);
   *
   * if (detector.checkAndRecord(hash)) {
   *   // Loop detected — abort the agent run.
   * }
   * ```
   */
  checkAndRecord(hash: string): boolean {
    if (this.checkLoop(hash)) {
      return true; // do NOT record — caller should halt
    }
    this.record(hash);
    return false;
  }

  // -------------------------------------------------------------------------
  // Introspection helpers
  // -------------------------------------------------------------------------

  /**
   * Returns a read-only snapshot of the detector's current state.
   * Useful for structured logging, persistence, or debugging.
   */
  snapshot(): LoopDetectorSnapshot {
    return {
      history: this.history.map((e) => ({ ...e })), // shallow clone each entry
      maxHistorySize: this.maxHistorySize,
      loopThreshold: this.loopThreshold,
    };
  }

  /**
   * The number of entries currently stored in history.
   */
  get size(): number {
    return this.history.length;
  }

  /**
   * Resets the detector to an empty state.
   * Call this when starting a new agent session or after handling a loop.
   */
  reset(): void {
    this.history = [];
  }

  /**
   * Returns the hash of the most recently recorded action,
   * or `null` if history is empty.
   */
  get latestHash(): string | null {
    return this.history.length > 0
      ? this.history[this.history.length - 1].hash
      : null;
  }

  /**
   * Returns a window of the last `n` history entries (newest last).
   * Clamped to the actual history length.
   */
  tail(n: number): HistoryEntry[] {
    return this.history.slice(-Math.max(0, n)).map((e) => ({ ...e }));
  }
}
