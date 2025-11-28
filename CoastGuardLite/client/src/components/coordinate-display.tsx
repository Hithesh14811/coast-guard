import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface CoordinateDisplayProps {
  lat: number | null;
  lng: number | null;
  label?: string;
  showCopy?: boolean;
  className?: string;
}

export function CoordinateDisplay({
  lat,
  lng,
  label = "Coordinates",
  showCopy = true,
  className = "",
}: CoordinateDisplayProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const formatCoord = (value: number | null, isLat: boolean) => {
    if (value === null) return "—";
    const direction = isLat ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
    return `${Math.abs(value).toFixed(6)}° ${direction}`;
  };

  const handleCopy = async () => {
    if (lat === null || lng === null) return;

    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Coordinates copied",
      description: text,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {(label || showCopy) && (
        <div className="flex items-center justify-between gap-4">
          {label && <span className="text-sm font-medium text-muted-foreground">{label}</span>}
          {showCopy && lat !== null && lng !== null && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 ml-auto"
              onClick={handleCopy}
              data-testid="button-copy-coordinates"
            >
              {copied ? (
                <Check className="h-4 w-4 text-live" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Latitude</span>
          <p
            className="text-xl font-mono font-medium tabular-nums"
            data-testid="text-latitude"
          >
            {formatCoord(lat, true)}
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Longitude</span>
          <p
            className="text-xl font-mono font-medium tabular-nums"
            data-testid="text-longitude"
          >
            {formatCoord(lng, false)}
          </p>
        </div>
      </div>
    </div>
  );
}
