
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
  var square = {
    path: 'M -15 15 L 15 15 L 15 -15 L -15 -15 z',
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

var oldVehicleIds = {
  '544e09fa': 1,
  '544e1ac0': 1,
  '544e1ad7': 1,
  '544e124f': 1,
  '544e1750': 1,
  '544e1907': 1,
  '544e1972': 1,
};

var newVehicleIds = {
  '544e0ff5': 1,  
  '544e012c': 1,  
  '544e1a3e': 1,  
  '544e1b07': 1,  
  '544e1c5e': 1,  
  '544e1dec': 1,  
  '544e1d09': 1,  
  '544e1d65': 1,  
  '544e1d8f': 1,  
  '544e158b': 1,  
  '544e158c': 1,  
  '544e1932': 1,  
  '544e193b': 1,  
};

function addArrows(vehicles) {
  var currTime = Math.floor((new Date()).getTime() / 1000);
  vehicles.forEach(function(vehicle) {
    var timeDiff = currTime - parseInt(vehicle.vehicle_timestamp);
    var marker = vehicleIdToMarker[vehicle.vehicle_id]
    if (marker === undefined) {
      var fillColor = 'yellow';
      if (oldVehicleIds[vehicle.vehicle_id.toLowerCase()]) {
        fillColor = 'green';
      } else if (oldVehicleIds[vehicle.vehicle_id.toLowerCase()]) {
        fillColor = 'red';
      }
      var arrow = {
        path: 'M -5 15 L 5 15 L 0 0 z',
        fillColor: fillColor,
        fillOpacity: 1,
        scale: 1,
        strokeColor: 'black',
        strokeWeight: 1,
        rotation: vehicle.direction == 'Northbound' ? 0 : 180,
      };
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
