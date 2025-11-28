import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/status-badge";
import { CoordinateDisplay } from "@/components/coordinate-display";
import { AlertStack } from "@/components/alert-banner";
import { MarineWeatherCard } from "@/components/marine-weather-card";
import { SimulationControls } from "@/components/simulation-controls";
import { LeafletMap } from "@/components/map/leaflet-map";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Anchor,
  RefreshCw,
  Clock,
  User,
  AlertTriangle,
  Radar,
  Loader2,
  Menu,
  X,
  Search,
  Ship,
  MapPin,
  ArrowLeft,
  LogOut,
  Info,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { 
  TrackingMode, 
  Alert, 
  MarineWeatherData,
  DriftResult,
  FishermanWithState,
} from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [simulationHours, setSimulationHours] = useState(3);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPaths, setShowPaths] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFishermanId, setSelectedFishermanId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allFishermen = [], isLoading: isFishermenLoading } = useQuery<FishermanWithState[]>({
    queryKey: ["/api/fishermen", searchQuery],
    queryFn: async () => {
      const url = searchQuery 
        ? `/api/fishermen?search=${encodeURIComponent(searchQuery)}`
        : "/api/fishermen";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch fishermen");
      return res.json();
    },
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const selectedFisherman = allFishermen.find(f => f.fisherman.id === selectedFishermanId);
  const fishermanData = selectedFisherman ? {
    state: selectedFisherman.state,
    lastLocation: selectedFisherman.lastLocation,
  } : null;

  const { data: alerts = [], isLoading: isAlertsLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: autoRefresh ? 10000 : false,
  });

  // Get coordinates for weather
  const weatherLat = fishermanData?.lastLocation?.lat;
  const weatherLng = fishermanData?.lastLocation?.lng;

  const { 
    data: weatherData, 
    isLoading: isWeatherLoading,
    refetch: refetchWeather 
  } = useQuery<MarineWeatherData>({
    queryKey: ["/api/marine-weather", weatherLat, weatherLng],
    queryFn: async () => {
      if (weatherLat === undefined || weatherLat === null || weatherLng === undefined || weatherLng === null) return null;
      const res = await fetch(
        `/api/marine-weather?lat=${weatherLat}&lng=${weatherLng}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch weather");
      return res.json();
    },
    enabled: weatherLat !== undefined && weatherLat !== null && weatherLng !== undefined && weatherLng !== null,
  });

  const { data: driftResult } = useQuery<DriftResult>({
    queryKey: ["/api/drift-result", selectedFishermanId],
    queryFn: async () => {
      const res = await fetch(`/api/drift-result/${selectedFishermanId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedFishermanId && fishermanData?.state?.mode === "drift",
  });

  const runSimulationMutation = useMutation({
    mutationFn: async () => {
      const lat = fishermanData?.lastLocation?.lat;
      const lng = fishermanData?.lastLocation?.lng;
      
      if (lat === undefined || lat === null || lng === undefined || lng === null || !selectedFishermanId) {
        throw new Error("No location data");
      }
      
      return apiRequest("POST", "/api/simulation/run", {
        fishermanProfileId: selectedFishermanId,
        lastKnownLat: lat,
        lastKnownLng: lng,
        simulationHours,
        numPaths: 100,
      });
    },
    onSuccess: () => {
      toast({
        title: "Drift simulation complete",
        description: `Generated 100 paths over ${simulationHours} hours`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/drift-result"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
    onError: (error) => {
      toast({
        title: "Simulation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const triggerDriftModeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFishermanId) throw new Error("No fisherman selected");
      return apiRequest("POST", "/api/fisherman/trigger-drift", {
        fishermanProfileId: selectedFishermanId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Drift mode activated",
        description: "Signal loss triggered manually",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fishermen"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to trigger drift mode",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const exitDriftModeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFishermanId) throw new Error("No fisherman selected");
      return apiRequest("POST", "/api/fisherman/exit-drift", {
        fishermanProfileId: selectedFishermanId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Drift mode exited",
        description: "Now awaiting GPS signal from fisherman",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fishermen"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const dismissAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest("PATCH", `/api/alerts/${alertId}/dismiss`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const handleDismissAlert = useCallback((alertId: string) => {
    dismissAlertMutation.mutate(alertId);
  }, []);

  const mode: TrackingMode = fishermanData?.state?.mode || "live";
  const isConnected = fishermanData?.state?.status === "online";
  const lastLocation = fishermanData?.lastLocation;
  const lastUpdateTime = lastLocation?.timestamp ? new Date(lastLocation.timestamp) : null;

  const formatTimeSince = (date: Date | null) => {
    if (!date) return "—";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  const mapMarkers = [];
  
  if (selectedFishermanId && lastLocation) {
    mapMarkers.push({
      lat: lastLocation.lat,
      lng: lastLocation.lng,
      type: isConnected ? ("live" as const) : ("lastKnown" as const),
      popup: isConnected ? "Live Location" : "Last Known Location",
    });
  } else {
    allFishermen.forEach(f => {
      if (f.lastLocation) {
        mapMarkers.push({
          lat: f.lastLocation.lat,
          lng: f.lastLocation.lng,
          type: f.state?.status === "online" ? ("live" as const) : ("lastKnown" as const),
          popup: `${f.fisherman.fishermanName} (${f.fisherman.boatName})`,
        });
      }
    });
  }

  const driftPaths = driftResult?.driftPaths?.map((path, i) => ({
    points: path,
    color: `hsl(${(i * 15) % 360}, 70%, 50%)`,
  })) || [];

  const heatmapPoints = driftResult?.heatmapPoints || [];

  const unreadAlerts = alerts.filter((a) => !a.read);

  const getMapCenter = (): [number, number] => {
    if (selectedFishermanId && lastLocation) {
      return [lastLocation.lat, lastLocation.lng];
    }
    if (allFishermen.length > 0 && allFishermen[0].lastLocation) {
      return [allFishermen[0].lastLocation.lat, allFishermen[0].lastLocation.lng];
    }
    return [13.0827, 80.2707];
  };

  // Get online fishermen count
  const onlineCount = allFishermen.filter(f => f.state?.status === "online").length;

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-80 bg-sidebar border-r transform transition-transform duration-200 lg:relative lg:translate-x-0 overflow-hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-ocean rounded-lg">
                <Anchor className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold">CoastGuard Lite</h1>
                <p className="text-xs text-muted-foreground">Dashboard</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
              data-testid="button-close-sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 overflow-hidden" style={{ isolation: 'isolate' }}>
            <div className="p-4 space-y-6">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search fisherman or boat..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-fishermen"
                  />
                </div>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Ship className="h-4 w-4" />
                    Registered Fishermen
                    <div className="ml-auto flex gap-1">
                      {onlineCount > 0 && (
                        <Badge variant="default" className="bg-live">
                          {onlineCount} Online
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        {allFishermen.length} Total
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isFishermenLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : allFishermen.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {allFishermen.map((f) => (
                        <div
                          key={f.fisherman.id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors hover-elevate ${
                            selectedFishermanId === f.fisherman.id
                              ? "bg-ocean/10 border border-ocean/30"
                              : "bg-muted/50"
                          }`}
                          onClick={() => {
                            setSelectedFishermanId(
                              selectedFishermanId === f.fisherman.id ? null : f.fisherman.id
                            );
                          }}
                          data-testid={`card-fisherman-${f.fisherman.id}`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{f.fisherman.fishermanName}</span>
                            </div>
                            <Badge
                              variant={f.state?.status === "online" ? "default" : "secondary"}
                              className={f.state?.status === "online" ? "bg-live" : ""}
                            >
                              {f.state?.status === "online" ? "Online" : f.state?.mode === "drift" ? "Drift" : "Offline"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Ship className="h-3 w-3" />
                            {f.fisherman.boatName}
                          </div>
                          {f.lastLocation && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {f.lastLocation.lat.toFixed(4)}, {f.lastLocation.lng.toFixed(4)}
                            </div>
                          )}
                          {f.lastOnlineSession && f.state?.status === "offline" && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Last online: {formatTimeSince(new Date(f.lastOnlineSession.endedAt!))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {searchQuery ? "No fishermen found" : "No fishermen registered yet"}
                    </p>
                  )}
                </CardContent>
              </Card>

              {selectedFishermanId && selectedFisherman && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setSelectedFishermanId(null)}
                    data-testid="button-back-to-all"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to All Fishermen
                  </Button>

                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {selectedFisherman.fisherman.fishermanName}
                        </CardTitle>
                        <StatusBadge mode={mode} isConnected={isConnected} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Ship className="h-4 w-4" />
                        <span>{selectedFisherman.fisherman.boatName}</span>
                      </div>

                      <Separator />

                      {lastLocation ? (
                        <>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              <MapPin className="h-3 w-3" />
                              <span>{isConnected ? "Live Location" : "Last Known Location"}</span>
                            </div>
                            <CoordinateDisplay
                              lat={lastLocation.lat}
                              lng={lastLocation.lng}
                              label=""
                            />
                          </div>

                          <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>Last Update</span>
                            </div>
                            <span 
                              className={`font-medium ${mode === "drift" ? "text-drift" : isConnected ? "text-live" : ""}`}
                              data-testid="text-last-update"
                            >
                              {formatTimeSince(lastUpdateTime)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No location data available
                        </p>
                      )}

                      {mode === "live" && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Emergency Actions</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                className="flex-1 border-drift text-drift hover:bg-drift/10"
                                onClick={() => triggerDriftModeMutation.mutate()}
                                disabled={triggerDriftModeMutation.isPending || !lastLocation}
                                data-testid="button-trigger-drift"
                              >
                                {triggerDriftModeMutation.isPending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Triggering...
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    Trigger Drift Mode
                                  </>
                                )}
                              </Button>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" data-testid="button-drift-info">
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="text-sm">
                                    <strong>Trigger Drift Mode</strong> manually simulates a GPS signal loss scenario. 
                                    When activated, the system marks this fisherman as offline and enables drift prediction 
                                    based on their last known location, weather conditions, and ocean currents.
                                    Use this to test emergency response procedures or when you suspect the fisherman 
                                    may be in distress but their GPS has failed.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </>
                      )}

                      {mode === "drift" && lastLocation && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Drift Mode Active</span>
                            </div>
                            <Button
                              variant="outline"
                              className="w-full border-live text-live hover:bg-live/10"
                              onClick={() => exitDriftModeMutation.mutate()}
                              disabled={exitDriftModeMutation.isPending}
                              data-testid="button-exit-drift"
                            >
                              {exitDriftModeMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Exiting...
                                </>
                              ) : (
                                <>
                                  <ArrowLeft className="h-4 w-4 mr-2" />
                                  Exit Drift Mode
                                </>
                              )}
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <MarineWeatherCard
                    data={weatherData || null}
                    isLoading={isWeatherLoading}
                    onRefresh={() => refetchWeather()}
                    lastFetched={weatherData ? new Date() : null}
                  />

                  <SimulationControls
                    hours={simulationHours}
                    onHoursChange={setSimulationHours}
                    showHeatmap={showHeatmap}
                    onShowHeatmapChange={setShowHeatmap}
                    showPaths={showPaths}
                    onShowPathsChange={setShowPaths}
                    onRunSimulation={() => runSimulationMutation.mutate()}
                    isSimulating={runSimulationMutation.isPending}
                    canSimulate={!!lastLocation}
                    isDriftMode={mode === "drift"}
                  />
                </>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Radar className="h-4 w-4" />
                      Recent Alerts
                    </CardTitle>
                    {unreadAlerts.length > 0 && (
                      <span className="text-xs bg-danger text-danger-foreground px-2 py-0.5 rounded-full">
                        {unreadAlerts.length}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isAlertsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : alerts.length > 0 ? (
                    <AlertStack
                      alerts={alerts}
                      onDismiss={handleDismissAlert}
                      maxVisible={3}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No alerts
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="auto-refresh" className="text-sm">
                        Auto-refresh
                      </Label>
                    </div>
                    <Switch
                      id="auto-refresh"
                      checked={autoRefresh}
                      onCheckedChange={setAutoRefresh}
                      data-testid="switch-auto-refresh"
                    />
                  </div>
                  {autoRefresh && (
                    <p className="text-xs text-muted-foreground">
                      Updating every 5 seconds
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shrink-0">
          <div className="flex items-center justify-between px-4 py-3 gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
                data-testid="button-open-sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="hidden sm:block">
                <h2 className="font-semibold">
                  {selectedFishermanId && selectedFisherman 
                    ? `Tracking: ${selectedFisherman.fisherman.fishermanName}`
                    : "Live Tracking Map"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedFishermanId 
                    ? (mode === "live" ? "GPS signal active" : "Drift prediction mode")
                    : `${allFishermen.length} fishermen registered, ${onlineCount} online`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedFishermanId && (
                <StatusBadge mode={mode} isConnected={isConnected} className="hidden sm:flex" />
              )}
              <ThemeToggle />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <LeafletMap
              center={getMapCenter()}
              zoom={selectedFishermanId ? 11 : 8}
              markers={mapMarkers}
              driftPaths={selectedFishermanId ? driftPaths : []}
              heatmapPoints={selectedFishermanId ? heatmapPoints : []}
              showHeatmap={showHeatmap}
              showPaths={showPaths}
            />
          </div>

          <div className="absolute bottom-4 left-4 z-[1000]">
            <Card className="bg-background/90 backdrop-blur p-3">
              <div className="space-y-2 text-xs">
                <div className="font-medium">Legend</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-live" />
                  <span>Live GPS</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-drift" />
                  <span>Last Known Location</span>
                </div>
                {showPaths && selectedFishermanId && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />
                    <span>Drift Path</span>
                  </div>
                )}
                {showHeatmap && selectedFishermanId && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-red-500 opacity-60" />
                    <span>Search Area</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
