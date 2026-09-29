import { Router } from "express";

const router = Router();

router.post("/reverse-geocode", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return res.status(400).json({
        message: "Latitude and longitude are required",
      });
    }

    const apiKey = process.env.OLA_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        message: "Ola Maps API key is not configured",
      });
    }

    const response = await fetch(
      `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${latitude},${longitude}&api_key=${apiKey}`,
      {
        method: "GET",
        headers: {
          "X-Request-Id": `location-${Date.now()}`,
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Ola Maps Error:", data);

      return res.status(response.status).json({
        message: "Ola Maps reverse geocoding failed",
        error: data,
      });
    }

    const results = Array.isArray(data?.results)
      ? data.results
      : [];

    if (results.length === 0) {
      return res.status(404).json({
        message: "Location not found",
      });
    }

    // Find the most detailed address.
    // This avoids changing the address just because GPS
    // moved a few meters.
    const scoredResults = results.map((result: any) => {
      const address = result?.formatted_address || "";
      const components = result?.address_components || [];

      let score = 0;

      // Prefer detailed street/building addresses
      if (
        components.some((item: any) =>
          item.types?.includes("street_address")
        )
      ) {
        score += 5;
      }

      if (
        components.some((item: any) =>
          item.types?.includes("route")
        )
      ) {
        score += 4;
      }

      if (
        components.some((item: any) =>
          item.types?.includes("neighborhood")
        )
      ) {
        score += 3;
      }

      if (
        components.some((item: any) =>
          item.types?.includes("sublocality")
        )
      ) {
        score += 3;
      }

      if (
        components.some((item: any) =>
          item.types?.includes("postal_code")
        )
      ) {
        score += 2;
      }

      if (
        components.some((item: any) =>
          item.types?.includes("locality")
        )
      ) {
        score += 2;
      }

      // Prefer a detailed formatted address
      if (address.length > 150) {
        score += 5;
      } else if (address.length > 100) {
        score += 3;
      } else if (address.length > 70) {
        score += 1;
      }

      return {
        result,
        score,
      };
    });

    scoredResults.sort((a: any, b: any) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // If score is same, use nearest result
      const distanceA =
        Number(a.result?.distance_meters) || Infinity;

      const distanceB =
        Number(b.result?.distance_meters) || Infinity;

      return distanceA - distanceB;
    });

    const bestResult = scoredResults[0].result;

    console.log("========== OLA LOCATION ==========");
    console.log("Latitude:", latitude);
    console.log("Longitude:", longitude);
    console.log("Selected Address:", bestResult.formatted_address);
    console.log("Score:", scoredResults[0].score);
    console.log("==================================");

    return res.json({
      status: "ok",
      result: bestResult,
    });
  } catch (error) {
    console.error("Reverse Geocoding Error:", error);

    return res.status(500).json({
      message: "Unable to detect location",
    });
  }
});

export default router;