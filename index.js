const data = [
  "IMECE",
  // "1 56178U 23054A   23169.40957752  .00000497  00000+0  99449-4 0  9999",
  // "2 56178  98.2075  65.0967 0008826  21.4833 338.6739 14.66115328 10016",
  "1 56178U 23054A   23170.02381016  .00000482  00000-0  96741-4 0  9990",
  "2 56178  98.2074  65.7106 0008782  19.6584 340.4956 14.66115951 10104"
];
document.getElementById("tleLines").innerHTML =
  "TLE Line1: " + data[1] + "\n" + "<br> TLE Line2: " + data[2];
// get day of year:
let dayOfYearTLE = parseFloat(data[1].substring(20, 31));
// Initialize a satellite record
var satrec = satellite.twoline2satrec(data[1], data[2]);
//  Propagate satellite using time since epoch (in minutes).
var positionAndVelocity = satellite.sgp4(satrec, 0);
var tInit = new Date();

function getTrajectory() {
  let trajectory = [];
  for (let i = 0; i < 20; i++) {
    let time = new Date();
    time.setMinutes(tInit.getMinutes() + i);
    let positionAndVelocity = satellite.propagate(satrec, time);
    // let positionAndVelocity = satellite.sgp4(satrec, minsSince);
    let posEci = positionAndVelocity.position;
    let satLLA = eciToGeodeticCorrected(posEci, time);
    let satLL = {
      lat: satellite.radiansToDegrees(satLLA.latitude),
      lng: satellite.radiansToDegrees(satLLA.longitude),
    };
    trajectory[i] = satLL;
  }
  return trajectory;
}

// update lat lon and satellite location on map
function moveMarker(marker) {
  setInterval(() => {
    let time = new Date();
    let positionAndVelocity = satellite.propagate(satrec, time);
    let posEci = positionAndVelocity.position;
    let satLLA = eciToGeodeticCorrected(posEci, time);
    let satLL = {
      lat: satellite.radiansToDegrees(satLLA.latitude),
      lng: satellite.radiansToDegrees(satLLA.longitude),
    };
    marker.setPosition(new google.maps.LatLng(satLL.lat, satLL.lng));
    document.getElementById("LLA").innerHTML =
      "Latitude: " +
      satLL.lat +
      ", <br>Longitude: " +
      satLL.lng +
      ", <br>Altitude: " +
      satLLA.height;
  }, 2000);
}

function initMap() {
  const flightTrajectory = getTrajectory();
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 1,
    center: { lat: 0, lng: 0 },
    mapTypeId: "satellite",
  });
  const flightPath = new google.maps.Polyline({
    path: flightTrajectory,
    geodesic: true,
    strokeColor: "#FF0000",
    strokeOpacity: 1.0,
    strokeWeight: 2,
  });
  flightPath.setMap(map);

  var marker = new google.maps.Marker({ position: flightTrajectory[0], map: map });
  marker.setMap(map);
  moveMarker(marker);
}

window.initMap = initMap;

// Retrieve TLE of imece satellite:
// const url = "https://celestrak.org/NORAD/elements/gp.php?NAME=IMECE&FORMAT=TLE";
// fetch(url)
//   .then((response) => response.text())
//   .then((data) => {
//     console.log(data);
//     // split into lines
//     data = data.split("\r\n");
//     // Initialize a satellite record
//     var satrec = satellite.twoline2satrec(data[1], data[2]);
//     //  Propagate satellite using time since epoch (in minutes).
//     var positionAndVelocity = satellite.sgp4(satrec, 0);
//     var positionAndVelocity = satellite.propagate(satrec, new Date());
//   });

function getDayOfYear(dateIn) {
  let start = new Date(Date.UTC(dateIn.getFullYear(), 0, 1));
  let out = (dateIn.valueOf() - start.valueOf()) / 86400000.0;
  return out;
}

// correction code for satellite.min.js
// the eciToGeodetic in sat..js actually converts ecef to geodetic
function eciToGeodeticCorrected(posEci, time) {
  return satellite.eciToGeodetic(
    satellite.eciToEcf(posEci, satellite.gstime(time)),
    0);
}