// TODO
// add search box (https://docs.mapbox.com/help/tutorials/local-search-geocoding-api/)
// add 'current location' button
// option to use own access token
// custom style?

let output_coords = document.querySelector("#coords");

// Zoom-level to significant digits factors (https://xkcd.com/2170/):
// digits = zoom * A + B
const A = 0.3;
const B = 0.3;

const UpdateDelayMS = 100;

let params = {};
let mapboxmap = null;
let marker = null;
mapboxgl.accessToken = 'pk.eyJ1IjoicGF1bGNocmFzdGluYSIsImEiOiJja21uaHEyajIxdXpwMm90NDBjNnFyNjJjIn0.Pvq8kldCSJmkiBZOj_HNDQ';
let updateTimeout = null;

// Pull data from storage
window.onload = function () {
    chrome.extension.sendMessage({ cmd: "getparams", }, function (response) {
        params = response;

        // Get location from browser if available
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(setup, setup);
        } else {
            console.log("Geolocation is not supported by this browser.");
            setup(null);
        }
    });
}


function setup(position) {
    let browserloc = null;
    let zoomlevel = 2; // country level
    if (position) {
        browserloc = [position.coords.longitude, position.coords.latitude];
        zoomlevel = 8; // city level
    }

    mapboxmap = new mapboxgl.Map({
        container: 'map', // parent element id
        // style: 'mapbox://styles/mapbox/streets-v11',
        style: 'mapbox://styles/paulchrastina/ckn6ictru0cky17r22amto0ld', // satellite
        // style: 'mapbox://styles/paulchrastina/ckn6i52s70cf017o1lwwhwx5g', // standard
        // style: 'mapbox://styles/paulchrastina/ckn6i67c4056d17nv85vr0boj', // decimal
        center: (params.lastCenter || browserloc) || [-96.746, 42.0655], // center of US
        zoom: params.lastZoom || zoomlevel,
    });
    mapboxmap.on('click', clickMap);
    mapboxmap.on('zoom', triggerUpdate);
    mapboxmap.on('move', triggerUpdate);

    // for (let i = 0; i < 10; i++) {
    //     TESTshowZoomLevels(i);
    // }

    if (params.lastMarker) {
        setMarker(params.lastMarker);
        setCoordinateText(params.lastMarker, false);
    }
}

function TESTshowZoomLevels(digit) {
    const [x, y] = [-96.746, 42.0655];
    const offset = 1 / (10 ** digit);
    const br = new mapboxgl.Marker()
        .setLngLat([x + offset, y])
        .addTo(mapboxmap);
    const tr = new mapboxgl.Marker()
        .setLngLat([x + offset, y + offset])
        .addTo(mapboxmap);
    const tl = new mapboxgl.Marker()
        .setLngLat([x, y + offset])
        .addTo(mapboxmap);
    const bl = new mapboxgl.Marker()
        .setLngLat([x, y])
        .addTo(mapboxmap);
}

function clickMap(event) {
    const digits = mapboxmap.getZoom() * A + B;
    const lngLat = [roundToDigits(event.lngLat.lng, digits), roundToDigits(event.lngLat.lat, digits)];

    setMarker(lngLat);
    setCoordinateText(lngLat);
    updateLastMarker(lngLat);
}

function setMarker(lngLat) {
    if (marker == null) {
        marker = new mapboxgl.Marker({ color: "#e4610f" })
            .setLngLat(lngLat)
            .addTo(mapboxmap);
        marker.getElement().addEventListener("click", e => window.setTimeout(removeMarker, 1));
    } else {
        marker.setLngLat(lngLat)
    }
}

function removeMarker() {
    const element = marker.getElement();
    element.parentNode.removeChild(element);
    marker = null;
    output_coords.value = "";
    updateLastMarker(null);
}

function setCoordinateText(lngLat, copyToClipboard = true) {
    output_coords.value = `${lngLat[1]}, ${lngLat[0]}`
    if (copyToClipboard) {
        output_coords.select();
        output_coords.setSelectionRange(0, 99999); /* For mobile devices */
        document.execCommand("copy");
    }
}

function updateLastMarker(lngLat) {
    params.lastMarker = lngLat;
    chrome.extension.sendMessage({
        cmd: "set_lastMarker",
        data: {
            value: params.lastMarker
        },
    });
}

function updateZoom(zoom) {
    params.lastZoom = zoom;
    chrome.extension.sendMessage({
        cmd: "set_lastZoom",
        data: {
            value: params.lastZoom
        },
    });
}

function updateCenter(center) {
    params.lastCenter = center;
    chrome.extension.sendMessage({
        cmd: "set_lastCenter",
        data: {
            value: params.lastCenter
        },
    });
}

function triggerUpdate() {
    if (updateTimeout != null) {
        clearTimeout(updateTimeout);
    }
    updateTimeout = window.setTimeout(doUpdate, UpdateDelayMS);
}

function doUpdate() {
    updateZoom(mapboxmap.getZoom());
    updateCenter(mapboxmap.getCenter());
    updateTimeout = null;
}

function roundToDigits(num, digits) {
    return Number(num.toFixed(digits));
}