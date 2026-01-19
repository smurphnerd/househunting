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

type PlaceResult = {
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
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

    this.deps.logger.info({ propertyAddress }, "Starting distance calculations");

    const [distanceToWork, nearestStation, nearestSupermarket, nearestGym] = await Promise.all([
      this.getDistanceToDestination(propertyAddress, this.workAddress),
      this.findNearestPlace(propertyAddress, "train_station"),
      // Search specifically for Coles or Woolworths
      this.findNearestPlaceByKeyword(propertyAddress, "supermarket", ["Coles", "Woolworths"]),
      // Search specifically for Anytime Fitness
      this.findNearestPlaceByKeyword(propertyAddress, "gym", ["Anytime Fitness"]),
    ]);

    this.deps.logger.debug({
      distanceToWork,
      nearestStation,
      nearestSupermarket,
      nearestGym
    }, "Distance calculation results");

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

  private async findNearestPlaceByKeyword(
    origin: string,
    type: string,
    keywords: string[]
  ): Promise<NearbyPlace | null> {
    try {
      // Geocode the origin address
      const geocodeUrl = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      geocodeUrl.searchParams.set("address", origin);
      geocodeUrl.searchParams.set("key", this.apiKey!);

      const geocodeResponse = await fetch(geocodeUrl.toString());
      const geocodeData = await geocodeResponse.json();

      this.deps.logger.debug({ geocodeData: geocodeData.status }, "Geocode response");

      if (!geocodeData.results?.[0]?.geometry?.location) {
        this.deps.logger.warn({ origin }, "Failed to geocode address");
        return null;
      }

      const { lat, lng } = geocodeData.results[0].geometry.location;

      // Search for each keyword and collect results
      const allResults: Array<{ place: PlaceResult; keyword: string }> = [];

      for (const keyword of keywords) {
        const placesUrl = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
        placesUrl.searchParams.set("location", `${lat},${lng}`);
        placesUrl.searchParams.set("rankby", "distance");
        placesUrl.searchParams.set("type", type);
        placesUrl.searchParams.set("keyword", keyword);
        placesUrl.searchParams.set("key", this.apiKey!);

        const placesResponse = await fetch(placesUrl.toString());
        const placesData = await placesResponse.json();

        this.deps.logger.debug({
          keyword,
          status: placesData.status,
          resultCount: placesData.results?.length ?? 0
        }, "Places search response");

        // Filter results to only include places whose name contains the keyword
        const matchingPlaces = (placesData.results || []).filter((place: PlaceResult) =>
          place.name.toLowerCase().includes(keyword.toLowerCase())
        );

        this.deps.logger.debug({
          keyword,
          matchingCount: matchingPlaces.length,
          matchingNames: matchingPlaces.slice(0, 3).map((p: PlaceResult) => p.name)
        }, "Filtered places by name");

        if (matchingPlaces[0]) {
          allResults.push({ place: matchingPlaces[0], keyword });
        }
      }

      if (allResults.length === 0) {
        this.deps.logger.warn({ keywords, type }, "No places found for any keyword");
        return null;
      }

      // Find the closest place among all results by getting distances
      let closestPlace: NearbyPlace | null = null;
      let closestDistance = Infinity;

      for (const { place } of allResults) {
        const placeLocation = place.geometry.location;

        const distanceUrl = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
        distanceUrl.searchParams.set("origins", `${lat},${lng}`);
        distanceUrl.searchParams.set("destinations", `${placeLocation.lat},${placeLocation.lng}`);
        distanceUrl.searchParams.set("mode", "driving");
        distanceUrl.searchParams.set("key", this.apiKey!);

        const distanceResponse = await fetch(distanceUrl.toString());
        const distanceData = await distanceResponse.json();

        if (distanceData.rows?.[0]?.elements?.[0]?.status === "OK") {
          const distanceKm = distanceData.rows[0].elements[0].distance.value / 1000;

          if (distanceKm < closestDistance) {
            closestDistance = distanceKm;
            closestPlace = {
              distance: distanceKm,
              name: place.name,
              address: place.vicinity || place.formatted_address || "",
            };
          }
        }
      }

      this.deps.logger.debug({ closestPlace }, "Found closest place by keyword");
      return closestPlace;
    } catch (error) {
      this.deps.logger.error({ error, type, keywords }, "Failed to find nearest place by keyword");
      return null;
    }
  }
}
