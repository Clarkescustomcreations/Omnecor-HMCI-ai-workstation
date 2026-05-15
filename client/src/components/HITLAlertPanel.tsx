import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HITLAlert } from "@/lib/actionHashDetector";

interface HITLAlertPanelProps {
  alert: HITLAlert;
  onRetry?: () => void;
  onModify?: () => void;
  onAbort?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * HITL Alert Panel Component
 * 
 * Displays human-in-the-loop alerts for loop detection.
 * Non-dismissible without explicit user action (retry, modify, or abort).
 * 
 * Features:
 * - Clear alert title and message
 * - Action history context
 * - Three action options: Retry, Modify, Abort
 * - Severity indicator
 */
export default function HITLAlertPanel({
  alert,
  onRetry,
  onModify,
  onAbort,
  onDismiss,
  className,
}: HITLAlertPanelProps) {
  const [selectedAction, setSelectedAction] = useState<"retry" | "modify" | "abort" | null>(null);

  const getSeverityIcon = () => {
    switch (alert.severity) {
      case "critical":
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      default:
        return <AlertCircle className="w-6 h-6 text-blue-500" />;
    }
  };

  const getSeverityColor = () => {
    switch (alert.severity) {
      case "critical":
        return "bg-red-500/10 border-red-500/30";
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/30";
      default:
        return "bg-blue-500/10 border-blue-500/30";
    }
  };

  const handleAction = (action: "retry" | "modify" | "abort") => {
    setSelectedAction(action);

    switch (action) {
      case "retry":
        onRetry?.();
        break;
      case "modify":
        onModify?.();
        break;
      case "abort":
        onAbort?.();
        break;
    }
  };

  return (
    <Card className={cn("border-2", getSeverityColor(), className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {getSeverityIcon()}
            <div className="flex-1">
              <CardTitle className="text-lg">{alert.title}</CardTitle>
              <CardDescription className="mt-1 text-sm">{alert.message}</CardDescription>
            </div>
          </div>
          <Badge
            variant={alert.severity === "critical" ? "destructive" : "secondary"}
            className="text-xs"
          >
            {alert.severity.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Action History Context */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Recent Action History</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto bg-muted/50 rounded-lg p-2">
            {alert.actionHistory.map((action, index) => (
              <div key={action.hash} className="text-xs font-mono text-muted-foreground">
                <span className="text-accent">#{index + 1}</span> {action.tool} •{" "}
                <span className="text-foreground">{action.hash.substring(0, 8)}...</span> •{" "}
                {action.timestamp.toLocaleTimeString()}
              </div>
            ))}
          </div>
        </div>

        {/* Alert Details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-muted">
            <p className="text-muted-foreground mb-1">Alert ID</p>
            <p className="font-mono truncate">{alert.id.substring(0, 16)}...</p>
          </div>
          <div className="p-2 rounded-lg bg-muted">
            <p className="text-muted-foreground mb-1">Triggered</p>
            <p className="font-mono">{alert.timestamp.toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {alert.userActions.retry && (
            <Button
              variant={selectedAction === "retry" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => handleAction("retry")}
              disabled={alert.resolved && selectedAction !== "retry"}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Retry
            </Button>
          )}
          {alert.userActions.modify && (
            <Button
              variant={selectedAction === "modify" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => handleAction("modify")}
              disabled={alert.resolved && selectedAction !== "modify"}
            >
              ✏️ Modify
            </Button>
          )}
          {alert.userActions.abort && (
            <Button
              variant={selectedAction === "abort" ? "destructive" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => handleAction("abort")}
              disabled={alert.resolved && selectedAction !== "abort"}
            >
              <X className="w-4 h-4 mr-2" />
              Abort
            </Button>
          )}
        </div>

        {/* Resolution Status */}
        {alert.resolved && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-xs text-green-700 dark:text-green-400">
              ✓ Alert resolved with action: <span className="font-semibold">{alert.userDecision}</span>
            </p>
          </div>
        )}

        {/* Warning */}
        <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            ⚠️ This alert cannot be dismissed until you take action. Choose Retry, Modify, or Abort.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
