function updateUnitIndicator(unitDiv, newIndicator) {
    // Simply updates the units indicator C/F
    return $(unitDiv).html(newIndicator);
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