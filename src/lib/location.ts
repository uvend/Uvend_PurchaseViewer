export type CapturedLocation = {
  latitude?: number;
  longitude?: number;
  locationStatus: string;
};

export function captureGps(): Promise<CapturedLocation> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ locationStatus: "GPS not available on this device" });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationStatus: "GPS captured",
        });
      },
      () => {
        resolve({ locationStatus: "GPS denied or unavailable" });
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  });
}
