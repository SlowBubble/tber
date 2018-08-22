
/////////// Constants
var apiKey = '5c68021c1c0942258e03ab1c82fd289a';
var redVehiclesUrl = getQueryUrl('vehicles', 'Red', apiKey); 
var redStopsUrl = getQueryUrl('stops', 'Red', apiKey); 

/////////// Vars initialized asynchronously
var vehicles = [];
var stops = [];
var map; // Done in another script;
var vehicleIdToMarker = {};

/////////// Mbta  data initialization
getAndUpdateVehiclesPosition();
window.setInterval(getAndUpdateVehiclesPosition, 8000);

function getAndUpdateVehiclesPosition() {
  $.get(redVehiclesUrl, function(data, status, xhr){
    vehicles = getVehicles(data);
    onGoogleReady(function() {
      addArrows(vehicles);      
    });
  }, 'json');
}

$.get(redStopsUrl, function(data) {
  data.data.forEach(function(stop) {
    stop.lat = stop.attributes.latitude;
    stop.lng = stop.attributes.longitude;
    stops.push(stop);
  });
  onGoogleReady(function() {
    addMarkers(stops);
  });
}, 'json');

/////////// Helpers 
function onGoogleReady(callback) {
  if (typeof google !== 'undefined') {
    callback();
  } else {
    var job = window.setInterval(function() {
      if (typeof google !== 'undefined') {
        clearInterval(job);
        callback();     
      }
      console.log('Google has gone from unready to ready!');
    }, 300);
  }    
}
function getQueryUrl(queryBy, route, apiKey) {
  return 'https://api-v3.mbta.com/' + queryBy + '?apiKey=' + apiKey + '&filter[route]=' + route;
}

function getVehicles(vehiclesData) {
  vehicles = [];
  vehiclesData.data.forEach(function(vehicle) {
    vehicle.lat = vehicle.attributes.latitude;
    vehicle.lng = vehicle.attributes.longitude;
    vehicle.bearing = vehicle.attributes.bearing;
    vehicle.vehicle_label = vehicle.attributes.label;
    vehicle.vehicle_id = vehicle.id;
    vehicles.push(vehicle);
  });
  return vehicles;
}

function addMarkers(stops) {
  var square = {
    path: 'M -10 10 L 10 10 L 10 -10 L -10 -10 z',
    fillColor: 'white',
    fillOpacity: 0.2,
    scale: 1,
    strokeColor: 'black',
    strokeWeight: 1,
  };
  stops.forEach(function(stop) {
    new google.maps.Marker({
      position: stop,
      map: map,
      icon: square,
    });
  });   
}

function addArrows(vehicles) {
  vehicles.forEach(function(vehicle) {
    var marker = vehicleIdToMarker[vehicle.vehicle_id]
    if (marker === undefined) {
      var fillColor = 'yellow';
      if (vehicle.vehicle_label[1] == 8) {
        fillColor = 'blue'; 
      }
      var arrow = {
        path: 'M -5 15 L 5 15 L 0 0 z',
        fillColor: fillColor,
        fillOpacity: 1,
        scale: 1,
        strokeColor: 'black',
        strokeWeight: 1,
        rotation: vehicle.bearing,
      };
      vehicleIdToMarker[vehicle.vehicle_id] = new google.maps.Marker({
        position: vehicle,
        icon: arrow,
        map: map,
        label: vehicle.vehicle_label,
      });
    } else {
      marker.setPosition(vehicle);
    }
  });   
}

function initMap(latitude, longitude) {
  latitude = latitude || 42.391549;
  longitude = longitude || -71.1249078;
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: latitude, lng: longitude},
    zoom: 13,
  });
}
