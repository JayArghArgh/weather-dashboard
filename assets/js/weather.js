
function fToDeg(tempF){
    // *Screams in Artillery* "I need these results in Celsius you muppet!!!"
    return (tempF - 32) * (5 / 9);
}

function dToFar(tempC){
    // Converts Celsius to Fahrenheit for those that need big numbers.
    return tempC * (9 / 5) + 32;
}

function getWeatherResponse() {
    // Build the URL and collect the weather response.
    let apiUrl = API_URL + "lat=" + cityLookupDetails[3] + "&lon=" + cityLookupDetails[4];

    // Determine the units being used for the search and parse to API.
    if (tempC) {
        apiUrl += API_UNITS_C;
    } else {
        apiUrl += API_UNITS_F;
    }
    apiUrl += API_KEY;

    // Collect the response.
    $.ajax({
        url: apiUrl,
        method: "GET"
    }).then(function(response) {
        initMap();
        // Send to build today's weather report and the x day forecast.
        let weatherDetails = response.current;
        let forecastDetails = response.daily;
        updateWeatherStats(weatherDetails);
        displayForecast(forecastDetails);
        storeCities(cityLookupDetails);
        citiesSearched = retrieveCities();
        displayLastSearched();
    });
}