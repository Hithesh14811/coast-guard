import { X, AlertTriangle, CheckCircle2, Info, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Alert } from "@shared/schema";

interface AlertBannerProps {
  alert: Alert;
  onDismiss?: () => void;
}

const alertIcons = {
  signal_lost: AlertTriangle,
  drift_complete: Radar,
  info: Info,
  success: CheckCircle2,
};

const alertStyles = {
  signal_lost: "bg-danger/10 border-danger text-danger",
  drift_complete: "bg-drift/10 border-drift text-drift",
  info: "bg-ocean/10 border-ocean text-ocean-dark dark:text-ocean",
  success: "bg-live/10 border-live text-live",
};

export function AlertBanner({ alert, onDismiss }: AlertBannerProps) {
  const alertType = alert.type as keyof typeof alertIcons;
  const Icon = alertIcons[alertType] || Info;
  const style = alertStyles[alertType] || alertStyles.info;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 border-l-4 rounded-r-lg ${style}`}
      role="alert"
      data-testid={`alert-${alert.type}-${alert.id}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{alert.message}</p>
        <p className="text-xs opacity-70">{formatTime(alert.timestamp)}</p>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0 opacity-70 hover:opacity-100"
          onClick={onDismiss}
          data-testid={`button-dismiss-alert-${alert.id}`}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface AlertStackProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
  maxVisible?: number;
}

export function AlertStack({ alerts, onDismiss, maxVisible = 3 }: AlertStackProps) {
  const visibleAlerts = alerts.slice(0, maxVisible);

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="alert-stack">
      {visibleAlerts.map((alert) => (
        <AlertBanner
          key={alert.id}
          alert={alert}
          onDismiss={onDismiss ? () => onDismiss(alert.id) : undefined}
        />
      ))}
      {alerts.length > maxVisible && (
        <p className="text-xs text-muted-foreground text-center">
          +{alerts.length - maxVisible} more alerts
        </p>
      )}
    </div>
  );
}
