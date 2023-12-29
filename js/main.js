import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';

const container = document.body;

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
container.appendChild( renderer.domElement );

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x222222 );

const orbitRadius = 5; // Example radius, adjust as needed
let level = new THREE.Group();

let levelSpline;
let levelSplinePoints;
let levelProgress = 0;

const openEnded = true;

const loadGLTF = (url) => new Promise(resolve => new GLTFLoader().load(url, resolve));

const levelModel = (await loadGLTF("houdini/export/level_geom.gltf")).scene.children[0];
level.add(levelModel);

levelModel.material.roughness = 1;

// flipNormals: {
// 	let temp;
// 	const {geometry} = levelModel;
// 	for ( let i = 0; i < geometry.index.array.length; i += 3 ) {
// 		temp = geometry.index.array[ i ];
// 		geometry.index.array[ i ] = geometry.index.array[ i + 2 ];
// 		geometry.index.array[ i + 2 ] = temp;
// 	}
// }

const levelPositions = (await loadGLTF("houdini/export/level_path.gltf")).scene.children[0].geometry.attributes.position;
const numVerts = levelPositions.array.length / 3;
const numGuideposts = numVerts;
// console.log(numGuideposts);

const {array, itemSize} = levelPositions;
levelSplinePoints = Array(numGuideposts)
	.fill()
	.map((_, index) => new THREE.Vector3(
		...array.slice(index * itemSize, index * itemSize + 3)
	)
);

// for (const pos of levelSplinePoints) {
// 	let sphere = new THREE.Mesh(
// 		new THREE.SphereGeometry(0.1),
// 		new THREE.MeshBasicMaterial({color: 0xFFFF00})
// 	);
// 	sphere.position.copy(pos);
// 	levelModel.add(sphere);
// }

for (let i = 0; i < numGuideposts; i++) {
	const pos = levelSplinePoints[i];
	const pointLight = new THREE.PointLight(0xFFAA88, 20);
	pointLight.position.copy(pos);
	pointLight.position.y += 5;
	levelModel.add(pointLight);
}

levelSpline = new THREE.CatmullRomCurve3( levelSplinePoints, true );

const playerShip = new THREE.Group();
const playerGroup = new THREE.Group();
const playerMovementGroup = new THREE.Group();

const pyramid = new THREE.Mesh(
	new THREE.TetrahedronGeometry(0.5, 1),
	new THREE.MeshLambertMaterial({ color: 0x8800aa, opacity: 0.5, transparent: true, reflectivity: 0 })
);
const pyramidLight1 = new THREE.PointLight(0xCC88FF, 5);
pyramid.add(pyramidLight1);
pyramidLight1.position.z += 5;
const pyramidLight2 = new THREE.PointLight(0xCC88FF, 5);
pyramid.add(pyramidLight2);
pyramidLight2.position.z -= 5;

playerShip.add(pyramid);
const playerPointLight = new THREE.PointLight(0xCC88FF, 50);
playerPointLight.position.z += 30;
playerPointLight.position.y -= 5;

playerShip.add(playerPointLight);

const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );
camera.position.z = -10;
//camera.position.y = 0.5;
camera.rotation.y = Math.PI;

playerGroup.add(camera);

playerShip.position.y = -orbitRadius;
playerGroup.add(playerMovementGroup);
playerMovementGroup.add(playerShip);

level.add(playerGroup);

scene.add(level);

window.onresize = () => {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
};

playerGroup.rotation.order = "ZXY";

let bank = 0;

// window.addEventListener("mousemove", ({x, y}) => {
// 	levelProgress = x / window.innerWidth;
// })

const keysDown = new Map();

window.addEventListener("keydown", (e) => {
	if (e.repeat) return;

	keysDown.set(e.key, true);
});

window.addEventListener("keyup", (e) => {
	keysDown.set(e.key, false);
});

let currentAngle = 0;
const animate = (time) => {
	renderer.render( scene, camera );

	levelProgress = (levelProgress + 0.00025) % 1;

	let turnAmount = 0;

	if (keysDown.get("ArrowLeft")) {
		turnAmount += 0.1;
	}

	if (keysDown.get("ArrowRight")) {
		turnAmount -= 0.1;
	}

	currentAngle += turnAmount;

	if (turnAmount > 0) {
		while(currentAngle < playerMovementGroup.rotation.z - Math.PI) {
			currentAngle += 2*Math.PI;
		}
	}else{
		while(currentAngle > playerMovementGroup.rotation.z + Math.PI) {
			currentAngle -= 2*Math.PI;
		}
	}

	playerMovementGroup.rotation.z = THREE.MathUtils.lerp(playerMovementGroup.rotation.z, currentAngle, 0.1);

	if (levelSpline != null) {
		const goalPosition = levelSpline.getPointAt(levelProgress);
		// playerShip.rotation.z = 0;
		// const lastY = playerShip.rotation.y;
		playerGroup.lookAt(levelSpline.getPointAt((levelProgress + 0.01) % 1));
		// bank = THREE.MathUtils.lerp(bank, Math.atan(lastY - playerShip.rotation.y) * 2, 0.1);
		// playerShip.rotation.z = bank;
		playerGroup.position.copy(goalPosition);
		//camera.lookAt(camera.worldToLocal(playerShip.localToWorld(playerShip.position)));
		//const lastPlayerZ = playerMovementGroup.rotation.z;
		//playerMovementGroup.rotation.z = THREE.MathUtils.lerp(lastPlayerZ, goalPlayerZ - lastPlayerZ, 0.2);
		//playerShip.position.y += 4.5;
	}

	//camera.position.x = 0 + Math.cos(time * 0.0033) * 0.15;
	//camera.position.y = 0.5 + Math.sin(time * 0.0040) * 0.15;
	//camera.rotation.x = 0 + Math.cos(time * 0.0033) * 0.1;
	//camera.rotation.y = Math.PI + Math.sin(time * 0.006) * 0.1;

	//pyramid.rotation.x += 0.04;
	//pyramid.rotation.y += 0.033;

	requestAnimationFrame(animate);
};

animate();
