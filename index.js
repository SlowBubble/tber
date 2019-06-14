// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
  Object.keys = (function() {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

    return function(obj) {
      if (typeof obj !== 'function' && (typeof obj !== 'object' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [], prop, i;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}

/////////// varants
var apiKey = '5c68021c1c0942258e03ab1c82fd289a';
var redVehiclesUrl = getQueryUrl('vehicles', 'Red', apiKey); 
var redStopsUrl = getQueryUrl('stops', 'Red', apiKey); 
var refresh_secs = 8;
var positions_history_mins = 4;
var num_positions_in_history = Math.floor(
  positions_history_mins * 60 / refresh_secs);

/////////// Vars initialized asynchronously
var stops = [];
var map; // Done in another script;
var vehicleIdToMarker = {};
var vehicleIdToPositions = {};

/////////// Mbta  data initialization
getAndUpdateVehiclesPosition();
window.setInterval(getAndUpdateVehiclesPosition, refresh_secs * 1000);

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
function getAndUpdateVehiclesPosition() {
  $.get(redVehiclesUrl, function(data, status, xhr){
    var vehicleIdToInfo = getVehicleIdToInfo(data);
    savePositions(vehicleIdToInfo);
    fixBearing(vehicleIdToInfo);
    onGoogleReady(function() {
      addArrows(vehicleIdToInfo);      
    });
  }, 'json');
}

function fixBearing(vehicleIdToInfo) {
  Object.keys(vehicleIdToInfo).forEach(function(id) {
    var info = vehicleIdToInfo[id];
    var positions = vehicleIdToPositions[id];
    var finalLat = positions[positions.length - 1].lat;
    var minsSinceLastMove = Math.floor((positions.length - 2) * refresh_secs / 60);
    for (var i = positions.length - 2; i >= 0; i--) {
      var latChange = finalLat - positions[i].lat;
      if (latChange !== 0) {
        info.bearing = latChange > 0 ? 0 : 180;
        info.hasMovement = true;
        minsSinceLastMove = Math.floor((positions.length - 2 - i) * refresh_secs / 60);
        break;
      }
    }
    info.minsSinceLastMove = minsSinceLastMove;
  });
}
function savePositions(vehicleIdToInfo) {
  Object.keys(vehicleIdToInfo).forEach(function(id) {
    var info = vehicleIdToInfo[id];
    var positions = vehicleIdToPositions[id];
    if (!positions) {
      positions = [];
      vehicleIdToPositions[id] = positions;
    }
    if (positions.length > 2 * num_positions_in_history) {
      positions = positions.slice(num_positions_in_history);
      vehicleIdToPositions[id] = positions;
    }
    positions.push({lat: info.lat, lng: info.lng});
  });
}
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
  return 'https://api-v3.mbta.com/' + queryBy + '?api_key=' + apiKey + '&filter[route]=' + route;
}

function getVehicleIdToInfo(vehiclesData) {
  var vehicleIdToInfo = {};
  vehiclesData.data.forEach(function(vehicle) {
    vehicle.lat = vehicle.attributes.latitude;
    vehicle.lng = vehicle.attributes.longitude;
    vehicle.bearing = vehicle.attributes.bearing;
    vehicle.vehicle_label = vehicle.attributes.label;
    vehicle.vehicle_id = vehicle.id;
    vehicleIdToInfo[vehicle.id] = vehicle;
  });
  return vehicleIdToInfo;
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

function addArrows(vehicleIdToInfo) {
  Object.keys(vehicleIdToInfo).forEach(function(id) {
    var vehicle = vehicleIdToInfo[id];
    var marker = vehicleIdToMarker[vehicle.vehicle_id];
    if (marker) {
      marker.setMap(null);
    }
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
    var label = '';
    if (vehicle.minsSinceLastMove > 0) {
      label = vehicle.minsSinceLastMove + ' min rest';
    } else if (vehicle.hasMovement) {
      label = 'moving';
    }
    vehicleIdToMarker[vehicle.vehicle_id] = new google.maps.Marker({
      position: vehicle,
      icon: arrow,
      map: map,
      label: label,
    });
  });   
}

function initMap(latitude, longitude) {
  latitude = latitude || 42.362491;
  longitude = longitude || -71.086177;
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: latitude, lng: longitude},
    zoom: 13,
  });
}

// TODO: allow specifying starting map location based on stop id via this info:
// "{"attributes":{"address":"300 Main St, Cambridge, MA 02142","description":null,"latitude":42.362491,"location_type":1,"longitude":-71.086177,"name":"Kendall/MIT","platform_code":null,"platform_name":null,"wheelchair_boarding":1},"id":"place-knncl","links":{"self":"/stops/place-knncl"},"relationships":{"child_stops":{},"facilities":{"links":{"related":"/facilities/?filter[stop]=place-knncl"}},"parent_station":{"data":null},"recommended_transfers":{},"zone":{"data":null}},"type":"stop","lat":42.362491,"lng":-71.086177}"
