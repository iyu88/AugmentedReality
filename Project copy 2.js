import * as THREE from "./node_modules/three/build/three.module.js";
import { OrbitControls } from "./node_modules/three/examples/jsm/controls/OrbitControls.js";

class Piano {
  // 피아노 객체
  constructor() {
    // 객체 생성자 : 피아노 정보를 초기화
    this.keyGroup = new THREE.Group(); // 피아노에 있는 각각의 건반을 담는 그룹 생성
    this.pianoPosition = new THREE.Vector3(-40, -20, 10); // 피아노의 초기 위치
    this.pianoPositionMatrix = new THREE.Matrix4().makeTranslation(
      -40,
      -20,
      10
    ); // >> 피아노의 위치를 옮기는 Matrix
    this.keySizeX = 6; // 피아노 너비
    this.keySizeY = 5; // 피아노 높이
    this.keySizeZ = 30; // 피아노 깊이
    this.keyNumber = 8; // 건반 개수
    for (let i = 0; i < this.keyNumber; i++) {
      // 반복문을 사용해서 각각의 건반을 생성
      const piano_geometry = new THREE.BoxGeometry( // BoxGeometry 를 사용해서 건반의 뼈대를 생성
        this.keySizeX,
        this.keySizeY,
        this.keySizeZ
      );
      const piano_material = new THREE.MeshBasicMaterial({ color: 0xffffff }); // 건반의 색상을 하얀색으로 설정
      piano_material.transparent = true; // 투명도 조절을 위해 True 로 변경
      piano_material.opacity = 0.6; // 투명도 설정
      let piano_mesh = new THREE.Mesh(piano_geometry, piano_material); // 건반의 Mesh를 생성
      piano_mesh.matrixAutoUpdate = false;
      piano_mesh.matrix.multiply(this.pianoPositionMatrix); // pianoPositionMatrix 값을 곱해서 위치를 옮겨줌
      let movematrix2 = new THREE.Matrix4().makeTranslation(11 * i, 0, 0);
      piano_mesh.matrix.multiply(movematrix2); // 건반의 순서에 따라서 위치를 옮김
      let rotationmatrix = new THREE.Matrix4().makeRotationX(Math.PI / 8);
      piano_mesh.matrix.multiply(rotationmatrix); // 건반을 Math.PI / 8 만큼 기울임
      piano_mesh.geometry.computeBoundingBox();
      piano_mesh.geometry.boundingBox.needsUpdate = true;
      piano_mesh.isPressed = false; // 건반이 눌렸는지 확인하는 boolean 값
      piano_mesh.finger = null; // 어떤 손가락으로 눌렀는지 index 를 저장할 필드
      this.keyGroup.add(piano_mesh); // 건반을 피아노 그룹에 저장
    }
    this.BB = new THREE.Box3();
  }
  getPianoGroup() {
    return this.keyGroup;
  }
  detectCollision(firstMesh, secondMesh) {
    // 피아노와 왼손, 오른손의 충돌을 확인하는 함수
    let presentMesh;
    if (firstMesh && secondMesh) {
      // 양손이 모두 있을 경우, 두 손의 구성하는 좌표 값들을 하나의 배열에 저장
      presentMesh = [
        ...firstMesh.geometry.attributes.position.array,
        ...secondMesh.geometry.attributes.position.array,
      ];
    } else {
      // 둘 중 하나만 있을 경우, 있는 위치 배열만을 저장
      presentMesh = firstMesh
        ? [...firstMesh.geometry.attributes.position.array]
        : [...secondMesh.geometry.attributes.position.array];
    }
    const arraylength = presentMesh.length / 3; // XYZ 가 담겨 있기 때문에 3으로 나눔
    for (const [index, key] of this.keyGroup.children.entries()) {
      // 피아노 건반들을 모두 순회하며 충둘 확인
      const BB = new THREE.Box3();
      BB.setFromObject(key);
      for (let i = 0; i < arraylength; i++) {
        // 반복문으로 각 점을 순회
        if (
          BB.containsPoint(
            // Box3 객체가 손가락에 해당하는 각각의 점의 위치를 포함하고 있는지 확인
            new THREE.Vector3(
              presentMesh[3 * i],
              presentMesh[3 * i + 1],
              presentMesh[3 * i + 2]
            )
          )
        ) {
          // 포함하고 있을 경우 : 건반이 눌리지 않고 + 이전에 누르지 않은 손가락일 경우 => 소리를 냄
          // 두 가지 경우를 확인하지 않으면 소리가 다중으로 재생되는 문제 발생
          if (key.isPressed === false && key.finger !== i) {
            key.material.color.set(0xff0000); // 눌린 건반의 색상을 빨간색으로 변경
            this.playSound(index); // 눌린 건반의 index 에 해당하는 오디오를 재생
            key.isPressed = true; // 눌렸음을 확인
            key.finger = i; // 누른 손가락 정보 저장
          }
        } else {
          // 손가락이 건반을 누르지 않을 경우
          if (key.isPressed === true && key.finger === i) {
            // 만약 건반이 이전에 눌렸었고, 손가락 정보가 있으면
            key.material.color.set(0xffffff); // 건반의 색상을 하얀색으로 변경
            key.isPressed = false; // 눌리지 않았음을 확인
            key.finger = null; // 누른 손가락 정보를 null 로 변경
          }
        }
      }
    }
  }
  updatePosition(chin) {
    // 피아노 위치를 업데이트해주는 함수
    let chinmatrix = new THREE.Matrix4().makeTranslation(
      // 위치를 업데이트 해주는 Matrix
      chin.x,
      chin.y,
      chin.z
    );
    for (const [index, key] of this.keyGroup.children.entries()) {
      // 각각의 건반을 순회
      key.matrix.setPosition(0, 0, 0);
      key.matrix.multiply(this.pianoPositionMatrix); // 피아노의 위치 Matrix 만큼 건반을 움직임
      let movematrix2 = new THREE.Matrix4().makeTranslation(11 * index, 0, 0);
      key.matrix.multiply(movematrix2); // 건반의 순서에 맞게 다시 위치 설정
      key.matrix = key.matrix;
      key.matrix.multiply(chinmatrix);
    }
  }
  playSound(index) {
    // index 값을 전달받아서 mp3 파일 재생하는 함수
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

controls_world.target.set(0, 0, 20);
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

let lefthand_point_mesh = null; // 왼손 Mesh 정보를 담는 변수
let righthand_point_mesh = null; // 오른손 Mesh 정보를 담는 변수

let testPiano = new Piano(); // 피아노 객체의 인스턴스 생성
scene.add(testPiano.keyGroup); // 생성하고 Scene 에 추가

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
    // 만약에 카메라에 얼굴이 잡히면
    const pos_chin = results.faceLandmarks[152]; // MediaPipe 에서 제공하는 얼굴의 랜드마크 정보를 받아옴
    const pos_ps_chin = new THREE.Vector3( // 랜드마크 좌표로부터 프로젝션 스페이스를 구함
      (pos_chin.x - 0.5) * 2,
      -(pos_chin.y - 0.5) * 2,
      -1
    );
    let pos_ws_chin = new THREE.Vector3( // 프로젝션 스페이스 좌표를 월드 스페이스로 변환 ( unproject 메서드 사용 )
      pos_ps_chin.x,
      pos_ps_chin.y,
      pos_ps_chin.z
    ).unproject(camera1);
    pos_ws_chin.z = -pos_chin.z * x_scale + camera1.position.z - camera1.near; // Newly compute Z
    // => 월드의 Z 좌표 설정
    pos_ws_chin = ProjScale(pos_ws_chin, camera1.position, camera1.near, 100.0);
    testPiano.updatePosition(pos_ws_chin); // 피아노의 위치를 업데이트 해주기 위해서 월드에 배치된 얼굴 좌표 정보를 인자로 전달
  }

