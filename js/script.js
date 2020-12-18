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
const FORECAST_LIMIT = 5;  // The number of daily forecast cards to display.
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
    let apiUrlExtension = city_lookup_details[0] + "," + city_lookup_details[1] + "," + city_lookup_details[2] + API_KEY;
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
    $('#deg-f').html(temp + "&deg;F");
    $('#humidity').text(humidity + "%");
    $('#knots').text(speed);
    $('#uvi').text(uvindex);
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
            fcList.append($('<li>').text(item.main.temp_max));
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
