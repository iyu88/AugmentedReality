import * as THREE from "/scripts/three/build/three.module.js";

// DOM Element <body>
const body = document.body;

// Viewport Transform : Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
body.appendChild(renderer.domElement);

// Projection Transform : Camera Intrinsic Parameter
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  500
);

// Viewing Transform : Camera Position
camera.position.set(0, 0, 30);
camera.lookAt(0, 0, 0);
camera.up.set(0, 1, 0);

const scene = new THREE.Scene();

// Object Box Geometry
const geo_cube = new THREE.BoxGeometry(5, 5, 5);

// Texture
const texture = new THREE.TextureLoader().load("../../Imgs/dog.jpg");

// Phong Material : Ambient , Diffuse , Specular , Shininess
const mat_cube = new THREE.MeshPhongMaterial({
  map: texture,
  emissive: 0x909000,
  color: 0xffffff,
  specular: 0xff0000,
  shininess: 1000,
});

const cube = new THREE.Mesh(geo_cube, mat_cube);
cube.matrixAutoUpdate = false;

scene.add(cube);

// Directional Light
const light = new THREE.DirectionalLight(0xffffff, 0.8);
scene.add(light);

const animate = () => {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
};

animate();

// e.key Arrays
const rotKey = ["r", "t", "y", "f", "g", "h"];
const movKey = ["a", "d", "w", "s"];

// Add Key Event
body.addEventListener("keydown", (e) => {
  if (rotKey.includes(e.key)) rotateObject(e);
  else if (movKey.includes(e.key)) moveObject(e);
  else console.warn("Wrong Keyboard Input!");
});

/* ===== Rotation Functions ===== */
// Rotation Values
let rotX = 0,
  rotY = 0,
  rotZ = 0;

const rotateLocalX = (value) => {
  rotX += value;
  return new THREE.Matrix4().makeRotationX(getRad(value));
};

const rotateLocalY = (value) => {
  rotY += value;
  return new THREE.Matrix4().makeRotationY(getRad(value));
};

const rotateLocalZ = (value) => {
  rotZ += value;
  return new THREE.Matrix4().makeRotationZ(getRad(value));
};

const getRad = (deg) => THREE.MathUtils.degToRad(deg);

const rotateObject = (e) => {
  let rotMatrix;
  switch (e.key) {
    case "r":
      rotMatrix = rotateLocalX(3);
      break;
    case "t":
      rotMatrix = rotateLocalY(3);
      break;
    case "y":
      rotMatrix = rotateLocalZ(3);
      break;
    case "f":
      rotMatrix = rotateLocalX(-3);
      break;
    case "g":
      rotMatrix = rotateLocalY(-3);
      break;
    case "h":
      rotMatrix = rotateLocalZ(-3);
      break;
  }
  cube.matrix = cube.matrix.multiply(rotMatrix);
  console.log(cube.matrix.elements);
  console.log("---After Rotation Matrix Elements---");
};
/* ===== END of Rotation Functions ===== */

/* ===== Translation Functions ===== */
const moveHorizontal = (dx, dy, value) => {
  let px = ((dx + value) / window.innerWidth) * 2 - 1;
  let py = -(dy / window.innerHeight) * 2 + 1;
  return [px, py];
};

const moveVertical = (dx, dy, value) => {
  let px = (dx / window.innerWidth) * 2 - 1;
  let py = -((dy + value) / window.innerHeight) * 2 + 1;
  return [px, py];
};

const moveObject = (e) => {
  let movMatrix = cube.matrix.clone(true);
  let [dx, dy] = screenPosition(cube, camera);
  let newPos = new THREE.Vector3();
  let px;
  let py;
  let vector;
  let dist;
  switch (e.key) {
    case "a":
      [px, py] = moveHorizontal(dx, dy, -10);
      break;
    case "d":
      [px, py] = moveHorizontal(dx, dy, 10);
      break;
    case "w":
      [px, py] = moveVertical(dx, dy, -10);
      break;
    case "s":
      [px, py] = moveVertical(dx, dy, 10);
      break;
  }
  vector = new THREE.Vector3(px, py, 0);
  vector.unproject(camera).sub(camera.position).normalize();
  dist = (cube.position.z - camera.position.z) / vector.z;
  newPos.copy(camera.position).add(vector.multiplyScalar(dist));
  movMatrix.elements[12] = newPos.x;
  movMatrix.elements[13] = newPos.y;
  cube.matrix = cube.matrix.multiply(movMatrix);
  console.log(cube.matrix.elements);
  console.log("---After Translation Matrix Elements---");
};

const screenPosition = (obj, camera) => {
  let vector = new THREE.Vector3();
  obj.updateMatrix();
  vector.setFromMatrixPosition(obj.matrixWorld).project(camera);
  vector.x = Math.round(((vector.x + 1) * window.innerWidth) / 2);
  vector.y = Math.round(((-vector.y + 1) * window.innerHeight) / 2);
  return [vector.x, vector.y];
};
/* ===== END of Translation Functions ===== */

// Add 10 pixel interval lines
const createDiv = (className) => {
  let newDiv = document.createElement("div");
  newDiv.classList.add(className);
  return newDiv;
};

const setPixelLines = () => {
  for (let i = 10; i <= window.innerHeight; i += 10) {
    let row = createDiv("rowLine");
    row.style.top = `${i}px`;
    body.appendChild(row);
  }

  for (let i = 10; i <= window.innerWidth; i += 10) {
    let col = createDiv("colLine");
    col.style.left = `${i}px`;
    body.appendChild(col);
  }
};

setPixelLines();
