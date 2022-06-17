import * as THREE from "./node_modules/three/build/three.module.js";
import { OrbitControls } from "./node_modules/three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "./node_modules/three/examples/jsm/loaders/FBXLoader.js";
import { CCDIKSolver } from "./node_modules/three/examples/jsm/animation/CCDIKSolver.js";
import { MMDLoader } from "./node_modules/three/examples/jsm/loaders/MMDLoader.js";
import { MMDPhysics } from "./node_modules/three/examples/jsm/animation/MMDPhysics.js";
//import * as CANNON from './node_modules/cannon/build/cannon.js';

// DOM 요소 가져오기
const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
const render_w = videoElement.videoWidth;
const render_h = videoElement.videoHeight;
renderer.setSize(render_w, render_h);
renderer.setViewport(0, 0, render_w, render_h);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// 첫번째 카메라
const camera_ar = new THREE.PerspectiveCamera(
  45,
  render_w / render_h,
  0.1,
  1000
);
camera_ar.position.set(-1, 2, 3);
camera_ar.up.set(0, 1, 0);
camera_ar.lookAt(0, 1, 0);

// 두번째 카메라
const camera_world = new THREE.PerspectiveCamera(
  45,
  render_w / render_h,
  1,
  1000
);
camera_world.position.set(0, 1, 3);
camera_world.up.set(0, 1, 0);
camera_world.lookAt(0, 1, 0);
camera_world.updateProjectionMatrix();

// 첫번째 카메라에 대해 OrbitControl 설정
const controls = new OrbitControls(camera_ar, renderer.domElement);
controls.enablePan = true;
controls.enableZoom = true;
controls.target.set(0, 1, -1);
controls.update();

// Scene
const scene = new THREE.Scene();

scene.background = new THREE.Color(0xa0a0a0);
scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

// HemisphereLight
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

// DirectionalLight
const dirLight = new THREE.DirectionalLight(0xffffff);
dirLight.position.set(3, 10, 10);
dirLight.castShadow = true;
dirLight.shadow.camera.top = 5;
dirLight.shadow.camera.bottom = -5;
dirLight.shadow.camera.left = -5;
dirLight.shadow.camera.right = 5;
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 500;
scene.add(dirLight);

// 땅 Mesh
const ground_mesh = new THREE.Mesh(
  new THREE.PlaneGeometry(1000, 1000),
  new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
);
ground_mesh.rotation.x = -Math.PI / 2;
ground_mesh.receiveShadow = true;
scene.add(ground_mesh);

// 그리드 헬퍼
const grid_helper = new THREE.GridHelper(1000, 1000);
grid_helper.rotation.x = Math.PI / 2;
ground_mesh.add(grid_helper);

let ikSolver_left;
let ikSolver_right;
let ikSolver_left_foot;
let ikSolver_right_foot;

let model,
  skeleton = null,
  skeleton_helper,
  mixer,
  numAnimations;
let physics;
let axis_helpers = [];
const loader2 = new GLTFLoader();
const loader = new FBXLoader(); //fbxLoader
const mmdloader = new MMDLoader();
const clock = new THREE.Clock();
let oldElapsedTime = 0;
mmdloader.load("../models/lin/lin.pmd", function (mmd) {
  // 마네킹을 그리는 부분
  model = mmd; // gltf.scene -> GLTF 용
  scene.add(model);

  model.scale.multiplyScalar(0.1); // 모델 전체의 크기 조절
  console.log(model);
  physics = new MMDPhysics(model,model.geometry.userData.MMD.rigidBodies,model.geometry.userData.MMD.constraints);
  physics.setGravity(new THREE.Vector3(0,10,0));
  //physics.update();
  console.log(physics);
  let bones = [];

  let char_mesh = null;
  model.traverse(function (object) {
    // object.scale.multiplyScalar(1);
    if (object.isMesh) {
      object.castShadow = true; // 스킨 메쉬
      if (!char_mesh) char_mesh = object;
    }

    //console.log(object.isBone);
    if (object.isBone) {
      // 본
      // https://stackoverflow.com/questions/13309289/three-js-geometry-on-top-of-another
      bones.push(object); // -> 배열로 구성 ( 위계질서가 있음 - 조인트 )
      //console.log(object);
      //if(object.name == "mixamorigLeftToeBase") {
      //let axis_helper = new THREE.AxesHelper(20);
      //axis_helper.material.depthTest = false;
      //object.add(new THREE.AxesHelper(20));
      //}
      //let axis_helper = new THREE.AxesHelper(20);
      //axis_helper.material.depthTest = false;
      //object.add(axis_helper);
      //axis_helpers.push(axis_helper);
    }
  });

  bones.forEach(function (bone) {
    // 조인트 이름을 콘솔에 찍어봄 : 힙 ( 루트 본 ) , 스파인, 넥, 헤드 등등
    console.log(bone.name);
  });
  // 미디어파이프에서의 어깨보다 스켈레톤의 어깨가 더 안쪽에 있음 ( 11, 12번 )
  // mixamorigLeftArm, mixamorigLeftForeArm, mixamorigLeftHand

  skeleton = new THREE.Skeleton(bones); // 스켈레톤 생성
  // getBoneByName : 직접 조인트 이름으로 접근
  // 조인트 앵글을 계산 : 개별 조인트의 Rotation 을 구하는 식을 계산 & 개별 조인트의 offset 을 가지고 해당 조인트에서 로컬 트랜스폼 설정

  skeleton_helper = new THREE.SkeletonHelper(model);
  skeleton_helper.visible = true;

  scene.add(skeleton_helper);

  const iks_left = [
    {
      target: 44,
      effector: 43,
      links: [{ index: 30 }, { index: 31 }, { index: 32 }, { index: 33 }],
    },
  ];

  const iks_right = [
    {
      target: 70,
      effector: 69,
      links: [{ index: 56 }, { index: 57 }, { index: 58 }, { index: 59 }],
    },
  ];

  const iks_left_foot = [
    {
      target: 88,
      effector: 87,
      links: [{ index: 85 }, { index: 86 }],
    },
  ];

  const iks_right_foot = [
    {
      target: 92,
      effector: 91,
      links: [{ index: 89 }, { index: 90 }],
    },
  ];
  // console.log(model.children[0].children[0]);
  //ikSolver_left = new CCDIKSolver(char_mesh, iks_left);
  //ikSolver_right = new CCDIKSolver(char_mesh, iks_right);
  //ikSolver_left_foot = new CCDIKSolver(char_mesh, iks_left_foot);
  //ikSolver_right_foot = new CCDIKSolver(char_mesh, iks_right_foot);
  //const ikhelper_left = ikSolver_left.createHelper();
  //scene.add(ikhelper_left);
  // console.log(bones.map((el) => el.name).join("\n"));

  //const animations = gltf.animations;
  //mixer = new THREE.AnimationMixer( model );

  //numAnimations = animations.length;

  //console.log(model.position);
  //console.log(model.scale);
});

