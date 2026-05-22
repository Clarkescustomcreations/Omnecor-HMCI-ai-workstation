/**
 * Advanced Settings Manager for Omnecor
 * 
 * Manages performance tuning, resource allocation, and system-level configurations
 * including Zram/Swap buffers, model caching, context limits, and data retention policies.
 */

export interface MemoryBufferConfig {
  enabled: boolean;
  type: 'zram' | 'swap' | 'hybrid';
  size: number; // in MB
  compressionRatio: number; // 1-3, typical 2-3 for zram
}

export interface ModelCacheConfig {
  enabled: boolean;
  maxSize: number; // in MB
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
  preloadModels: string[]; // model names to keep in cache
}

export interface ContextLimitConfig {
  maxContextTokens: number;
  maxRequestTokens: number;
  autoTruncate: boolean;
  truncationStrategy: 'recent' | 'important' | 'hybrid';
}

export interface DataRetentionConfig {
  retentionDays: number;
  autoCleanup: boolean;
  cleanupFrequency: 'daily' | 'weekly' | 'monthly';
  archiveOldData: boolean;
  archivePath: string;
}

export interface PerformanceTuningConfig {
  enableGPUAcceleration: boolean;
  enableParallelProcessing: boolean;
  maxParallelTasks: number;
  enableResponseCaching: boolean;
  cacheTTL: number; // in seconds
}

export interface AdvancedSettings {
  memoryBuffer: MemoryBufferConfig;
  modelCache: ModelCacheConfig;
  contextLimit: ContextLimitConfig;
  dataRetention: DataRetentionConfig;
  performanceTuning: PerformanceTuningConfig;
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Default advanced settings optimized for typical systems
 */
export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  memoryBuffer: {
    enabled: true,
    type: 'hybrid',
    size: 2048, // 2GB
    compressionRatio: 2.5,
  },
  modelCache: {
    enabled: true,
    maxSize: 5120, // 5GB
    evictionPolicy: 'lru',
    preloadModels: [],
  },
  contextLimit: {
    maxContextTokens: 8000,
    maxRequestTokens: 2000,
    autoTruncate: true,
    truncationStrategy: 'hybrid',
  },
  dataRetention: {
    retentionDays: 90,
    autoCleanup: true,
    cleanupFrequency: 'weekly',
    archiveOldData: true,
    archivePath: '~/.cortex/archive',
  },
  performanceTuning: {
    enableGPUAcceleration: true,
    enableParallelProcessing: true,
    maxParallelTasks: 4,
    enableResponseCaching: true,
    cacheTTL: 3600, // 1 hour
  },
  debugMode: false,
  logLevel: 'warn',
};

/**
 * Preset configurations for different system types
 */
export const PERFORMANCE_PRESETS = {
  lowEnd: {
    memoryBuffer: { enabled: true, type: 'zram', size: 1024, compressionRatio: 3 },
    modelCache: { enabled: true, maxSize: 1024, evictionPolicy: 'lfu', preloadModels: [] },
    contextLimit: { maxContextTokens: 4000, maxRequestTokens: 1000, autoTruncate: true, truncationStrategy: 'recent' },
    performanceTuning: { enableGPUAcceleration: false, enableParallelProcessing: false, maxParallelTasks: 1, enableResponseCaching: true, cacheTTL: 7200 },
  },
  midRange: {
    memoryBuffer: { enabled: true, type: 'hybrid', size: 2048, compressionRatio: 2.5 },
    modelCache: { enabled: true, maxSize: 5120, evictionPolicy: 'lru', preloadModels: [] },
    contextLimit: { maxContextTokens: 8000, maxRequestTokens: 2000, autoTruncate: true, truncationStrategy: 'hybrid' },
    performanceTuning: { enableGPUAcceleration: true, enableParallelProcessing: true, maxParallelTasks: 4, enableResponseCaching: true, cacheTTL: 3600 },
  },
  highEnd: {
    memoryBuffer: { enabled: true, type: 'swap', size: 4096, compressionRatio: 2 },
    modelCache: { enabled: true, maxSize: 10240, evictionPolicy: 'lru', preloadModels: [] },
    contextLimit: { maxContextTokens: 16000, maxRequestTokens: 4000, autoTruncate: false, truncationStrategy: 'hybrid' },
    performanceTuning: { enableGPUAcceleration: true, enableParallelProcessing: true, maxParallelTasks: 8, enableResponseCaching: true, cacheTTL: 1800 },
  },
};

/**
 * Advanced Settings Manager
 */
export class AdvancedSettingsManager {
  private settings: AdvancedSettings = { ...DEFAULT_ADVANCED_SETTINGS };
  private listeners: Set<(settings: AdvancedSettings) => void> = new Set();
  private storageKey = 'cortex-advanced-settings';

