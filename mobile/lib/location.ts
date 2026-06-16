// location.ts — device GPS → nearest city, for the home "near you" filter.
//
// On demand (never on mount, so we don't prompt unprompted): request foreground
// permission, get a coarse fix, reverse-geocode to a city name. Best-effort:
// resolves to null on denial / simulator / error rather than throwing.
import { useCallback, useState } from "react";
import * as Location from "expo-location";

export type LocationStatus = "idle" | "loading" | "granted" | "denied" | "error";

export type DeviceCity = {
  city: string | null;
  status: LocationStatus;
  detect: () => Promise<string | null>;
};

export function useDeviceCity(): DeviceCity {
  const [city, setCity] = useState<string | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  const detect = useCallback(async (): Promise<string | null> => {
    setStatus("loading");
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setStatus("denied");
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      const places = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const p = places[0];
      const detected = p?.city ?? p?.subregion ?? p?.region ?? null;
      setCity(detected);
      setStatus("granted");
      return detected;
    } catch {
      setStatus("error");
      return null;
    }
  }, []);

  return { city, status, detect };
}
