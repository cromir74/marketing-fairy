import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const location = searchParams.get("location");

        if (!location) {
            return NextResponse.json({ error: "Location is required" }, { status: 400 });
        }

        console.log(`[Weather] Fetching weather for location: ${location}`);

        // 1. Parse address for geocoding
        const encodedLocation = encodeURIComponent(location.trim());

        // 2. Geocoding via Nominatim (OpenStreetMap)
        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodedLocation}&format=json&limit=1`;
        console.log(`[Weather] Geocoding URL: ${geoUrl}`);

        const geoResponse = await fetch(geoUrl, {
            headers: {
                'User-Agent': 'MarketingFairyApp/1.0'
            },
            cache: 'no-store' // Prevent Next.js from caching old errors or data
        });

        if (!geoResponse.ok) {
            console.error(`[Weather] Geocoding HTTP Error: ${geoResponse.status}`);
            throw new Error(`Geocoding failed: ${geoResponse.status}`);
        }

        const geoData = await geoResponse.json();
        console.log(`[Weather] Geocoding Response:`, JSON.stringify(geoData));

        let latitude, longitude, name;

        if (!geoData || geoData.length === 0) {
            console.warn(`[Weather] Could not find coordinates for ${location}, falling back to Seoul.`);
            latitude = 37.566;
            longitude = 126.9784;
            name = "Seoul";
        } else {
            latitude = parseFloat(geoData[0].lat);
            longitude = parseFloat(geoData[0].lon);
            const parts = geoData[0].display_name.split(",");
            name = parts[0];
        }

        console.log(`[Weather] Selected Coordinates: lat=${latitude}, lon=${longitude}, name=${name}`);

        // 3. Fetch Weather from Open-Meteo Forecast API
        // explicit units: temperature_unit=celsius (it is default, but added to be safe)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=celsius&timezone=auto`;
        console.log(`[Weather] Weather API URL: ${weatherUrl}`);

        const weatherResponse = await fetch(weatherUrl, {
            cache: 'no-store'
        });

        if (!weatherResponse.ok) {
            console.error(`[Weather] Weather HTTP Error: ${weatherResponse.status}`);
            throw new Error(`Weather API failed: ${weatherResponse.status}`);
        }

        const weatherData = await weatherResponse.json();
        console.log(`[Weather] Weather API Response:`, JSON.stringify(weatherData));

        return NextResponse.json({
            temp_C: Math.round(weatherData.current.temperature_2m).toString(),
            weatherCode: weatherData.current.weather_code,
            detectedLocation: name
        });

    } catch (error: any) {
        console.error("[Weather] API Error Detail:", error);

        // Fallback mock data to prevent UI breaks
        return NextResponse.json({
            temp_C: "20",
            weatherCode: 0,
            detectedLocation: "Seoul"
        });
    }
}
