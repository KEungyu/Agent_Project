import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CITIES } from "./cities";
import { SPOT_PHOTOS } from "./photos";

describe("spot photos", () => {
  it("belong to real spots, exist on disk and carry a free license with an author", () => {
    const spotKeys = new Set(CITIES.flatMap((city) => city.spots.map((spot) => `${city.id}/${spot.name.en}`)));
    for (const [key, photo] of Object.entries(SPOT_PHOTOS)) {
      expect(spotKeys.has(key), key).toBe(true);
      expect(existsSync(join(process.cwd(), "public", photo.src)), photo.src).toBe(true);
      expect(photo.license).toMatch(/^(CC0|CC BY|Public domain)/);
      expect(photo.artist.length).toBeGreaterThan(0);
      expect(photo.page).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
  });
});
