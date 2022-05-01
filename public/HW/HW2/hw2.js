import * as THREE from "/scripts/three/build/three.module.js";
import { OrbitControls } from "/scripts/three/examples/jsm/controls/OrbitControls.js";
import { Line2 } from "/scripts/three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "/scripts/three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "/scripts/three/examples/jsm/lines/LineGeometry.js";
import { TRIANGULATION } from "./triangulation.js";

/*** Variables for HTML ***/
const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");
/*** END OF Variables for HTML ***/

/*** Upper Renderer ***/
const renderer = new THREE.WebGLRenderer();
const $width = 640;
const $height = 480;
renderer.setSize($width, $height);
renderer.setViewport(0, 0, $width, $height);
document.body.appendChild(renderer.domElement);
/*** END OF Upper Renderer ***/

/*** Lower Renderer ***/
const renderer2 = new THREE.WebGLRenderer();
renderer2.setSize($width, $height);
renderer2.setViewport(0, 0, $width, $height);
document.body.appendChild(renderer2.domElement);
/*** END OF Lower Renderer ***/

// Create Scene
const scene = new THREE.Scene();

// Load VideoTexture for Background
const texture_bg = new THREE.VideoTexture(videoElement);

/*** First Camera (Main for upper renderer) ***/
const camera_ar = new THREE.PerspectiveCamera(45, $width / $height, 50, 500);
camera_ar.position.set(0, 0, 100);
camera_ar.lookAt(0, 0, 0);
camera_ar.up.set(0, 1, 0);
scene.add(camera_ar);
/*** END OF First Camera ***/

/*** Second Camera (Main for lower renderer) ***/
const camera_temp = new THREE.PerspectiveCamera(45, $width / $height, 1, 5000);
camera_temp.position.set(70, 30, 200);
camera_temp.lookAt(0, 0, 0);
camera_temp.up.set(0, 1, 0);
/*** END OF Second Camera ***/

/*** CameraHelper for lower renderer ***/
const cameraPerspectiveHelper = new THREE.CameraHelper(camera_ar);
scene.add(cameraPerspectiveHelper);
/*** END OF CameraHelper ***/

/*** Directional Light on scene ***/
const light = new THREE.DirectionalLight(0xffffff, 1.0);
light.position.set(-100, 0, 100);
scene.add(light);
/*** END OF Directional Light on scene ***/

/*** OrbitControls for lower renderer ***/
const controls = new OrbitControls(camera_temp, renderer2.domElement);
controls.enableZoom = true;
controls.enablePan = true;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
/*** END OF OrbitControls ***/

// Object for tracking the face by OrbitControls
let orbitVec = new THREE.Box3();

/*** Variables for 3D Objects ***/
let point_mesh = null;
let face_mesh = null;
let fat_line_mesh = null;
let fat_line_geo = null;
/*** END OF Vairables for 3D Objects ***/

/*** Adjust Scale by Vector ***/
function ProjScale(p_ms, cam_pos, src_d, dst_d) {
  let vec_cam2p = new THREE.Vector3().subVectors(p_ms, cam_pos);
  return new THREE.Vector3().addVectors(
    cam_pos,
    vec_cam2p.multiplyScalar(dst_d / src_d)
  );
}
/*** END OF Adjust Scale by Vector ***/

