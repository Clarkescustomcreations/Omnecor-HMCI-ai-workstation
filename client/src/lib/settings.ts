/**
 * Settings Management Library
 * 
 * Handles all application settings including:
 * - Knowledge base management
 * - Security and privacy settings
 * - General preferences
 * - Advanced configuration
 */

import { nanoid } from "nanoid";

// ============================================================================
// KNOWLEDGE BASE TYPES
// ============================================================================

export interface KnowledgeBaseFolder {
  id: string;
  name: string;
  path: string;
  fileCount: number;
  totalSize: number; // in bytes
  lastIndexed?: Date;
  enabled: boolean;
}

export interface KnowledgeBaseSettings {
  folders: KnowledgeBaseFolder[];
  autoIndex: boolean;
  indexInterval: number; // in minutes
  maxFileSize: number; // in MB
  supportedFileTypes: string[];
  excludePatterns: string[];
  lastFullIndex?: Date;
  totalIndexedFiles: number;
  totalIndexSize: number; // in bytes
}

// ============================================================================
// SECURITY SETTINGS TYPES
// ============================================================================

export interface SecuritySettings {
  fileTypeBlacklist: string[];
  maliciousFileScan: boolean;
  scanOnUpload: boolean;
  quarantineLocation: string;
  encryptionEnabled: boolean;
  encryptionKeyPath?: string;
  apiKeyEncryption: boolean;
  sessionTimeout: number; // in minutes
  requireConfirmation: boolean;
  confirmationThreshold: string; // "low" | "medium" | "high"
}

// ============================================================================
// PRIVACY SETTINGS TYPES
// ============================================================================

export interface PrivacySettings {
  zeroLoginMode: boolean;
  cloudSyncEnabled: boolean;
  cloudSyncProvider?: string;
  cloudSyncFolder?: string;
  dataRetention: number; // in days
  telemetryEnabled: boolean;
  crashReportsEnabled: boolean;
  analyticsEnabled: boolean;
  shareUsageData: boolean;
}

// ============================================================================
// GENERAL SETTINGS TYPES
// ============================================================================

export interface GeneralSettings {
  theme: "dark" | "light" | "auto";
  language: string;
  fontSize: number; // 12-18
  autoSave: boolean;
  autoSaveInterval: number; // in seconds
  defaultModel: string;
  defaultProvider: string;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  startupBehavior: "last-session" | "blank" | "dashboard";
}

// ============================================================================
// ADVANCED SETTINGS TYPES
// ============================================================================

export interface AdvancedSettings {
  debugMode: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
  enableDevTools: boolean;
  cacheEnabled: boolean;
  cacheSizeLimit: number; // in MB
  maxContextTokens: number;
  maxResponseTokens: number;
  temperatureDefault: number; // 0-2
  topPDefault: number; // 0-1
  frequencyPenalty: number; // -2 to 2
  presencePenalty: number; // -2 to 2
  enableExperimentalFeatures: boolean;
}

// ============================================================================
// COMPLETE SETTINGS OBJECT
// ============================================================================

