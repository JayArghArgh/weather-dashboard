const SEARCH_LIMIT = 10;  // The number of searches to store in local.
const KEY_CITY = "weather_cities_searched";
let citiesSearched = [];

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

citiesSearched = retrieveCities();