let pose_name_to_index = {
  nose: 0,
  left_eye_inner: 1,
  left_eye: 2,
  left_eye_outer: 3,
  right_eye_inner: 4,
  right_eye: 5,
  right_eye_outer: 6,
  left_ear: 7,
  right_ear: 8,
  mouth_left: 9,
  mouth_right: 10,
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_pinky: 17,
  right_pinky: 18,
  left_index: 19,
  right_index: 20,
  left_thumb: 21,
  right_thumb: 22,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28,
  left_heel: 29,
  right_heel: 30,
  left_foot_index: 31,
  right_foot_index: 32,
};

let hand_name_to_index = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_FINGER_MCP: 5,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_MCP: 9,
  MIDDLE_FINGER_PIP: 10,
  MIDDLE_FINGER_DIP: 11,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_MCP: 13,
  RING_FINGER_PIP: 14,
  RING_FINGER_DIP: 15,
  RING_FINGER_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

let pose_index_to_name = {};
let hand_index_to_name = {};
let pos_3d_landmarks = {};
let custom_pos_3d_landmarks = {};
let lefthand_3d_landmarks;
let righthand_3d_landmarks;
let total_pos_3d_landmarks;

// Pose 의 이름에 대한 인덱스 저장
for (const [key, value] of Object.entries(pose_name_to_index)) {
  //console.log(key, value);
  pose_index_to_name[value] = key;
}

// Hand 의 이름에 대한 인덱스 저장
for (const [key, value] of Object.entries(hand_name_to_index)) {
  hand_index_to_name[value] = key;
}

let axis_helper_root = new THREE.AxesHelper(1);
axis_helper_root.position.set(0, 0.001, 0);
scene.add(axis_helper_root);

const pose_points = new THREE.Points(
  new THREE.BufferGeometry(),
  new THREE.PointsMaterial({
    color: 0xff0000,
    size: 0.1,
    sizeAttenuation: true,
  })
);

const custom_points = new THREE.Points(
  new THREE.BufferGeometry(),
  new THREE.PointsMaterial({
    color: 0x0000ff,
    size: 0.1,
    sizeAttenuation: true,
  })
);

pose_points.geometry.setAttribute(
  "position",
  new THREE.BufferAttribute(new Float32Array(33 * 3), 3)
);
scene.add(pose_points);

custom_points.geometry.setAttribute(
  "position",
  new THREE.BufferAttribute(new Float32Array(10 * 3), 3)
);
scene.add(custom_points);

const hand_points = new THREE.Points(
  new THREE.BufferGeometry(),
  new THREE.PointsMaterial({
    color: 0xff0000,
    size: 0.1,
    sizeAttenuation: true,
  })
);

hand_points.geometry.setAttribute(
  "position",
  new THREE.BufferAttribute(new Float32Array(42 * 3), 3)
);
scene.add(hand_points);

const world = new CANNON.World(); //  Physics               !!!!!!!!
world.gravity.set(0, -9.82*10, 0);

const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body();
floorBody.mass = 0;
floorBody.addShape(floorShape);
world.addBody(floorBody);
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(- 1, 0, 0), Math.PI * 0.5) 

const sphereShape = new CANNON.Sphere(0.5); // BONE Physics
const sphereBody = new CANNON.Body({
  mass: 1,
  position: new CANNON.Vec3(0, 3, 0),
  shape: sphereShape,
});
world.addBody(sphereBody);

const cannon_tick = (bone) => // Apply physics
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime

    // Update physics
    world.step(1 / 60, deltaTime, 3)
    // step은 업데이트 해주는 메소드
    //console.log(sphereBody.position.y)
  
    // cannon.js world에 있는 값으로 Three.js의 sphere 값을 업데이트
    // sphere.position.x = sphereBody.position.x
    // sphere.position.y = sphereBody.position.y
    // sphere.position.z = sphereBody.position.z
  
    bone.position.copy(sphereBody.position)
}
// const righthand_points = new THREE.Points(
//   new THREE.BufferGeometry(),
//   new THREE.PointsMaterial({
//     color: 0xff0000,
//     size: 0.1,
//     sizeAttenuation: true,
//   })
// );
//
// righthand_points.geometry.setAttribute(
//   "position",
//   new THREE.BufferAttribute(new Float32Array(33 * 3), 3)
// );
// scene.add(righthand_points);

