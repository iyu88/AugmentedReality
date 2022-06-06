const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");

import "../node_modules/@mediapipe/camera_utils/camera_utils.js";
import "../node_modules/@mediapipe/control_utils/control_utils.js";
import "../node_modules/@mediapipe/drawing_utils/drawing_utils.js";
import "../node_modules/@mediapipe/pose/pose.js";

import * as THREE from "three";
import { OrbitControls } from "../node_modules/three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "../node_modules/three/examples/jsm/loaders/GLTFLoader.js";

const renderer = new THREE.WebGLRenderer({ antialias: true });
const render_w = videoElement.videoWidth;
const render_h = videoElement.videoHeight;
renderer.setSize(render_w, render_h);
renderer.setViewport(0, 0, render_w, render_h);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const camera_ar = new THREE.PerspectiveCamera(
  45,
  render_w / render_h,
  0.1,
  1000
);
camera_ar.position.set(-1, 2, 3);
camera_ar.up.set(0, 1, 0);
camera_ar.lookAt(0, 1, 0);

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

const controls = new OrbitControls(camera_ar, renderer.domElement);
controls.enablePan = true;
controls.enableZoom = true;
controls.target.set(0, 1, -1);
controls.update();

const scene = new THREE.Scene();

scene.background = new THREE.Color(0xa0a0a0);
scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

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

const ground_mesh = new THREE.Mesh(
  new THREE.PlaneGeometry(1000, 1000),
  new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
);
ground_mesh.rotation.x = -Math.PI / 2;
ground_mesh.receiveShadow = true;
scene.add(ground_mesh);

const grid_helper = new THREE.GridHelper(1000, 1000);
grid_helper.rotation.x = Math.PI / 2;
ground_mesh.add(grid_helper);

let model,
  skeleton = null,
  skeleton_helper,
  mixer,
  numAnimations;
let axis_helpers = [];
const loader = new GLTFLoader();
loader.load("../models/gltf/Xbot.glb", function (gltf) {
  // 마네킹을 그리는 부분
  model = gltf.scene;
  scene.add(model);

  let bones = [];
  model.traverse(function (object) {
    if (object.isMesh) object.castShadow = true; // 스킨 메쉬

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

  //const animations = gltf.animations;
  //mixer = new THREE.AnimationMixer( model );

  //numAnimations = animations.length;

  //console.log(model.position);
  //console.log(model.scale);
});

let name_to_index = {
  nose: 0,
  left_eye_inner: 1,
  left_eye: 2,
  left_eye_outer: 3,
  right_eye_inner: 4,
  right_eye: 5,
  right_eye_outer: 6,
  left_ear: 7,
  right_ear: 8,
  mouse_left: 9,
  mouse_right: 10,
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
let index_to_name = {};
for (const [key, value] of Object.entries(name_to_index)) {
  //console.log(key, value);
  index_to_name[value] = key;
}

let axis_helper_root = new THREE.AxesHelper(1);
axis_helper_root.position.set(0, 0.001, 0);
scene.add(axis_helper_root);

const test_points = new THREE.Points(
  new THREE.BufferGeometry(),
  new THREE.PointsMaterial({
    color: 0xff0000,
    size: 0.1,
    sizeAttenuation: true,
  })
);
test_points.geometry.setAttribute(
  "position",
  new THREE.BufferAttribute(new Float32Array(33 * 3), 3)
);
scene.add(test_points);

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

function onResults2(results) {
  if (!results.poseLandmarks) {
    return;
  }

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

  {
    let pose_landmarks_dict = {};
    results.poseLandmarks.forEach((landmark, i) => {
      //console.log(i, landmark);
      //console.log(index_to_name[i]);
      pose_landmarks_dict[index_to_name[i]] = landmark;
    });

    // 월드 스페이스로 매핑된 랜드마크 점들 ( 조인트 ) 을 Point Mesh 로 그림
    let pos_3d_landmarks = update3dpose(
      camera_world,
      1.5,
      new THREE.Vector3(1, 0, -1.5),
      pose_landmarks_dict
    );
    //console.log(pos_3d_landmarks["left_heel"]);

    let i = 0;
    for (const [key, value] of Object.entries(pos_3d_landmarks)) {
      test_points.geometry.attributes.position.array[3 * i + 0] = value.x;
      test_points.geometry.attributes.position.array[3 * i + 1] = value.y;
      test_points.geometry.attributes.position.array[3 * i + 2] = value.z;
      i++;
    }
    test_points.geometry.attributes.position.needsUpdate = true;

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
    let jointLeftShoulder = pos_3d_landmarks["left_shoulder"]; // p0 -> 부모
    let jointLeftElbow = pos_3d_landmarks["left_elbow"]; // p1 -> 자식
    let boneLeftArm = skeleton.getBoneByName("mixamorigLeftArm"); // j1
    let v01 = new THREE.Vector3()
      .subVectors(jointLeftElbow, jointLeftShoulder) // 0 에서 1 을 뺀다 ( 순서는 1 다음 0 )
      .normalize(); // 정규화하여 유닛 벡터를 구함
    let j1 = boneLeftArm.position.clone().normalize(); // 팔꿈치 위치 정규화
    // j1 을 v01 로 가져감 ( Rotation 을 구하는 함수는 정의되어 있음 - computeR )
    let R0 = computeR(j1, v01); // LeftArm 의 Rotation Vector 를 구할 수 있음 ( 앞의 녀석을 뒤의 녀석으로 만들어주는 매트릭스를 계산 )
    // 로컬 트랜스폼을 변경해줌
    boneLeftArm.setRotationFromMatrix(R0); // Matrix4 로 설정

    // 루트부터 싹 새롭게 설정하지 않았음 : 어깨의 상대적인 위치만 설정해주겠다 ( 어깨를 임시적인 루트로 정의하고 진행 )
    // => 실제로는 루트에서부터 차례대로 로컬 트랜스폼이 작동하도록 만들어야 함

    let boneHips = skeleton.getBoneByName("mixamorigHips"); // j1
    console.log(boneHips);
    // 하위 부분 움직이도록 만들기
    let jointLeftWrist = pos_3d_landmarks["left_wrist"]; // p2
    let boneLeftForeArm = skeleton.getBoneByName("mixamorigLeftForeArm"); // j2
    let v12 = new THREE.Vector3()
      .subVectors(jointLeftWrist, jointLeftElbow) // (벡터 2, 벡터 1);
      .normalize();
    let j2 = boneLeftForeArm.position.clone().normalize();
    let Rv12 = v12.clone().applyMatrix4(R0.clone().transpose()); // R0 의 역행렬으로부터 -> transpose()
    let R1 = computeR(j2, Rv12);
    boneLeftForeArm.setRotationFromMatrix(R1); // setRotationFromQuaternion() 사용 권장
    // console.log(boneLeftArm);

    // 갈라지는 곳에서는 두 개의 Rotation Matrix 가 나올 수 있고, Rotation 의 Interpolation 을 위해서 Quaternion 사용
    // 랜드마크 + 홀리스틱 ( 손가락 관절 ) + IK Solver ( 바닥에 붙이기 - 타켓 포지션에 적용 ) + Physics ( Skin Mesh 에 대해서 충돌 피직스 설정 - 충돌 일어나지 않도록 )
  }

  renderer.render(scene, camera_ar);
  canvasCtx.restore();
}

const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
  },
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: true,
  smoothSegmentation: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
pose.onResults(onResults2);

videoElement.play();

async function detectionFrame() {
  await pose.send({ image: videoElement });
  videoElement.requestVideoFrameCallback(detectionFrame);
}

detectionFrame();