/*** FUNC - onResults2 : Rendering the entire Scene ***/
function onResults2(results) {
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
      if (point_mesh === null) {
        let point_geo = new THREE.BufferGeometry();
        const point_len = FACEMESH_FACE_OVAL.length;
        const point_vertices = [];
        for (let i = 0; i < point_len; i++) {
          const index = FACEMESH_FACE_OVAL[i][0];
          const point_ns = landmarks[index];
          const point_ps = new THREE.Vector3(
            (point_ns.x - 0.5) * 2,
            -(point_ns.y - 0.5) * 2,
            point_ns.z
          );
          let point_ws = new THREE.Vector3(
            point_ps.x,
            point_ps.y,
            point_ps.z
          ).unproject(camera_ar);
          point_vertices.push(point_ws.x, point_ws.y, point_ws.z);
        }
        /*** Point - Geometry & Material ***/
        point_geo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(point_vertices, 3)
        );
        const point_mat = new THREE.PointsMaterial({
          color: 0xff0000,
          size: 5,
        });
        point_mesh = new THREE.Points(point_geo, point_mat);
        scene.add(point_mesh);
        /*** END OF Point ***/

        /*** Fat Line - Geometry & Material ***/
        fat_line_geo = new LineGeometry();
        fat_line_geo.setPositions(point_vertices);
        let fat_line_mat = new LineMaterial({
          color: 0xffffff,
          linewidth: 14,
          vertexColors: true,
          resolution: new THREE.Vector2(640, 480),
          dashed: false,
          alphaToCoverage: false,
        });
        fat_line_mesh = new Line2(fat_line_geo, fat_line_mat);
        scene.add(fat_line_mesh);
        /*** END OF Fat Line ***/

        /*** Face - Geometry & Material ***/
        let face_geo = new THREE.BufferGeometry();
        face_geo.setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array(landmarks.length * 3), 3)
        );
        face_geo.setAttribute(
          "normal",
          new THREE.BufferAttribute(new Float32Array(landmarks.length * 3), 3)
        );
        face_geo.setAttribute(
          "uv",
          new THREE.BufferAttribute(new Float32Array(landmarks.length * 2), 2)
        );
        let face_mat = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          specular: new THREE.Color(0, 0, 0),
          shininess: 1000,
        });
        face_mesh = new THREE.Mesh(face_geo, face_mat);
        face_mesh.geometry.setIndex(TRIANGULATION);
        scene.add(face_mesh);
        /*** END OF Face ***/
      }

      const p_c = new THREE.Vector3(0, 0, 0).unproject(camera_ar);
      const vec_cam2center = new THREE.Vector3().subVectors(
        p_c,
        camera_ar.position
      );
      const center_dist = vec_cam2center.length();

      const point_len = FACEMESH_FACE_OVAL.length;
      let positions = point_mesh.geometry.attributes.position.array;
      for (let i = 0; i < point_len; i++) {
        const index = FACEMESH_FACE_OVAL[i][0];
        const point_ns = landmarks[index];
        const point_ps = new THREE.Vector3(
          (point_ns.x - 0.5) * 2,
          -(point_ns.y - 0.5) * 2,
          point_ns.z
        );
        let point_ws = new THREE.Vector3(
          point_ps.x,
          point_ps.y,
          point_ps.z
        ).unproject(camera_ar);

        point_ws = ProjScale(point_ws, camera_ar.position, center_dist, 100.0);

        positions[i * 3] = point_ws.x;
        positions[i * 3 + 1] = point_ws.y;
        positions[i * 3 + 2] = point_ws.z;
      }
      point_mesh.geometry.attributes.position.needsUpdate = true;
      fat_line_geo.setPositions(positions);

      const landmarks_len = landmarks.length;
      for (let i = 0; i < landmarks_len; i++) {
        const point_ns = landmarks[i];
        const point_ps = new THREE.Vector3(
          (point_ns.x - 0.5) * 2,
          -(point_ns.y - 0.5) * 2,
          point_ns.z
        );

        let point_ws = new THREE.Vector3(
          point_ps.x,
          point_ps.y,
          point_ps.z
        ).unproject(camera_ar);

        point_ws = ProjScale(point_ws, camera_ar.position, center_dist, 100.0);

        face_mesh.geometry.attributes.position.array[i * 3] = point_ws.x;
        face_mesh.geometry.attributes.position.array[i * 3 + 1] = point_ws.y;
        face_mesh.geometry.attributes.position.array[i * 3 + 2] = point_ws.z;
        face_mesh.geometry.attributes.uv.array[i * 2] = point_ns.x;
        face_mesh.geometry.attributes.uv.array[i * 2 + 1] = 1.0 - point_ns.y;
      }
      face_mesh.geometry.attributes.position.needsUpdate = true;
      face_mesh.geometry.attributes.uv.needsUpdate = true;
      face_mesh.geometry.computeVertexNormals();

      let texture_frame = new THREE.CanvasTexture(results.image);
      face_mesh.material.map = texture_frame;
      light.target = face_mesh;
    }
  }
  canvasCtx.restore();
  let canvasBackground = new THREE.CanvasTexture(canvasCtx.canvas);
  /*** Upper Renderder ***/
  scene.background = canvasBackground;
  cameraPerspectiveHelper.visible = false;
  lightHelper.visible = false;
  renderer.render(scene, camera_ar);
  /*** END OF Upper Renderder ***/

  /*** Lower Renderder ***/
  scene.background = null;
  cameraPerspectiveHelper.visible = true;
  cameraPerspectiveHelper.update();
  lightHelper.visible = true;
  far_plane_mesh.material.map = canvasBackground;
  orbitVec.setFromObject(face_mesh);
  orbitVec.getCenter(controls.target);
  controls.update();
  renderer2.render(scene, camera_temp);
  /*** END OF Lower Renderder ***/
}
/*** END OF FUNC - onResults2 ***/

