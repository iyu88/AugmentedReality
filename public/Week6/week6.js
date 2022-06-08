import * as THREE from "/scripts/three/build/three.module.js";
import { OrbitControls } from "/scripts/three/examples/jsm/controls/OrbitControls.js";
import { Line2 } from "/scripts/three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "/scripts/three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "/scripts/three/examples/jsm/lines/LineGeometry.js";

let points_mesh;
let line_mesh;
let face_mesh;

const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");

const renderer = new THREE.WebGLRenderer();
const $width = 640;
const $height = 480;
renderer.setSize($width, $height);
renderer.setViewport(0, 0, $width, $height);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(45, $width / $height, 1, 500);
camera.position.set(0, 0, 100);
camera.lookAt(0, 0, 0);
camera.up.set(0, 1, 0);

// Orbit 생성
// camera 에 대한 작업이 더 이상 필요하지 않음
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableZoom = false;
// controls.enablePan = false;

const scene = new THREE.Scene();

const texture = new THREE.VideoTexture(videoElement);
const geometry = new THREE.PlaneGeometry(4, 3);
// geometry.scale(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ map: texture });
const mesh = new THREE.Mesh(geometry, material);
mesh.position.set(0, 0, 96); // wrong
mesh.lookAt(camera.position);
scene.add(mesh);

/*
const points = [];
points.push(new THREE.Vector3(-10, 0, 0));
points.push(new THREE.Vector3(0, 10, 0));
points.push(new THREE.Vector3(10, 0, 0));

const geometry = new THREE.BufferGeometry().setFromPoints(points);

const material = new THREE.LineBasicMaterial({ color: 0x0000ff });

const line = new THREE.Line(geometry, material);

line.matrixAutoUpdate = false;
let mat_r = new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(-70));
line.matrix = new THREE.Matrix4().makeTranslation(0, 10, 0).multiply(mat_r);
console.log(line);

const geo_box = new THREE.BoxGeometry(5, 5, 5);
const loader = new THREE.TextureLoader();

const material_box = new THREE.MeshPhongMaterial({
  map: loader.load("../Imgs/dog.jpg"),
  color: 0xffffff,
  emissive: 0x101000,
  specular: 0xff0000,
  shininess: 10000,
});
const boxObj = new THREE.Mesh(geo_box, material_box);

boxObj.matrixAutoUpdate = false;
let mat_box = new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(-40));
boxObj.matrix = new THREE.Matrix4().makeTranslation(0, 0, 80).multiply(mat_box);

const light = new THREE.DirectionalLight(0xffffff, 0.5);
scene.add(light);

scene.add(line);
scene.add(boxObj);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();
*/

