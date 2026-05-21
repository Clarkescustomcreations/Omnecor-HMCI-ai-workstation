import OmnecorDashboardLayout from "@/components/CortexDashboardLayout";
import SettingsPanel from "@/components/SettingsPanel";
import { Settings } from "lucide-react";

/**
 * Settings Page
 * 
 * Comprehensive settings interface with:
 * - General preferences (theme, language, behavior)
 * - Knowledge base management (folder import, indexing)
 * - Security settings (file scanning, encryption, blacklist)
 * - Privacy settings (zero-login, cloud sync, telemetry)
 * - Advanced configuration (AI model defaults, developer options)
 */
export default function SettingsPage() {
  return (
    <OmnecorDashboardLayout>
      <div className="h-full flex flex-col bg-background">
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-accent" />
            <div>
              <h1 className="text-xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configuration and preferences for Omnecor
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <SettingsPanel />
        </div>
      </div>
    </OmnecorDashboardLayout>
  );
}
