
/////////// Constants
var apiKey = 'SGED1xrcdUiBRkdRrq6zJQ';
var redVehiclesUrl = getQueryUrl('vehiclesbyroutes', 'routes', 'Red', apiKey); 
var redPredictionsUrl = getQueryUrl('predictionsbyroutes', 'routes', 'Red', apiKey);
var redStopsUrl = getQueryUrl('stopsbyroute', 'route', 'Red', apiKey); 

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
  data.direction[0].stop.forEach(function(stop) {
    stop.lat = parseFloat(stop.stop_lat);
    stop.lng = parseFloat(stop.stop_lon);
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
function getQueryUrl(queryBy, routesKey, routesVal, apiKey) {
  return 'https://realtime.mbta.com/developer/api/v2/' + queryBy + '?' + routesKey + '=' + routesVal + '&format=json&api_key=' + apiKey;
}

function getVehicles(vehiclesData) {
  vehicles = [];
  vehiclesData['mode'].forEach(function(mode) {
    mode['route'].forEach(function(route) {
      route['direction'].forEach(function(direction) {
        direction['trip'].forEach(function(trip) {
          var vehicle = trip.vehicle;
          vehicle.lat = parseFloat(vehicle.vehicle_lat);
          vehicle.lng = parseFloat(vehicle.vehicle_lon);
          vehicle.rotation = parseFloat(vehicle.vehicle_bearing);
          vehicle.direction = direction.direction_name;
          vehicles.push(vehicle);
        });
      });
    });
  });
  return vehicles;
}

function addMarkers(stops) {
  stops.forEach(function(stop) {
    new google.maps.Marker({
      position: stop,
      map: map,
    });
  });   
}

function addArrows(vehicles) {
  var currTime = Math.floor((new Date()).getTime() / 1000);
  vehicles.forEach(function(vehicle) {
    var timeDiff = currTime - parseInt(vehicle.vehicle_timestamp);
    var arrow = {
      path: 'M -5 15 L 5 15 L 0 0 z',
      fillColor: 'red',
      fillOpacity: 0.5,
      scale: 1,
      strokeColor: 'black',
      strokeWeight: 1,
      rotation: vehicle.direction == 'Northbound' ? 0 : 180,
    };
    var marker = vehicleIdToMarker[vehicle.vehicle_id]
    if (marker === undefined) {
      vehicleIdToMarker[vehicle.vehicle_id] = new google.maps.Marker({
        position: vehicle,
        icon: arrow,
        map: map,
        label: vehicle.vehicle_id + ' : ' + timeDiff.toString(),
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
