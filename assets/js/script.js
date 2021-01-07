"use strict";
// Constants
// For the map
const MAP_ZOOM_LEVEL = 9;
const API_KEY = "&appid=3e6428fa21f3a15117a8b5558c08b036";
const API_URL = "https://api.openweathermap.org/data/2.5/onecall?";
const API_UNITS_C = "&units=metric";
const API_UNITS_F = "&units=imperial";
const KEY_CITY = "weather_cities_searched";
const SEARCH_LIMIT = 10;  // The number of searches to store in local.
const MAX_FORECAST_DAYS = 5;
const IND_CEL = "C&deg;";
const IND_FAR = "F&deg;";
const ICON_BASE = 'https://openweathermap.org/img/wn/';

// Variables
let citiesSearched = [];
let cityLookupDetails;
let autocomplete;
let tempC = false;  // when true, temperature units are displayed in degrees C.

// load cities
citiesSearched = retrieveCities();
displayLastSearched();

$('#search-button').click(function (event) {
    event.preventDefault();
    // Get the weather.
    getWeatherResponse();
});


$('#temp-units').click(function (event){
    if (tempC) {
        tempC = false;
    } else {
        tempC = true;
    }
    updateTempUnit();
    updateUnitIndicator();
})

$('#last-searched').click(function (event) {
    event.preventDefault();
    event.stopPropagation();
    let searchedItem = event.target;

    // Grab the items lookup data so the search can be refreshed by simply clicking the item.
    cityLookupDetails = [
        searchedItem.getAttribute("data-city"),
        searchedItem.getAttribute("data-state"),
        searchedItem.getAttribute("data-country"),
        parseFloat(searchedItem.getAttribute("data-lat")),
        parseFloat(searchedItem.getAttribute("data-lon"))
    ];
    getWeatherResponse();
})
