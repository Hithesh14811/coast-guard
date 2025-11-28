import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wind, Waves, Navigation, RefreshCw, Loader2, ExternalLink } from "lucide-react";
import type { MarineWeatherData } from "@shared/schema";

interface MarineWeatherCardProps {
  data: MarineWeatherData | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  lastFetched?: Date | null;
  className?: string;
}

export function MarineWeatherCard({
  data,
  isLoading = false,
  onRefresh,
  lastFetched,
  className = "",
}: MarineWeatherCardProps) {
  const formatDirection = (degrees: number) => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-base font-semibold">Marine Weather</CardTitle>
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onRefresh}
            disabled={isLoading}
            data-testid="button-refresh-weather"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {data ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wind className="h-4 w-4" />
                  <span className="text-xs">Wind</span>
                </div>
                <p className="text-lg font-medium" data-testid="text-wind-speed">
                  {data.windSpeed.toFixed(1)} km/h
                </p>
                <p className="text-xs text-muted-foreground" data-testid="text-wind-direction">
                  {formatDirection(data.windDirection)} ({data.windDirection.toFixed(0)}°)
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Waves className="h-4 w-4" />
                  <span className="text-xs">Waves</span>
                </div>
                <p className="text-lg font-medium" data-testid="text-wave-height">
                  {data.waveHeight.toFixed(1)} m
                </p>
                <p className="text-xs text-muted-foreground">Height</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Navigation className="h-4 w-4" />
                <span className="text-xs">Ocean Current</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-lg font-medium" data-testid="text-current-speed">
                  {data.currentSpeed.toFixed(2)} m/s
                </p>
                <p className="text-xs text-muted-foreground" data-testid="text-current-direction">
                  {formatDirection(data.currentDirection)} ({data.currentDirection.toFixed(0)}°)
                </p>
              </div>
            </div>
            {lastFetched && (
              <p className="text-xs text-muted-foreground">
                Last updated: {formatTime(lastFetched)}
              </p>
            )}
            <div className="pt-2 border-t mt-3">
              <a
                href="https://open-meteo.com/en/docs/marine-weather-api"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-ocean hover:underline"
                data-testid="link-weather-source"
              >
                <ExternalLink className="h-3 w-3" />
                Data from Open-Meteo Marine API
              </a>
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {isLoading ? "Loading weather data..." : "No weather data available"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
