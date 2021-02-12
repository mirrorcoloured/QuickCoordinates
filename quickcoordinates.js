// TODO Look into using Maptiler or Mapbox for free versions

let firstkeydiv = document.querySelector("#firstkey");
let inpfirstkey = document.querySelector("#inpfirstkey");
let output_keymsg = document.querySelector("#keymsg");
let divmapcontainer;
let output_coords;
let divmap;
let pacinput;

let map = null;
let params = {};

// Wait for first-time api key entry
inpfirstkey.addEventListener("input", function (event) {
    if (isValidKey(inpfirstkey.value)) {
        params.APIKey = inpfirstkey.value;
        chrome.extension.sendMessage({
            cmd: "set_APIKey",
            data: {
                value: inpfirstkey.value
            },
        });
        setup();
    } else {
        output_keymsg.innerHTML = "Please enter a valid google API key.";
    }
})

function isValidKey(key) {
    if (key.length == 39) {
        return true;
    }
    return false;
}

function gm_authFailure() {
    console.log("WOMP API key failure");
}

// Pull data from storage
window.onload = function () {
    chrome.extension.sendMessage({ cmd: "getparams", }, function (response) {
        params = response;
        if (isValidKey(params.APIKey)) {
            setup();
        } else {
            inpfirstkey.focus();
        }
    });
}

// Modify page
function setup() {
    // Remove first key entry div
    firstkeydiv.parentElement.removeChild(firstkeydiv);

    // Inject reference to google api with key
    let inj_script = document.createElement("script");
    inj_script.type = 'text/javascript';
    inj_script.src = 'https://maps.googleapis.com/maps/api/js?v=3' + '&key=' + params.APIKey + '&libraries=places&callback=setup_map';
    document.body.appendChild(inj_script);

    // Inject map
    divmapcontainer = document.createElement("div");
    divmap = document.createElement("div");
    divmap.id = "map";
    output_coords = document.createElement("input");
    output_coords.id = "coords";
    output_coords.type = "text";
    divmapcontainer.appendChild(divmap);
    divmapcontainer.appendChild(output_coords);
    document.body.appendChild(divmapcontainer);

    // Inject search box
    pacinput = document.createElement("input");
    pacinput.id = "pac-input";
    pacinput.type = "text";
    pacinput.placeholder = "Enter a location";
    document.body.appendChild(pacinput);
}

// Enhance map functionality and ask browser for location
function setup_map() {
    // add to prototype functions to clear markers  https://stackoverflow.com/a/1544885
    google.maps.Map.prototype.markers = new Array();

    google.maps.Map.prototype.getMarkers = function () {
        return this.markers
    };

    google.maps.Map.prototype.clearMarkers = function () {
        for (var i = 0; i < this.markers.length; i++) {
            this.markers[i].setMap(null);
        }
        this.markers = new Array();
    };

    google.maps.Marker.prototype._setMap = google.maps.Marker.prototype.setMap;

    google.maps.Marker.prototype.setMap = function (map) {
        if (map) {
            map.markers[map.markers.length] = this;
        }
        this._setMap(map);
    }

    // Get location from browser
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(initialize_map, initialize_map);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// Insert map object, add listeners for interaction
function initialize_map(position) {

    // Set starting map position
    if (params.lastCenter == null) {
        try {
            params.lastCenter = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        } catch {
            // If no location is provided, default to the middle of the US and zoomed out
            params.lastCenter = new google.maps.LatLng(40, -98);
            params.lastZoom = 3;
        }
    }

    // Create map
    const mapOptions = {
        zoom: params.lastZoom,
        center: params.lastCenter
    }
    map = new google.maps.Map(divmap, mapOptions);

    // Setup search box
    let searchBox = new google.maps.places.SearchBox(pacinput);
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(pacinput);
    google.maps.event.addListener(searchBox, 'places_changed', function () {
        let places = searchBox.getPlaces();
        let bounds = new google.maps.LatLngBounds();
        bounds.extend(places[0].geometry.location);
        map.fitBounds(bounds);
        map.setZoom(Math.min(map.getZoom(), 12));
    });

    // Load last marker
    if (params.lastMarker) {
        map.clearMarkers();
        new google.maps.Marker({ position: params.lastMarker, map: map });
        const loc = params.lastMarker;
        output_coords.value = `${loc.lat}, ${loc.lng}`;
    }

    // Listen for clicks on the map
    google.maps.event.addListener(map, 'click', function (event) {
        const loc = event.latLng;
        output_coords.value = `${loc.lat()}, ${loc.lng()}`

        map.clearMarkers();
        new google.maps.Marker({ position: event.latLng, map: map });

        output_coords.select();
        output_coords.setSelectionRange(0, 99999); /* For mobile devices */
        document.execCommand("copy");

        params.lastMarker = event.latLng;
        chrome.extension.sendMessage({
            cmd: "set_lastMarker",
            data: {
                value: params.lastMarker
            },
        });
    });

    function updateZoom() {
        params.lastZoom = map.getZoom();
        chrome.extension.sendMessage({
            cmd: "set_lastZoom",
            data: {
                value: params.lastZoom
            },
        });
    }

    function updateCenter() {
        params.lastCenter = map.getCenter();
        chrome.extension.sendMessage({
            cmd: "set_lastCenter",
            data: {
                value: params.lastCenter
            },
        });
    }

    google.maps.event.addListener(map, 'zoom_changed', function () {
        updateZoom();
        updateCenter();
    })

    google.maps.event.addListener(map, 'dragend', function () {
        updateCenter();
    })

    // Set focus to search box
    focus_search();
    window.setTimeout(focus_search, 1000);
}

function focus_search() {
    pacinput.focus();
}