import "server-only";
import type { Cradle } from "@/server/initialization";
import { env } from "@/env";

export type NearbyPlace = {
  distance: number;
  name: string;
  address: string;
};

export type DistanceCalculationResult = {
  distanceToWork: number | null;
  nearestStation: NearbyPlace | null;
  nearestSupermarket: NearbyPlace | null;
  nearestGym: NearbyPlace | null;
};

export class GoogleMapsService {
  constructor(private deps: Cradle) {}

  private get apiKey() {
    return env.GOOGLE_MAPS_API_KEY;
  }

  private get workAddress() {
    return env.DESTINATION_WORK;
  }

  async calculateDistances(propertyAddress: string): Promise<DistanceCalculationResult> {
    if (!this.apiKey) {
      throw new Error("Google Maps API key not configured");
    }

    const [distanceToWork, nearestStation, nearestSupermarket, nearestGym] = await Promise.all([
      this.getDistanceToDestination(propertyAddress, this.workAddress),
      this.findNearestPlace(propertyAddress, "train_station"),
      this.findNearestPlace(propertyAddress, "supermarket"),
      this.findNearestPlace(propertyAddress, "gym"),
    ]);

    return {
      distanceToWork,
      nearestStation,
      nearestSupermarket,
      nearestGym,
    };
  }

  private async getDistanceToDestination(origin: string, destination: string): Promise<number | null> {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
      url.searchParams.set("origins", origin);
      url.searchParams.set("destinations", destination);
      url.searchParams.set("mode", "driving");
      url.searchParams.set("key", this.apiKey!);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.rows?.[0]?.elements?.[0]?.status === "OK") {
        return data.rows[0].elements[0].distance.value / 1000;
      }
      return null;
    } catch (error) {
      this.deps.logger.error({ error }, "Failed to get distance to destination");
      return null;
    }
  }

  private async findNearestPlace(origin: string, type: string): Promise<NearbyPlace | null> {
    try {
      // Geocode the origin address
      const geocodeUrl = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      geocodeUrl.searchParams.set("address", origin);
      geocodeUrl.searchParams.set("key", this.apiKey!);

      const geocodeResponse = await fetch(geocodeUrl.toString());
      const geocodeData = await geocodeResponse.json();

      if (!geocodeData.results?.[0]?.geometry?.location) {
        return null;
      }

      const { lat, lng } = geocodeData.results[0].geometry.location;

      // Search for nearby places
      const placesUrl = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
      placesUrl.searchParams.set("location", `${lat},${lng}`);
      placesUrl.searchParams.set("rankby", "distance");
      placesUrl.searchParams.set("type", type);
      placesUrl.searchParams.set("key", this.apiKey!);

      const placesResponse = await fetch(placesUrl.toString());
      const placesData = await placesResponse.json();

      if (!placesData.results?.[0]) {
        return null;
      }

      const place = placesData.results[0];
      const placeLocation = place.geometry.location;

      // Get driving distance to the place
      const distanceUrl = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
      distanceUrl.searchParams.set("origins", `${lat},${lng}`);
      distanceUrl.searchParams.set("destinations", `${placeLocation.lat},${placeLocation.lng}`);
      distanceUrl.searchParams.set("mode", "driving");
      distanceUrl.searchParams.set("key", this.apiKey!);

      const distanceResponse = await fetch(distanceUrl.toString());
      const distanceData = await distanceResponse.json();

      if (distanceData.rows?.[0]?.elements?.[0]?.status === "OK") {
        return {
          distance: distanceData.rows[0].elements[0].distance.value / 1000,
          name: place.name,
          address: place.vicinity || place.formatted_address || "",
        };
      }

      return null;
    } catch (error) {
      this.deps.logger.error({ error, type }, "Failed to find nearest place");
      return null;
    }
  }
}
