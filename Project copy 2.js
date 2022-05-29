import * as THREE from "./node_modules/three/build/three.module.js";
import { OrbitControls } from "./node_modules/three/examples/jsm/controls/OrbitControls.js";

class Piano {
  constructor() {
    this.keyGroup = new THREE.Group();
    this.pianoPosition = new THREE.Vector3(-40, -20, 10);
    this.keySizeX = 6;
    this.keySizeY = 5;
    this.keySizeZ = 30;
    this.keyNumber = 8;
    for (let i = 0; i < this.keyNumber; i++) {
      const piano_geometry = new THREE.BoxGeometry(
        this.keySizeX,
        this.keySizeY,
        this.keySizeZ
      );
      const piano_material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      piano_material.transparent = true;
      piano_material.opacity = 0.6;
      let piano_mesh = new THREE.Mesh(piano_geometry, piano_material);
      piano_mesh.position.x = this.pianoPosition.x;
      piano_mesh.position.z = this.pianoPosition.z;
      piano_mesh.rotation.x = Math.PI / 8;
      piano_mesh.geometry.attributes.position.needsUpdate = true;
      piano_mesh.geometry.computeBoundingBox();
      piano_mesh.geometry.boundingBox.needsUpdate = true;
      piano_mesh.isPressed = false;
      piano_mesh.finger = null;
      console.log(piano_mesh);
      this.keyGroup.add(piano_mesh);
    }
    this.BB = new THREE.Box3();
  }
  getPianoGroup() {
    return this.keyGroup;
  }
  detectCollision(firstMesh, secondMesh) {
    let presentMesh;
    if (firstMesh && secondMesh) {
      presentMesh = [
        ...firstMesh.geometry.attributes.position.array,
        ...secondMesh.geometry.attributes.position.array,
      ];
    } else {
      presentMesh = firstMesh
        ? [...firstMesh.geometry.attributes.position.array]
        : [...secondMesh.geometry.attributes.position.array];
    }
    const arraylength = presentMesh.length / 3;
    for (const [index, key] of this.keyGroup.children.entries()) {
      const BB = new THREE.Box3();
      BB.setFromObject(key);
      for (let i = 0; i < arraylength; i++) {
        if (
          BB.containsPoint(
            new THREE.Vector3(
              presentMesh[3 * i],
              presentMesh[3 * i + 1],
              presentMesh[3 * i + 2]
            )
          )
        ) {
          if (key.isPressed === false && key.finger !== i) {
            key.material.color.set(0xff0000);
            this.playSound(index);
            key.isPressed = true;
            key.finger = i;
          }
        } else {
          if (key.isPressed === true && key.finger === i) {
            key.material.color.set(0xffffff);
            key.isPressed = false;
            key.finger = null;
          }
        }
      }
    }
  }
  updatePosition(chin) {
    // set piano in the position of face chin
    let tempPosition = new THREE.Vector3()
      .copy(this.pianoPosition)
      .add(new THREE.Vector3(chin.x, chin.y, chin.z));
    // let tempPosition = new THREE.Vector3(chin.x, chin.y, chin.z)
    for (const [index, key] of this.keyGroup.children.entries()) {
      key.position.x = tempPosition.x + index * (this.keySizeX + 6);
      key.position.y = tempPosition.y - 10;
      key.position.z = tempPosition.z;
      key.geometry.attributes.position.needsUpdate = true;
    }
  }
  playSound(index) {
    let audio = new Audio(`./sounds/${index}.mp3`);
    audio.loop = false;
    audio.play();
  }
}

const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");

const scene = new THREE.Scene();

let renderer = new THREE.WebGLRenderer(); // 렌더러1
const render_w = 640;
const render_h = 480;
renderer.setSize(render_w, render_h);
document.body.appendChild(renderer.domElement);

const camera1 = new THREE.PerspectiveCamera(45, render_w / render_h, 50, 300); // 렌더러1용 카메라
camera1.position.set(0, 0, 100);
camera1.lookAt(0, 0, 0);
camera1.up.set(0, 1, 0);

const cameraHelper = new THREE.CameraHelper(camera1);
scene.add(cameraHelper);

let renderer_world = new THREE.WebGLRenderer();
renderer_world.setSize(render_w, render_h);
document.body.appendChild(renderer_world.domElement);

const camera_world = new THREE.PerspectiveCamera(
  45,
  render_w / render_h,
  1,
  2000
);
camera_world.position.set(0, 60, 60);
camera_world.up.set(0, 1, 0);
camera_world.lookAt(0, 0, 100);

