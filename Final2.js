import * as THREE from "./node_modules/three/build/three.module.js";
import { OrbitControls } from "./node_modules/three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "./node_modules/three/examples/jsm/loaders/FBXLoader.js";
import { CCDIKSolver } from "./node_modules/three/examples/jsm/animation/CCDIKSolver.js";

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

let ikSolver;

let model,
  skeleton = null,
  skeleton_helper,
  mixer,
  numAnimations;
let axis_helpers = [];
const loader2 = new GLTFLoader();
const loader = new FBXLoader(); //fbxLoader
loader2.load("../models/gltf/Xbot.glb", function (glb) {
  // 마네킹을 그리는 부분
  model = glb.scene; // gltf.scene -> GLTF 용
  scene.add(model);
  console.log(glb);
  model.scale.multiplyScalar(1); // 모델 전체의 크기 조절

  let bones = [];

  let left_mesh = null;
  model.traverse(function (object) {
    // object.scale.multiplyScalar(1);
    if (object.isMesh) {
      object.castShadow = true; // 스킨 메쉬
      if (!left_mesh) left_mesh = object;
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
      target: 17,
      effector: 16,
      links: [
        { index: 6 },
        { index: 7 },
        { index: 8 },
        { index: 9 },
        { index: 15 },
      ],
    },
  ];

  // console.log(model.children[0].children[0]);
  ikSolver = new CCDIKSolver(left_mesh, iks_left);

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
  INDEX_FINGER_MCP: 6,
  INDEX_FINGER_PIP: 7,
  INDEX_FINGER_DIP: 8,
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
  const C = new THREE.Matrix4().makeBasis(u, v, w).transpose(); // 나중에 uA, uB, cross_AB(normalized) 넣고 실험
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
  //console.log(u,v,w);
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

    /* Custom Pos 3d Landmarks */

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
    //console.log(skeleton.getBoneByName("mixamorigLeftHand").rotation);
    // rigging //
    // mixamorigLeftArm : left_shoulder
    // mixamorigLeftForeArm : left_elbow
    // mixamorigLeftHand : left_wrist
    // 조인트의 Rotation 을 구하기 위해서는 조인트와 그 자식의 조인트를 알아야 함
    // 미디어파이프에서 받아낸 랜드마크는 손 마디가 정확하지 않음 VS 모델의 rig 는 손 마디가 정확함
    // => 인터폴레이션하여 캐릭터에 맞추기 VS IK Solver VS Hand Tracking ( Holistic - 자세와 손을 모두 사용하기 위해서 )
    // 조인트의 오프셋 정보는 항상 일정하게 정의되어 있다. ( position 속성 ) -> 식에서 J가 됨

    // joint 는 미디어파이프 상, bone 은 threejs 상
    // joint 사이의 거리와 bone 사이의 거리는 다름 : 각도를 갖고 위치를 설정할 것이므로 방향 자체는 랜드마크의 벡터로 가져올 수 있음
    // -> 거리는 랜드마크에서 벡터로 구한 것과는 다름 : 수식에서 오프셋과 벡터는 같기 때문에 방향은 정규화된 방향을 사용할 수 있음

    // let jointLeftShoulder = pos_3d_landmarks["left_shoulder"]; // p0 -> 부모
    // let jointLeftElbow = pos_3d_landmarks["left_elbow"]; // p1 -> 자식
    // let boneLeftForeArm = skeleton.getBoneByName("mixamorigLeftForeArm"); // j1

    // let v01 = new THREE.Vector3()
    //   .subVectors(jointLeftElbow, jointLeftShoulder) // 0 에서 1 을 뺀다 ( 순서는 1 다음 0 )
    //   .normalize(); // 정규화하여 유닛 벡터를 구함
    // let j1 = boneLeftForeArm.position.clone().normalize(); // 팔꿈치 위치 정규화
    // // j1 을 v01 로 가져감 ( Rotation 을 구하는 함수는 정의되어 있음 - computeR )
    // let R0 = computeR(j1, v01); // LeftArm 의 Rotation Vector 를 구할 수 있음 ( 앞의 녀석을 뒤의 녀석으로 만들어주는 매트릭스를 계산 )
    // // 로컬 트랜스폼을 변경해줌
    // skeleton.getBoneByName("mixamorigLeftArm").setRotationFromMatrix(R0); // Matrix4 로 설정

    // TEST--------------------------------------------------------------------
    /*
    const hip_root = skeleton.getBoneByName("mixamorigHips");
    const turn = new THREE.Matrix4().makeRotationZ(180/Math.PI);
    
    const R_hips = computeR_hips();
    const Q_hips = new THREE.Quaternion().setFromRotationMatrix(R_hips.clone());
    //const hip_joint = custom_pos_3d_landmarks["hips"];
    //console.log(hip_root.parent.position);
    //console.log(hip_root.position);
    ///////////////////////////////////hip_root.position.set(0, 0, 0);
    //const character_scale = hip_root.parent.scale;
    //hip_root.position.set(hip_joint.x / character_scale.x, hip_joint.y / character_scale.x, hip_joint.z / character_scale.x);
    hip_root.quaternion.slerp(Q_hips, 0.9);
    //const RootQuaternion_hip = new THREE.Quaternion().copy(hip_root.quaternion);

    let $chain_spines;
    */
    //console.log(skeleton.getBoneByName("mixamorigLeftHand"));
    if (results.leftHandLandmarks) {
      let jointLeftWrist = total_pos_3d_landmarks["LEFT_WRIST"];
      let jointLeftThumb1 = total_pos_3d_landmarks["LEFT_THUMB_CMC"];
      let jointLeftIndex1 = total_pos_3d_landmarks["LEFT_INDEX_FINGER_MCP"];
      let jointLeftMiddle1 = total_pos_3d_landmarks["LEFT_MIDDLE_FINGER_MCP"];
      let jointLeftRing1 = total_pos_3d_landmarks["LEFT_RING_FINGER_MCP"];
      let jointLeftPinky1 = total_pos_3d_landmarks["LEFT_PINKY_MCP"];

      let v_wrist_to_thumb1 = new THREE.Vector3()
        .subVectors(jointLeftThumb1, jointLeftWrist)
        .normalize();
      let v_writst_to_pinky1 = new THREE.Vector3()
        .subVectors(jointLeftPinky1, jointLeftWrist)
        .normalize();
      let wrist_to_middle1 = new THREE.Vector3()
        .subVectors(jointLeftMiddle1, jointLeftWrist)
        .normalize();

      let u = new THREE.Vector3().copy(v_wrist_to_thumb1);
      let v = new THREE.Vector3().copy(wrist_to_middle1);
      let w = new THREE.Vector3().crossVectors(u, v).normalize();
      let new_u = new THREE.Vector3().crossVectors(v, w).normalize();

      const R = new THREE.Matrix4().makeBasis(v, w, new_u);
      let q_hips = skeleton.getBoneByName("mixamorigHips").quaternion.clone();
      let q_spine = skeleton.getBoneByName("mixamorigSpine").quaternion.clone();
      let q_spine1 = skeleton
        .getBoneByName("mixamorigSpine1")
        .quaternion.clone();
      let q_spine2 = skeleton
        .getBoneByName("mixamorigSpine2")
        .quaternion.clone();
      let q_leftshoulder = skeleton
        .getBoneByName("mixamorigLeftShoulder")
        .quaternion.clone();
      let q_leftarm = skeleton
        .getBoneByName("mixamorigLeftArm")
        .quaternion.clone();
      let q_leftforearm = skeleton
        .getBoneByName("mixamorigLeftForeArm")
        .quaternion.clone();
      q_hips.multiply(q_spine);
      q_hips.multiply(q_spine1);
      q_hips.multiply(q_spine2);
      q_hips.multiply(q_leftshoulder);
      q_hips.multiply(q_leftarm);
      q_hips.multiply(q_leftforearm);
      q_hips = q_hips.conjugate();
      // let temp_chain = new THREE.Matrix4().makeRotationFromQuaternion($chain);
      //const new_R = R.clone().premultiply(temp_chain.transpose());
      const new_Q = new THREE.Quaternion().setFromRotationMatrix(R);
      //new_Q.multiply(q_hips);
      skeleton.getBoneByName("mixamorigLeftHand").quaternion.slerp(new_Q, 0.9);
      // const skeleton_quaternion = new THREE.Quaternion();
      // skeleton.getBoneByName("mixamorigLeftHand").getWorldQuaternion(skeleton_quaternion);
      // const quaternion_angle = skeleton_quaternion.angleTo(new_Q);
    }
    /*
    // spine
    {
      let $chain = Q_hips.clone();
      const Q_spine = computeJointParentQ(
        "mixamorigSpine1",
        "$spine1",
        "$spine",
        $chain,
        skeleton
      );
      skeleton.getBoneByName("mixamorigSpine").quaternion.slerp(Q_spine, 0.9);
      $chain.multiply(Q_spine);

      const Q_spine1 = computeJointParentQ(
        "mixamorigSpine2",
        "$spine2",
        "$spine1",
        $chain,
        skeleton
      );
      skeleton.getBoneByName("mixamorigSpine1").quaternion.slerp(Q_spine1, 0.9);
      $chain.multiply(Q_spine1);

      const Q_spine2 = computeJointParentQ(
        "mixamorigNeck",
        "$neck1",
        "$spine2",
        $chain,
        skeleton
      );
      skeleton.getBoneByName("mixamorigSpine2").quaternion.slerp(Q_spine2, 0.9);
      $chain_spines = $chain.multiply(Q_spine2);
    }

    // neck
    {
      let $chain = $chain_spines.clone();
      const Q_neck = computeJointParentQ(
        "mixamorigHead",
        "$neck2",
        "$neck1",
        $chain,
        skeleton
      );
      skeleton.getBoneByName("mixamorigNeck").quaternion.slerp(Q_neck, 0.9);
      $chain.multiply(Q_neck);
    }

    // left arm
    {
      let $chain = $chain_spines.clone();
      const Q_shoulder_left = computeJointParentQ(
        "mixamorigLeftArm",
        "left_shoulder",
        "$left_inner_shoulder",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("mixamorigLeftShoulder")
        .quaternion.slerp(Q_shoulder_left, 0.9);
      $chain.multiply(Q_shoulder_left);

      const Q_arm = computeJointParentQ(
        "mixamorigLeftForeArm",
        "left_elbow",
        "left_shoulder",
        $chain,
        skeleton
      );
      skeleton.getBoneByName("mixamorigLeftArm").quaternion.slerp(Q_arm, 0.9);
      $chain.multiply(Q_arm);

      const Q_forearm = computeJointParentQ(
        "mixamorigLeftHand",
        "left_wrist",
        "left_elbow",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("mixamorigLeftForeArm")
        .quaternion.slerp(Q_forearm, 0.9);
      $chain.multiply(Q_forearm);

      if (results.leftHandLandmarks) {
        // lefthand rigging

        // const R_hand = computeJointParentR(
        //   "mixamorigLeftHandIndex1",
        //   "LEFT_INDEX_FINGER_MCP",
        //   "left_wrist",
        //   $chain,
        //   skeleton
        // );
        // skeleton
        //   .getBoneByName("mixamorigLeftHand")
        //   .quaternion.slerp(new Quaternion().setFromRotationMatrix(R_hand), 0.9);

        let jointLeftWrist = total_pos_3d_landmarks["LEFT_WRIST"];
        let jointLeftThumb1 = total_pos_3d_landmarks["LEFT_THUMB_CMC"];
        let jointLeftIndex1 = total_pos_3d_landmarks["LEFT_INDEX_FINGER_MCP"];
        let jointLeftMiddle1 = total_pos_3d_landmarks["LEFT_MIDDLE_FINGER_MCP"];
        let jointLeftRing1 = total_pos_3d_landmarks["LEFT_RING_FINGER_MCP"];
        let jointLeftPinky1 = total_pos_3d_landmarks["LEFT_PINKY_MCP"];

        let v_wrist_to_thumb1 = new THREE.Vector3()
          .subVectors(jointLeftThumb1, jointLeftWrist)
          .normalize();
        let v_writst_to_pinky1 = new THREE.Vector3()
          .subVectors(jointLeftPinky1, jointLeftWrist)
          .normalize();
        let wrist_to_middle1 = new THREE.Vector3()
        .subVectors(jointLeftMiddle1, jointLeftWrist)
        .normalize();

        let u = new THREE.Vector3().copy(v_wrist_to_thumb1);
        let v = new THREE.Vector3().copy(wrist_to_middle1);
        let w = new THREE.Vector3().crossVectors(u,v).normalize();
        let new_u = new THREE.Vector3().crossVectors(v,w).normalize();
        
        const R = new THREE.Matrix4().makeBasis(v, w, new_u);

        let temp_chain = new THREE.Matrix4().makeRotationFromQuaternion($chain);
        const new_R = R.clone().premultiply(temp_chain.transpose());
        const new_Q = new THREE.Quaternion().setFromRotationMatrix(new_R);
        skeleton
        .getBoneByName("mixamorigLeftHand").quaternion.slerp(new_Q,0.9);
        //let $quaternion = new THREE.Quaternion().setFromRotationMatrix($chain.clone());

        // let boneLeftThumb1 = skeleton.getBoneByName("mixamorigLeftHandThumb1");
        //let Rv_wrist2thumb1 = v_wrist_to_thumb1.applyQuaternion($quaternion.clone().transpose());
        // let j_thumb1 = boneLeftThumb1.position.clone().normalize();
        // let R_hand1 = computeR(j_thumb1,Rv_wrist2thumb1);

        //skeleton.getBoneByName("mixamorigLeftHand").setRotationFromMatrix(R_hand1);
        //console.log(R_hand1);
        //console.log(skeleton.getBoneByName("mixamorigLeftHand"));

        const Q_hand_thumb = computeJointParentQ(
          "mixamorigLeftHandThumb1",
          "LEFT_THUMB_CMC",
          "left_wrist",
          $chain,
          skeleton
        );
        const Q_hand_index = computeJointParentQ(
          "mixamorigLeftHandIndex1",
          "LEFT_INDEX_FINGER_MCP",
          "left_wrist",
          $chain,
          skeleton
        );
        const Q_hand_middle = computeJointParentQ(
          "mixamorigLeftHandMiddle1",
          "LEFT_MIDDLE_FINGER_MCP",
          "left_wrist",
          $chain,
          skeleton
        );
        const Q_hand_ring = computeJointParentQ(
          "mixamorigLeftHandRing1",
          "LEFT_RING_FINGER_MCP",
          "left_wrist",
          $chain,
          skeleton
        );
        const Q_hand_pinky = computeJointParentQ(
          "mixamorigLeftHandPinky1",
          "LEFT_PINKY_MCP",
          "left_wrist",
          $chain,
          skeleton
        );

        let Q_hand = new THREE.Quaternion().slerpQuaternions(
          Q_hand_thumb.clone(),
          Q_hand_pinky.clone(),
          0.5
        );

        // skeleton
        //   .getBoneByName("mixamorigLeftHand")
        //   .quaternion.slerp(Q_hand, 0.9);
      }
    }

    // right arm
    {
      let $chain = $chain_spines.clone();
      const Q_shoulder_right = computeJointParentQ(
        "mixamorigRightArm",
        "right_shoulder",
        "$right_inner_shoulder",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("mixamorigRightShoulder")
        .quaternion.slerp(Q_shoulder_right, 0.9);
      $chain.multiply(Q_shoulder_right);

      const Q_arm = computeJointParentQ(
        "mixamorigRightForeArm",
        "right_elbow",
        "right_shoulder",
        $chain,
        skeleton
      );
      skeleton.getBoneByName("mixamorigRightArm").quaternion.slerp(Q_arm, 0.9);
      $chain.multiply(Q_arm);

      const Q_forearm = computeJointParentQ(
        "mixamorigRightHand",
        "right_wrist",
        "right_elbow",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("mixamorigRightForeArm")
        .quaternion.slerp(Q_forearm, 0.9);
      $chain.multiply(Q_forearm);

      const Q_hand = computeJointParentQ(
        "mixamorigRightHandIndex1",
        "right_index",
        "right_wrist",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("mixamorigRightHand")
        .quaternion.slerp(Q_hand, 0.9);
    }

    // left legs
    {
      let $chain = Q_hips.clone();
      const Q_upLeg = computeJointParentQ(
        "mixamorigLeftLeg",
        "left_knee",
        "left_hip",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("mixamorigLeftUpLeg")
        .quaternion.slerp(Q_upLeg, 0.9);
      $chain = $chain.multiply(Q_upLeg);

      const Q_leg = computeJointParentQ(
        "mixamorigLeftFoot",
        "left_ankle",
        "left_knee",
        $chain,
        skeleton
      );
      skeleton.getBoneByName("mixamorigLeftLeg").quaternion.slerp(Q_leg, 0.9);

      $chain = $chain.multiply(Q_leg);
      const Q_foot = computeJointParentQ(
        "mixamorigLeftToeBase",
        "left_foot_index",
        "left_ankle",
        $chain,
        skeleton
      );
      skeleton.getBoneByName("mixamorigLeftFoot").quaternion.slerp(Q_foot, 0.9);
    }

    // right legs
    {
      let $chain = Q_hips.clone();
      const Q_upLeg = computeJointParentQ(
        "mixamorigRightLeg",
        "right_knee",
        "right_hip",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("mixamorigRightUpLeg")
        .quaternion.slerp(Q_upLeg, 0.9);
      $chain = $chain.multiply(Q_upLeg);

      const Q_leg = computeJointParentQ(
        "mixamorigRightFoot",
        "right_ankle",
        "right_knee",
        $chain,
        skeleton
      );
      skeleton.getBoneByName("mixamorigRightLeg").quaternion.slerp(Q_leg, 0.9);

      $chain = $chain.multiply(Q_leg);
      const Q_foot = computeJointParentQ(
        "mixamorigRightToeBase",
        "right_foot_index",
        "right_ankle",
        $chain,
        skeleton
      );
      skeleton
        .getBoneByName("mixamorigRightFoot")
        .quaternion.slerp(Q_foot, 0.9);
    }
    */
    /*


    // TEST------------------------------------------------------------------------------------------------------------------------------------------------
    // 루트부터 싹 새롭게 설정하지 않았음 : 어깨의 상대적인 위치만 설정해주겠다 ( 어깨를 임시적인 루트로 정의하고 진행 )
    // => 실제로는 루트에서부터 차례대로 로컬 트랜스폼이 작동하도록 만들어야 함

    // 하위 부분 움직이도록 만들기

    /*
    let jointLeftWrist = pos_3d_landmarks["left_wrist"]; // p2
    let boneLeftHand = skeleton.getBoneByName("mixamorigLeftHand"); // j2
    let v12 = new THREE.Vector3()
      .subVectors(jointLeftWrist, jointLeftElbow) // (벡터 2, 벡터 1);
      .normalize();
    let j2 = boneLeftHand.position.clone().normalize();
    let Rv12 = v12.clone().applyMatrix4(R0.clone().transpose()); // R0 의 역행렬으로부터 -> transpose()
    let R1 = computeR(j2, Rv12);
    skeleton.getBoneByName("mixamorigLeftForeArm").setRotationFromMatrix(R1); // setRotationFromQuaternion() 사용 권장
    */
    // console.log(boneLeftArm);

    // console.log(skeleton);

    // 갈라지는 곳에서는 두 개의 Rotation Matrix 가 나올 수 있고, Rotation 의 Interpolation 을 위해서 Quaternion 사용
    // 랜드마크 + 홀리스틱 ( 손가락 관절 ) + IK Solver ( 바닥에 붙이기 - 타켓 포지션에 적용 ) + Physics ( Skin Mesh 에 대해서 충돌 피직스 설정 - 충돌 일어나지 않도록 )
  }

  //ikSolver?.update();
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