const faceMesh = new FaceMesh({
  locateFile: (file) => {
    return `/scripts/@mediapipe/face_mesh/${file}`;
  },
});
faceMesh.setOptions({
  maxNumFaces: 1,
  selfieMode: true,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
faceMesh.onResults(onResults2);
/*** END OF faceMesh ***/

/*** WebCam Camera (Get image data from WebCam) ***/
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});
camera.start();
/*** END OF WebCam Camera ***/

// Light x, y position
let $px = 0;
let $py = 0;

// Upper Renderer
const upperCanvas = document.getElementsByTagName("canvas")[1];

/*** mouseLight & LightHelper ***/
const mouseLight = new THREE.DirectionalLight(0xffffff, 1.0);
mouseLight.position.set($px, $py, 100);
scene.add(mouseLight);
const lightHelper = new THREE.DirectionalLightHelper(mouseLight, 5);
scene.add(lightHelper);
/*** END OF mouseLight & LightHelper ***/

/*** FUNC - lightMoveByMouse : Calculate mouse position ***/
const lightMoveByMouse = () => {
  let vector = new THREE.Vector3($px, $py, -1);
  vector.unproject(camera_ar);
  mouseLight.position.set(
    vector.x,
    vector.y,
    camera_ar.position.z - camera_ar.near
  );
  mouseLight.lookAt(0, 0, 0);
  lightHelper.update();
};
/*** END OF FUNC - lightMoveByMouse ***/

/*** mouseClickEvent ***/
upperCanvas.addEventListener("click", (e) => {
  $px = (e.clientX / 640) * 2 - 1;
  $py = -(e.clientY / 480) * 2 + 1;
  lightMoveByMouse();
});
/*** END OF mouseClickEvent ***/

// mouse state variable
let readyToMove = false;

/*** mouse drag & move Events ***/
upperCanvas.addEventListener("mousedown", () => {
  readyToMove = true;
});

upperCanvas.addEventListener("mouseup", () => {
  readyToMove = false;
});

upperCanvas.addEventListener("mousemove", (e) => {
  if (readyToMove) {
    $px = (e.clientX / 640) * 2 - 1;
    $py = -(e.clientY / 480) * 2 + 1;
    lightMoveByMouse();
  }
});
/*** END OF mouse drag & move Events ***/

/*** mouseWheelEvent ***/
upperCanvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (e.deltaY < 0) camera_ar.near++;
  else camera_ar.near--;
  camera_ar.updateProjectionMatrix();
  lightMoveByMouse();
});
/*** END OF mouseWheelEvent ***/

/*** Create Far Plane Object ***/
let vFOV = THREE.MathUtils.degToRad(camera_ar.fov);
let far_height = 2 * Math.tan(vFOV / 2) * camera_ar.far;
let far_width = far_height * camera_ar.aspect;

let far_plane_geo = new THREE.PlaneGeometry(far_width, far_height);
let far_plane_mat = new THREE.MeshBasicMaterial({
  side: THREE.DoubleSide,
  map: new THREE.CanvasTexture(canvasCtx.canvas),
});
let far_plane_mesh = new THREE.Mesh(far_plane_geo, far_plane_mat);
far_plane_mesh.position.set(0, 0, camera_ar.position.z - camera_ar.far);
scene.add(far_plane_mesh);
/*** END OF Create Far Plane Object ***/
