// Global variables
var trajDraw = false;
let map, gsCircleMap, infoWindow;
let mission = { sat: undefined, tgt: undefined };
// selected ground station index
var gsInd = 0;

const drawOrbCnt = 7;

const data = [
  "IMECE",
  "1 56178U 23054A   23170.02381016  .00000482  00000-0  96741-4 0  9990",
  "2 56178  98.2074  65.7106 0008782  19.6584 340.4956 14.66115951 10104",
];

var gsList = [
  { latitude: 39.8914, longitude: 32.77863, height: 0.0 },
  { latitude: 69.66196, longitude: 18.94225, height: 0.0 },
  { latitude: -53.15483, longitude: -70.91129, height: 0.0 },
];
// Events:
document.getElementById("btn_closeHeader").onclick = function () {
  document.getElementById("mySidenav").style.display = "none";
};

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
  for (let i = 0; i < (1440 / meanMotionTLE) * drawOrbCnt; i++) {
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
    zoom: 2.8,
    center: { lat: 30, lng: 0 },
    streetViewControl: false,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
    },
    mapTypeId: "satellite",
  });

  let marker = new google.maps.Marker({
    position: flightTrajectory[0],
    map: map,
    icon: {
      url: "./icons/satIcon.svg",
      scaledSize: new google.maps.Size(3, 3, "rem", "rem"),
      anchor: new google.maps.Point(24, 23),
    },
    clickable: false,
  });

  map.addListener("click", (mapsMouseEvent) => {
    // Close the current InfoWindow.
    if (infoWindow != undefined) {
      infoWindow.close();
    }
    // Create a new InfoWindow.
    infoWindow = new google.maps.InfoWindow({
      position: mapsMouseEvent.latLng,
    });
    const lla = {
      latitude: mapsMouseEvent.latLng.toJSON().lat,
      longitude: mapsMouseEvent.latLng.toJSON().lng,
      height: 0,
    };

    const out = getNextPass(lla, new Date(), 30);
    document.getElementById("mySidenav").style.display = "flex";

    if (mission.tgt == undefined) {
      mission.tgt = new google.maps.Marker({
        position: out.tarLL,
        map: map,
      });
      mission.sat = new google.maps.Polyline({
        path: [out.tarLL, out.satLL],
        geodesic: true,
        strokeColor: "#8fff00",
        strokeOpacity: 1.0,
        strokeWeight: 2,
      });
    }
    else{
      mission.sat.setMap(null);
      mission.sat = new google.maps.Polyline({
        path: [out.tarLL, out.satLL],
        geodesic: true,
        strokeColor: "#8fff00",
        strokeOpacity: 1.0,
        strokeWeight: 2,
      });}
    mission.tgt.setMap(map);
    mission.tgt.setPosition(
      new google.maps.LatLng(out.tarLL)
    );
    mission.sat.setMap(map);

    // stupid control to make top header in the middle:
    map.setZoom(map.getZoom());
  });

  const sideNav = document.getElementById("mySidenav");
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(sideNav);

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

  // draw all ground station circles
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
  let gsListRad = [];
  let gsIcon;
  for (let i = 0; i < gsList.length; i++) {
    gsListRad[i] = {
      latitude: (gsList[i].latitude * Math.PI) / 180,
      longitude: (gsList[i].longitude * Math.PI) / 180,
      height: gsList[i].height,
    };
    let rGsEcef = satellite.geodeticToEcf(gsListRad[i]);
    let nGsEcef = getNorm(rGsEcef);
    let nStEcef = getNorm(positionAndVelocity.position);
    let elevAngle = (95 * Math.PI) / 180;
    let smallAngle = getAngleABabAC(nGsEcef, nStEcef, elevAngle);
    let north = vec(0, 0, 1);
    let uGsEcef = getUnit(rGsEcef);
    let rotAx = getUnit(cross(north, uGsEcef));
    let rCircleEcef = rotate(rGsEcef, rotAx, smallAngle);
    let rCircleLL = [ecefToLatLon(rCircleEcef)];
    for (let i = 1; i <= 36; i++) {
      rCircleLL[i] = ecefToLatLon(
        rotate(rCircleEcef, uGsEcef, (i * 10 * Math.PI) / 180)
      );
    }

    // draw gs circles
    gsCircleMap = new google.maps.Polyline({
      path: rCircleLL,
      geodesic: true,
      strokeColor: "#a3e4d7 ",
      strokeOpacity: 1.0,
      strokeWeight: 1.0,
    });
    gsCircleMap.setMap(map);

    // draw satellite antenna
    gsIcon = new google.maps.Marker({
      position: { lat: gsList[i].latitude, lng: gsList[i].longitude },
      map: map,
      icon: {
        url: "./icons/dish.svg",
        scaledSize: new google.maps.Size(1, 1, "rem", "rem"),
        anchor: new google.maps.Point(6, 11),
      },
      clickable: false,
    });
  }
}