function computeR(A, B) {
  // get unit vectors
  const uA = A.clone().normalize();
  const uB = B.clone().normalize();

  // get products
  const idot = uA.dot(uB);
  const cross_AB = new THREE.Vector3().crossVectors(uA, uB);
  const cdot = cross_AB.length();

  // get new unit vectors
  const u = uA.clone();
  const v = new THREE.Vector3()
    .subVectors(uB, uA.clone().multiplyScalar(idot))
    .normalize();
  const w = cross_AB.clone().normalize();

  // get change of basis matrix
  const C = new THREE.Matrix4().makeBasis(u, v, w).transpose();
  // get rotation matrix in new basis
  const R_uvw = new THREE.Matrix4().set(
    idot,
    -cdot,
    0,
    0,
    cdot,
    idot,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1
  );
  // full rotation matrix
  //const R = new Matrix4().multiplyMatrices(new Matrix4().multiplyMatrices(C, R_uvw), C.clone().transpose());
  const R = new THREE.Matrix4().multiplyMatrices(
    C.clone().transpose(),
    new THREE.Matrix4().multiplyMatrices(R_uvw, C)
  );
  return R;
}

function computeQuaternion(A, B) {
  const uA = A.clone().normalize();
  const uB = B.clone().normalize();

  // get products
  const idot = uA.dot(uB);
  const cross_AB = new THREE.Vector3().crossVectors(uA, uB);
  const cdot = cross_AB.length();

  // get new unit vectors
  const u = uA.clone();
  const v = new THREE.Vector3()
    .subVectors(uB, uA.clone().multiplyScalar(idot))
    .normalize();
  const w = cross_AB.clone().normalize();

  const angle = Math.acos(Math.abs(idot));
  // const Q = new THREE.Quaternion().setFromAxisAngle(w, angle);
  // return Q;
  const half_angle = angle / 2;
  const half_sin = Math.sin(half_angle);
  const half_cos = Math.cos(half_angle);
  return new THREE.Quaternion(
    half_sin * w.x,
    half_sin * w.y,
    half_sin * w.z,
    half_cos
  );
}

function computeR_hips() {
  const hip_joint = custom_pos_3d_landmarks["$hips"];
  let u = new THREE.Vector3()
    .subVectors(pos_3d_landmarks["left_hip"], pos_3d_landmarks["right_hip"])
    .normalize();
  const v = new THREE.Vector3()
    .subVectors(custom_pos_3d_landmarks["$neck1"], hip_joint)
    .normalize();
  const w = new THREE.Vector3().crossVectors(u, v).normalize();
  u = new THREE.Vector3().crossVectors(v, w).normalize();
  const R = new THREE.Matrix4().makeBasis(u, v, w); // local!!
  return R;
}

function computeJointParentR(
  nameSkeletonJoint,
  nameMpJoint,
  nameMpJointParent,
  R_chain,
  skeleton
) {
  const skeletonJoint = skeleton.getBoneByName(nameSkeletonJoint);
  const j = skeletonJoint.position.clone().normalize();
  const v = new THREE.Vector3()
    .subVectors(
      total_pos_3d_landmarks[nameMpJoint],
      total_pos_3d_landmarks[nameMpJointParent]
    )
    .normalize();
  let R = computeR(j, v.applyMatrix4(R_chain.clone().transpose()));
  return R;
}

function computeJointParentQ(
  nameSkeletonJoint,
  nameMpJoint,
  nameMpJointParent,
  Q_chain,
  skeleton
) {
  const skeletonJoint = skeleton.getBoneByName(nameSkeletonJoint);
  const j = skeletonJoint.position.clone().normalize();
  const v = new THREE.Vector3()
    .subVectors(
      total_pos_3d_landmarks[nameMpJoint],
      total_pos_3d_landmarks[nameMpJointParent]
    )
    .normalize();
  let Q = computeQuaternion(j, v.applyQuaternion(Q_chain.clone().conjugate()));
  return Q;
}