  if (results.leftHandLandmarks) {
    // 만약에 왼손이 카메라에 잡히면
    if (lefthand_point_mesh == null) {
      // 왼손 Mesh 정보가 초기화 되지 않았을 경우 ( 최초 1회일 경우 )
      let lefthand_point_geo = new THREE.BufferGeometry(); // 왼손 뼈대 정보를 저장할 변수 선언
      const lefthand_vertices = []; // 왼손의 좌표 값들을 저장할 배열 선언
      for (const [index, landmarks] of results.leftHandLandmarks.entries()) {
        // 왼손의 랜드마크를 반복문 순회
        // left hand landmarks 21개
        if (index % 4 === 0 && index > 4) {
          // 인덱스가 8, 12, 16, 20 일 경우만 저장함 (검지, 중지, 약지, 소지)
          const pos_ns = landmarks; // 랜드마크에서 Normalized Space 좌표 받아옴
          const pos_ps = new THREE.Vector3( // 위 좌표를 프로젝션 스페이스로 변환
            (pos_ns.x - 0.5) * 2,
            -(pos_ns.y - 0.5) * 2,
            pos_ns.z
          );
          let pos_ws = new THREE.Vector3( // 프로젝션 스페이스를 월드 스페이스로 변환
            pos_ps.x,
            pos_ps.y,
            pos_ps.z
          ).unproject(camera1);
          lefthand_vertices.push(pos_ws.x, pos_ws.y, pos_ws.z); // 월드에 위치한 좌표를 위에서 선언한 배열에 저장
        }
      }
      const point_mat = new THREE.PointsMaterial({ color: 0x0000ff, size: 7 }); // 왼손은 파란색으로 표현하는 머터리얼
      const lefthand_geo_bufferattribute = new THREE.Float32BufferAttribute(
        lefthand_vertices,
        3
      ); // 왼손 뼈대를 위치 값을 기반으로 설정
      lefthand_point_geo.setAttribute("position", lefthand_geo_bufferattribute);
      lefthand_point_mesh = new THREE.Points(lefthand_point_geo, point_mat); // 왼손 Mesh 를 생성하고
      scene.add(lefthand_point_mesh); // Scene 에 추가함
    }

    let positions = lefthand_point_mesh.geometry.attributes.position.array; // 왼손 뼈대의 위치 값들을 positions 변수에 저장
    for (const [i, landmarks] of results.leftHandLandmarks.entries()) {
      // 최신화된 왼손 랜드마크들의 정보를 반복문
      if (i % 4 === 0 && i > 4) {
        // 위에서 표시했던 손가락들일 경우 같은 작업을 반복함 => 손가락 위치에 따라서 점이 움직이도록 위치 정보를 업데이트
        const pos_ns = landmarks;
        const pos_ps = new THREE.Vector3(
          (pos_ns.x - 0.5) * 2,
          -(pos_ns.y - 0.5) * 2,
          -1
        );
        let pos_ws = new THREE.Vector3(pos_ps.x, pos_ps.y, pos_ps.z).unproject(
          camera1
        );

        pos_ws.z = -pos_ns.z * x_scale + camera1.position.z - camera1.near; // Newly compute Z

        pos_ws = ProjScale(pos_ws, camera1.position, camera1.near, 100.0);
        positions[3 * (i / 4 - 2) + 0] = pos_ws.x;
        positions[3 * (i / 4 - 2) + 1] = pos_ws.y;
        positions[3 * (i / 4 - 2) + 2] = pos_ws.z;
      }
    }
    lefthand_point_mesh.geometry.attributes.position.needsUpdate = true; // 위치가 바뀌도록 해당 값을 True 로 설정
  }