function toggleGsCircle() {
  gsInd = (gsInd + 1) % (gsList.length + 1);
  gsCircleMap.setMap(null);
  if (gsInd != gsList.length) {
    drawGsCircle();
    // getNextPass(gsList[gsInd], new Date());
  }
}

// Orbit and Geodesy related geometric functions:
function ecefToLatLon(r) {
  const A = 6378.137; // equatorial radius km
  const B = A * (1 - 1 / 298.257223563); // polar radius km R_EQ*(1-flattening)
  const v = getUnit(vec((B / A) * r.x, (B / A) * r.y, (A / B) * r.z));
  return {
    lat: (Math.atan(v.z / Math.sqrt(v.x * v.x + v.y * v.y)) * 180) / Math.PI,
    lng: (Math.atan2(v.y, v.x) * 180) / Math.PI,
  };
}

function findPitch(r, v, rGst) {
  const un = getUnit(mult(-1, r));
  const rGS = substract(rGst, r);
  const uGSp = getUnit(getOnPlane(rGS, r, v));
  const sn = Math.sign(dot(uGSp, v));
  return sn * Math.acos(dot(un, uGSp));
}

function findPitchDot(r, v, rGst) {
  const rGS = substract(rGst, r);
  const rGSp = getOnPlane(rGS, r, v);
  const nGSp = getNorm(rGSp);
  const wEarth = (2 * Math.PI) / (23 * 3600 + 56 * 60 + 4.098903691);
  const vGst = mult(wEarth, cross(vec(0, 0, 1), rGst));
  const vGS = substract(vGst, v);
  const vGSp = getNormalToVec(getOnPlane(vGS, r, v), rGSp);
  const sn = Math.sign(dot(cross(vGSp, v), cross(v, r)));
  return (sn * getNorm(vGSp)) / nGSp;
}

// Newton-Raphson search method for scalar functions:
function findNewton(x, f, fd, eps, nMax, params) {
  let i = 0;
  let y = f(x, params);
  while (Math.abs(y) > eps && i < nMax) {
    x = x - y / fd(x, params);
    y = f(x, params);
    i++;
  }
  if (i == nMax) {
    console.log(
      "Max iteration number for newton search is reached: ",
      i,
      " with delta time in seconds: ",
      y / fd(x, params) / 1000.0,
      " y: ",
      y
    );
  }

  return x;
}