function onResults2(results) {
  // if (
  //   !results.poseLandmarks
  // ) {
  //   return;
  // }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );

  {
    // Only overwrite existing pixels.
    // canvasCtx.globalCompositeOperation = 'source-in';
    // canvasCtx.fillStyle = '#00FF00';
    // canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    // Only overwrite missing pixels.
    canvasCtx.globalCompositeOperation = "destination-atop";
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );

    //console.log(results.poseLandmarks);

    canvasCtx.globalCompositeOperation = "source-over";
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: "#00FF00",
      lineWidth: 2,
    });
    drawLandmarks(canvasCtx, results.poseLandmarks, {
      color: "#FF0000",
      radius: 1,
    });
    canvasCtx.restore();
  }

  function update3dpose(camera, dist_from_cam, offset, poseLandmarks) {
    // if the camera is orthogonal, set scale to 1
    const ip_lt = new THREE.Vector3(-1, 1, -1).unproject(camera); // 해당 카메라의 이미지 플레인에 두고, 이것에 투영한 점들을 갖고
    const ip_rb = new THREE.Vector3(1, -1, -1).unproject(camera); // 월드 스페이스에 랜드마크를 투영
    const ip_diff = new THREE.Vector3().subVectors(ip_rb, ip_lt);
    const x_scale = Math.abs(ip_diff.x);

    function ProjScale(p_ms, cam_pos, src_d, dst_d) {
      let vec_cam2p = new THREE.Vector3().subVectors(p_ms, cam_pos);
      return new THREE.Vector3().addVectors(
        cam_pos,
        vec_cam2p.multiplyScalar(dst_d / src_d)
      );
    }

    let pose3dDict = {};
    // 투영하는 코드
    for (const [key, value] of Object.entries(poseLandmarks)) {
      let p_3d = new THREE.Vector3(
        (value.x - 0.5) * 2.0,
        -(value.y - 0.5) * 2.0,
        0
      ).unproject(camera);
      p_3d.z = -value.z * x_scale - camera.near + camera.position.z;
      //console.log(p_3d.z);
      p_3d = ProjScale(p_3d, camera.position, camera.near, dist_from_cam);
      pose3dDict[key] = p_3d.add(offset);
    }

    return pose3dDict;
  }

  if (results.poseLandmarks) {
    let pose_landmarks_dict = {};
    results.poseLandmarks.forEach((landmark, i) => {
      //console.log(i, landmark);
      //console.log(index_to_name[i]);
      pose_landmarks_dict[pose_index_to_name[i]] = landmark;
    });

    // 월드 스페이스로 매핑된 랜드마크 점들 ( 조인트 ) 을 Point Mesh 로 그림
    pos_3d_landmarks = update3dpose(
      camera_world,
      1.5,
      new THREE.Vector3(1, 0, -1.5),
      pose_landmarks_dict
    );

    let i = 0;
    for (const [key, value] of Object.entries(pos_3d_landmarks)) {
      pose_points.geometry.attributes.position.array[3 * i + 0] = value.x;
      pose_points.geometry.attributes.position.array[3 * i + 1] = value.y;
      pose_points.geometry.attributes.position.array[3 * i + 2] = value.z;
      i++;
    }
    pose_points.geometry.attributes.position.needsUpdate = true;

    // Custom Pos 3d Landmarks

    custom_pos_3d_landmarks["$center_hip"] = new THREE.Vector3()
      .addVectors(
        pos_3d_landmarks["left_hip"].clone(),
        pos_3d_landmarks["right_hip"].clone()
      )
      .multiplyScalar(0.5);

    custom_pos_3d_landmarks["$center_shoulder"] = new THREE.Vector3()
      .addVectors(
        pos_3d_landmarks["left_shoulder"].clone(),
        pos_3d_landmarks["right_shoulder"].clone()
      )
      .multiplyScalar(0.5);

    custom_pos_3d_landmarks["$hips"] = new THREE.Vector3()
      .addVectors(
        custom_pos_3d_landmarks["$center_hip"].clone().multiplyScalar(4),
        custom_pos_3d_landmarks["$center_shoulder"].clone().multiplyScalar(1)
      )
      .multiplyScalar(0.2);

    custom_pos_3d_landmarks["$spine"] = new THREE.Vector3()
      .addVectors(
        custom_pos_3d_landmarks["$center_hip"].clone().multiplyScalar(2),
        custom_pos_3d_landmarks["$center_shoulder"].clone().multiplyScalar(3)
      )
      .multiplyScalar(0.2);

    custom_pos_3d_landmarks["$spine1"] = new THREE.Vector3()
      .addVectors(
        custom_pos_3d_landmarks["$center_hip"].clone().multiplyScalar(3),
        custom_pos_3d_landmarks["$center_shoulder"].clone().multiplyScalar(2)
      )
      .multiplyScalar(0.2);

    custom_pos_3d_landmarks["$spine2"] = new THREE.Vector3()
      .addVectors(
        custom_pos_3d_landmarks["$center_hip"].clone().multiplyScalar(1),
        custom_pos_3d_landmarks["$center_shoulder"].clone().multiplyScalar(4)
      )
      .multiplyScalar(0.2);

    custom_pos_3d_landmarks["$left_inner_shoulder"] = new THREE.Vector3()
      .addVectors(
        pos_3d_landmarks["left_shoulder"].clone().multiplyScalar(1),
        pos_3d_landmarks["right_shoulder"].clone().multiplyScalar(2)
      )
      .multiplyScalar(1 / 3);

    custom_pos_3d_landmarks["$right_inner_shoulder"] = new THREE.Vector3()
      .addVectors(
        pos_3d_landmarks["left_shoulder"].clone().multiplyScalar(2),
        pos_3d_landmarks["right_shoulder"].clone().multiplyScalar(1)
      )
      .multiplyScalar(1 / 3);

    custom_pos_3d_landmarks["$neck1"] = new THREE.Vector3(0, 0, 0)
      .add(pos_3d_landmarks["left_shoulder"].clone().multiplyScalar(4))
      .add(pos_3d_landmarks["right_shoulder"].clone().multiplyScalar(4))
      .add(pos_3d_landmarks["left_ear"].clone())
      .add(pos_3d_landmarks["right_ear"].clone())
      .multiplyScalar(1 / 10);

    custom_pos_3d_landmarks["$neck2"] = new THREE.Vector3(0, 0, 0)
      .add(pos_3d_landmarks["left_shoulder"].clone())
      .add(pos_3d_landmarks["right_shoulder"].clone())
      .add(pos_3d_landmarks["left_ear"].clone())
      .add(pos_3d_landmarks["right_ear"].clone())
      .multiplyScalar(1 / 4);

    custom_pos_3d_landmarks["$right_inner_shoulder"] = new THREE.Vector3()
      .addVectors(
        pos_3d_landmarks["left_shoulder"].clone().multiplyScalar(2),
        pos_3d_landmarks["right_shoulder"].clone().multiplyScalar(1)
      )
      .multiplyScalar(1 / 3);

    delete custom_pos_3d_landmarks["$center_hip"];
    delete custom_pos_3d_landmarks["$center_shoulder"];

    i = 0;
    for (const [key, value] of Object.entries(custom_pos_3d_landmarks)) {
      custom_points.geometry.attributes.position.array[3 * i + 0] = value.x;
      custom_points.geometry.attributes.position.array[3 * i + 1] = value.y;
      custom_points.geometry.attributes.position.array[3 * i + 2] = value.z;
      i++;
    }
    custom_points.geometry.attributes.position.needsUpdate = true;

    if (results.leftHandLandmarks) {
      //hand pose update to world

      let lefthand_landmarks_dict = {};
      results.leftHandLandmarks.forEach((landmark, i) => {
        //console.log(i, landmark);
        //console.log(index_to_name[i]);
        lefthand_landmarks_dict[`LEFT_${hand_index_to_name[i]}`] = landmark;
      });

      lefthand_3d_landmarks = update3dpose(
        camera_world,
        1.5,
        new THREE.Vector3(1, 0, -1.5),
        lefthand_landmarks_dict
      );

      let i = 0;
      const left_hand2pose = new THREE.Vector3().subVectors(
        pos_3d_landmarks["left_wrist"],
        lefthand_3d_landmarks["LEFT_WRIST"]
      );
      for (const [key, value] of Object.entries(lefthand_3d_landmarks)) {
        value.add(left_hand2pose);
        hand_points.geometry.attributes.position.array[3 * i + 0] = value.x;
        hand_points.geometry.attributes.position.array[3 * i + 1] = value.y;
        hand_points.geometry.attributes.position.array[3 * i + 2] = value.z;
        i++;
      }
      //lefthand_points.geometry.attributes.position.needsUpdate = true;
    }

    if (results.rightHandLandmarks) {
      let righthand_landmarks_dict = {};
      results.rightHandLandmarks.forEach((landmark, i) => {
        //console.log(i, landmark);
        //console.log(index_to_name[i]);
        righthand_landmarks_dict[`RIGHT_${hand_index_to_name[i]}`] = landmark;
      });

      righthand_3d_landmarks = update3dpose(
        camera_world,
        1.5,
        new THREE.Vector3(1, 0, -1.5),
        righthand_landmarks_dict
      );

      const right_hand2pose = new THREE.Vector3().subVectors(
        pos_3d_landmarks["right_wrist"],
        righthand_3d_landmarks["RIGHT_WRIST"]
      );
      let i = 21;
      for (const [key, value] of Object.entries(righthand_3d_landmarks)) {
        value.add(right_hand2pose);
        hand_points.geometry.attributes.position.array[3 * i + 0] = value.x;
        hand_points.geometry.attributes.position.array[3 * i + 1] = value.y;
        hand_points.geometry.attributes.position.array[3 * i + 2] = value.z;
        i++;
      }
    }
    hand_points.geometry.attributes.position.needsUpdate = true;

    total_pos_3d_landmarks = Object.assign(
      {},
      pos_3d_landmarks,
      custom_pos_3d_landmarks,
      lefthand_3d_landmarks,
      righthand_3d_landmarks
    );

        
    const R_hips = computeR_hips();
    const Q_hips = new THREE.Quaternion().setFromRotationMatrix(R_hips.clone());
    const hip_root = skeleton.getBoneByName("センター"); //엉덩이
    hip_root.quaternion.slerp(Q_hips, 0.9);

    let $chain_spines;

    // spine
    {
      let $chain = Q_hips.clone();
      const Q_spine = computeJointParentQ(
        "首", // 머리 
        "$neck1",
        "$spine",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("グルーブ")
        .quaternion.slerp(Q_spine, 0.9); //척추? 
      $chain.multiply(Q_spine);

      $chain_spines = $chain.multiply(Q_spine);
    }

    // neck
    {
      let $chain = $chain_spines.clone();
      const Q_neck = computeJointParentQ(
        "頭" ,// 목 
        "$neck2",
        "$neck1",
        $chain,
        skeleton
      );
      skeleton.getBoneByName("首").quaternion.slerp(Q_neck, 0.9); //머리
      $chain.multiply(Q_neck);
    }

    // left arm
    {
      let $chain = $chain_spines.clone();
      const Q_shoulder_left = computeJointParentQ(
        "左腕" ,// 왼위쪽팔
        "left_shoulder",
        "$left_inner_shoulder",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("左肩")
        .quaternion.slerp(Q_shoulder_left, 0.9); // 왼어깨 
      $chain.multiply(Q_shoulder_left);

      const Q_arm = computeJointParentQ(
        "左ひじ" , // 왼앞팔 
        "left_elbow",
        "left_shoulder",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("左腕")
        .quaternion.slerp(Q_arm, 0.9); // 왼위쪽팔
      $chain.multiply(Q_arm);

      const Q_forearm = computeJointParentQ(
        "左手首" , // 왼손목
        "left_wrist",
        "left_elbow",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("左ひじ")
        .quaternion.slerp(Q_forearm, 0.9); // 왼앞팔
      $chain.multiply(Q_forearm);

      if (results.leftHandLandmarks) { // 왼손의 rotation

        let jointLeftWrist = total_pos_3d_landmarks["LEFT_WRIST"];
        let jointLeftThumb1 = total_pos_3d_landmarks["LEFT_THUMB_CMC"];
        let jointLeftIndex1 = total_pos_3d_landmarks["LEFT_INDEX_FINGER_MCP"];
        let jointLeftMiddle1 = total_pos_3d_landmarks["LEFT_MIDDLE_FINGER_MCP"];
        let jointLeftRing1 = total_pos_3d_landmarks["LEFT_RING_FINGER_MCP"];
        let jointLeftPinky1 = total_pos_3d_landmarks["LEFT_PINKY_MCP"];

        let v_wrist_to_thumb1 = new THREE.Vector3()
          .subVectors(jointLeftThumb1, jointLeftWrist)
          .normalize();

        let wrist_to_middle1 = new THREE.Vector3()
        .subVectors(jointLeftMiddle1, jointLeftWrist)
        .normalize();

        let MP_u = new THREE.Vector3().copy(v_wrist_to_thumb1);
        let MP_v = new THREE.Vector3().copy(wrist_to_middle1);
        let MP_w = new THREE.Vector3().crossVectors(MP_u,MP_v).normalize();
        let MP_new_u = new THREE.Vector3().crossVectors(MP_v,MP_w).normalize();

        const MP_R = new THREE.Matrix4().makeBasis(MP_new_u, MP_v, MP_w);
        let R_chain = new THREE.Matrix4().makeRotationFromQuaternion($chain);

        const SK_u = new THREE.Vector3()
          .subVectors(skeleton.getBoneByName('左小指先').position, skeleton.getBoneByName('左親指先').position) // 엄지->검지 벡터
          .normalize();
        const SK_v = skeleton.getBoneByName('左中指先').clone().position.normalize(); // 손목->중지 벡터
        const SK_w = new THREE.Vector3().crossVectors( // 손바닥의 법선 벡터
          SK_u,
          SK_v
        ).multiplyScalar(-1);
        const SK_new_u = new THREE.Vector3().crossVectors(
          SK_v,
          SK_w
        );
        const SK_R = new THREE.Matrix4().makeBasis(
          SK_new_u,
          SK_v,
          SK_w
        );

        const R_BonetoMP = MP_R.clone().multiply( // Detection상 손의 rotation을 LeftHandBone의 rotation으로 변환하는 행렬
          SK_R.clone().transpose()
        );
        const R_Tpose = R_chain.clone().transpose();
        const R_wrist = R_BonetoMP.clone().premultiply(R_Tpose); // LeftHandBone의 Local rotation 계산
        const Q_wrist = new THREE.Quaternion().setFromRotationMatrix(R_wrist);
        skeleton.getBoneByName("左手首").quaternion.slerp(Q_wrist,0.9); // LeftHandBone 의 Local한 quaternion 곱해줌.
        $chain.multiply(Q_wrist);
        const $chain_hand = $chain.clone();
        { // 왼손 엄지
          let $chain = $chain_hand.clone();

          const Q_thumb1 = computeJointParentQ(
            '左親指１' , // 엄지
            "LEFT_THUMB_MCP",
            "LEFT_THUMB_CMC",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("左親指先").quaternion.slerp(Q_thumb1,0.9);
           $chain.multiply(Q_thumb1);

           const Q_thumb2 = computeJointParentQ(
            '左親指２' , // 엄지
            "LEFT_THUMB_IP",
            "LEFT_THUMB_MCP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("左親指１").quaternion.slerp(Q_thumb2,0.9);

        }
        { // 왼손 검지
          let $chain = $chain_hand.clone();

          const Q_index1 = computeJointParentQ(
            '左人指１' , // 검지
            "LEFT_INDEX_FINGER_PIP",
            "LEFT_INDEX_FINGER_MCP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("左人差指先").quaternion.slerp(Q_index1,0.9);
           $chain.multiply(Q_index1);

           const Q_index2 = computeJointParentQ(
            '左人指２' , // 검지
            "LEFT_INDEX_FINGER_DIP",
            "LEFT_INDEX_FINGER_PIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("左人指１").quaternion.slerp(Q_index2,0.9);
           $chain.multiply(Q_index2);

           const Q_index3 = computeJointParentQ(
            '左人指３' , // 검지
            "LEFT_INDEX_FINGER_TIP",
            "LEFT_INDEX_FINGER_DIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("左人指２").quaternion.slerp(Q_index3,0.9);

        }
        { // 왼손 중지
          let $chain = $chain_hand.clone();

          const Q_MIDDLE1 = computeJointParentQ(
            '左中指１' , // 중지
            "LEFT_MIDDLE_FINGER_PIP",
            "LEFT_MIDDLE_FINGER_MCP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("左中指先").quaternion.slerp(Q_MIDDLE1,0.9);
           $chain.multiply(Q_MIDDLE1);

           const Q_MIDDLE2 = computeJointParentQ(
            '左中指２' , // 중지
            "LEFT_MIDDLE_FINGER_DIP",
            "LEFT_MIDDLE_FINGER_PIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("左中指１").quaternion.slerp(Q_MIDDLE2,0.9);
           $chain.multiply(Q_MIDDLE2);

           const Q_MIDDLE3 = computeJointParentQ(
            '左中指３' , // 중지
            "LEFT_MIDDLE_FINGER_TIP",
            "LEFT_MIDDLE_FINGER_DIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("左中指２").quaternion.slerp(Q_MIDDLE3,0.9);
           $chain.multiply(Q_MIDDLE3);
        }

        { // 왼손 약지
          let $chain = $chain_hand.clone();

          const Q_RING1 = computeJointParentQ(
            '左薬指１' , // 약지
            "LEFT_RING_FINGER_PIP",
            "LEFT_RING_FINGER_MCP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("左薬指先").quaternion.slerp(Q_RING1,0.9);
           $chain.multiply(Q_RING1);

           const Q_RING2 = computeJointParentQ(
            '左薬指２' , // 약지
            "LEFT_RING_FINGER_DIP",
            "LEFT_RING_FINGER_PIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("左薬指１").quaternion.slerp(Q_RING2,0.9);
           $chain.multiply(Q_RING2);

           const Q_RING3 = computeJointParentQ(
            '左薬指３' , // 약지
            "LEFT_RING_FINGER_TIP",
            "LEFT_RING_FINGER_DIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("左薬指２").quaternion.slerp(Q_RING3,0.9);
        }
        { // 왼손 소지
          let $chain = $chain_hand.clone();

          const Q_PINKY1 = computeJointParentQ(
            '左小指１' , // 소지
            "LEFT_PINKY_PIP",
            "LEFT_PINKY_MCP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("左小指先").quaternion.slerp(Q_PINKY1,0.9);
           $chain.multiply(Q_PINKY1);

           const Q_PINKY2 = computeJointParentQ(
            '左小指２' , // 소지
            "LEFT_PINKY_DIP",
            "LEFT_PINKY_PIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("左小指１").quaternion.slerp(Q_PINKY2,0.9);
           $chain.multiply(Q_PINKY2);

           const Q_PINKY3 = computeJointParentQ(
            '左小指３' , // 소지
            "LEFT_PINKY_TIP",
            "LEFT_PINKY_DIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("左小指２").quaternion.slerp(Q_PINKY3,0.9);
        }
      }
    }

    // right arm
    {
      let $chain = $chain_spines.clone();
      const Q_shoulder_right = computeJointParentQ(
        "右腕" , // 오른쪽위팔
        "right_shoulder",
        "$right_inner_shoulder",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("右肩")
        .quaternion.slerp(Q_shoulder_right, 0.9); // 오른어깨
      $chain.multiply(Q_shoulder_right);

      const Q_arm = computeJointParentQ(
        "右ひじ" , //오른앞팔
        "right_elbow",
        "right_shoulder",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("右腕")
        .quaternion.slerp(Q_arm, 0.9); // 오른위쪽팔
      $chain.multiply(Q_arm);

      const Q_forearm = computeJointParentQ(
        "右手首" , // 오른손목
        "right_wrist",
        "right_elbow",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("右ひじ")
        .quaternion.slerp(Q_forearm, 0.9); // 오른앞팔
      $chain.multiply(Q_forearm);

      if (results.rightHandLandmarks) { // 오른손의 rotation

        let jointRightWrist = total_pos_3d_landmarks["RIGHT_WRIST"];
        let jointRightThumb1 = total_pos_3d_landmarks["RIGHT_THUMB_CMC"];
        let jointRightMiddle1 = total_pos_3d_landmarks["RIGHT_MIDDLE_FINGER_MCP"];

        let v_wrist_to_thumb1 = new THREE.Vector3()
          .subVectors(jointRightThumb1, jointRightWrist)
          .normalize();

        let wrist_to_middle1 = new THREE.Vector3()
        .subVectors(jointRightMiddle1, jointRightWrist)
        .normalize();

        let MP_u = new THREE.Vector3().copy(v_wrist_to_thumb1);
        let MP_v = new THREE.Vector3().copy(wrist_to_middle1);
        let MP_w = new THREE.Vector3().crossVectors(MP_u,MP_v).normalize();
        let MP_new_u = new THREE.Vector3().crossVectors(MP_v,MP_w).normalize();

        const MP_R = new THREE.Matrix4().makeBasis(MP_new_u, MP_v, MP_w);
        let R_chain = new THREE.Matrix4().makeRotationFromQuaternion($chain);

        const SK_u = new THREE.Vector3()
          .subVectors(skeleton.getBoneByName('右小指先').position, skeleton.getBoneByName('右親指先').position) // 엄지->검지 벡터
          .normalize();
        const SK_v = skeleton.getBoneByName('右中指先').clone().position.normalize(); // 손목->중지 벡터
        const SK_w = new THREE.Vector3().crossVectors( // 손바닥의 법선 벡터
          SK_u,
          SK_v
        ).multiplyScalar(-1);
        const SK_new_u = new THREE.Vector3().crossVectors(
          SK_v,
          SK_w
        );
        const SK_R = new THREE.Matrix4().makeBasis(
          SK_new_u,
          SK_v,
          SK_w
        );

        const R_BonetoMP = MP_R.clone().multiply( // Detection상 손의 rotation을 RightHandBone의 rotation으로 변환하는 행렬
          SK_R.clone().transpose()
        );
        const R_Tpose = R_chain.clone().transpose();
        const R_wrist = R_BonetoMP.clone().premultiply(R_Tpose); // RightHandBone의 Local rotation 계산
        const Q_wrist = new THREE.Quaternion().setFromRotationMatrix(R_wrist);
        skeleton.getBoneByName("右手首").quaternion.slerp(Q_wrist,0.9); // RightHandBone 의 Local한 quaternion 곱해줌.
        $chain.multiply(Q_wrist);
        const $chain_hand = $chain.clone();
        { // 오른손 엄지
          let $chain = $chain_hand.clone();

          const Q_thumb1 = computeJointParentQ(
            '右親指１' , // 엄지
            "RIGHT_THUMB_MCP",
            "RIGHT_THUMB_CMC",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("右親指先").quaternion.slerp(Q_thumb1,0.9);
           $chain.multiply(Q_thumb1);

           const Q_thumb2 = computeJointParentQ(
            '右親指２' , // 엄지
            "RIGHT_THUMB_IP",
            "RIGHT_THUMB_MCP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("右親指１").quaternion.slerp(Q_thumb2,0.9);

        }
        { // 오른손 검지
          let $chain = $chain_hand.clone();

          const Q_index1 = computeJointParentQ(
            '右人指１' , // 검지
            "RIGHT_INDEX_FINGER_PIP",
            "RIGHT_INDEX_FINGER_MCP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("右人差指先").quaternion.slerp(Q_index1,0.9);
           $chain.multiply(Q_index1);

           const Q_index2 = computeJointParentQ(
            '右人指２' , // 검지
            "RIGHT_INDEX_FINGER_DIP",
            "RIGHT_INDEX_FINGER_PIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("右人指１").quaternion.slerp(Q_index2,0.9);
           $chain.multiply(Q_index2);

           const Q_index3 = computeJointParentQ(
            '右人指３' , // 검지
            "RIGHT_INDEX_FINGER_TIP",
            "RIGHT_INDEX_FINGER_DIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("右人指２").quaternion.slerp(Q_index3,0.9);

        }
        { // 오른손 중지
          let $chain = $chain_hand.clone();

          const Q_MIDDLE1 = computeJointParentQ(
            '右中指１' , // 중지
            "RIGHT_MIDDLE_FINGER_PIP",
            "RIGHT_MIDDLE_FINGER_MCP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("右中指先").quaternion.slerp(Q_MIDDLE1,0.9);
           $chain.multiply(Q_MIDDLE1);

           const Q_MIDDLE2 = computeJointParentQ(
            '右中指２' , // 중지
            "RIGHT_MIDDLE_FINGER_DIP",
            "RIGHT_MIDDLE_FINGER_PIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("右中指１").quaternion.slerp(Q_MIDDLE2,0.9);
           $chain.multiply(Q_MIDDLE2);

           const Q_MIDDLE3 = computeJointParentQ(
            '右中指３' , // 중지
            "RIGHT_MIDDLE_FINGER_TIP",
            "RIGHT_MIDDLE_FINGER_DIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("右中指２").quaternion.slerp(Q_MIDDLE3,0.9);
           $chain.multiply(Q_MIDDLE3);
        }

        { // 오른손 약지
          let $chain = $chain_hand.clone();

          const Q_RING1 = computeJointParentQ(
            '右薬指１' , // 약지
            "RIGHT_RING_FINGER_PIP",
            "RIGHT_RING_FINGER_MCP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("右薬指先").quaternion.slerp(Q_RING1,0.9);
           $chain.multiply(Q_RING1);

           const Q_RING2 = computeJointParentQ(
            '右薬指２' , // 약지
            "RIGHT_RING_FINGER_DIP",
            "RIGHT_RING_FINGER_PIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("右薬指１").quaternion.slerp(Q_RING2,0.9);
           $chain.multiply(Q_RING2);

           const Q_RING3 = computeJointParentQ(
            '右薬指３' , // 약지
            "RIGHT_RING_FINGER_TIP",
            "RIGHT_RING_FINGER_DIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("右薬指２").quaternion.slerp(Q_RING3,0.9);
        }
        { // 오른손 소지
          let $chain = $chain_hand.clone();

          const Q_PINKY1 = computeJointParentQ(
            '右小指１' , // 소지
            "RIGHT_PINKY_PIP",
            "RIGHT_PINKY_MCP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("右小指先").quaternion.slerp(Q_PINKY1,0.9);
           $chain.multiply(Q_PINKY1);

           const Q_PINKY2 = computeJointParentQ(
            '右小指２' , // 소지
            "RIGHT_PINKY_DIP",
            "RIGHT_PINKY_PIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("右小指１").quaternion.slerp(Q_PINKY2,0.9);
           $chain.multiply(Q_PINKY2);

           const Q_PINKY3 = computeJointParentQ(
            '右小指３' , // 소지
            "RIGHT_PINKY_TIP",
            "RIGHT_PINKY_DIP",
            $chain,
            skeleton
           );
           skeleton.getBoneByName("右小指２").quaternion.slerp(Q_PINKY3,0.9);
        }
      }
    }

    // left legs
    {
      let $chain = Q_hips.clone();
      const Q_upLeg = computeJointParentQ(
        "左ひざ", // 왼무릎
        "left_knee",
        "left_hip",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("左足")
        .quaternion.slerp(Q_upLeg, 0.9); // 왼허벅지
      $chain = $chain.multiply(Q_upLeg);

      const Q_leg = computeJointParentQ(
        "左足首", // 왼발목
        "left_ankle",
        "left_knee",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("左ひざ")
        .quaternion.slerp(Q_leg, 0.9); // 왼무릎

      $chain = $chain.multiply(Q_leg);
      const Q_foot = computeJointParentQ(
        "左つま先" , //왼발끝
        "left_foot_index",
        "left_ankle",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("左足首")
        .quaternion.slerp(Q_foot, 0.9); // 왼발목
    }

    // right legs
    {
      let $chain = Q_hips.clone();
      const Q_upLeg = computeJointParentQ(
        "右ひざ" , // 오른무릎
        "right_knee",
        "right_hip",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("右足")
        .quaternion.slerp(Q_upLeg, 0.9); // 오른허벅지
      $chain = $chain.multiply(Q_upLeg);

      const Q_leg = computeJointParentQ(
        "右足首" , // 오른발목
        "right_ankle",
        "right_knee",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("右ひざ")
        .quaternion.slerp(Q_leg, 0.9); // 오른무릎

      $chain = $chain.multiply(Q_leg);
      const Q_foot = computeJointParentQ(
        "右つま先" , //오른발끝
        "right_foot_index",
        "right_ankle",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("右足首")
        .quaternion.slerp(Q_foot, 0.9); // 오른발목
    }
    
  
  }

  //ikSolver_left?.update();
  //ikSolver_right?.update();
  //ikSolver_left_foot?.update();
  //ikSolver_right_foot?.update();
  const hip_right_toe = skeleton.getBoneByName("右足首"); //오른발목
  
  cannon_tick(hip_right_toe);

  //const delta = clock.getDelta();
  //physics.update(delta);
  renderer.render(scene, camera_ar);
  canvasCtx.restore();
}

const holistic = new Holistic({
  // MediaPipe 의 Holistic 솔루션을 사용하기 위해서 파일을 읽음
  locateFile: (file) => {
    return `./node_modules/@mediapipe/holistic/${file}`;
  },
});
holistic.setOptions({
  // selfieMode: true,
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: true,
  smoothSegmentation: true,
  refineFaceLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
holistic.onResults(onResults2);

videoElement.play();

async function detectionFrame() {
  await holistic.send({ image: videoElement });
  videoElement.requestVideoFrameCallback(detectionFrame);
}

//detectionFrame();

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await holistic.send({ image: videoElement });
  },
  width: 1280,
  height: 720,
});

camera.start();
