const mapo = encodeURIComponent("마포구");
fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${mapo}&count=1&language=ko&format=json`)
    .then(r => r.json())
    .then(geo => {
        console.log("GEO:", JSON.stringify(geo));
        const { latitude, longitude } = geo.results[0];
        return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
    })
    .then(r => r.json())
    .then(weather => {
        console.log("WEATHER:", JSON.stringify(weather, null, 2));
    })
    .catch(e => console.error(e));
