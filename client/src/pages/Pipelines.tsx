import CortexDashboardLayout from "@/components/CortexDashboardLayout";
import SpecializedModuleLauncher from "@/components/SpecializedModuleLauncher";
import { Zap } from "lucide-react";

/**
 * Pipelines Page - Specialized Module Launchers
 * 
 * Provides access to three specialized tools:
 * 1. Custom LLM Builder - Fine-tuning with LoRA/QLoRA
 * 2. AI-Assisted 3D Modeler - Blender co-pilot
 * 3. AI-Assisted PCB Designer - KiCad co-pilot
 */
export default function Pipelines() {
  return (
    <CortexDashboardLayout>
      <div className="h-full flex flex-col bg-background">
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-accent" />
            <div>
              <h1 className="text-xl font-bold">Specialized Modules</h1>
              <p className="text-sm text-muted-foreground">
                Advanced tools for AI-assisted workflows
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <SpecializedModuleLauncher />
        </div>
      </div>
    </CortexDashboardLayout>
  );
}
