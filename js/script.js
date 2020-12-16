"use strict";
// Constants
const API_KEY = "&appid=3e6428fa21f3a15117a8b5558c08b036";
const API_URL = "https://api.openweathermap.org/data/2.5/";
const API_WEATHER_CODE = "weather?q=";
const API_FORECAST_CODE = "forecast?q=";
const API_UVI_CODE = "uvi?";
const KEY_CITY = "weather_cities_searched";
const SEARCH_LIMIT = 10;  // The number of searches to store in local.
// These are required here to avoid typos when validating the values.
const WEATHER = "weather";
const FORECAST = "forecast";
const UVI = "uvi";

// Variables
let cities_searched = [];
let weatherStats = {temp: 0, humidity: 0, speed: 0};

// Functions
function getWeatherResponse(city, expectation) {
    // The API is hit in 3 different locations. This function handles all three.
    let apiUrl;
    // Adjust the url pending the required result. (Weather, forecast, or UV lookup)
    switch (expectation) {
        case WEATHER:
            apiUrl = API_URL + API_WEATHER_CODE + city + API_KEY;
            break;
        case FORECAST:
            apiUrl = API_URL + API_FORECAST_CODE + city + API_KEY;
            break;
        case UVI:
            // UV requires lat lon in place of city. These are parsed back to this function as an array in the city parameter.
            apiUrl = API_URL + API_UVI_CODE + "lat=" + city[0] + "&lon=" + city[1] + API_KEY;
            break;
    }

    // The Ajax query itself.
    $.ajax({
        url: apiUrl,
        method: "GET"
    }).then(function(response) {
        // TODO Test for 404 not found.
        if (expectation === WEATHER) {
            // Get the weather results, and store them in a global dictionary.
            displayLastSearched();
            weatherStats.temp = response.main.temp;
            weatherStats.humidity = response.main.humidity;
            weatherStats.speed = response.wind.speed;
            // Fire off the lat lon off and get the uv index.
            getWeatherResponse([response.coord.lat, response.coord.lon], UVI);
        } else if (expectation === UVI) {
            // Get the UV Index
            weatherStats.uvindex = response.value;
            // Compile all the stats required for the days weather, and update the page.
            updateWeatherStats(weatherStats.temp, weatherStats.humidity, weatherStats.speed, response.value);
        } else if (expectation === FORECAST) {
            // Simply get the required forecast information for six days.
            console.log(FORECAST);
        }
    });
}

function storeCities(cityArrayToStore) {
    // Updates local storage.
    localStorage.setItem(KEY_CITY, JSON.stringify(cities_searched));
}

function retrieveCities() {
    // Retrieves locally stored cities.
    if (localStorage.getItem(KEY_CITY)) {
        return JSON.parse(localStorage.getItem(KEY_CITY));
    } else {
        return false;
    }
}

function trimCityArray(cityArrayToTrim, cityToAdd) {
    // keeps the recent searches to the limited amount.
    if (cityArrayToTrim.length +1 > SEARCH_LIMIT) {
        cityArrayToTrim.shift();
    }
    // add the new item
    cityArrayToTrim.push(cityToAdd);
    return cityArrayToTrim;
}

function displayLastSearched() {
    // Display the last searched cities for the user, in reverse order.
    let lastSearched = $('#last-searched');
    lastSearched.empty();
    $('#search-city').val("");
    // The last item should be the current search.
    cities_searched.forEach(function (city, index) {
        // TODO if user clicks one of these, it should parse itself and refresh the search.
        if (index === cities_searched.length - 1) {
            lastSearched.prepend('<a href="#!" class="collection-item blue active">' + city + '</a>')
        } else {
            // Everything else is standard.
            lastSearched.prepend('<a href="#!" class="collection-item blue-text">' + city + '</a>')
        }
    });
}

function updateWeatherStats(temp, humidity, speed, uvindex) {
    $('#deg-f').html(temp + "&deg;F");
    $('#humidity').text(humidity + "%");
    $('#knots').text(speed);
    $('#uvi').text(uvindex);
}

// Statements
// load cities
if (retrieveCities()) {
    cities_searched = retrieveCities();
    displayLastSearched();
}

$('#search-button').click(function (event) {
    event.preventDefault();
    // Trim the user input and set the variable we'll use.
    let searchCity = $.trim($('#search-city').val());

    // Only proceed if there's a value. Build the URL.
    if (searchCity) {
        // Get the immediate and forecast weather reports.
        getWeatherResponse(searchCity, WEATHER);
        storeCities(trimCityArray(cities_searched, searchCity));
        getWeatherResponse(searchCity, FORECAST);
    }
});


