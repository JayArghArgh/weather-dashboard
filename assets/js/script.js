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

    cityLookupDetails = [
        place.address_components[0].long_name,
        setState,
        setCountry,
        place.geometry.location.lat(),
        place.geometry.location.lng()
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
function initMap() {
    // Centre over the city that was searched for
    const citySearched = { lat: cityLookupDetails[3], lng: cityLookupDetails[4] };
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

function storeCities(cityArrayToStore) {
    // Updates local storage.
    // Check we're not over the limit, pop if we are.
    if (citiesSearched.length === SEARCH_LIMIT) {
        citiesSearched.pop();
    }
    // Add the new item and store.
    citiesSearched.push(cityArrayToStore);
    localStorage.setItem(KEY_CITY, JSON.stringify(citiesSearched));
}

function retrieveCities() {
    // Retrieves locally stored cities.
    if (localStorage.getItem(KEY_CITY)) {
        return JSON.parse(localStorage.getItem(KEY_CITY));
    } else {
        return citiesSearched;
    }
}

function displayLastSearched() {
    // Display the last searched cities for the user, in reverse order.
    let lastSearched = $('#last-searched');
    lastSearched.empty();
    $('#search-city').val("");
    // The last item should be the current search.
    if (citiesSearched.length > 0) {
        citiesSearched.forEach(function (city, index) {
            let cityItem = $('<a href="#!">');
            if (index === citiesSearched.length - 1) {
                cityItem.addClass("collection-item city blue active");
            } else {
                cityItem.addClass("collection-item city blue-text");
            }
            // Build the item that contains the city lookup data.
            cityItem.attr('id', 'citySearched-' + index);
            // TODO These should be stored using data() not as individual strings.
            cityItem.attr("data-city", city[0]);
            cityItem.attr("data-state", city[1])
            cityItem.attr("data-country", city[2])
            cityItem.attr("data-lat", city[3])
            cityItem.attr("data-lon", city[4])

            // Set what it is we want to display. (ie City only)
            // cityItem.text(city[0]);
            cityItem.text(city[0] + ", " + city[1]);

            // prepend it so it is on to of the list.
            lastSearched.prepend(cityItem);
        });
    }
}

function updateWeatherStats(weatherDetails) {
    // Creates and populates a div of the main weather stats.
    $('.city-title').text(cityLookupDetails[0] + " " + moment().format("(DD/MM/YYYY)"));
    $('.weather-icon').html('<img src="' + ICON_BASE +  weatherDetails.weather[0].icon + '.png" alt="weather icon">');
    // Updates the weather stats for the main day weather.
    $('#deg-f').html('<span class="temp-change-units">' + weatherDetails.temp + '</span> ' + selectUnitIndicator());
    // start with the correct temperature indicator
    $('#humidity').text(weatherDetails.humidity + "%");
    $('#knots').text(weatherDetails.wind_speed);
    $('#uvi').text(weatherDetails.uvi);
}

function selectUnitIndicator() {
    // Returns the correct unit indicator ie F / C
    let unitIndicator;
    if (tempC) {
        unitIndicator = '<span className="unit-indicator-deg">C</span>';
    } else {
        unitIndicator = '<span class="unit-indicator-deg">F</span>';
    }
    return unitIndicator;
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
        if (tempC) {
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
    // Apply an offset and get the weather for midday each day.
    // TODO this is too hardcoded.
    let fcCounter = 1;
    // Empty the forecast container
    let forecastContainer = $('#forecast-container');
    forecastContainer.empty();

    while (fcCounter < MAX_FORECAST_DAYS + 1) {
        let item = forecast[fcCounter];
        let fcDiv = $('<div>').addClass("col s12 m2 l2");
        let cardHz = $('<div>').addClass("card horizontal");
        let cardStacked = $('<div>').addClass("card-stacked");
        let cardContent = $('<div>').addClass("card-content");
        let fcList = $('<ul>');


        // Extract and format the date.
        // TODO Find out why moment ws too painful for this simple string. #blamingTheTools!
        var tempDate = item.dt;
        tempDate = moment.unix(tempDate).format("MM/DD/YYYY");
        // Construct the list item.
        fcList.append($('<li>').text(tempDate));
        fcList.append($('<img src="' + ICON_BASE + item.weather[0].icon + '.png">'));
        fcList.append($('<li>').html('<span class="temp-change-units">' + item.temp.max + "</span>" + selectUnitIndicator()));
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

    var searchedItem = event.target;

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