/**
 * Keyboard Shortcuts Manager for Omnecor
 * 
 * Provides a centralized system for managing keyboard shortcuts across the application.
 * Supports modifier keys (Ctrl, Shift, Alt, Cmd) and prevents conflicts.
 */

export type KeyboardModifier = 'ctrl' | 'shift' | 'alt' | 'cmd';
export type KeyboardAction = 
  | 'focus-search'
  | 'new-chat'
  | 'new-project'
  | 'save'
  | 'undo'
  | 'redo'
  | 'toggle-sidebar'
  | 'toggle-theme'
  | 'open-settings'
  | 'open-help'
  | 'clear-context'
  | 'export-context'
  | 'import-context';

export interface KeyboardShortcut {
  action: KeyboardAction;
  keys: string[];
  modifiers: KeyboardModifier[];
  description: string;
  category: 'navigation' | 'editing' | 'view' | 'context' | 'help';
}

/**
 * Default keyboard shortcuts for Omnecor
 * Follows common conventions (Ctrl+S for save, Ctrl+Z for undo, etc.)
 */
export const DEFAULT_SHORTCUTS: Record<KeyboardAction, KeyboardShortcut> = {
  'focus-search': {
    action: 'focus-search',
    keys: ['k'],
    modifiers: ['ctrl'],
    description: 'Focus on search bar',
    category: 'navigation',
  },
  'new-chat': {
    action: 'new-chat',
    keys: ['n'],
    modifiers: ['ctrl'],
    description: 'Start a new chat conversation',
    category: 'navigation',
  },
  'new-project': {
    action: 'new-project',
    keys: ['n'],
    modifiers: ['ctrl', 'shift'],
    description: 'Create a new project',
    category: 'navigation',
  },
  'save': {
    action: 'save',
    keys: ['s'],
    modifiers: ['ctrl'],
    description: 'Save current work',
    category: 'editing',
  },
  'undo': {
    action: 'undo',
    keys: ['z'],
    modifiers: ['ctrl'],
    description: 'Undo last action',
    category: 'editing',
  },
  'redo': {
    action: 'redo',
    keys: ['z'],
    modifiers: ['ctrl', 'shift'],
    description: 'Redo last action',
    category: 'editing',
  },
  'toggle-sidebar': {
    action: 'toggle-sidebar',
    keys: ['b'],
    modifiers: ['ctrl'],
    description: 'Toggle sidebar visibility',
    category: 'view',
  },
  'toggle-theme': {
    action: 'toggle-theme',
    keys: ['l'],
    modifiers: ['ctrl', 'shift'],
    description: 'Toggle light/dark theme',
    category: 'view',
  },
  'open-settings': {
    action: 'open-settings',
    keys: [','],
    modifiers: ['ctrl'],
    description: 'Open settings',
    category: 'navigation',
  },
  'open-help': {
    action: 'open-help',
    keys: ['?'],
    modifiers: ['shift'],
    description: 'Open help and keyboard shortcuts',
    category: 'help',
  },
  'clear-context': {
    action: 'clear-context',
    keys: ['x'],
    modifiers: ['ctrl', 'shift'],
    description: 'Clear AI context (requires confirmation)',
    category: 'context',
  },
  'export-context': {
    action: 'export-context',
    keys: ['e'],
    modifiers: ['ctrl', 'shift'],
    description: 'Export current context',
    category: 'context',
  },
  'import-context': {
    action: 'import-context',
    keys: ['i'],
    modifiers: ['ctrl', 'shift'],
    description: 'Import context from file',
    category: 'context',
  },
};

/**
 * Keyboard Shortcuts Manager
 * Handles registration, execution, and management of keyboard shortcuts
 */
export class KeyboardShortcutsManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private handlers: Map<KeyboardAction, Set<() => void>> = new Map();
  private isEnabled: boolean = true;

  constructor() {
    this.registerDefaultShortcuts();
  }

  /**
   * Register default shortcuts
   */
  private registerDefaultShortcuts() {
    Object.values(DEFAULT_SHORTCUTS).forEach((shortcut) => {
      this.registerShortcut(shortcut);
    });
  }

  /**
   * Register a keyboard shortcut
   */
  registerShortcut(shortcut: KeyboardShortcut) {
    const key = this.getShortcutKey(shortcut.keys, shortcut.modifiers);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Register a handler for a keyboard action
   */
  onShortcut(action: KeyboardAction, handler: () => void) {
    if (!this.handlers.has(action)) {
      this.handlers.set(action, new Set());
    }
    this.handlers.get(action)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(action)?.delete(handler);
    };
  }

  /**
   * Handle keyboard event
   */
  handleKeyEvent(event: KeyboardEvent) {
    if (!this.isEnabled) return;

    const modifiers: KeyboardModifier[] = [];
    if (event.ctrlKey || event.metaKey) modifiers.push('ctrl');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');

    const key = event.key.toLowerCase();
    const shortcutKey = this.getShortcutKey([key], modifiers);

    const shortcut = this.shortcuts.get(shortcutKey);
    if (shortcut) {
      event.preventDefault();
      const handlers = this.handlers.get(shortcut.action);
      handlers?.forEach((handler) => handler());
    }
  }

  /**
   * Get all shortcuts
   */
  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: KeyboardShortcut['category']): KeyboardShortcut[] {
    return this.getAllShortcuts().filter((s) => s.category === category);
  }

  /**
   * Enable/disable shortcuts
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Generate shortcut key for lookup
   */
  private getShortcutKey(keys: string[], modifiers: KeyboardModifier[]): string {
    const sortedModifiers = [...modifiers].sort().join('+');
    const sortedKeys = [...keys].sort().join('+');
    return `${sortedModifiers}${sortedModifiers ? '+' : ''}${sortedKeys}`;
  }

  /**
   * Format shortcut for display
   */
  formatShortcut(shortcut: KeyboardShortcut): string {
    const parts = [...shortcut.modifiers.map((m) => this.formatModifier(m)), ...shortcut.keys];
    return parts.join('+');
  }

  /**
   * Format modifier key for display
   */
  private formatModifier(modifier: KeyboardModifier): string {
    const modifierMap: Record<KeyboardModifier, string> = {
      ctrl: 'Ctrl',
      shift: 'Shift',
      alt: 'Alt',
      cmd: 'Cmd',
    };
    return modifierMap[modifier];
  }
}

/**
 * Create and export global keyboard shortcuts manager
 */
export const keyboardShortcuts = new KeyboardShortcutsManager();

/**
 * Hook to use keyboard shortcuts in React components
 */
export function useKeyboardShortcut(action: KeyboardAction, handler: () => void) {
  React.useEffect(() => {
    return keyboardShortcuts.onShortcut(action, handler);
  }, [action, handler]);
}

// Import React for the hook
import React from 'react';
