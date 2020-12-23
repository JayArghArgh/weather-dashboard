"use strict";
// Constants
const API_KEY = "&appid=3e6428fa21f3a15117a8b5558c08b036";
const API_URL = "https://api.openweathermap.org/data/2.5/";
const API_WEATHER_CODE = "weather?q=";
const API_FORECAST_CODE = "forecast?q=";
const API_UVI_CODE = "uvi?";
const API_UNITS_C = "&units=metric";
const API_UNITS_F = "&units=imperial";
const KEY_CITY = "weather_cities_searched";
const SEARCH_LIMIT = 10;  // The number of searches to store in local.
const MAX_FORECAST_DAYS = 5;
// These are required here to avoid typos when validating the values.
const WEATHER = "weather";
const FORECAST = "forecast";
const UVI = "uvi";
const IND_CEL = "C&deg;";
const IND_FAR = "F&deg;";
const ICON_BASE = 'http://openweathermap.org/img/wn/';

// Variables
let cities_searched = [];
let city_lookup_details;
let autocomplete;
let temp_c = false;  // when true, temperature units are displayed in degrees C.

let lastSearchDisplayed = false;


// For the map
const MAP_ZOOM_LEVEL = 9;


// Functions
function fToDeg(tempF){
    // *Screams in Artillery* "I need these results in Celsius you muppet!!!"
    return (tempF - 32) * (5 / 9);
}

function dToFar(tempC){
    // Converts Celsius to Fahrenheit for those that need big numbers.
    return tempC * (9 / 5) + 32;
}

function initAutocomplete() {
    // Create the autocomplete object, restricting the search predictions to
    // geographical location types.
    autocomplete = new google.maps.places.Autocomplete(
        document.getElementById("search-city"),
        { types: ["geocode"] }
    );
    // Avoid paying for data that you don't need by restricting the set of
    // place fields that are returned to just the address components.
    autocomplete.setFields(["address_component", "geometry"]);
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
        place.geometry.location.lat(),
        place.geometry.location.lng()
    ]

    // console.log(city_lookup_details);
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


// Initialize and add the map
function initMap() {
    // Centre over the city that was searched for
    const citySearched = { lat: city_lookup_details[3], lng: city_lookup_details[4] };
    // The map, centered at the city seached for.
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: MAP_ZOOM_LEVEL,
        center: citySearched,
        disableDefaultUI: true,
        gestureHandling: "none",
        zoomControl: false,
    });
    // The marker, positioned at the city searched for
    const marker = new google.maps.Marker({
        position: citySearched,
        map: map,
    });
}

function getWeatherResponse() {
    let apiUrl = "https://api.openweathermap.org/data/2.5/onecall?lat=" + city_lookup_details[3] + "&lon=" + city_lookup_details[4];
    // &exclude={part}
    // Determine the units being used for the search and parse to API.
    if (temp_c) {
        apiUrl += API_UNITS_C;
    } else {
        apiUrl += API_UNITS_F;
    }
    apiUrl += API_KEY;

    // The Ajax query itself.
    $.ajax({
        url: apiUrl,
        method: "GET"
    }).then(function(response) {
        // initMap();
        let weatherDetails = response.current;
        let forecastDetails = response.daily;
        updateWeatherStats(weatherDetails.temp, weatherDetails.humidity, weatherDetails.wind_speed, weatherDetails.uvi, weatherDetails.weather[0].icon);
        displayForecast(forecastDetails);
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
    console.log("last searched");
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
        cityItem.text(city[0]);
        lastSearched.prepend(cityItem);

        $('.city').click(function (event){
            event.stopPropagation();
            // TODO this is only working for one single click :/
            // event.preventDefault();
            city_lookup_details = [city[0], city[1], city[2]];
            getWeatherResponse(WEATHER);
            getWeatherResponse(FORECAST);
            storeCities(trimCityArray(cities_searched, city_lookup_details));
        });
    });
}