const controls_world = new OrbitControls(
  camera_world,
  renderer_world.domElement
);
controls_world.enableDamping = true;
controls_world.dampingFactor = 0.05;
controls_world.enableZoom = true;
controls_world.update();

controls_world.target.set(0,0,40);
const pointMap = {};
const w = 1,
  h = 1;
const _vector = new THREE.Vector3();

_vector.set(-w, -h, 1).unproject(camera1);
pointMap["f1"] = new THREE.Vector3().copy(_vector);
_vector.set(w, -h, 1).unproject(camera1);
pointMap["f2"] = new THREE.Vector3().copy(_vector);
_vector.set(-w, h, 1).unproject(camera1);
pointMap["f3"] = new THREE.Vector3().copy(_vector);
_vector.set(w, h, 1).unproject(camera1);
pointMap["f4"] = new THREE.Vector3().copy(_vector);

const FarPlane_geometry = new THREE.PlaneBufferGeometry();
const FarPlane_material = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  side: THREE.DoubleSide,
});
const FarPlane_mesh = new THREE.Mesh(FarPlane_geometry, FarPlane_material);

const FarPlane_vertices = [
  pointMap["f4"].x,
  pointMap["f4"].y,
  pointMap["f4"].z,
  pointMap["f3"].x,
  pointMap["f3"].y,
  pointMap["f3"].z,
  pointMap["f2"].x,
  pointMap["f2"].y,
  pointMap["f2"].z,
  pointMap["f1"].x,
  pointMap["f1"].y,
  pointMap["f1"].z,
];

FarPlane_geometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(FarPlane_vertices, 3)
);
scene.add(FarPlane_mesh);

const ip_lt = new THREE.Vector3(-1, 1, -1).unproject(camera1);
const ip_rb = new THREE.Vector3(1, -1, -1).unproject(camera1);
const ip_diff = new THREE.Vector3().subVectors(ip_rb, ip_lt);
const x_scale = Math.abs(ip_diff.x);

let lefthand_point_mesh = null;
let righthand_point_mesh = null;

let testPiano = new Piano();
scene.add(testPiano.keyGroup);
console.log(testPiano.getPianoGroup());

function ProjScale(p_ms, cam_pos, src_d, dst_d) {
  let vec_cam2p = new THREE.Vector3().subVectors(p_ms, cam_pos);
  return new THREE.Vector3().addVectors(
    cam_pos,
    vec_cam2p.multiplyScalar(dst_d / src_d)
  );
}