// calculates next pass at 5 degrees elevation mask
function getNextPass(latLon, beginTime, maxRoll) {
  // constant configuration parameters:
  const leapTime = 86400000.0 / meanMotionTLE / 2;
  const maxNewtonIter = 200;

  // get time satellite is at latitude of the gs coord
  let now = beginTime;
  let pv = satellite.propagate(satrec, now);

  // calculate threshold angle for visibility with elevation mask:
  const latLonRad = {
    latitude: (latLon.latitude * Math.PI) / 180,
    longitude: (latLon.longitude * Math.PI) / 180,
    height: latLon.height,
  };
  const rGstEcef = satellite.geodeticToEcf(latLonRad);
  const nGsEcef = getNorm(rGstEcef);
  const nStEcef = getNorm(pv.position);
  const elevAngle = (95 * Math.PI) / 180;
  let thThresh;
  if (maxRoll == undefined) {
    thThresh = getAngleABabAC(nGsEcef, nStEcef, elevAngle);
  } else {
    thThresh = getAngleABabAC(nStEcef, nGsEcef, (maxRoll / 180) * Math.PI);
  }

  const nws = (2 * Math.PI) / (23 * 3600 + 56 * 60 + 4.098903691) / 1000.0; // rad / ms
  const we = mult(
    (2 * Math.PI * meanMotionTLE) / 86400000, // rad / ms
    vec(0, 0, 1)
  );

  let t, usI, ugI, th;
  // function handle to calculate time and th,
  //intermediate variables are global since they are used in thd and thdd calculation
  let getTh = function (x) {
    t = new Date(x);
    pv = satellite.propagate(satrec, t);
    usI = getUnit(pv.position);
    ugI = getUnit(satellite.ecfToEci(rGstEcef, satellite.gstime(t)));
    return Math.acos(dot(ugI, usI));
  };

  // find where th is minimum or maximum
  const solverHandle = function () {
    return findNewton(
      x,
      function (x, param) {
        th = getTh(x);
        const ws = mult(nws, getUnit(cross(pv.position, pv.velocity)));
        const thd = -dot(cross(ws, usI), ugI) / Math.sin(th); // in rad / s
        return thd;
      },
      function (x, param) {
        th = getTh(x);
        const ws = mult(nws, getUnit(cross(pv.position, pv.velocity)));
        const thd = -dot(cross(ws, usI), ugI) / Math.sin(th);
        const thdd =
          -(
            dot(cross(ws, cross(ws, usI)), ugI) +
            dot(cross(we, cross(we, ugI)), usI) +
            thd * thd * Math.cos(th)
          ) / Math.sin(th);
        return thdd;
      },
      ((0.1 * Math.PI) / 180) * 1e-6,
      maxNewtonIter,
      null
    );
  };

  // convert to unix time stamp in ms
  let x = now.valueOf();
  let xOld = x;
  let xNew = solverHandle();

  let ctr = 1;
  th = getTh(xNew);

  while (th > thThresh || xNew < xOld) {
    x = xOld + ctr * leapTime;
    ctr++;
    if (ctr > 15 * meanMotionTLE) {
      console.log("NOT FOUND");
      break;
    }
    xNew = solverHandle();
    th = getTh(xNew);
  }

  // find where th is minimum or maximum
  const solverHandleTh = function () {
    return findNewton(
      x,
      function (x) {
        th = getTh(x);
        return th - thThresh;
      },
      function (x) {
        th = getTh(x);
        const ws = mult(nws, getUnit(cross(pv.position, pv.velocity)));
        const thd = -dot(cross(ws, usI), ugI) / Math.sin(th); // in rad / s
        return thd * 1000; // slow down the search
      },
      (0.1 * Math.PI) / 180,
      maxNewtonIter,
      null
    );
  };

  let roll = (getRollFromTh(nStEcef, nGsEcef, th) / Math.PI) * 180;
  const maxElev = 90 - roll - th / Math.PI / 180;
  const maxPv = pv;
  const maxT = t;
  roll = roll * Math.sign(dot(pv.velocity, cross(ugI, usI)));

  const xMax = xNew;
  x = xMax - 600000;
  const tVisStart = new Date(solverHandleTh());
  x = xMax + 600000;
  const tVisEnd = new Date(solverHandleTh());

  // draw marker on pass position
  const satLLA = satellite.eciToGeodetic(
    maxPv.position,
    satellite.gstime(maxT)
  );
  const satLL = lla2ll(satLLA);

  const dateString =
    maxT.getUTCFullYear() +
    "-" +
    ("0" + (maxT.getUTCMonth() + 1)).slice(-2) +
    "-" +
    ("0" + maxT.getUTCDate()).slice(-2);

  const visStartString =
    ("0" + tVisStart.getUTCHours()).slice(-2) +
    ":" +
    ("0" + tVisStart.getUTCMinutes()).slice(-2) +
    ":" +
    ("0" + tVisStart.getUTCSeconds()).slice(-2);

  const visMaxString =
    ("0" + maxT.getUTCHours()).slice(-2) +
    ":" +
    ("0" + maxT.getUTCMinutes()).slice(-2) +
    ":" +
    ("0" + maxT.getUTCSeconds()).slice(-2);

  const visEndString =
    ("0" + tVisEnd.getUTCHours()).slice(-2) +
    ":" +
    ("0" + tVisEnd.getUTCMinutes()).slice(-2) +
    ":" +
    ("0" + tVisEnd.getUTCSeconds()).slice(-2);

  const out = {
    date: dateString,
    visStart: visStartString,
    visMax: visMaxString,
    visEnd: visEndString,
    tMaxElev: maxT,
    roll: roll,
    maxElev: maxElev,
    satLL: satLL,
    tarLL: {lat:latLon.latitude, lng:latLon.longitude},
    t: maxT,
    visMaxString: (tVisEnd.valueOf() - tVisStart.valueOf()) / 60000.0, // in minutes
    toString: "Date: " + dateString + "T" + visMaxString + " Roll: " + roll,
  };

  document.getElementById("date").innerHTML = dateString;
  // document.getElementById("visStart").innerHTML = visStartString;
  document.getElementById("visMax").innerHTML = visMaxString;
  // document.getElementById("visEnd").innerHTML = visEndString;
  document.getElementById("roll").innerHTML = out.roll.toFixed(2) + "&deg;";
  // document.getElementById("elev").innerHTML = out.maxElev.toFixed(2) + "&deg;";

  return out;
}

// Math library, TODO move to another file:
function vec(x, y, z) {
  return { x: x, y: y, z: z };
}
function getAngleABabAC(a, b, AC) {
  const bb = -2 * a * Math.cos(AC);
  const sdelta = Math.sqrt(bb * bb - 4 * (a * a - b * b));
  const c = (-bb - sdelta) / 2;
  return Math.acos((a * a + b * b - c * c) / a / b / 2);
}

function getRollFromTh(a, b, ab) {
  const c2 = a * a + b * b - 2 * a * b * Math.cos(ab);
  const c = Math.sqrt(c2);
  const ac = Math.acos((a * a + c2 - b * b) / (2 * a * c));
  return ac;
}

function getNorm(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}
function getUnit(v) {
  const n = getNorm(v);
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

function substract(v1, v2) {
  return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
}

function add(v1, v2) {
  return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
}

function mult(k, v) {
  return { x: k * v.x, y: k * v.y, z: k * v.z };
}

function getOnPlane(v, v1, v2) {
  // return on plane component of vector v to the plane def by v1 and v2
  const u = getUnit(cross(v1, v2));
  return substract(v, mult(dot(v, u), u));
}

function getNormalToVec(v, v1) {
  // return component of v perpendicular to v1
  const u = getUnit(v1);
  return substract(v, mult(dot(v, u), u));
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
