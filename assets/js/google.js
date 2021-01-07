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