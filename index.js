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
var refresh_secs = 5;
var positions_history_mins = 8;
var num_positions_in_history = Math.floor(
  positions_history_mins * 60 / refresh_secs);

/////////// Vars initialized asynchronously
var stops = [];
var map; // Done in another script;
var vehicleIdToMarker = {};
var vehicleIdToPositions = {};
var vehicleIdToArrivingStart = {};
var vehicleIdToBoardingStart = {};
var debugData;

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
    debugData = data;
    var vehicleIdToInfo = getVehicleIdToInfo(data);
    savePositions(vehicleIdToInfo);
    updateLastMoveSince(vehicleIdToInfo);
    updateArrivingStart(vehicleIdToInfo);
    updateBoardingStart(vehicleIdToInfo);
    onGoogleReady(function() {
      addArrows(vehicleIdToInfo);      
    });
  }, 'json');
}

function updateArrivingStart(vehicleIdToInfo) {
  Object.keys(vehicleIdToInfo).forEach(function(id) {
    var info = vehicleIdToInfo[id];
    if (info.current_status.includes('INCOMING')) {
      if (vehicleIdToArrivingStart[id]) {
        return;
      }
      vehicleIdToArrivingStart[id] = Date.now();
      return;
    }
    delete vehicleIdToArrivingStart[id];
  });
}

function updateBoardingStart(vehicleIdToInfo) {
  Object.keys(vehicleIdToInfo).forEach(function(id) {
    var info = vehicleIdToInfo[id];
    if (info.current_status.includes('STOPPED')) {
      if (vehicleIdToBoardingStart[id]) {
        return;
      }
      vehicleIdToBoardingStart[id] = Date.now();
      return;
    }
    delete vehicleIdToBoardingStart[id];
  });
}

function updateLastMoveSince(vehicleIdToInfo) {
  Object.keys(vehicleIdToInfo).forEach(function(id) {
    var info = vehicleIdToInfo[id];
    var positions = vehicleIdToPositions[id];
    var finalLat = positions[positions.length - 1].lat;
    // Make 1 minute to mean 45 seconds.
    var lastMoveSince = (positions.length - 2) * refresh_secs;
    for (var i = positions.length - 2; i >= 0; i--) {
      var latChange = finalLat - positions[i].lat;
      if (latChange !== 0) {
        info.hasMovement = true;
        lastMoveSince = (positions.length - 2 - i) * refresh_secs;
        break;
      }
    }
    info.lastMoveSince = lastMoveSince;
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
    vehicle.direction_id = vehicle.attributes.direction_id;
    vehicle.current_status = vehicle.attributes.current_status;
    vehicle.updated_at = vehicle.attributes.updated_at;
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
    var fillColor = 'red';
    console.log(vehicle);
    var rotation = vehicle.bearing;
    if (vehicle.direction_id === 0) {
      rotation = 180;
    }
    if (vehicle.direction_id === 1) {
      rotation = 0;
    }
    var arrow = {
      path: 'M -5 15 L 5 15 L 0 0 z',
      fillColor: fillColor,
      fillOpacity: 1,
      scale: 1,
      strokeColor: 'black',
      strokeWeight: 1,
      rotation: rotation,
    };
    var label = '';
    var duration = Math.floor((Date.now() - Date.parse(vehicle.updated_at)) / 1000);
    if (duration > 120) {
      label += '?: ' + duration + 's';
    } else {
      if (vehicle.current_status.includes('STOPPED')) {
        var duration = Math.floor((Date.now() - vehicleIdToBoardingStart[id]) / 1000);
        vehicleIdToBoardingStart
        label += 'BRD: ' + duration + 's';
      } else if (vehicle.current_status.includes('INCOMING')) {
        var duration = Math.floor((Date.now() - vehicleIdToArrivingStart[id]) / 1000);
        label += 'ARR: ' + duration + 's';
      } else {
        if (vehicle.lastMoveSince > 40) {
          label += 'STOP: ' + vehicle.lastMoveSince + 's';
        }
      }
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
