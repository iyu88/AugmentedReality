// 모든 경로를 다 적어주어야 Vanilla 에서는 오류가 발생하지 않음
import * as THREE from "../node_modules/three/build/three.module.js";

/*
const body = document.querySelector("body");
body.style.height = "100vh";

body.addEventListener("click", (e) => {
  e.target.style.backgroundColor = `rgb(${Math.random() * 255}, ${
    Math.random() * 255
  }, ${Math.random() * 255})`;
});
*/

// renderer 는 html 의 canvas 느낌 ( dom 요소는 아니다 )
const renderer = new THREE.WebGLRenderer(); // renderer 가져오기
// Viewport Matrix 는 정의되어 있지 않음 -> Identity Matrix
renderer.setSize(window.innerWidth, window.innerHeight); // renderer 크기 설정하기
renderer.setViewport(0, 0, window.innerWidth, window.innerHeight); // setViewport() 사용
document.body.appendChild(renderer.domElement); // body 에 renderer 를 dom 요소로 추가하기

// 카메라 렌즈 설정
// Projection Transform 정의 ( camera 의 parameter 를 통해서 )
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  500
); // fov, aspect ratio, near plane, far plane
// View Transform 정의 ( World Space 기준으로 )
camera.position.set(0, 0, 100); // x, y, z
camera.lookAt(0, 0, 0); // x, y, z 의 위치에서 바라봄 ( UpVector 의 값이 빠져있다 - default 는 0, 1, 0 // viewVector 는 1, -1, 1 // rightVector 는 오른손 좌표계 )
camera.up.set(0, 1, 0); // 명시적으로 UpVector 설정

const scene = new THREE.Scene();

// 라인을 그릴 점을 정의
const points = [];
points.push(new THREE.Vector3(-10, 0, 0));
points.push(new THREE.Vector3(0, 10, 0));
points.push(new THREE.Vector3(10, 0, 0));

// geometry buffer 생성
const geometry = new THREE.BufferGeometry().setFromPoints(points); // 점을 저장한 버퍼 (Array)

//create a blue LineBasicMaterial
const material = new THREE.LineBasicMaterial({ color: 0x0000ff }); // RGBA

// line 은 연속해서 구현된다 ( Path ) -> Geometry
// 선이 빛을 반사하는 속성 ( Material ) -> Material
const line = new THREE.Line(geometry, material); // 두 개의 정보가 모두 필요함
// => line 의 xyz 축이 world 의 xyz 축과 같아짐 ( identity matrix 를 사용하여 object transform 을 world transform 으로 )

// default values for object to world
// line.position.set(0, 5, 0);
// line.up.set(0, 1, 0); // world 와 같음 || 음수로 바꾸면 상하가 뒤집힘
// line.lookAt(0, 5, -1); // 사물의 z축이 음수로

// Rotation 후 Translation
line.matrixAutoUpdate = false;
let mat_r = new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(-70));
line.matrix = new THREE.Matrix4().makeTranslation(0, 10, 0).multiply(mat_r); // world 의 y 축 방향으로 움직임
// line.matrix = new THREE.Matrix4().makeTranslation(0, 5, 0);
console.log(line);

const geo_box = new THREE.BoxGeometry(5, 5, 5);
const loader = new THREE.TextureLoader();
// const material_box = new THREE.MeshBasicMaterial({ map: loader.load("../dog.jpg") }); // texture 삽입 가능
// Phong Material on Cube
const material_box = new THREE.MeshPhongMaterial({
  map: loader.load("../Imgs/dog.jpg"),
  color: 0xffffff,
  emissive: 0x101000,
  specular: 0xff0000,
  shininess: 10000,
});
const boxObj = new THREE.Mesh(geo_box, material_box); // 선이 아닌 것

boxObj.matrixAutoUpdate = false;
let mat_box = new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(-40));
boxObj.matrix = new THREE.Matrix4().makeTranslation(0, 0, 80).multiply(mat_box); // z축으로 당김: 카메라에서 20만큼 떨어짐

// add new directional Light
const light = new THREE.DirectionalLight(0xffffff, 0.5);
scene.add(light);

scene.add(line); // Scene 에 line 을 추가함
scene.add(boxObj);

// Model Transform 이 없어서 Object Space 의 좌표가 World Space 로 들어간다 -> Identity Matrix

// View & projection & viewport transform 을 계산하여 화면에 뿌려줌
// renderer.render(scene, camera); // Scene 을 camera 로 그린다

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();
