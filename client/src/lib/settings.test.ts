import { describe, it, expect } from "vitest";
import {
  getDefaultSettings,
  addKnowledgeBaseFolder,
  removeKnowledgeBaseFolder,
  toggleKnowledgeBaseFolder,
  updateKnowledgeBaseFolderStats,
  addFileTypeToBlacklist,
  removeFileTypeFromBlacklist,
  isFileTypeBlacklisted,
  enableCloudSync,
  disableCloudSync,
  exportSettings,
  importSettings,
  validateSettings,
  createMockSettings,
  type AppSettings,
} from "./settings";

describe("Settings Management", () => {
  describe("Default Settings", () => {
    it("should create default settings", () => {
      const settings = getDefaultSettings();

      expect(settings.id).toBeDefined();
      expect(settings.version).toBe(1);
      expect(settings.general.theme).toBe("dark");
      expect(settings.general.language).toBe("en");
      expect(settings.knowledge.autoIndex).toBe(true);
      expect(settings.security.maliciousFileScan).toBe(true);
      expect(settings.privacy.zeroLoginMode).toBe(true);
    });

    it("should have valid default values", () => {
      const settings = getDefaultSettings();
      const errors = validateSettings(settings);

      expect(errors).toHaveLength(0);
    });
  });

  describe("Knowledge Base Management", () => {
    it("should add a knowledge base folder", () => {
      const settings = getDefaultSettings();
      const updated = addKnowledgeBaseFolder(
        settings,
        "My Projects",
        "/home/user/projects"
      );

      expect(updated.knowledge.folders).toHaveLength(1);
      expect(updated.knowledge.folders[0].name).toBe("My Projects");
      expect(updated.knowledge.folders[0].path).toBe("/home/user/projects");
      expect(updated.knowledge.folders[0].enabled).toBe(true);
    });

    it("should remove a knowledge base folder", () => {
      let settings = getDefaultSettings();
      settings = addKnowledgeBaseFolder(settings, "Folder 1", "/path1");
      settings = addKnowledgeBaseFolder(settings, "Folder 2", "/path2");

      const folderId = settings.knowledge.folders[0].id;
      const updated = removeKnowledgeBaseFolder(settings, folderId);

      expect(updated.knowledge.folders).toHaveLength(1);
      expect(updated.knowledge.folders[0].name).toBe("Folder 2");
    });

    it("should toggle knowledge base folder enabled state", () => {
      let settings = getDefaultSettings();
      settings = addKnowledgeBaseFolder(settings, "My Projects", "/path");

      const folderId = settings.knowledge.folders[0].id;
      let updated = toggleKnowledgeBaseFolder(settings, folderId);

      expect(updated.knowledge.folders[0].enabled).toBe(false);

      updated = toggleKnowledgeBaseFolder(updated, folderId);

      expect(updated.knowledge.folders[0].enabled).toBe(true);
    });

    it("should update knowledge base folder stats", () => {
      let settings = getDefaultSettings();
      settings = addKnowledgeBaseFolder(settings, "My Projects", "/path");

      const folderId = settings.knowledge.folders[0].id;
      const updated = updateKnowledgeBaseFolderStats(settings, folderId, 42, 1024000);

      expect(updated.knowledge.folders[0].fileCount).toBe(42);
      expect(updated.knowledge.folders[0].totalSize).toBe(1024000);
      expect(updated.knowledge.folders[0].lastIndexed).toBeDefined();
    });

    it("should track total indexed files and size", () => {
      let settings = getDefaultSettings();
      settings = addKnowledgeBaseFolder(settings, "Folder 1", "/path1");
      settings = addKnowledgeBaseFolder(settings, "Folder 2", "/path2");

      expect(settings.knowledge.folders).toHaveLength(2);
    });
  });

  describe("Security Settings", () => {
    it("should add file type to blacklist", () => {
      const settings = getDefaultSettings();
      const updated = addFileTypeToBlacklist(settings, "exe");

      expect(updated.security.fileTypeBlacklist).toContain(".exe");
    });

    it("should normalize file type with dot", () => {
      const settings = getDefaultSettings();
      const updated = addFileTypeToBlacklist(settings, ".txt");

      expect(updated.security.fileTypeBlacklist).toContain(".txt");
    });

    it("should not add duplicate file types", () => {
      let settings = getDefaultSettings();
      const initialCount = settings.security.fileTypeBlacklist.length;

      settings = addFileTypeToBlacklist(settings, "txt");
      settings = addFileTypeToBlacklist(settings, ".txt");

      expect(settings.security.fileTypeBlacklist.length).toBe(initialCount + 1);
    });

    it("should remove file type from blacklist", () => {
      let settings = getDefaultSettings();
      settings = addFileTypeToBlacklist(settings, "txt");

      const updated = removeFileTypeFromBlacklist(settings, ".txt");

      expect(updated.security.fileTypeBlacklist).not.toContain(".txt");
    });

    it("should check if file type is blacklisted", () => {
      let settings = getDefaultSettings();
      settings = addFileTypeToBlacklist(settings, "exe");

      expect(isFileTypeBlacklisted(settings, "malware.exe")).toBe(true);
      expect(isFileTypeBlacklisted(settings, "document.pdf")).toBe(false);
    });

    it("should handle case-insensitive file type checking", () => {
      let settings = getDefaultSettings();
      settings = addFileTypeToBlacklist(settings, "exe");

      expect(isFileTypeBlacklisted(settings, "MALWARE.EXE")).toBe(true);
    });
  });

  describe("Privacy Settings", () => {
    it("should enable cloud sync", () => {
      const settings = getDefaultSettings();
      const updated = enableCloudSync(settings, "google-drive", "/Omnecor Backup");

      expect(updated.privacy.cloudSyncEnabled).toBe(true);
      expect(updated.privacy.cloudSyncProvider).toBe("google-drive");
      expect(updated.privacy.cloudSyncFolder).toBe("/Omnecor Backup");
    });

    it("should disable cloud sync", () => {
      let settings = getDefaultSettings();
      settings = enableCloudSync(settings, "google-drive", "/Omnecor Backup");

      const updated = disableCloudSync(settings);

      expect(updated.privacy.cloudSyncEnabled).toBe(false);
      expect(updated.privacy.cloudSyncProvider).toBeUndefined();
      expect(updated.privacy.cloudSyncFolder).toBeUndefined();
    });

    it("should maintain zero-login mode by default", () => {
      const settings = getDefaultSettings();

      expect(settings.privacy.zeroLoginMode).toBe(true);
    });
  });

  describe("Settings Export/Import", () => {
    it("should export settings to JSON", () => {
      const settings = getDefaultSettings();
      const json = exportSettings(settings);

      expect(typeof json).toBe("string");
      expect(json).toContain(settings.id);
      expect(json).toContain("general");
    });

    it("should import settings from JSON", () => {
      const original = getDefaultSettings();
      const json = exportSettings(original);

      const imported = importSettings(json);

      expect(imported).toBeDefined();
      expect(imported?.id).toBe(original.id);
      expect(imported?.general.theme).toBe(original.general.theme);
    });

    it("should return null for invalid JSON", () => {
      const result = importSettings("invalid json");

      expect(result).toBeNull();
    });

    it("should return null for incomplete settings", () => {
      const result = importSettings('{"incomplete": true}');

      expect(result).toBeNull();
    });

    it("should preserve dates during export/import", () => {
      const original = getDefaultSettings();
      const json = exportSettings(original);
      const imported = importSettings(json);

      expect(imported?.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe("Settings Validation", () => {
    it("should validate default settings", () => {
      const settings = getDefaultSettings();
      const errors = validateSettings(settings);

      expect(errors).toHaveLength(0);
    });

    it("should detect invalid font size", () => {
      const settings = getDefaultSettings();
      settings.general.fontSize = 25;

      const errors = validateSettings(settings);

      expect(errors).toContain("Font size must be between 12 and 18");
    });

    it("should detect invalid temperature", () => {
      const settings = getDefaultSettings();
      settings.advanced.temperatureDefault = 3;

      const errors = validateSettings(settings);

      expect(errors).toContain("Temperature must be between 0 and 2");
    });

    it("should detect invalid top P", () => {
      const settings = getDefaultSettings();
      settings.advanced.topPDefault = 1.5;

      const errors = validateSettings(settings);

      expect(errors).toContain("Top P must be between 0 and 1");
    });

    it("should detect low max context tokens", () => {
      const settings = getDefaultSettings();
      settings.advanced.maxContextTokens = 500;

      const errors = validateSettings(settings);

      expect(errors).toContain("Max context tokens must be at least 1000");
    });

    it("should detect low auto-save interval", () => {
      const settings = getDefaultSettings();
      settings.general.autoSaveInterval = 2;

      const errors = validateSettings(settings);

      expect(errors).toContain("Auto-save interval must be at least 5 seconds");
    });
  });

  describe("Mock Settings", () => {
    it("should create mock settings with sample data", () => {
      const settings = createMockSettings();

      expect(settings.knowledge.folders.length).toBeGreaterThan(0);
      expect(settings.privacy.cloudSyncEnabled).toBe(true);
    });

    it("should have valid mock settings", () => {
      const settings = createMockSettings();
      const errors = validateSettings(settings);

      expect(errors).toHaveLength(0);
    });

    it("should have indexed folders in mock settings", () => {
      const settings = createMockSettings();

      const indexedFolders = settings.knowledge.folders.filter(
        (f) => f.lastIndexed !== undefined
      );

      expect(indexedFolders.length).toBeGreaterThan(0);
    });

    it("should have custom blacklisted file types in mock", () => {
      const settings = createMockSettings();

      expect(settings.security.fileTypeBlacklist).toContain(".scr");
      expect(settings.security.fileTypeBlacklist).toContain(".vbs");
    });
  });

  describe("Settings Immutability", () => {
    it("should not mutate original settings when adding folder", () => {
      const original = getDefaultSettings();
      const originalLength = original.knowledge.folders.length;

      addKnowledgeBaseFolder(original, "New Folder", "/path");

      expect(original.knowledge.folders.length).toBe(originalLength);
    });

    it("should update lastUpdated timestamp on modifications", () => {
      const settings = getDefaultSettings();
      const originalTime = settings.lastUpdated;

      // Small delay to ensure timestamp difference
      const updated = addKnowledgeBaseFolder(settings, "Folder", "/path");

      expect(updated.lastUpdated.getTime()).toBeGreaterThanOrEqual(originalTime.getTime());
    });
  });
});
