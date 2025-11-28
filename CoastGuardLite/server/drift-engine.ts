import type { MarineWeatherData } from "@shared/schema";

const R = 6371;

export interface DriftPoint {
  lat: number;
  lng: number;
}

export interface DriftPath {
  points: DriftPoint[];
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface DriftSimulationResult {
  predictedPoints: DriftPoint[];
  heatmapPoints: HeatmapPoint[];
  driftPaths: DriftPoint[][];
}

export function calculateDrift(
  lat: number,
  lng: number,
  windSpeed: number,
  windDirection: number,
  currentSpeed: number,
  currentDirection: number,
  hours: number
): DriftPoint {
  const windSpeedMs = windSpeed / 3.6;
  
  const windDriftFactor = 0.035;
  const windDriftSpeed = windSpeedMs * windDriftFactor;
  
  const windAngle = (windDirection * Math.PI) / 180;
  const currentAngle = (currentDirection * Math.PI) / 180;
  
  const windDriftX = windDriftSpeed * Math.sin(windAngle);
  const windDriftY = windDriftSpeed * Math.cos(windAngle);
  
  const currentX = currentSpeed * Math.sin(currentAngle);
  const currentY = currentSpeed * Math.cos(currentAngle);
  
  const totalVelocityX = windDriftX + currentX;
  const totalVelocityY = windDriftY + currentY;
  
  const distanceX = totalVelocityX * hours * 3600 / 1000;
  const distanceY = totalVelocityY * hours * 3600 / 1000;
  
  const latChange = (distanceY / R) * (180 / Math.PI);
  const lngChange = (distanceX / R) * (180 / Math.PI) / Math.cos((lat * Math.PI) / 180);

  return { lat: lat + latChange, lng: lng + lngChange };
}

function randomVariation(value: number, percentage: number): number {
  const variation = value * (percentage / 100);
  return value + (Math.random() * 2 - 1) * variation;
}

function randomAngleVariation(angle: number, maxDegrees: number): number {
  return angle + (Math.random() * 2 - 1) * maxDegrees;
}

export function runMonteCarloSimulation(
  startLat: number,
  startLng: number,
  weather: MarineWeatherData,
  simulationHours: number,
  numPaths: number = 100
): DriftSimulationResult {
  const driftPaths: DriftPoint[][] = [];
  const allPoints: DriftPoint[] = [];
  const pointCounts: Map<string, number> = new Map();

  for (let pathIndex = 0; pathIndex < numPaths; pathIndex++) {
    const path: DriftPoint[] = [{ lat: startLat, lng: startLng }];
    
    let currentLat = startLat;
    let currentLng = startLng;

    for (let hour = 1; hour <= simulationHours; hour++) {
      const variedWindSpeed = randomVariation(weather.windSpeed, 20);
      const variedCurrentSpeed = randomVariation(weather.currentSpeed, 15);
      const variedWindDirection = randomAngleVariation(weather.windDirection, 15);
      const variedCurrentDirection = randomAngleVariation(weather.currentDirection, 10);

      const newPoint = calculateDrift(
        currentLat,
        currentLng,
        variedWindSpeed,
        variedWindDirection,
        variedCurrentSpeed,
        variedCurrentDirection,
        1
      );

      path.push(newPoint);
      allPoints.push(newPoint);
      currentLat = newPoint.lat;
      currentLng = newPoint.lng;

      const gridKey = `${newPoint.lat.toFixed(3)}_${newPoint.lng.toFixed(3)}`;
      pointCounts.set(gridKey, (pointCounts.get(gridKey) || 0) + 1);
    }

    driftPaths.push(path);
  }

  const maxCount = Math.max(...Array.from(pointCounts.values()));
  const heatmapPoints: HeatmapPoint[] = [];

  pointCounts.forEach((count, key) => {
    const [lat, lng] = key.split("_").map(parseFloat);
    heatmapPoints.push({
      lat,
      lng,
      intensity: count / maxCount,
    });
  });

  const predictedPoints = calculateCentroidPoints(allPoints, simulationHours);

  return {
    predictedPoints,
    heatmapPoints,
    driftPaths,
  };
}

function calculateCentroidPoints(points: DriftPoint[], hours: number): DriftPoint[] {
  if (points.length === 0) return [];

  const pointsPerHour = Math.floor(points.length / hours);
  const centroids: DriftPoint[] = [];

  for (let h = 0; h < hours; h++) {
    const start = h * pointsPerHour;
    const end = start + pointsPerHour;
    const hourPoints = points.slice(start, end);

    if (hourPoints.length > 0) {
      const avgLat = hourPoints.reduce((sum, p) => sum + p.lat, 0) / hourPoints.length;
      const avgLng = hourPoints.reduce((sum, p) => sum + p.lng, 0) / hourPoints.length;
      centroids.push({ lat: avgLat, lng: avgLng });
    }
  }

  return centroids;
}

export function generateSearchAreaRadius(heatmapPoints: HeatmapPoint[]): number {
  if (heatmapPoints.length < 2) return 5;

  const lats = heatmapPoints.map((p) => p.lat);
  const lngs = heatmapPoints.map((p) => p.lng);

  const latRange = Math.max(...lats) - Math.min(...lats);
  const lngRange = Math.max(...lngs) - Math.min(...lngs);

  const maxRange = Math.max(latRange, lngRange);
  const radiusKm = (maxRange * 111) / 2;

  return Math.max(2, Math.min(50, radiusKm));
}
