import { describe, it, expect } from "vitest";
import {
  getIntegrationInfo,
  createIntegration,
  connectIntegration,
  disconnectIntegration,
  updateSyncStatus,
  createIntegrationAction,
  updateIntegrationAction,
  createGitHubIntegration,
  createNotionIntegration,
  createSlackIntegration,
  createCloudStorageIntegration,
  createMockGitHubIntegration,
  createMockNotionIntegration,
  createMockSlackIntegration,
  createMockGoogleDriveIntegration,
} from "./integrations";

describe("Third-Party Integrations", () => {
  describe("Integration Info", () => {
    it("should get GitHub integration info", () => {
      const info = getIntegrationInfo("github");

      expect(info.title).toBe("GitHub");
      expect(info.description).toBeDefined();
      expect(info.icon).toBe("🐙");
      expect(info.scope.length).toBeGreaterThan(0);
    });

    it("should get Notion integration info", () => {
      const info = getIntegrationInfo("notion");

      expect(info.title).toBe("Notion");
      expect(info.icon).toBe("📝");
    });

    it("should get Slack integration info", () => {
      const info = getIntegrationInfo("slack");

      expect(info.title).toBe("Slack");
      expect(info.icon).toBe("💬");
    });

    it("should get cloud storage integration info", () => {
      const gdrive = getIntegrationInfo("google-drive");
      const dropbox = getIntegrationInfo("dropbox");
      const onedrive = getIntegrationInfo("onedrive");

      expect(gdrive.title).toBe("Google Drive");
      expect(dropbox.title).toBe("Dropbox");
      expect(onedrive.title).toBe("OneDrive");
    });
  });

  describe("Integration Creation", () => {
    it("should create a basic integration", () => {
      const integration = createIntegration("github", "GitHub", "My GitHub account");

      expect(integration.id).toBeDefined();
      expect(integration.type).toBe("github");
      expect(integration.name).toBe("GitHub");
      expect(integration.isConnected).toBe(false);
      expect(integration.syncStatus).toBe("idle");
    });

    it("should create GitHub integration", () => {
      const integration = createGitHubIntegration();

      expect(integration.type).toBe("github");
      expect(integration.repositories).toEqual([]);
    });

    it("should create Notion integration", () => {
      const integration = createNotionIntegration();

      expect(integration.type).toBe("notion");
      expect(integration.databases).toEqual([]);
    });

    it("should create Slack integration", () => {
      const integration = createSlackIntegration();

      expect(integration.type).toBe("slack");
      expect(integration.workspaces).toEqual([]);
    });

    it("should create cloud storage integrations", () => {
      const gdrive = createCloudStorageIntegration("google-drive");
      const dropbox = createCloudStorageIntegration("dropbox");

      expect(gdrive.type).toBe("google-drive");
      expect(dropbox.type).toBe("dropbox");
      expect(gdrive.storageQuota).toBeDefined();
    });
  });

  describe("Integration Connection", () => {
    it("should connect an integration", () => {
      let integration = createIntegration("github", "GitHub", "Test");

      integration = connectIntegration(
        integration,
        {
          username: "testuser",
          email: "test@example.com",
          id: "user_123",
        },
        {
          id: "token_1",
          accessToken: "test_token",
          expiresAt: new Date(),
          tokenType: "bearer",
          scope: ["repo"],
        }
      );

      expect(integration.isConnected).toBe(true);
      expect(integration.account?.username).toBe("testuser");
      expect(integration.token?.accessToken).toBe("test_token");
      expect(integration.syncStatus).toBe("success");
    });

    it("should disconnect an integration", () => {
      let integration = createIntegration("github", "GitHub", "Test");

      integration = connectIntegration(
        integration,
        {
          username: "testuser",
          id: "user_123",
        },
        {
          id: "token_1",
          accessToken: "test_token",
          expiresAt: new Date(),
          tokenType: "bearer",
          scope: ["repo"],
        }
      );

      integration = disconnectIntegration(integration);

      expect(integration.isConnected).toBe(false);
      expect(integration.account).toBeUndefined();
      expect(integration.token).toBeUndefined();
    });
  });

  describe("Sync Status", () => {
    it("should update sync status to syncing", () => {
      let integration = createIntegration("github", "GitHub", "Test");

      integration = updateSyncStatus(integration, "syncing");

      expect(integration.syncStatus).toBe("syncing");
    });

    it("should update sync status to success", () => {
      let integration = createIntegration("github", "GitHub", "Test");

      integration = updateSyncStatus(integration, "success");

      expect(integration.syncStatus).toBe("success");
      expect(integration.lastSynced).toBeDefined();
    });

    it("should update sync status to error with message", () => {
      let integration = createIntegration("github", "GitHub", "Test");

      integration = updateSyncStatus(integration, "error", "Connection timeout");

      expect(integration.syncStatus).toBe("error");
      expect(integration.error).toBe("Connection timeout");
    });
  });

  describe("Integration Actions", () => {
    it("should create an integration action", () => {
      const action = createIntegrationAction("int_123", "sync");

      expect(action.id).toBeDefined();
      expect(action.integrationId).toBe("int_123");
      expect(action.type).toBe("sync");
      expect(action.status).toBe("pending");
      expect(action.progress).toBe(0);
    });

    it("should update integration action to in_progress", () => {
      let action = createIntegrationAction("int_123", "sync");

      action = updateIntegrationAction(action, "in_progress", 50);

      expect(action.status).toBe("in_progress");
      expect(action.progress).toBe(50);
    });

    it("should complete integration action", () => {
      let action = createIntegrationAction("int_123", "sync");

      action = updateIntegrationAction(
        action,
        "completed",
        100,
        { itemsSync: 42 }
      );

      expect(action.status).toBe("completed");
      expect(action.progress).toBe(100);
      expect(action.result?.itemsSync).toBe(42);
      expect(action.completedAt).toBeDefined();
    });

    it("should fail integration action", () => {
      let action = createIntegrationAction("int_123", "sync");

      action = updateIntegrationAction(
        action,
        "failed",
        0,
        undefined,
        "Network error"
      );

      expect(action.status).toBe("failed");
      expect(action.error).toBe("Network error");
      expect(action.completedAt).toBeDefined();
    });
  });

  describe("Mock Data", () => {
    it("should create mock GitHub integration", () => {
      const integration = createMockGitHubIntegration();

      expect(integration.isConnected).toBe(true);
      expect(integration.account?.username).toBe("cortex-user");
      expect(integration.repositories?.length).toBeGreaterThan(0);
      expect(integration.repositories?.[0].name).toBe("cortex-ai-workstation");
    });

    it("should create mock Notion integration", () => {
      const integration = createMockNotionIntegration();

      expect(integration.isConnected).toBe(true);
      expect(integration.databases?.length).toBeGreaterThan(0);
      expect(integration.databases?.[0].title).toBe("Project Plans");
    });

    it("should create mock Slack integration", () => {
      const integration = createMockSlackIntegration();

      expect(integration.isConnected).toBe(true);
      expect(integration.workspaces?.length).toBeGreaterThan(0);
      expect(integration.workspaces?.[0].channels.length).toBeGreaterThan(0);
    });

    it("should create mock Google Drive integration", () => {
      const integration = createMockGoogleDriveIntegration();

      expect(integration.isConnected).toBe(true);
      expect(integration.account?.email).toBe("cortex.user@gmail.com");
      expect(integration.storageQuota?.used).toBeGreaterThan(0);
      expect(integration.storageQuota?.total).toBeGreaterThan(integration.storageQuota?.used);
    });
  });

  describe("Token Management", () => {
    it("should have valid token in connected integration", () => {
      const integration = createMockGitHubIntegration();

      expect(integration.token).toBeDefined();
      expect(integration.token?.accessToken).toBeDefined();
      expect(integration.token?.expiresAt).toBeInstanceOf(Date);
      expect(integration.token?.scope.length).toBeGreaterThan(0);
    });

    it("should have refresh token for long-lived integrations", () => {
      const integration = createMockGoogleDriveIntegration();

      expect(integration.token?.refreshToken).toBeDefined();
    });
  });
});
