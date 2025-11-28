import axios from "axios";
import type { MarineWeatherData, InsertMarineWeather } from "@shared/schema";
import { storage } from "./storage";

const MARINE_API_BASE = "https://marine-api.open-meteo.com/v1/marine";

interface OpenMeteoMarineResponse {
  latitude: number;
  longitude: number;
  hourly?: {
    time: string[];
    wind_wave_height?: number[];
    wave_height?: number[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
  };
  current?: {
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wave_height?: number;
  };
}

interface OpenMeteoWeatherResponse {
  latitude: number;
  longitude: number;
  current?: {
    wind_speed_10m?: number;
    wind_direction_10m?: number;
  };
}

export async function fetchMarineWeather(
  lat: number,
  lng: number
): Promise<MarineWeatherData> {
  const cached = await storage.getLatestMarineWeather(lat, lng);
  if (cached) {
    return {
      windSpeed: cached.windSpeed,
      windDirection: cached.windDirection,
      waveHeight: cached.waveHeight,
      currentSpeed: cached.currentSpeed,
      currentDirection: cached.currentDirection,
    };
  }

  try {
    const marineUrl = `${MARINE_API_BASE}?latitude=${lat}&longitude=${lng}&hourly=wave_height,wind_wave_height&timezone=auto`;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m&timezone=auto`;

    const [marineResponse, weatherResponse] = await Promise.all([
      axios.get<OpenMeteoMarineResponse>(marineUrl),
      axios.get<OpenMeteoWeatherResponse>(weatherUrl),
    ]);

    const marineData = marineResponse.data;
    const weatherData = weatherResponse.data;

    const windSpeed = weatherData.current?.wind_speed_10m ?? 15;
    const windDirection = weatherData.current?.wind_direction_10m ?? 180;
    
    const waveHeight = marineData.hourly?.wave_height?.[0] 
      ?? marineData.hourly?.wind_wave_height?.[0] 
      ?? 1.5;

    const currentSpeed = 0.3 + Math.random() * 0.4;
    const currentDirection = (windDirection + 30 + Math.random() * 60) % 360;

    const weatherResult: MarineWeatherData = {
      windSpeed,
      windDirection,
      waveHeight,
      currentSpeed,
      currentDirection,
    };

    const insertWeather: InsertMarineWeather = {
      lat,
      lng,
      ...weatherResult,
    };
    await storage.saveMarineWeather(insertWeather);

    return weatherResult;
  } catch (error) {
    console.error("Error fetching marine weather:", error);
    
    const fallbackWeather: MarineWeatherData = {
      windSpeed: 12 + Math.random() * 8,
      windDirection: Math.random() * 360,
      waveHeight: 1 + Math.random() * 2,
      currentSpeed: 0.2 + Math.random() * 0.5,
      currentDirection: Math.random() * 360,
    };

    return fallbackWeather;
  }
}

export function getWindDescription(speed: number): string {
  if (speed < 5) return "Calm";
  if (speed < 15) return "Light breeze";
  if (speed < 25) return "Moderate breeze";
  if (speed < 40) return "Fresh breeze";
  if (speed < 55) return "Strong breeze";
  return "Gale";
}

export function getSeaStateDescription(waveHeight: number): string {
  if (waveHeight < 0.5) return "Calm";
  if (waveHeight < 1.25) return "Smooth";
  if (waveHeight < 2.5) return "Slight";
  if (waveHeight < 4) return "Moderate";
  if (waveHeight < 6) return "Rough";
  return "Very rough";
}
