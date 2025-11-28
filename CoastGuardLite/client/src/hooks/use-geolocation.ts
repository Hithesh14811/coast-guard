import { useState, useEffect, useCallback, useRef } from "react";

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  error: string | null;
  isTracking: boolean;
  lastUpdate: Date | null;
  accuracyLevel: "high" | "medium" | "low" | null;
  isAcquiring: boolean;
}

function getAccuracyLevel(accuracy: number | null): "high" | "medium" | "low" | null {
  if (accuracy === null) return null;
  if (accuracy <= 20) return "high";
  if (accuracy <= 100) return "medium";
  return "low";
}

export function useGeolocation(options?: PositionOptions) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    heading: null,
    speed: null,
    error: null,
    isTracking: false,
    lastUpdate: null,
    accuracyLevel: null,
    isAcquiring: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isTracking: true, isAcquiring: true, error: null }));
    retryCountRef.current = 0;

    const handleSuccess = (position: GeolocationPosition) => {
      const coords = position.coords;
      const currentAccuracy = coords.accuracy;
      
      setState({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: currentAccuracy,
        altitude: coords.altitude,
        heading: coords.heading,
        speed: coords.speed,
        error: null,
        isTracking: true,
        lastUpdate: new Date(),
        accuracyLevel: getAccuracyLevel(currentAccuracy),
        isAcquiring: false,
      });
      
      retryCountRef.current = 0;
    };

    const handleError = (error: GeolocationPositionError) => {
      let errorMessage: string;
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location permission denied. Please enable GPS access in your browser settings.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location unavailable. Please ensure GPS is enabled on your device.";
          break;
        case error.TIMEOUT:
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            return;
          }
          errorMessage = "Location request timed out. Please check your GPS signal.";
          break;
        default:
          errorMessage = "An unknown error occurred while getting location.";
      }
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isTracking: false,
        isAcquiring: false,
      }));
    };

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleSuccess(position);
        
        watchIdRef.current = navigator.geolocation.watchPosition(
          handleSuccess,
          handleError,
          defaultOptions
        );
      },
      (error) => {
        watchIdRef.current = navigator.geolocation.watchPosition(
          handleSuccess,
          handleError,
          defaultOptions
        );
      },
      { ...defaultOptions, timeout: 10000 }
    );
  }, [options]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((prev) => ({ ...prev, isTracking: false, isAcquiring: false }));
  }, []);

  const clearLocation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      latitude: null,
      longitude: null,
      accuracy: null,
      altitude: null,
      heading: null,
      speed: null,
      lastUpdate: null,
      accuracyLevel: null,
    }));
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
    clearLocation,
  };
}
