import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.body;

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
container.appendChild( renderer.domElement );

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x222222 );

const orbitRadius = 100; // Example radius, adjust as needed

let level = new THREE.Group();
const tubeLength = 250;

let levelSpline;
let levelSplinePoints;
let levelProgress = 0;

const openEnded = true;

const levelModelLoader = new GLTFLoader();
levelModelLoader.load("houdini/export/output2.gltf", (gltf) => {
	const levelModel = gltf.scene.children[0];
	levelModel.material.side = THREE.DoubleSide;

	level.add(levelModel);

	levelModel.geometry.computeVertexNormals();

	const numGuideposts = Math.max(...Array.from(levelModel.geometry.attributes._path_hint_id.array)) + 1;

	const {array, itemSize} = levelModel.geometry.attributes.position;
	levelSplinePoints = Array(numGuideposts)
		.fill()
		.map((_, index) => new THREE.Vector3(
			...array.slice(index * 4 * itemSize, index * 4 * itemSize + 3)
		)
	);

	for (const pos of levelSplinePoints) {
		let sphere = new THREE.Mesh(
			new THREE.SphereGeometry(0.1),
			new THREE.MeshBasicMaterial({color: 0xFFFF00})
		);
		sphere.position.copy(pos);
		levelModel.add(sphere);
	}

	for (let i = 0; i < numGuideposts; i += 5) {
		const pos = levelSplinePoints[i];
		const pointLight = new THREE.PointLight(0x00ff00, (i % 3) * 5);
		pointLight.position.copy(pos);
		pointLight.position.y += 8;
		levelModel.add(pointLight);
	}

	levelSpline = new THREE.CatmullRomCurve3( levelSplinePoints, true );

})

let playerShip = new THREE.Mesh(
	new THREE.BoxGeometry(1, 1, 1), // Example geometry
	new THREE.MeshStandardMaterial({ color: 0xff0000 })
);
const playerPointLight = new THREE.PointLight(0xffff00, 50);
playerPointLight.position.z += 30;
playerPointLight.position.y -= 4;

playerShip.add(playerPointLight);

const camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
camera.position.z = -10;
camera.position.y = 2;
camera.rotation.y = Math.PI;

playerShip.add(camera);

level.add(playerShip);

scene.add(level);

window.onresize = () => {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
};

function getPlayerInput() {
	// Placeholder for your input handling logic
	// For example, this could listen to keyboard events and return 'left' or 'right'
	// You need to implement this part based on how you want to handle input
}

// Function to update the orbit target based on player input
function updateOrbitTarget(playerInput, ship, orbitRadius) {
	// Constants for orbit speed and direction
	const ORBIT_SPEED = 0.05; // Adjust as needed
	const direction = playerInput === 'left' ? -1 : 1; // Assuming 'left' or 'right' input

	// Current angle of the ship around the central point
	let currentAngle = Math.atan2(ship.position.y, ship.position.x);

	// Update the angle based on the direction and speed
	currentAngle += ORBIT_SPEED * direction;

	// Calculate the new target position
	const targetX = Math.cos(currentAngle) * orbitRadius;
	const targetY = Math.sin(currentAngle) * orbitRadius;

	// Return the new target location
	return new THREE.Vector3(targetX, targetY, ship.position.z);
}

playerShip.rotation.order = "ZXY";

let bank = 0;

const animate = () => {
	renderer.render( scene, camera );

	levelProgress = (levelProgress + 0.0008) % 1;

	if (levelSpline != null) {
		const goalPosition = levelSpline.getPointAt(levelProgress);
		playerShip.rotation.z = 0;
		const lastY = playerShip.rotation.y;
		playerShip.lookAt(levelSpline.getPointAt((levelProgress + 0.01) % 1));

		bank = THREE.MathUtils.lerp(bank, Math.atan(lastY - playerShip.rotation.y) * 2, 0.1);
		playerShip.rotation.z = bank;
		playerShip.position.copy(goalPosition);
	}

	requestAnimationFrame(animate);
};

animate();
