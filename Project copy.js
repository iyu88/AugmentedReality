import * as THREE from './node_modules/three/build/three.module.js';
import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';

class Piano{
  constructor(){
    this.keyGroup = new THREE.Group();
    this.pianoPosition = new THREE.Vector3(0,0,30);
    this.keySizeX = 10;
    this.keySizeY = 20;
    this.keySizeZ = 5;
    this.keyNumber = 5;
    for(let i =0;i<this.keyNumber;i++){
      const piano_geometry = new THREE.BoxGeometry(this.keySizeX, this.keySizeY, this.keySizeZ);
      const piano_material = new THREE.MeshBasicMaterial({color:0xFFFFFF});
      let piano_mesh = new THREE.Mesh(piano_geometry,piano_material);
      piano_mesh.position.x = this.pianoPosition.x + i*11;
      piano_mesh.position.z = this.pianoPosition.z;
      this.keyGroup.add(piano_mesh);
    }
  }
  getPianoGroup(){
    return this.keyGroup;
  }
  detectCollision(){
    console.log(this.keyGroup.children[1].position);
    for(const key in this.keyGroup.children){
      console.log(key.position);
    }
  }
}

const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

const scene = new THREE.Scene();

let renderer = new THREE.WebGLRenderer(); // 렌더러1
const render_w = 640;
const render_h = 480;
renderer.setSize(render_w,render_h);
document.body.appendChild(renderer.domElement);

const camera1 = new THREE.PerspectiveCamera(45, render_w/render_h, 50, 300); // 렌더러1용 카메라
camera1.position.set(0, 0, 100);
camera1.lookAt(0, 0, 0);
camera1.up.set(0, 1, 0);

const cameraHelper = new THREE.CameraHelper(camera1);
scene.add( cameraHelper );

let renderer_world = new THREE.WebGLRenderer();
renderer_world.setSize(render_w,render_h);
document.body.appendChild(renderer_world.domElement);

const camera_world = new THREE.PerspectiveCamera(45, render_w/render_h, 1, 2000);
camera_world.position.set(200, 0, 400);
camera_world.lookAt(0, 0, 0);
camera_world.up.set(0, 1, 0);

const controls_world = new OrbitControls( camera_world, renderer_world.domElement );
controls_world.enableDamping = true;
controls_world.dampingFactor = 0.05;
controls_world.enableZoom = true;
controls_world.update();

const pointMap = {};
const w = 1, h = 1;
const _vector = new THREE.Vector3();

_vector.set( - w, - h, 1).unproject( camera1 );
pointMap['f1'] = new THREE.Vector3().copy(_vector);
_vector.set( w, - h, 1).unproject( camera1 );
pointMap['f2'] = new THREE.Vector3().copy(_vector);
_vector.set( - w, h, 1).unproject( camera1 );
pointMap['f3'] = new THREE.Vector3().copy(_vector);
_vector.set( w, h, 1).unproject( camera1 );
pointMap['f4'] = new THREE.Vector3().copy(_vector);

const FarPlane_geometry = new THREE.PlaneBufferGeometry();
const FarPlane_material = new THREE.MeshBasicMaterial({color:0xFFFFFF, side:THREE.DoubleSide});
const FarPlane_mesh = new THREE.Mesh(FarPlane_geometry,FarPlane_material);

const FarPlane_vertices = [
pointMap['f4'].x, pointMap['f4'].y, pointMap['f4'].z,
pointMap['f3'].x, pointMap['f3'].y, pointMap['f3'].z,
pointMap['f2'].x, pointMap['f2'].y, pointMap['f2'].z,
pointMap['f1'].x, pointMap['f1'].y, pointMap['f1'].z,
];

FarPlane_geometry.setAttribute('position', new THREE.Float32BufferAttribute( FarPlane_vertices, 3 ));
scene.add(FarPlane_mesh);

