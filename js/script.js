"use strict";
// Constants
const API_KEY = "&appid=3e6428fa21f3a15117a8b5558c08b036";
const API_URL = "https://api.openweathermap.org/data/2.5/";
// const API_KEY_G_PLACES = "AIzaSyDDqTXIJDEbYWvg8V30Au2gIdtTMX5R9dI";
const API_WEATHER_CODE = "weather?q=";
const API_FORECAST_CODE = "forecast?q=";
const API_UVI_CODE = "uvi?";
const API_UNITS_C = "&units=metric";
const API_UNITS_F = "&units=imperial";
const KEY_CITY = "weather_cities_searched";
const SEARCH_LIMIT = 10;  // The number of searches to store in local.
const FORECAST_LIMIT = 5;  // The number of daily forecast cards to display.
// These are required here to avoid typos when validating the values.
const WEATHER = "weather";
const FORECAST = "forecast";
const UVI = "uvi";

// Variables
let cities_searched = [];
let weatherStats = {temp: 0, humidity: 0, speed: 0};
let city_lookup_details;
let autocomplete;
let temp_c = false;  // when true, temperature units are displayed in degrees C.
let temp_c_searched = false;  // We need to know if the user searched in C / F

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


// Initialize and add the map
function initMap(centreLat, centreLon) {
    // Centre over the city that was searched for
    const citySearched = { lat: centreLat, lng: centreLon };
    // The map, centered at the city seached for.
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: MAP_ZOOM_LEVEL,
        center: citySearched,
    });
    // The marker, positioned at the city searched for
    // TODO Replace with weather icon.
    const marker = new google.maps.Marker({
        position: citySearched,
        map: map,
    });
}


function getWeatherResponse(city, expectation) {
    // TODO this needs to be tidied up, the city parameter is only used for UVI lat lon lookup.
    // The API is hit in 3 different locations. This function handles all three.
    let apiUrl;
    let apiUrlExtension = city_lookup_details[0] + "," + city_lookup_details[1] + "," + city_lookup_details[2] + API_KEY;

    // Determine the units being used for the search and parse to API.
    if (temp_c) {
        apiUrlExtension += API_UNITS_C;
        // record that we searched for temp c.Or when we do dynamic conversion on the data, it will double convert to celsius.
        temp_c_searched = true;
    } else {
        apiUrlExtension += API_UNITS_F;
        temp_c_searched = false;
    }

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
        if (expectation === WEATHER) {
            // Get the weather results, and store them in a global dictionary.
            displayLastSearched();
            console.log(response);
            weatherStats.temp = response.main.temp;
            weatherStats.humidity = response.main.humidity;
            weatherStats.speed = response.wind.speed;
            // Fire off the lat lon off and get the uv index.
            getWeatherResponse([response.coord.lat, response.coord.lon], UVI);
            initMap(response.coord.lat, response.coord.lon);
        } else if (expectation === UVI) {
            // Get the UV Index
            weatherStats.uvindex = response.value;
            // Compile all the stats required for the days weather, and update the page.
            updateWeatherStats(weatherStats.temp, weatherStats.humidity, weatherStats.speed, response.value);
        } else if (expectation === FORECAST) {
            // Simply get the required forecast information for six days.
            displayForecast(response.list);
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
        cityItem.text(city[0]);
        cityItem.attr("data-city", city[0]);
        cityItem.attr("data-state", city[1]);
        cityItem.attr("data-country", city[2]);
        lastSearched.prepend(cityItem);
        // TODO if user clicks one of these, it should parse itself and refresh the search.
    });
}

function updateWeatherStats(temp, humidity, speed, uvindex) {
    // Updates the weather stats for the main day weather.
    $('#deg-f').html(temp + "&deg;");
    $('#humidity').text(humidity + "%");
    $('#knots').text(speed);
    $('#uvi').text(uvindex);
}

function updateTempUnits() {
    // If user toggles button after the search, we still need to change the units displayed.
    let tempHolder = $('.temp-change-units');
    let i =0;
    let newTemp;
    for ( i; i < tempHolder.length; i++){
        // convert to Celsius.
        if (temp_c) {
            newTemp = fToDeg($(tempHolder[i]).text());
            console.log(newTemp);
        } else {
            // Convert to Farenheit.
            newTemp = dToFar($(tempHolder[i]).text());
        }
        // Update the span with the new values.
        $(tempHolder[i]).text(Math.round(newTemp * 10) / 10);
    }
}

function displayForecast(forecast) {
    // Apply an offset and get the weather for midday each day.
    // TODO this is too hardcoded.
    let fcCounter = 0;
    // Empty the forecast container
    $('#forecast-container').empty();

    forecast.forEach(function (item, index) {
        // TODO Rethink how to achieve the weather here, with max and mins.
        if (index % 8 === 0) {

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
            var tempDate = item.dt_txt;
            tempDate = tempDate.split(" ")[0];
            tempDate = tempDate.split("-");
            tempDate = tempDate[2] + "/" + tempDate[1] + "/" +tempDate[0]

            // Construct the list item.
            fcList.append($('<li>').text(tempDate));
            fcList.append($('<li>').html('<span class="temp-change-units">' + item.main.temp_max + "</span>"));
            fcList.append($('<li>').text(item[2]));

            // Construct the forecast card.
            cardContent.append(fcList);
            cardStacked.append(cardContent);
            cardHz.append(cardStacked);
            fcDiv.append(cardHz);
            $('#forecast-container').append(fcDiv);

            // Tick the counter over.
            fcCounter += 1;

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
    // Get the immediate and forecast weather reports.
    getWeatherResponse("", WEATHER);
    getWeatherResponse("", FORECAST);
    storeCities(trimCityArray(cities_searched, city_lookup_details));
});


$('.city').click(function (event){
    event.preventDefault();
    // TODO this is only working for one single click :/
    city_lookup_details = [$(this).attr("data-city"), $(this).attr("data-state"), $(this).attr("data-country")];
    getWeatherResponse("", WEATHER);
    getWeatherResponse("", FORECAST);
    storeCities(trimCityArray(cities_searched, city_lookup_details));
});

$('#temp-units').click(function (event){
    if (temp_c) {
        temp_c = false;
        updateTempUnits();
    } else {
        temp_c = true;
        updateTempUnits();
    }
})
