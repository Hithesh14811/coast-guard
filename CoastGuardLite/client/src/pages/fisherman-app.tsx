import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { ConnectionBadge } from "@/components/status-badge";
import { CoordinateDisplay } from "@/components/coordinate-display";
import { LeafletMap } from "@/components/map/leaflet-map";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Anchor, MapPin, Navigation, Loader2, Clock, Wifi, WifiOff, Ship, User, Signal, SignalHigh, SignalLow, SignalMedium, LogOut, MapPinned, Crosshair, Power, PowerOff, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { FishermanProfile, OnlineSession } from "@shared/schema";

interface ProfileData {
  profile: FishermanProfile | null;
  activeSession: OnlineSession | null;
}

interface PinnedLocation {
  lat: number;
  lng: number;
}

const UPDATE_INTERVAL = 10000;

export default function FishermanApp() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [isPinMode, setIsPinMode] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState<PinnedLocation | null>(null);
  const [lastSentTime, setLastSentTime] = useState<Date | null>(null);
  const [fishermanName, setFishermanName] = useState("");
  const [boatName, setBoatName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    latitude,
    longitude,
    accuracy,
    accuracyLevel,
    error: gpsError,
    isTracking,
    isAcquiring,
    lastUpdate,
    startTracking,
    stopTracking,
    clearLocation,
  } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
  });

  const { data: profileData, isLoading: isProfileLoading } = useQuery<ProfileData>({
    queryKey: ["/api/fisherman/profile"],
    enabled: !!user,
  });

  const profile = profileData?.profile;
  const activeSession = profileData?.activeSession;

  const hasGpsLocation = latitude !== null && longitude !== null;
  const hasPinnedLocation = pinnedLocation !== null;
  const hasAnyLocation = hasGpsLocation || hasPinnedLocation;
  const canGoOnline = hasAnyLocation && !isOnline;

  const currentLat = pinnedLocation?.lat ?? latitude;
  const currentLng = pinnedLocation?.lng ?? longitude;
  const locationSource = pinnedLocation ? "pinned" : (hasGpsLocation ? "gps" : null);

  const createProfileMutation = useMutation({
    mutationFn: async (data: { fishermanName: string; boatName: string }) => {
      return apiRequest("POST", "/api/fisherman/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fisherman/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile created",
        description: `Welcome ${fishermanName}! You can now share your location.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create profile",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const startSharingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/fisherman/start-sharing", {});
    },
    onSuccess: () => {
      setIsOnline(true);
      queryClient.invalidateQueries({ queryKey: ["/api/fisherman/profile"] });
      toast({
        title: "You are now online",
        description: "Your location is being shared with the Coast Guard.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to go online",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const stopSharingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/fisherman/stop-sharing", {});
    },
    onSuccess: () => {
      setIsOnline(false);
      queryClient.invalidateQueries({ queryKey: ["/api/fisherman/profile"] });
      toast({
        title: "You are now offline",
        description: "Your location is no longer being shared.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to go offline",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const sendLocationMutation = useMutation({
    mutationFn: async (location: { lat: number; lng: number; source: string; accuracy?: number }) => {
      return apiRequest("POST", "/api/fisherman/location", location);
    },
    onSuccess: () => {
      setLastSentTime(new Date());
    },
    onError: (error) => {
      console.error("Failed to send location:", error);
    },
  });

  const latRef = useRef(currentLat);
  const lngRef = useRef(currentLng);
  const sourceRef = useRef(locationSource);
  const accuracyRef = useRef(accuracy);

  useEffect(() => {
    latRef.current = currentLat;
    lngRef.current = currentLng;
    sourceRef.current = locationSource;
    accuracyRef.current = accuracy;
  }, [currentLat, currentLng, locationSource, accuracy]);

  useEffect(() => {
    if (activeSession && !isOnline) {
      setIsOnline(true);
    }
  }, [activeSession]);

  useEffect(() => {
    if (!isOnline || !profile) return;

    const sendLocation = () => {
      if (latRef.current !== null && lngRef.current !== null) {
        sendLocationMutation.mutate({ 
          lat: latRef.current, 
          lng: lngRef.current,
          source: sourceRef.current || "gps",
          accuracy: accuracyRef.current ?? undefined,
        });
      }
    };

    sendLocation();
    const interval = setInterval(sendLocation, UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, [isOnline, profile]);

  const handleCreateProfile = useCallback(() => {
    if (!fishermanName.trim() || !boatName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both your name and boat name.",
        variant: "destructive",
      });
      return;
    }
    createProfileMutation.mutate({ fishermanName: fishermanName.trim(), boatName: boatName.trim() });
  }, [fishermanName, boatName, createProfileMutation, toast]);

  const handleStartGpsTracking = useCallback(() => {
    setPinnedLocation(null);
    startTracking();
  }, [startTracking]);

  const handleStopGpsTracking = useCallback(() => {
    stopTracking();
    clearLocation();
  }, [stopTracking, clearLocation]);

  const handleTogglePinMode = useCallback(() => {
    if (isPinMode) {
      setIsPinMode(false);
    } else {
      stopTracking();
      clearLocation();
      setIsPinMode(true);
      toast({
        title: "Pin mode enabled",
        description: "Tap on the map to set your location manually.",
      });
    }
  }, [isPinMode, stopTracking, clearLocation, toast]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (isPinMode) {
      setPinnedLocation({ lat, lng });
      setIsPinMode(false);
      toast({
        title: "Location pinned",
        description: "Your manual location has been set.",
      });
    }
  }, [isPinMode, toast]);

  const handleClearPinnedLocation = useCallback(() => {
    setPinnedLocation(null);
  }, []);

  const handleGoOnline = useCallback(() => {
    startSharingMutation.mutate();
  }, [startSharingMutation]);

  const handleGoOffline = useCallback(() => {
    stopSharingMutation.mutate();
  }, [stopSharingMutation]);

  const formatTime = (date: Date | null) => {
    if (!date) return "--";
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getAccuracyIcon = () => {
    switch (accuracyLevel) {
      case "high":
        return <SignalHigh className="h-4 w-4 text-live" />;
      case "medium":
        return <SignalMedium className="h-4 w-4 text-drift" />;
      case "low":
        return <SignalLow className="h-4 w-4 text-danger" />;
      default:
        return <Signal className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getAccuracyLabel = () => {
    if (!accuracy) return "--";
    if (accuracy <= 20) return `High (${accuracy.toFixed(0)}m)`;
    if (accuracy <= 100) return `Medium (${accuracy.toFixed(0)}m)`;
    return `Low (${accuracy.toFixed(0)}m)`;
  };

  const markers = [];
  if (hasGpsLocation && !pinnedLocation) {
    markers.push({ 
      lat: latitude!, 
      lng: longitude!, 
      type: "live" as const, 
      popup: "Your GPS Location",
      accuracy: accuracy ?? undefined,
    });
  }
  if (pinnedLocation) {
    markers.push({ 
      lat: pinnedLocation.lat, 
      lng: pinnedLocation.lng, 
      type: "pinned" as const, 
      popup: "Pinned Location (Manual)" 
    });
  }

  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-ocean mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-ocean rounded-lg">
                <Anchor className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">CoastGuard Lite</h1>
                <p className="text-xs text-muted-foreground">Fisherman Tracker</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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

        <main className="flex-1 container mx-auto px-4 py-6 flex items-center justify-center">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-ocean/10 rounded-full flex items-center justify-center mb-4">
                <Ship className="h-8 w-8 text-ocean" />
              </div>
              <CardTitle className="text-xl">Complete Your Profile</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Enter your details to start sharing your location with the Coast Guard
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fishermanName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Your Name
                </Label>
                <Input
                  id="fishermanName"
                  placeholder="Enter your name"
                  value={fishermanName}
                  onChange={(e) => setFishermanName(e.target.value)}
                  data-testid="input-fisherman-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="boatName" className="flex items-center gap-2">
                  <Ship className="h-4 w-4" />
                  Boat Name
                </Label>
                <Input
                  id="boatName"
                  placeholder="Enter your boat name"
                  value={boatName}
                  onChange={(e) => setBoatName(e.target.value)}
                  data-testid="input-boat-name"
                />
              </div>
              <Button
                className="w-full h-12 bg-ocean hover:bg-ocean/90"
                onClick={handleCreateProfile}
                disabled={createProfileMutation.isPending}
                data-testid="button-create-profile"
              >
                {createProfileMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  <>
                    <Navigation className="h-5 w-5 mr-2" />
                    Create Profile & Continue
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ocean rounded-lg">
              <Anchor className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">CoastGuard Lite</h1>
              <p className="text-xs text-muted-foreground">Fisherman Tracker</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

      <main className="flex-1 container mx-auto px-4 py-6 space-y-4 max-w-lg">
        <Card className="bg-ocean/5 border-ocean/20">
          <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-ocean/10 rounded-full">
                <User className="h-5 w-5 text-ocean" />
              </div>
              <div>
                <p className="font-medium" data-testid="text-fisherman-name">{profile.fishermanName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Ship className="h-3 w-3" />
                  <span data-testid="text-boat-name">{profile.boatName}</span>
                </p>
              </div>
            </div>
            <ConnectionBadge isConnected={isOnline} />
          </CardContent>
        </Card>

        {gpsError && (
          <Card className="border-danger/30 bg-danger/5">
            <CardContent className="py-4 flex items-center gap-3 text-danger">
              <WifiOff className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{gpsError}</p>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg overflow-hidden rounded-2xl">
          <div className="h-64 relative">
            <LeafletMap
              center={
                currentLat && currentLng
                  ? [currentLat, currentLng]
                  : [13.0827, 80.2707]
              }
              zoom={14}
              markers={markers}
              className="rounded-t-2xl"
              allowClick={isPinMode}
              onMapClick={handleMapClick}
            />
            {isPinMode && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000]">
                <Badge className="bg-ocean text-white">
                  <Crosshair className="h-3 w-3 mr-1" />
                  Tap to pin location
                </Badge>
              </div>
            )}
          </div>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <CoordinateDisplay
                lat={currentLat}
                lng={currentLng}
                label={pinnedLocation ? "Pinned Location" : "GPS Location"}
                showCopy={true}
              />
              {locationSource && (
                <Badge variant={pinnedLocation ? "secondary" : "outline"} className="shrink-0">
                  {pinnedLocation ? (
                    <>
                      <MapPinned className="h-3 w-3 mr-1" />
                      Pinned
                    </>
                  ) : (
                    <>
                      <Navigation className="h-3 w-3 mr-1" />
                      GPS
                    </>
                  )}
                </Badge>
              )}
            </div>
            
            {!pinnedLocation && hasGpsLocation && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {getAccuracyIcon()}
                  <span data-testid="text-accuracy">
                    {getAccuracyLabel()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last: {formatTime(lastUpdate)}</span>
                </div>
              </div>
            )}

            {accuracyLevel === "low" && !pinnedLocation && (
              <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 text-sm text-danger">
                Low GPS accuracy detected. Try moving to an open area for better signal, or use the pin feature to set your location manually.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {!isTracking ? (
            <Button
              className="h-12 bg-live hover:bg-live/90"
              onClick={handleStartGpsTracking}
              disabled={isOnline}
              data-testid="button-start-gps"
            >
              {isAcquiring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Acquiring...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 mr-2" />
                  Use GPS
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="h-12 border-danger text-danger hover:bg-danger/10"
              onClick={handleStopGpsTracking}
              disabled={isOnline}
              data-testid="button-stop-gps"
            >
              <WifiOff className="h-4 w-4 mr-2" />
              Stop GPS
            </Button>
          )}

          {!pinnedLocation ? (
            <Button
              variant={isPinMode ? "default" : "outline"}
              className={`h-12 ${isPinMode ? "bg-ocean hover:bg-ocean/90" : ""}`}
              onClick={handleTogglePinMode}
              disabled={isOnline}
              data-testid="button-pin-location"
            >
              {isPinMode ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel Pin
                </>
              ) : (
                <>
                  <MapPinned className="h-4 w-4 mr-2" />
                  Pin Location
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="h-12"
              onClick={handleClearPinnedLocation}
              disabled={isOnline}
              data-testid="button-clear-pin"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Pin
            </Button>
          )}
        </div>

        <Button
          className={`w-full h-14 rounded-xl text-lg font-semibold shadow-lg transition-all ${
            isOnline
              ? "bg-danger hover:bg-danger/90"
              : hasAnyLocation
              ? "bg-live hover:bg-live/90"
              : "bg-muted text-muted-foreground"
          }`}
          onClick={isOnline ? handleGoOffline : handleGoOnline}
          disabled={(!canGoOnline && !isOnline) || startSharingMutation.isPending || stopSharingMutation.isPending}
          data-testid="button-go-online"
        >
          {startSharingMutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Going online...
            </>
          ) : stopSharingMutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Going offline...
            </>
          ) : isOnline ? (
            <>
              <PowerOff className="h-5 w-5 mr-2" />
              Go Offline
            </>
          ) : hasAnyLocation ? (
            <>
              <Power className="h-5 w-5 mr-2" />
              Go Online
            </>
          ) : (
            <>
              <Power className="h-5 w-5 mr-2" />
              Set location to go online
            </>
          )}
        </Button>

        {isOnline && (
          <Card className="bg-live/5 border-live/20">
            <CardContent className="py-4 flex items-center justify-center gap-3">
              <Wifi className="h-5 w-5 text-live animate-pulse" />
              <div className="text-center">
                <p className="text-sm font-medium text-live">
                  Sending updates every 10 seconds
                </p>
                <p className="text-xs text-muted-foreground">
                  Last sent: {formatTime(lastSentTime)} | Source: {locationSource === "pinned" ? "Manual Pin" : "GPS"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!hasAnyLocation && !isTracking && !isPinMode && (
          <Card className="bg-muted/50">
            <CardContent className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Use <strong>GPS</strong> for automatic location tracking, or <strong>Pin Location</strong> to set your position manually on the map.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>Keep your screen on for continuous tracking</p>
        </div>
      </main>
    </div>
  );
}