const ip_lt = new THREE.Vector3(-1, 1, -1).unproject(camera1);
const ip_rb = new THREE.Vector3(1, -1, -1).unproject(camera1);
const ip_diff = new THREE.Vector3().subVectors(ip_rb, ip_lt);
const x_scale = Math.abs(ip_diff.x);

let lefthand_point_mesh = null;

let testPiano = new Piano();
scene.add(testPiano.keyGroup);
console.log(testPiano.getPianoGroup());

function ProjScale(p_ms, cam_pos, src_d, dst_d) {
  let vec_cam2p = new THREE.Vector3().subVectors(p_ms, cam_pos);
  return new THREE.Vector3().addVectors(cam_pos, vec_cam2p.multiplyScalar(dst_d/src_d));
}

function onResults(results) {
  let texture_frame = new THREE.CanvasTexture(results.image);
  texture_frame.center = new THREE.Vector2(0.5,0.5);
  texture_frame.rotation = Math.PI;
  // canvasCtx.save();
  // canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  // canvasCtx.drawImage(
  //    results.image, 0, 0, canvasElement.width, canvasElement.height);
  if (results.leftHandLandmarks) { 
    console.log("왼손 발견");
    //console.log(testPiano.keyGroup.children[0].position);
    //let num_lefthand_point = 21;
    if (lefthand_point_mesh == null) {
      //console.log(HAND_CONNECTIONS);
      console.log(testPiano.detectCollision());
      let lefthand_point_geo = new THREE.BufferGeometry();
      const lefthand_vertices = [];
      for (const landmarks of results.leftHandLandmarks) {// left hand landmarks 21개
        const pos_ns = landmarks;
        const pos_ps = new THREE.Vector3((pos_ns.x-0.5)*2, -(pos_ns.y-0.5)*2, pos_ns.z)
        let pos_ws = new THREE.Vector3(pos_ps.x, pos_ps.y, pos_ps.z).unproject(camera1);
        lefthand_vertices.push(pos_ws.x, pos_ws.y, pos_ws.z);
      }
    const point_mat = new THREE.PointsMaterial({ color:0xff0000,size:7});
    lefthand_point_geo.setAttribute('position', new THREE.Float32BufferAttribute(lefthand_vertices,3));
    lefthand_point_mesh = new THREE.Points(lefthand_point_geo, point_mat);
    scene.add(lefthand_point_mesh);
    console.log(lefthand_point_mesh);
    }
    let positions = lefthand_point_mesh.geometry.attributes.position.array;
    let i = 0;
    for (const landmarks of results.leftHandLandmarks) {
      const pos_ns = landmarks;
      const pos_ps = new THREE.Vector3((pos_ns.x-0.5)*2, -(pos_ns.y-0.5)*2, -1)
      let pos_ws = new THREE.Vector3(pos_ps.x, pos_ps.y, pos_ps.z).unproject(camera1);
      
      pos_ws.z = -pos_ns.z * x_scale + camera1.position.z - camera1.near; //Newly compute Z

      pos_ws = ProjScale(pos_ws, camera1.position, camera1.near, 100.0);
      positions[ 3*i + 0] = pos_ws.x;
      positions[ 3*i + 1] = pos_ws.y;
      positions[ 3*i + 2] = pos_ws.z;
      i += 1;
    }
    lefthand_point_mesh.geometry.computeBoundingBox();
    lefthand_point_mesh.geometry.boundingBox.needsUpdate = true;
    //console.log(lefthand_point_mesh.geometry.boundingBox);
    lefthand_point_mesh.geometry.attributes.position.needsUpdate =  true;
  }
  controls_world.update();
  FarPlane_mesh.material.map = texture_frame;
  renderer.render(scene,camera1);
  renderer_world.render(scene,camera_world);
  canvasCtx.restore();
}

const holistic = new Holistic({locateFile: (file) => {
  return `./node_modules/@mediapipe/holistic/${file}`;
}});
holistic.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: true,
  smoothSegmentation: true,
  refineFaceLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
holistic.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await holistic.send({image: videoElement});
  },
  width: 640,
  height: 480,
});
camera.start();