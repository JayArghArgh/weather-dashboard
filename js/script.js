"use strict";
// Constants
const API_KEY = "&appid=3e6428fa21f3a15117a8b5558c08b036";
const API_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather?q=";
const API_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast?q=";
const KEY_CITY = "weather_cities_searched";
const SEARCH_LIMIT = 10;
// Variables
let cities_searched = [];


// Functions
function getResponse(apiUrl) {
    $.ajax({
        url: apiUrl,
        method: "GET"
    }).then(function(response) {
        displayLastSearched();
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
        if (index === cities_searched.length - 1) {
            lastSearched.prepend('<a href="#!" class="collection-item blue active">' + city + '</a>')
        } else {
            // Everything else is standard.
            lastSearched.prepend('<a href="#!" class="collection-item blue-text">' + city + '</a>')
        }
    });
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
        let immediateWeatherURL = API_WEATHER_URL + searchCity + API_KEY;
        // let forecastWeatherURL = API_FORECAST_URL + searchCity + API_KEY;
        // Get the immediate and forecast weather reports.
        getResponse(immediateWeatherURL);
        // getResponse(forecastWeatherURL);
        // Add the city to the recently searched array and store it in local.
        storeCities(trimCityArray(cities_searched, searchCity));
    }
});