  constructor() {
    this.loadSettings();
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = this.mergeSettings(DEFAULT_ADVANCED_SETTINGS, parsed);
      }
    } catch (error) {
      console.error('Failed to load advanced settings:', error);
      this.settings = { ...DEFAULT_ADVANCED_SETTINGS };
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save advanced settings:', error);
    }
  }

  /**
   * Merge settings with defaults
   */
  private mergeSettings(defaults: AdvancedSettings, overrides: Partial<AdvancedSettings>): AdvancedSettings {
    return {
      memoryBuffer: { ...defaults.memoryBuffer, ...overrides.memoryBuffer },
      modelCache: { ...defaults.modelCache, ...overrides.modelCache },
      contextLimit: { ...defaults.contextLimit, ...overrides.contextLimit },
      dataRetention: { ...defaults.dataRetention, ...overrides.dataRetention },
      performanceTuning: { ...defaults.performanceTuning, ...overrides.performanceTuning },
      debugMode: overrides.debugMode ?? defaults.debugMode,
      logLevel: overrides.logLevel ?? defaults.logLevel,
    };
  }

  /**
   * Get all settings
   */
  getSettings(): AdvancedSettings {
    return JSON.parse(JSON.stringify(this.settings));
  }

  /**
   * Update settings
   */
  updateSettings(updates: Partial<AdvancedSettings>) {
    this.settings = this.mergeSettings(this.settings, updates);
    this.saveSettings();
  }

  /**
   * Apply a performance preset
   */
  applyPreset(preset: 'lowEnd' | 'midRange' | 'highEnd') {
    const presetSettings = PERFORMANCE_PRESETS[preset];
    this.updateSettings(presetSettings as Partial<AdvancedSettings>);
  }

  /**
   * Reset to defaults
   */
  resetToDefaults() {
    this.settings = { ...DEFAULT_ADVANCED_SETTINGS };
    this.saveSettings();
  }

  /**
   * Subscribe to changes
   */
  subscribe(listener: (settings: AdvancedSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners
   */
  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.getSettings()));
  }

  /**
   * Get memory buffer configuration
   */
  getMemoryBufferConfig(): MemoryBufferConfig {
    return { ...this.settings.memoryBuffer };
  }

  /**
   * Calculate estimated memory usage
   */
  estimateMemoryUsage(): {
    contextMemory: number;
    cacheMemory: number;
    bufferMemory: number;
    totalMemory: number;
  } {
    const contextMemory = (this.settings.contextLimit.maxContextTokens * 0.5) / 1024; // Rough estimate: ~0.5KB per token
    const cacheMemory = this.settings.modelCache.maxSize;
    const bufferMemory = this.settings.memoryBuffer.size;
    const totalMemory = contextMemory + cacheMemory + bufferMemory;

    return { contextMemory, cacheMemory, bufferMemory, totalMemory };
  }

  /**
   * Validate settings
   */
  validateSettings(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.settings.contextLimit.maxContextTokens < 1000) {
      errors.push('Max context tokens should be at least 1000');
    }

    if (this.settings.contextLimit.maxRequestTokens > this.settings.contextLimit.maxContextTokens) {
      errors.push('Max request tokens cannot exceed max context tokens');
    }

    if (this.settings.modelCache.maxSize < 512) {
      errors.push('Model cache size should be at least 512MB');
    }

    if (this.settings.dataRetention.retentionDays < 1) {
      errors.push('Retention days must be at least 1');
    }

    if (this.settings.performanceTuning.maxParallelTasks < 1) {
      errors.push('Max parallel tasks must be at least 1');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export settings as JSON
   */
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings from JSON
   */
  importSettings(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      const validation = this.validateSettings();
      if (!validation.valid) {
        console.error('Invalid settings:', validation.errors);
        return false;
      }
      this.updateSettings(parsed);
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }

  /**
   * Get memory buffer setup instructions
   */
  getMemoryBufferInstructions(): string {
    const config = this.settings.memoryBuffer;
    const sizeMB = config.size;
    const sizeGB = (sizeMB / 1024).toFixed(1);

    if (config.type === 'zram') {
      return `
# Enable Zram buffer (${sizeGB}GB)
sudo modprobe zram
echo ${sizeMB}M | sudo tee /sys/block/zram0/disksize
sudo mkswap /dev/zram0
sudo swapon /dev/zram0
      `.trim();
    } else if (config.type === 'swap') {
      return `
# Create swap file (${sizeGB}GB)
sudo fallocate -l ${sizeGB}G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
      `.trim();
    } else {
      return `
# Hybrid setup: Zram + Swap
# First setup Zram (see above)
# Then setup Swap file (see above)
      `.trim();
    }
  }
}

/**
 * Create and export global advanced settings manager
 */
export const advancedSettings = new AdvancedSettingsManager();

/**
 * React hook for using advanced settings
 */
export function useAdvancedSettings() {
  const [settings, setSettings] = React.useState<AdvancedSettings>(advancedSettings.getSettings());

  React.useEffect(() => {
    return advancedSettings.subscribe(setSettings);
  }, []);

  return {
    settings,
    updateSettings: advancedSettings.updateSettings.bind(advancedSettings),
    applyPreset: advancedSettings.applyPreset.bind(advancedSettings),
    resetToDefaults: advancedSettings.resetToDefaults.bind(advancedSettings),
    estimateMemoryUsage: advancedSettings.estimateMemoryUsage.bind(advancedSettings),
    validateSettings: advancedSettings.validateSettings.bind(advancedSettings),
  };
}

// Import React for the hook
import React from 'react';
