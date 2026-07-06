export interface GPSLocation {
  latitude: number;
  longitude: number;
  area: string;
  street: string;
  city: string;
  district: string;
  state: string;
  country: string;
  postal_code: string;
  timestamp: number;
}

const CACHE_KEY = "activity_logger_gps_location";
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const MIN_DISTANCE = 10; // meters

export function getCachedGPSLocation(): GPSLocation | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    return JSON.parse(cached) as GPSLocation;
  } catch (err) {
    console.error("Failed to read GPS cache", err);
    return null;
  }
}

function saveCache(data: GPSLocation) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save GPS cache", err);
  }
}

export function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371e3;

  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;

  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) *
    Math.sin(Δφ / 2) +
    Math.cos(φ1) *
    Math.cos(φ2) *
    Math.sin(Δλ / 2) *
    Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function updateGPSLocation(
  latitude: number,
  longitude: number
): Promise<GPSLocation | null> {

  if (typeof window === "undefined") return null;

  const cached = getCachedGPSLocation();

  if (cached) {
    const distance = getDistanceInMeters(
      latitude,
      longitude,
      cached.latitude,
      cached.longitude
    );

    const age = Date.now() - cached.timestamp;

    if (distance < MIN_DISTANCE && age < CACHE_DURATION) {
      cached.timestamp = Date.now();
      saveCache(cached);
      return cached;
    }
  }

  // --------------------------------------------------
  // ALWAYS SAVE COORDINATES FIRST
  // --------------------------------------------------

  const location: GPSLocation = {
    latitude,
    longitude,
    area: "",
    street: "",
    city: "",
    district: "",
    state: "",
    country: "",
    postal_code: "",
    timestamp: Date.now(),
  };

  saveCache(location);

  try {

    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=jsonv2` +
      `&lat=${latitude}` +
      `&lon=${longitude}` +
      `&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      console.error(
        "Reverse geocoding failed:",
        response.status,
        response.statusText
      );

      return location;
    }

    const data = await response.json();

    const addr = data.address || {};

    location.area =
      addr.suburb ||
      addr.neighbourhood ||
      addr.residential ||
      addr.quarter ||
      addr.hamlet ||
      addr.village ||
      addr.locality ||
      "";

    location.street =
      addr.road ||
      addr.pedestrian ||
      addr.street ||
      addr.path ||
      "";

    location.city =
      addr.city ||
      addr.town ||
      addr.city_district ||
      addr.municipality ||
      addr.village ||
      "";

    location.district =
      addr.county ||
      addr.state_district ||
      addr.district ||
      "";

    location.state =
      addr.state ||
      "";

    location.country =
      addr.country ||
      "";

    location.postal_code =
      addr.postcode ||
      "";

    location.timestamp = Date.now();

    saveCache(location);

    return location;

  } catch (err) {

    console.error("Reverse geocoding error", err);

    // IMPORTANT:
    // Return GPS coordinates even if address lookup failed.
    return location;
  }
}