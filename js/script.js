const API_KEY = "3e6428fa21f3a15117a8b5558c08b036";
let queryURL = "https://api.openweathermap.org/data/2.5/weather?";
let queryForecastURL = "https://api.openweathermap.org/data/2.5/forecast?";

let city_name = "adelaide";
let state_code = "sa";
let country_code = "au";

// Construct the URLs
queryURL += "q=" + city_name + "," + state_code +"," + country_code;
queryForecastURL += "q=" + city_name;
queryURL += "&appid=" + API_KEY;
queryForecastURL += "&appid=" + API_KEY;


function getResponse(apiUrl) {
    $.ajax({
        url: apiUrl,
        method: "GET"
    }).then(function(response) {
        console.log(response);
    });
}

// getResponse(queryURL);
// getResponse(queryForecastURL);
