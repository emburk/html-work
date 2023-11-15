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
  
  function getAngleACabAB(a, b, ab) {
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
  