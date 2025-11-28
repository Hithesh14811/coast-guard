import { Badge } from "@/components/ui/badge";
import { Signal, SignalZero, Radar } from "lucide-react";
import type { TrackingMode } from "@shared/schema";

interface StatusBadgeProps {
  mode: TrackingMode;
  isConnected: boolean;
  className?: string;
}

export function StatusBadge({ mode, isConnected, className = "" }: StatusBadgeProps) {
  if (mode === "live") {
    return (
      <Badge
        className={`h-10 px-6 text-sm font-bold uppercase tracking-wide bg-live text-live-foreground border-0 gap-2 ${className}`}
        data-testid="badge-status-live"
      >
        <Signal className="h-4 w-4" />
        <span>Live Mode</span>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
      </Badge>
    );
  }

  return (
    <Badge
      className={`h-10 px-6 text-sm font-bold uppercase tracking-wide bg-drift text-drift-foreground border-0 gap-2 ${className}`}
      data-testid="badge-status-drift"
    >
      <Radar className="h-4 w-4" />
      <span>Drift Mode</span>
    </Badge>
  );
}

interface ConnectionBadgeProps {
  isConnected: boolean;
  className?: string;
}

export function ConnectionBadge({ isConnected, className = "" }: ConnectionBadgeProps) {
  if (isConnected) {
    return (
      <Badge
        className={`h-16 px-6 text-base font-semibold bg-live/10 text-live border-2 border-live/30 gap-3 ${className}`}
        data-testid="badge-connection-online"
      >
        <Signal className="h-6 w-6" />
        <span>Connected</span>
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-live"></span>
        </span>
      </Badge>
    );
  }

  return (
    <Badge
      className={`h-16 px-6 text-base font-semibold bg-danger/10 text-danger border-2 border-danger/30 gap-3 ${className}`}
      data-testid="badge-connection-offline"
    >
      <SignalZero className="h-6 w-6" />
      <span>Not Connected</span>
    </Badge>
  );
}
