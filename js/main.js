import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

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

const openEnded = true;

let cylinder = new THREE.Mesh(
	new THREE.CylinderGeometry(10, 10, tubeLength, 32, tubeLength, openEnded),
	new THREE.MeshStandardMaterial({color: 0xFFFFFF, side: THREE.BackSide})
);
/*
for(let i = 0; i < 10; i++) {
	const depth = (i / 10 - .5) * tubeLength;
	const pointLight = new THREE.PointLight(0x00ff00, 10 + i % 3);

	pointLight.position.x = 20 * Math.sin(depth);
	pointLight.position.y = 5;
	pointLight.position.z = depth;

	level.add(pointLight);
}
*/
//level.add(cylinder);
const levelModelLoader = new FBXLoader();
levelModelLoader.load("houdini/export/out.fbx", function(fbx) {
	//level.add(fbx.scene);
	console.log(fbx);

	// theScene = fbx.scene;

	//const geo = theScene.children[0].geometry;

	console.log(geo);
	//gltf.scene.scale.set(100, 100, 100);
})

//cylinder.position.z = -20;
//cylinder.position.y = -5;

cylinder.rotation.y = Math.PI / 2;
cylinder.rotation.z = Math.PI / 2;

let playerShip = new THREE.Mesh(
	new THREE.BoxGeometry(1, 1, 1), // Example geometry
	new THREE.MeshStandardMaterial({ color: 0xff0000 })
);
const playerPointLight = new THREE.PointLight(0xff0000, 50);
playerPointLight.position.z += 5;
playerPointLight.position.y += 15;

playerShip.add(playerPointLight);

const camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
camera.position.z = 10;
camera.position.y = 2;

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

const animate = () => {``
	renderer.render( scene, camera );

	// Get player input (this part is up to your implementation)
	const playerInput = getPlayerInput(); // 'left' or 'right'
	playerShip.position.z--;
	if (playerShip.position.z < -tubeLength / 2) {
		playerShip.position.z = tubeLength / 2;
	}
	// Update the orbit target
	const targetLocation = updateOrbitTarget(playerInput, playerShip, orbitRadius);

	requestAnimationFrame(animate);
};

animate();
