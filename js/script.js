"use strict";
// Constants
const API_KEY = "&appid=3e6428fa21f3a15117a8b5558c08b036";
const API_URL = "https://api.openweathermap.org/data/2.5/";
const API_KEY_G_PLACES = "AIzaSyDDqTXIJDEbYWvg8V30Au2gIdtTMX5R9dI";
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
let city_lookup_details;

let placeSearch;
let autocomplete;
const componentForm = {
    street_number: "short_name",
    route: "long_name",
    locality: "long_name",
    administrative_area_level_1: "short_name",
    country: "long_name",
    postal_code: "short_name",
};

// Functions
function initAutocomplete() {
    // Create the autocomplete object, restricting the search predictions to
    // geographical location types.
    autocomplete = new google.maps.places.Autocomplete(
        document.getElementById("search-city"),
        { types: ["geocode"] }
    );
    // Avoid paying for data that you don't need by restricting the set of
    // place fields that are returned to just the address components.
    autocomplete.setFields(["address_component"]);
    // When the user selects an address from the drop-down, populate the
    // address fields in the form.
    autocomplete.addListener("place_changed", setCity);
}

function setCity() {
    // Get the place details from the autocomplete object. and set the global variable.
    const place = autocomplete.getPlace();

    let setState = "";
    let setCountry = "";

    // Flush out the state and Country from the administrative areas.
    place.address_components.forEach(function (placeItem) {
        if (placeItem.types[0] === "administrative_area_level_1") {
            setState = placeItem.short_name;
        } else if (placeItem.types[0] === "country") {
            setCountry = placeItem.short_name;
        }
    });

    city_lookup_details = [
        place.address_components[0].long_name,
        setState,
        setCountry,
    ]
}

// Bias the autocomplete object to the user's geographical location,
// as supplied by the browser's 'navigator.geolocation' object.
function geolocate() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const geolocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };
            const circle = new google.maps.Circle({
                center: geolocation,
                radius: position.coords.accuracy,
            });
            autocomplete.setBounds(circle.getBounds());
        });
    }
}


function getWeatherResponse(city, expectation) {
    // TODO this needs to be tidied up, the city parameter is only used for UVI lat lon lookup.
    // The API is hit in 3 different locations. This function handles all three.
    let apiUrl;
    let apiUrlExtension =  + city_lookup_details[0] + "," + city_lookup_details[1] + "," + city_lookup_details[2] + API_KEY;
    // Adjust the url pending the required result. (Weather, forecast, or UV lookup)
    switch (expectation) {
        case WEATHER:
            apiUrl = API_URL + API_WEATHER_CODE + apiUrlExtension;
            break;
        case FORECAST:
            apiUrl = API_URL + API_FORECAST_CODE + apiUrlExtension;
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
        let cityItem = $('<a href="#!">');
        if (index === cities_searched.length - 1) {
            cityItem.addClass("collection-item city blue active");
        } else {
            cityItem.addClass("collection-item city blue-text");
        }
        // console.log(city)
        cityItem.text(city[0]);
        cityItem.attr("data-city", city[0]);
        cityItem.attr("data-state", city[1]);
        cityItem.attr("data-country", city[2]);
        lastSearched.prepend(cityItem);
        // TODO if user clicks one of these, it should parse itself and refresh the search.
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
    // Get the immediate and forecast weather reports.
    getWeatherResponse("", WEATHER);
    getWeatherResponse("", FORECAST);
    storeCities(trimCityArray(cities_searched, city_lookup_details));
});


$('.city').click(function (event){
    event.preventDefault();
    console.log("repeated");
    // TODO this is only working for one single click :/
    city_lookup_details = [$(this).attr("data-city"), $(this).attr("data-state"), $(this).attr("data-country")];
    getWeatherResponse("", WEATHER);
    getWeatherResponse("", FORECAST);
    console.log(city_lookup_details);
    storeCities(trimCityArray(cities_searched, city_lookup_details));
});