function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );
  if (results.multiFaceLandmarks) {
    for (const landmarks of results.multiFaceLandmarks) {
      // console.log(FACEMESH_RIGHT_IRIS); // landmarks 배열의 index 를 반환
      // 가상의 projection matrix 를 통해서 카메라의 intrinsic parameter 를 몰라도 camera space 에 좌표를 저장
      // 정규화하여 -1 ~ 1 사이의 값으로 변환됨 & 원점을 중심으로 하여 정규화된 점들을 반환
      // camera space 로 unproject 하면 near plane 주변에 잡히게 됨
      // 카메라로부터 scaling backprojection 을 수행
      // 3d to 2d 호모그래피 : w term -> 이미지 거리를 조절하는 역할 (카메라가 위치한 좌표만큼 떨어트림)
      drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {
        color: "#C0C0C070",
        lineWidth: 1,
      });
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {
        color: "#FF3030",
      });
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW, {
        color: "#FF3030",
      });
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_IRIS, {
        color: "#FF3030",
      });
      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, {
        color: "#30FF30",
      });
      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW, {
        color: "#30FF30",
      });
      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_IRIS, {
        color: "#30FF30",
      });
      drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, {
        color: "#E0E0E0",
      });
      drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, { color: "#E0E0E0" });

      // variables
      let index,
        points_geo,
        points_len,
        points_vertices,
        points_ns,
        points_ps,
        points_ws,
        points_mat,
        line_geo,
        line_mat,
        face_geo,
        face_mat;
      // landmarks, FACEMESH_FACE_OVAL
      if (!points_mesh) {
        /* THREE.BufferGeometry */
        points_geo = new THREE.BufferGeometry();
        points_len = FACEMESH_FACE_OVAL.length;
        points_vertices = [];
        for (let i = 0; i < points_len; i++) {
          index = FACEMESH_FACE_OVAL[i][0]; // 시작점
          points_ns = landmarks[index]; // facemesh(정규화된 좌표) 에서의 x,y,z 좌표
          // 정규화된 좌표 (0~1) 를 projection space (-1~1) 로 옮김 + 미디어파이프의 y 축 방향과 ps 의 그것이 다르기 때문에 좌표계를 맞춰줌
          points_ps = new THREE.Vector3(
            (points_ns.x - 0.5) * 2,
            -(points_ns.y - 0.5) * 2,
            points_ns.z
          );
          points_ws = new THREE.Vector3(
            points_ps.x,
            points_ps.y,
            points_ps.z
          ).unproject(camera); // facemesh 에서 정규화된 좌표를 world space 로 점을 매핑
          // near plane 에 매우 밀착하여 보여줌
          points_vertices.push(points_ws.x, points_ws.y, points_ws.z);
        }
        points_geo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(points_vertices, 3)
        );

        line_geo = new THREE.BufferGeometry();
        line_geo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(points_vertices * 3, 3)
        );

        face_geo = new THREE.BufferGeometry();
        face_geo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(points_vertices * 3, 3)
        );
        face_geo.setAttribute(
          "normal",
          new THREE.Float32BufferAttribute(points_vertices * 3, 3)
        );
        face_geo.setAttribute(
          "uv",
          new THREE.Float32BufferAttribute(points_vertices * 2, 2)
        );
        face_mat = new THREE.MeshBasicMaterial({ color: "yellow" });

        line_mat = new THREE.LineBasicMaterial({
          color: 0xff0000,
        });
        /* THREE.PointsMaterial */
        points_mat = new THREE.PointsMaterial({
          color: 0xff0000,
          size: 0.07,
        });
        /* THREE.Points */
        points_mesh = new THREE.Points(points_geo, points_mat);
        line_mesh = new THREE.Line(line_geo, line_mat);
        face_mesh = new THREE.Mesh(face_geo, face_mat);
        // face_mesh.geometry.setIndex(TRIANGULATION);
        scene.add(points_mesh);
        scene.add(line_mesh);
        scene.add(face_mesh);
      }
      let geo_copy = points_mesh.geometry.attributes.position.array;
      for (let i = 0; i < points_len; i++) {
        index = FACEMESH_FACE_OVAL[i][0];
        points_ns = landmarks[index];
        points_ps = new THREE.Vector3(
          (points_ns.x - 0.5) * 2,
          -(points_ns.y - 0.5) * 2,
          points_ns.z
        );
        points_ws = new THREE.Vector3(
          points_ps.x,
          points_ps.y,
          points_ps.z
        ).unproject(camera);
        geo_copy[i * 3] = points_ws.x;
        geo_copy[i * 3 + 1] = points_ws.y;
        geo_copy[i * 3 + 2] = points_ws.z;
      }
      // GPU 에게 렌더링 업데이트 호출
      points_mesh.geometry.attributes.position.needsUpdate = true;
      line_mesh.geometry.attributes.position.array = geo_copy;
      line_mesh.geometry.attributes.position.needsUpdate = true;

      const num_len = landmarks.length;
      for (let i = 0; i < num_len; i++) {
        points_ns = landmarks[i];
        points_ps = new THREE.Vector3(
          (points_ns.x - 0.5) * 2,
          -(points_ns.y - 0.5) * 2,
          points_ns.z
        );
        points_ws = new THREE.Vector3(
          points_ps.x,
          points_ps.y,
          points_ps.z
        ).unproject(camera);
        face_mesh.geometry.attributes.position.array[i * 3] = points_ws.x;
        face_mesh.geometry.attributes.position.array[i * 3 + 1] = points_ws.y;
        face_mesh.geometry.attributes.position.array[i * 3 + 2] = points_ws.z;
      }
      face_mesh.geometry.attributes.position.needsUpdate = true;
    }
  }
  canvasCtx.restore();
  renderer.render(scene, camera); // renderer 추가
}

const faceMesh = new FaceMesh({
  locateFile: (file) => {
    return `/scripts/@mediapipe/face_mesh/${file}`;
  },
});
faceMesh.setOptions({
  maxNumFaces: 1, // Mesh 의 수
  refineLandmarks: true, // iris tracking ON / OFF
  minDetectionConfidence: 0.5, // vertex (landmark points) 들에 대해서 내부적인 확실성의 하한
  minTrackingConfidence: 0.5, // 내부적인 확실성의 상한 (threshold)
});
faceMesh.onResults(onResults); // Mesh 의 landmark 를 전달

// 비디오를 매 프레임마다 프로세싱 -> camera_utils 사용
/*
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({ image: videoElement });
  },
  width: 1280,
  height: 720,
});
*/
// camera.start();

async function processVideo() {
  await faceMesh.send({ image: videoElement });
  videoElement.requestVideoFrameCallback(processVideo);
}

processVideo();