export interface AppSettings {
  id: string;
  version: number;
  lastUpdated: Date;
  general: GeneralSettings;
  knowledge: KnowledgeBaseSettings;
  security: SecuritySettings;
  privacy: PrivacySettings;
  advanced: AdvancedSettings;
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export function getDefaultSettings(): AppSettings {
  return {
    id: nanoid(),
    version: 1,
    lastUpdated: new Date(),
    general: {
      theme: "dark",
      language: "en",
      fontSize: 14,
      autoSave: true,
      autoSaveInterval: 30,
      defaultModel: "gpt-4o",
      defaultProvider: "openai",
      notificationsEnabled: true,
      soundEnabled: true,
      startupBehavior: "last-session",
    },
    knowledge: {
      folders: [],
      autoIndex: true,
      indexInterval: 60,
      maxFileSize: 100,
      supportedFileTypes: [
        ".md",
        ".txt",
        ".pdf",
        ".json",
        ".yaml",
        ".yml",
        ".py",
        ".js",
        ".ts",
        ".tsx",
        ".jsx",
        ".html",
        ".css",
        ".sql",
        ".sh",
        ".bash",
      ],
      excludePatterns: ["node_modules", ".git", "__pycache__", ".env"],
      totalIndexedFiles: 0,
      totalIndexSize: 0,
    },
    security: {
      fileTypeBlacklist: [".exe", ".dll", ".so", ".dylib", ".bin"],
      maliciousFileScan: true,
      scanOnUpload: true,
      quarantineLocation: "~/.cortex/quarantine",
      encryptionEnabled: false,
      apiKeyEncryption: true,
      sessionTimeout: 60,
      requireConfirmation: true,
      confirmationThreshold: "high",
    },
    privacy: {
      zeroLoginMode: true,
      cloudSyncEnabled: false,
      dataRetention: 90,
      telemetryEnabled: false,
      crashReportsEnabled: false,
      analyticsEnabled: false,
      shareUsageData: false,
    },
    advanced: {
      debugMode: false,
      logLevel: "info",
      enableDevTools: false,
      cacheEnabled: true,
      cacheSizeLimit: 500,
      maxContextTokens: 8000,
      maxResponseTokens: 2000,
      temperatureDefault: 0.7,
      topPDefault: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
      enableExperimentalFeatures: false,
    },
  };
}

// ============================================================================
// KNOWLEDGE BASE UTILITIES
// ============================================================================

export function addKnowledgeBaseFolder(
  settings: AppSettings,
  name: string,
  path: string
): AppSettings {
  const folder: KnowledgeBaseFolder = {
    id: nanoid(),
    name,
    path,
    fileCount: 0,
    totalSize: 0,
    enabled: true,
  };

  return {
    ...settings,
    knowledge: {
      ...settings.knowledge,
      folders: [...settings.knowledge.folders, folder],
    },
    lastUpdated: new Date(),
  };
}

export function removeKnowledgeBaseFolder(
  settings: AppSettings,
  folderId: string
): AppSettings {
  return {
    ...settings,
    knowledge: {
      ...settings.knowledge,
      folders: settings.knowledge.folders.filter((f) => f.id !== folderId),
    },
    lastUpdated: new Date(),
  };
}

export function toggleKnowledgeBaseFolder(
  settings: AppSettings,
  folderId: string
): AppSettings {
  return {
    ...settings,
    knowledge: {
      ...settings.knowledge,
      folders: settings.knowledge.folders.map((f) =>
        f.id === folderId ? { ...f, enabled: !f.enabled } : f
      ),
    },
    lastUpdated: new Date(),
  };
}

export function updateKnowledgeBaseFolderStats(
  settings: AppSettings,
  folderId: string,
  fileCount: number,
  totalSize: number
): AppSettings {
  return {
    ...settings,
    knowledge: {
      ...settings.knowledge,
      folders: settings.knowledge.folders.map((f) =>
        f.id === folderId
          ? { ...f, fileCount, totalSize, lastIndexed: new Date() }
          : f
      ),
    },
    lastUpdated: new Date(),
  };
}

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

export function addFileTypeToBlacklist(
  settings: AppSettings,
  fileType: string
): AppSettings {
  const normalized = fileType.startsWith(".") ? fileType : `.${fileType}`;

  if (settings.security.fileTypeBlacklist.includes(normalized)) {
    return settings;
  }

  return {
    ...settings,
    security: {
      ...settings.security,
      fileTypeBlacklist: [...settings.security.fileTypeBlacklist, normalized],
    },
    lastUpdated: new Date(),
  };
}

export function removeFileTypeFromBlacklist(
  settings: AppSettings,
  fileType: string
): AppSettings {
  const normalized = fileType.startsWith(".") ? fileType : `.${fileType}`;

  return {
    ...settings,
    security: {
      ...settings.security,
      fileTypeBlacklist: settings.security.fileTypeBlacklist.filter(
        (ft) => ft !== normalized
      ),
    },
    lastUpdated: new Date(),
  };
}

export function isFileTypeBlacklisted(
  settings: AppSettings,
  filePath: string
): boolean {
  const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
  return settings.security.fileTypeBlacklist.includes(ext);
}

// ============================================================================
// PRIVACY UTILITIES
// ============================================================================

export function enableCloudSync(
  settings: AppSettings,
  provider: string,
  folder: string
): AppSettings {
  return {
    ...settings,
    privacy: {
      ...settings.privacy,
      cloudSyncEnabled: true,
      cloudSyncProvider: provider,
      cloudSyncFolder: folder,
    },
    lastUpdated: new Date(),
  };
}

export function disableCloudSync(settings: AppSettings): AppSettings {
  return {
    ...settings,
    privacy: {
      ...settings.privacy,
      cloudSyncEnabled: false,
      cloudSyncProvider: undefined,
      cloudSyncFolder: undefined,
    },
    lastUpdated: new Date(),
  };
}

// ============================================================================
// SETTINGS EXPORT/IMPORT
// ============================================================================

export function exportSettings(settings: AppSettings): string {
  return JSON.stringify(settings, null, 2);
}

export function importSettings(jsonString: string): AppSettings | null {
  try {
    const parsed = JSON.parse(jsonString);
    // Validate structure
    if (!parsed.id || !parsed.general || !parsed.knowledge) {
      return null;
    }
    return {
      ...parsed,
      lastUpdated: new Date(parsed.lastUpdated),
    };
  } catch {
    return null;
  }
}

// ============================================================================
// SETTINGS VALIDATION
// ============================================================================

export function validateSettings(settings: AppSettings): string[] {
  const errors: string[] = [];

  if (settings.general.fontSize < 12 || settings.general.fontSize > 18) {
    errors.push("Font size must be between 12 and 18");
  }

  if (settings.advanced.temperatureDefault < 0 || settings.advanced.temperatureDefault > 2) {
    errors.push("Temperature must be between 0 and 2");
  }

  if (settings.advanced.topPDefault < 0 || settings.advanced.topPDefault > 1) {
    errors.push("Top P must be between 0 and 1");
  }

  if (settings.advanced.maxContextTokens < 1000) {
    errors.push("Max context tokens must be at least 1000");
  }

  if (settings.general.autoSaveInterval < 5) {
    errors.push("Auto-save interval must be at least 5 seconds");
  }

  return errors;
}

// ============================================================================
// MOCK SETTINGS
// ============================================================================

export function createMockSettings(): AppSettings {
  const settings = getDefaultSettings();

  // Add some mock knowledge base folders
  let updated = addKnowledgeBaseFolder(
    settings,
    "Omnecor Projects",
    "/home/user/cortex-projects"
  );
  updated = addKnowledgeBaseFolder(
    updated,
    "Research Papers",
    "/home/user/research"
  );
  updated = addKnowledgeBaseFolder(
    updated,
    "Code Samples",
    "/home/user/code"
  );

  // Update folder stats
  updated = updateKnowledgeBaseFolderStats(updated, updated.knowledge.folders[0].id, 42, 15728640); // 15 MB
  updated = updateKnowledgeBaseFolderStats(updated, updated.knowledge.folders[1].id, 28, 52428800); // 50 MB
  updated = updateKnowledgeBaseFolderStats(updated, updated.knowledge.folders[2].id, 156, 104857600); // 100 MB

  // Add some custom blacklisted file types
  updated = addFileTypeToBlacklist(updated, ".scr");
  updated = addFileTypeToBlacklist(updated, ".vbs");

  // Configure cloud sync
  updated = enableCloudSync(updated, "google-drive", "/Omnecor Backup");

  return updated;
}