  // RIGHT HAND => 왼손과 똑같은 작업
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
      const point_mat = new THREE.PointsMaterial({ color: 0x00ff00, size: 7 }); // 오른손은 초록색으로 설정
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

        pos_ws.z = -pos_ns.z * x_scale + camera1.position.z - camera1.near; // Newly compute Z

        pos_ws = ProjScale(pos_ws, camera1.position, camera1.near, 100.0);
        positions[3 * (i / 4 - 2) + 0] = pos_ws.x;
        positions[3 * (i / 4 - 2) + 1] = pos_ws.y;
        positions[3 * (i / 4 - 2) + 2] = pos_ws.z;
      }
    }
    righthand_point_mesh.geometry.attributes.position.needsUpdate = true;
  }

  if (lefthand_point_mesh || righthand_point_mesh) {
    // 왼손이나 오른손에 대한 Mesh 정보가 있을 경우 ( 둘 중 하나라도 카메라에 비춰져서 점으로 표시가 되었다면 )
    testPiano.detectCollision(lefthand_point_mesh, righthand_point_mesh); // 피아노와의 충돌을 확인하기 위해서 피아노의 detectionCollision() 메서드에 Mesh 정보를 전달함
  }
  controls_world.update(); // Orbit 컨트롤 적용을 위해서 선언
  FarPlane_mesh.material.map = texture_frame;
  if (lefthand_point_mesh) lefthand_point_mesh.visible = false; // 위쪽에서는 손가락 점을 숨기기 위해서 왼손을 숨김
  if (righthand_point_mesh) righthand_point_mesh.visible = false; // 위쪽에서는 손가락 점을 숨기기 위해서 오른손을 숨김
  renderer.render(scene, camera1); // 위쪽 랜더러 랜더링 ( camera1 로 )
  if (lefthand_point_mesh) lefthand_point_mesh.visible = true; // 다시 아랫쪽에서는 손가락 점을 보이기 위해서 왼손을 보임
  if (righthand_point_mesh) righthand_point_mesh.visible = true; // 다시 아랫쪽에서는 손가락 점을 보이기 위해서 오른손을 보임
  renderer_world.render(scene, camera_world); // 아랫쪽 랜더러 랜더링 ( camera_world 로 )
  canvasCtx.restore();
}

const holistic = new Holistic({
  // MediaPipe 의 Holistic 솔루션을 사용하기 위해서 파일을 읽음
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
