// Global variables
var trajDraw = false;
let map;

const data = [
  "IMECE",
  "1 56178U 23054A   23170.02381016  .00000482  00000-0  96741-4 0  9990",
  "2 56178  98.2074  65.7106 0008782  19.6584 340.4956 14.66115951 10104",
];

var gsList = [
  { latitude: 39.8914, longitude: 32.77863, height: 0.0 },
  { latitude: 69.66196, longitude: 18.94225, height: 0.0 },
];
// Events:
document.getElementById("btn_tglCircle").onclick = function () {
  toggleGsCircle();
};

document.getElementById("tleLines").innerHTML =
  "TLE Line1: " + data[1] + "\n" + "<br> TLE Line2: " + data[2];
// get day of year:
let dayOfYearTLE = parseFloat(data[1].substring(20, 31));
let meanMotionTLE = parseFloat(data[2].substring(52, 62));

// Initialize a satellite record
var satrec = satellite.twoline2satrec(data[1], data[2]);
//  Propagate satellite using time since epoch (in minutes).
var positionAndVelocity = satellite.sgp4(satrec, 0);
var tInit = new Date();

function getTrajectory() {
  let trajectory = [];
  for (let i = 0; i < 1440 / meanMotionTLE; i++) {
    let time = new Date();
    time.setMinutes(tInit.getMinutes() + i);
    let positionAndVelocity = satellite.propagate(satrec, time);
    // let positionAndVelocity = satellite.sgp4(satrec, minsSince);
    let posEci = positionAndVelocity.position;
    let satLLA = satellite.eciToGeodetic(posEci, satellite.gstime(time));
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
    let satLLA = satellite.eciToGeodetic(posEci, satellite.gstime(time));
    let satLL = lla2ll(satLLA);
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

function lla2ll(lla) {
  // lat,lon,alt to latitude longitude
  return {
    lat: (lla.latitude * 180) / Math.PI,
    lng: (lla.longitude * 180) / Math.PI,
  };
}

function initMap() {
  let flightTrajectory = getTrajectory();
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 1,
    center: { lat: 0, lng: 0 },
    mapTypeId: "satellite",
  });

  let marker = new google.maps.Marker({
    position: flightTrajectory[0],
    map: map,
  });
  marker.setMap(map);
  moveMarker(marker);
  let flightPath = new google.maps.Polyline({
    path: flightTrajectory,
    geodesic: true,
    strokeColor: "#FF0000",
    strokeOpacity: 1.0,
    strokeWeight: 2,
  });
  flightPath.setMap(map);
  drawGsCircle();
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

function drawGsCircle() {
  const nStEcef = getNorm(positionAndVelocity.position);
  const gsInd = 1;
  const gsListRad = [
    {
      latitude: (gsList[gsInd].latitude * Math.PI) / 180,
      longitude: (gsList[gsInd].longitude * Math.PI) / 180,
      height: gsList[gsInd].height,
    },
  ];
  const rGsEcef = satellite.geodeticToEcf(gsListRad[0]);
  const nGsEcef = getNorm(rGsEcef);
  const uGsEcef = getUnit(rGsEcef);
  const elevAngle = (5 * Math.PI) / 180;
  const north = vec(0, 0, 1);
  const rotAx = getUnit(cross(north, uGsEcef));
  const smallAngle = getNextAngle(nGsEcef, nStEcef, elevAngle);
  let rCircleEcef = rotate(rGsEcef, rotAx, smallAngle);
  console.log(rGsEcef);
  let rCircleLL = [ecefToLatLon(rCircleEcef)];
  for (let i = 1; i <= 36; i++) {
    rCircleLL[i] = ecefToLatLon(
      rotate(rCircleEcef, uGsEcef, (i * 10 * Math.PI) / 180)
    );
  }
  console.log(rCircleLL);
  let circlePath = new google.maps.Polyline({
    path: rCircleLL,
    geodesic: true,
    strokeColor: "#a3e4d7 ",
    strokeOpacity: 1.0,
    strokeWeight: 1.0,
  });
  circlePath.setMap(map);
}

function toggleGsCircle() {
  trajDraw = !trajDraw;
  if (trajDraw) {
  } else {
  }
}

// 3d geometric functions:
function ecefToLatLon(r) {
  const A = 6378.137; // equatorial radius km
  const B = A * (1 - 1 / 298.257223563); // polar radius km R_EQ*(1-flattening)
  const v = getUnit(vec((B / A) * r.x, (B / A) * r.y, (A / B) * r.z));
  // en iyi otel nerede bulunur
  return {
    lat: (Math.atan(v.z / Math.sqrt(v.x * v.x + v.y * v.y)) * 180) / Math.PI,
    lng: (Math.atan2(v.y, v.x) * 180) / Math.PI,
  };
}

// Math library, TODO move to another file:
function vec(x, y, z) {
  return { x: x, y: y, z: z };
}
function getNextAngle(a, b, c) {
  // b > a
  // 0 < c < pi/2
  let bb = 2 * a * Math.sin(c);
  let sdelta = Math.sqrt(bb * bb + 4 * (b * b - a * a));
  let x = (-bb + sdelta) / 2;
  return Math.acos((a * a + b * b - x * x) / a / b / 2);
}
function getNorm(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}
function getUnit(v) {
  let n = getNorm(v);
  return {
    x: v.x / n,
    y: v.y / n,
    z: v.z / n,
  };
}
function cross(v1, v2) {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
}
function dot(v1, v2) {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

function rotate(v, u, th) {
  // rotate v vector in u unit vector axis of rotation in th radians
  const c = Math.cos(th);
  const s = Math.sin(th);
  const cc = 1 - c;
  return {
    x:
      (c + u.x * u.x * cc) * v.x +
      (u.x * u.y * cc - u.z * s) * v.y +
      (u.x * u.z * cc + u.y * s) * v.z,
    y:
      (u.y * u.x * cc + u.z * s) * v.x +
      (c + u.y * u.y * cc) * v.y +
      (u.y * u.z * cc - u.x * s) * v.z,
    z:
      (u.z * u.x * cc - u.y * s) * v.x +
      (u.z * u.y * cc + u.x * s) * v.y +
      (c + u.z * u.z * cc) * v.z,
  };
}