function updateWeatherStats(temp, humidity, speed, uvindex, iconToUse) {
    // Update the title information.
    // TODO this can be done neater.
    $('.city-title').text(city_lookup_details[0] + " " + moment().format("(DD/MM/YYYY)"));
    $('.weather-icon').html('<img src="' + ICON_BASE +  iconToUse + '.png" alt="weather icon">');
    // Updates the weather stats for the main day weather.
    $('#deg-f').html('<span class="temp-change-units">' + temp + '</span> ');
    // start with the correct temperature indicator
    if (temp_c) {
        $('#deg-f').append('<span className="unit-indicator-deg">C</span>');
    } else {
        $('#deg-f').append('<span class="unit-indicator-deg">F</span>');
    }
    $('#humidity').text(humidity);
    $('#humidity').append("%");
    $('#knots').text(speed);
    $('#uvi').text(uvindex);
}

function updateUnitIndicator(unitDiv, newIndicator) {
    // Simply updates the units indicator C/F
    return $(unitDiv).html(newIndicator);
}

function updateTempUnit() {
    // Changes the temperature units for the user.
    let tempHolder = $('.temp-change-units');
    let i =0;
    let newTemp;
    for ( i; i < tempHolder.length; i++){
        // convert to Celsius.
        if (temp_c) {
            newTemp = fToDeg($(tempHolder[i]).text());
            updateUnitIndicator($(tempHolder[i]).siblings(), IND_CEL);

        } else {
            // Convert to Farenheit.
            newTemp = dToFar($(tempHolder[i]).text());
            updateUnitIndicator($(tempHolder[i]).siblings(), IND_FAR);
        }
        // Update the span with the new values.
        $(tempHolder[i]).text(Math.round(newTemp * 100) / 100);
    }
}

function displayForecast(forecast) {
    console.log(forecast);
    // Apply an offset and get the weather for midday each day.
    // TODO this is too hardcoded.
    let fcCounter = 1;
    // Empty the forecast container
    let forecastContainer = $('#forecast-container');
    forecastContainer.empty();

    while (fcCounter < MAX_FORECAST_DAYS + 1) {
        let item = forecast[fcCounter];
        let fcDivOffset = "offset-l1 offset-m1";
        let fcDiv = $('<div>').addClass("col s12 m2 l2");
        let cardHz = $('<div>').addClass("card horizontal");
        let cardStacked = $('<div>').addClass("card-stacked");
        let cardContent = $('<div>').addClass("card-content");
        let fcList = $('<ul>');

        // Offset the first element as we're fitting 5 items in a col-12
        // TODO This needs to be done dynamically.
        if (fcCounter === 0) {
            fcDiv.addClass(fcDivOffset);
        }

        // Extract and format the date.
        // TODO Find out why moment ws too painful for this simple string. #blamingTheTools!
        var tempDate = item.dt;
        tempDate = moment.unix(tempDate).format("MM/DD/YYYY");
        // Construct the list item.
        fcList.append($('<li>').text(tempDate));
        fcList.append($('<img src="' + ICON_BASE + item.weather[0].icon + '.png">'));
        fcList.append($('<li>').html('<span class="temp-change-units">' + item.temp.max + "</span>"));
        fcList.append($('<li>').text("Humidity " + item.humidity + " %"));

        // Construct the forecast card.
        cardContent.append(fcList);
        cardStacked.append(cardContent);
        cardHz.append(cardStacked);
        fcDiv.append(cardHz);
        forecastContainer.append(fcDiv);

        // Tick the counter over.
         fcCounter ++;
    }
}


// Statements
// load cities
if (retrieveCities()) {
    cities_searched = retrieveCities();
    // displayLastSearched();
}

$('#search-button').click(function (event) {
    event.preventDefault();
    // Get the immediate and forecast weather reports.
    getWeatherResponse();
    // getWeatherResponse(WEATHER);
    // getWeatherResponse(FORECAST);
    // storeCities(trimCityArray(cities_searched, city_lookup_details));
});


$('#temp-units').click(function (event){
    if (temp_c) {
        temp_c = false;
    } else {
        temp_c = true;
    }
    updateTempUnit();
    updateUnitIndicator();
})

// this is being snafu.
// displayLastSearched();