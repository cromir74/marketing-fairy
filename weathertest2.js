const location = "마포구";
const encodedLocation = encodeURIComponent(location.trim());

async function test() {
    try {
        console.log(`[Weather] Geocoding URL: https://nominatim.openstreetmap.org/search?q=${encodedLocation}&format=json&limit=1`);
        const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodedLocation}&format=json&limit=1`, {
            headers: {
                'User-Agent': 'MarketingFairyApp/1.0'
            }
        });

        if (!geoResponse.ok) {
            console.error(`[Weather] Geocoding HTTP Error: ${geoResponse.status}`);
            const text = await geoResponse.text();
            console.error(text);
            return;
        }

        const geoData = await geoResponse.json();
        console.log(`[Weather] Geocoding Response:`, JSON.stringify(geoData));

        if (!geoData || geoData.length === 0) {
            console.warn(`[Weather] Could not find coordinates for ${location}`);
            return;
        }

        const latitude = parseFloat(geoData[0].lat);
        const longitude = parseFloat(geoData[0].lon);
        const parts = geoData[0].display_name.split(",");
        const name = parts[0];

        console.log(`[Weather] Selected Coordinates: lat=${latitude}, lon=${longitude}, name=${name}`);

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=celsius&timezone=auto`;
        console.log(`[Weather] Weather API URL: ${weatherUrl}`);

        const weatherResponse = await fetch(weatherUrl);

        if (!weatherResponse.ok) {
            console.error(`[Weather] Weather HTTP Error: ${weatherResponse.status}`);
            const text = await weatherResponse.text();
            console.error(text);
            return;
        }

        const weatherData = await weatherResponse.json();
        console.log(`[Weather] Weather API Response:`, JSON.stringify(weatherData));

    } catch (error) {
        console.error("Caught error:", error);
    }
}

test();