function onResults(results) {
  let texture_frame = new THREE.CanvasTexture(results.image);
  texture_frame.center = new THREE.Vector2(0.5, 0.5);
  texture_frame.rotation = Math.PI;

  if (results.faceLandmarks) {
    const pos_chin = results.faceLandmarks[152];
    const pos_ps_chin = new THREE.Vector3(
      (pos_chin.x - 0.5) * 2,
      -(pos_chin.y - 0.5) * 2,
      -1
    );
    let pos_ws_chin = new THREE.Vector3(
      pos_ps_chin.x,
      pos_ps_chin.y,
      pos_ps_chin.z
    ).unproject(camera1);
    pos_ws_chin.z = -pos_chin.z * x_scale + camera1.position.z - camera1.near; //Newly compute Z
    pos_ws_chin = ProjScale(pos_ws_chin, camera1.position, camera1.near, 100.0);
    testPiano.updatePosition(pos_ws_chin);
  }

  if (results.leftHandLandmarks) {
    if (lefthand_point_mesh == null) {
      let lefthand_point_geo = new THREE.BufferGeometry();
      const lefthand_vertices = [];
      for (const [index, landmarks] of results.leftHandLandmarks.entries()) {
        // left hand landmarks 21개
        if (index % 4 === 0 && index > 4) {
          const pos_ns = landmarks;
          const pos_ps = new THREE.Vector3(
            (pos_ns.x - 0.5) * 2,
            -(pos_ns.y - 0.5) * 2,
            pos_ns.z
          );
          let pos_ws = new THREE.Vector3(
            pos_ps.x,
            pos_ps.y,
            pos_ps.z
          ).unproject(camera1);
          lefthand_vertices.push(pos_ws.x, pos_ws.y, pos_ws.z);
        }
      }
      const point_mat = new THREE.PointsMaterial({ color: 0x0000ff, size: 7 });
      const lefthand_geo_bufferattribute = new THREE.Float32BufferAttribute(
        lefthand_vertices,
        3
      );
      console.log(lefthand_geo_bufferattribute);
      lefthand_point_geo.setAttribute("position", lefthand_geo_bufferattribute);
      lefthand_point_mesh = new THREE.Points(lefthand_point_geo, point_mat);
      scene.add(lefthand_point_mesh);
    }
    let positions = lefthand_point_mesh.geometry.attributes.position.array;
    for (const [i, landmarks] of results.leftHandLandmarks.entries()) {
      if (i % 4 === 0 && i > 4) {
        const pos_ns = landmarks;
        const pos_ps = new THREE.Vector3(
          (pos_ns.x - 0.5) * 2,
          -(pos_ns.y - 0.5) * 2,
          -1
        );
        let pos_ws = new THREE.Vector3(pos_ps.x, pos_ps.y, pos_ps.z).unproject(
          camera1
        );

        pos_ws.z = -pos_ns.z * x_scale + camera1.position.z - camera1.near; //Newly compute Z

        pos_ws = ProjScale(pos_ws, camera1.position, camera1.near, 100.0);
        positions[3 * (i / 4 - 2) + 0] = pos_ws.x;
        positions[3 * (i / 4 - 2) + 1] = pos_ws.y;
        positions[3 * (i / 4 - 2) + 2] = pos_ws.z;
      }
    }
    lefthand_point_mesh.geometry.attributes.position.needsUpdate = true;
  }

  // RIGHT HAND
  if (results.rightHandLandmarks) {
    if (righthand_point_mesh == null) {
      let righthand_point_geo = new THREE.BufferGeometry();
      const righthand_vertices = [];
      for (const [index, landmarks] of results.rightHandLandmarks.entries()) {
        if (index % 4 === 0 && index > 4) {
          const pos_ns = landmarks;
          const pos_ps = new THREE.Vector3(
            (pos_ns.x - 0.5) * 2,
            -(pos_ns.y - 0.5) * 2,
            pos_ns.z
          );
          let pos_ws = new THREE.Vector3(
            pos_ps.x,
            pos_ps.y,
            pos_ps.z
          ).unproject(camera1);
          righthand_vertices.push(pos_ws.x, pos_ws.y, pos_ws.z);
        }
      }
      const point_mat = new THREE.PointsMaterial({ color: 0x00ff00, size: 7 });
      const righthand_geo_bufferattribute = new THREE.Float32BufferAttribute(
        righthand_vertices,
        3
      );
      righthand_point_geo.setAttribute(
        "position",
        righthand_geo_bufferattribute
      );
      righthand_point_mesh = new THREE.Points(righthand_point_geo, point_mat);
      scene.add(righthand_point_mesh);
    }
    let positions = righthand_point_mesh.geometry.attributes.position.array;
    for (const [i, landmarks] of results.rightHandLandmarks.entries()) {
      if (i % 4 === 0 && i > 4) {
        const pos_ns = landmarks;
        const pos_ps = new THREE.Vector3(
          (pos_ns.x - 0.5) * 2,
          -(pos_ns.y - 0.5) * 2,
          -1
        );
        let pos_ws = new THREE.Vector3(pos_ps.x, pos_ps.y, pos_ps.z).unproject(
          camera1
        );

        pos_ws.z = -pos_ns.z * x_scale + camera1.position.z - camera1.near; //Newly compute Z

        pos_ws = ProjScale(pos_ws, camera1.position, camera1.near, 100.0);
        positions[3 * (i / 4 - 2) + 0] = pos_ws.x;
        positions[3 * (i / 4 - 2) + 1] = pos_ws.y;
        positions[3 * (i / 4 - 2) + 2] = pos_ws.z;
      }
    }
    righthand_point_mesh.geometry.attributes.position.needsUpdate = true;
  }

  if (lefthand_point_mesh || righthand_point_mesh) {
    testPiano.detectCollision(lefthand_point_mesh, righthand_point_mesh);
  }
  controls_world.update();
  FarPlane_mesh.material.map = texture_frame;
  renderer.render(scene, camera1);
  renderer_world.render(scene, camera_world);
  canvasCtx.restore();
}

const holistic = new Holistic({
  locateFile: (file) => {
    return `./node_modules/@mediapipe/holistic/${file}`;
  },
});
holistic.setOptions({
  selfieMode: true,
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: true,
  smoothSegmentation: true,
  refineFaceLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
holistic.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await holistic.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});
camera.start();
