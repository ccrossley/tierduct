import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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

const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );
camera.position.z = -10;
//camera.position.y = 0.5;
camera.rotation.y = Math.PI;

for (let i = 0; i < numGuideposts; i++) {
	const pos = levelSplinePoints[i];
	const pointLight = new THREE.PointLight(0xFFAA88, 20);
	pointLight.position.copy(pos);
	pointLight.position.y += 5;
	levelModel.add(pointLight);
}

levelSpline = new THREE.CatmullRomCurve3( levelSplinePoints, true );

const maxPlayers = 35;
const playerIsFasterThanBotScalar = 1.25;
const players = new Array(maxPlayers);
const ships = new Array(maxPlayers);

const speedVariance = 0.0001;
const turnVariance = 0.75;

//need to do these in parallel...probably?
async function loadShips() {
	for (let i = 0; i < maxPlayers; i++) {
		ships[i] = await loadGLTF(`houdini/export/ships/ship_${i}.gltf`);
		console.log(`ship ${i} loaded`);
	}
}

await loadShips();

const addPlayer = (playerIndex, isPlayer = false) => {
	const player = {
		shipId: playerIndex,
		speed: (0.00025 + (speedVariance * Math.random())),
		currentAngle: 0,
		turnChance: (0.25 + (turnVariance) * Math.random()),
		levelProgress: Math.random(),
		lap: 1,
		isPlayer: isPlayer,

		group: new THREE.Group(),
		shipGroup: new THREE.Group(),
		movementGroup: new THREE.Group(),
	};

	if (isPlayer) {
		player.group.add(camera);
		player.speed *= playerIsFasterThanBotScalar;
	}

	const shipModel = ships[playerIndex].scene.children[0];

	shipModel.scale.set(1.5, 1.5, 1.5);

	player.shipGroup.position.y = -orbitRadius;
	player.group.add(player.movementGroup);
	player.movementGroup.add(player.shipGroup);

	const pyramidLight1 = new THREE.PointLight(0xCC88FF, 5);
	shipModel.add(pyramidLight1);
	pyramidLight1.position.z += 5;
	const pyramidLight2 = new THREE.PointLight(0xCC88FF, 5);
	shipModel.add(pyramidLight2);
	pyramidLight2.position.z -= 5;

	player.shipGroup.add(shipModel);
	const playerPointLight = new THREE.PointLight(0xCC88FF, 50);
	playerPointLight.position.z += 30;
	playerPointLight.position.y -= 5;

	player.shipGroup.add(playerPointLight);

	player.group.rotation.order = "ZXY";

	players[playerIndex] = player;

	level.add(player.group);

	return player;
}

const addPlayers = (count) => {
	addPlayer(0, true);
	for (let i = 1; i < count; i++) {
		addPlayer(i);
	}
}

addPlayers(maxPlayers);

scene.add(level);

window.onresize = () => {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
};

const keysDown = new Map();

window.addEventListener("keydown", (e) => {
	if (e.repeat) return;

	keysDown.set(e.key, true);
});

window.addEventListener("keyup", (e) => {
	keysDown.set(e.key, false);
});

const animate = (time) => {
	renderer.render( scene, camera );

	for (const player of players) {
		if (!player) continue;

		const lastLevelProgress = player.levelProgress;
		const levelProgress = (lastLevelProgress + player.speed) % 1;

		let currentAngle = player.currentAngle;

		if (levelProgress < lastLevelProgress) {
			player.lap++;
			console.log(`new lap: ${player.lap}`);
		}

		let turnAmount = 0;

		if (player.isPlayer) {
			if (keysDown.get("ArrowLeft")) {
				turnAmount += 0.1;
			}

			if (keysDown.get("ArrowRight")) {
				turnAmount -= 0.1;
			}

			if (keysDown.get("ArrowUp")) {
				player.speed = Math.min(Math.max(0, player.speed + 0.00001), 1);
			}

			if (keysDown.get("ArrowDown")) {
				player.speed = Math.min(Math.max(0, player.speed - 0.00001), 1);
			}
		} else {
		//	turnAmount = (Math.random() <= player.turnChance) ? 0.1 : 0;
		}

		currentAngle += turnAmount;

		const movementGroup = player.movementGroup;

		if (turnAmount > 0) {
			while(currentAngle < movementGroup.rotation.z - Math.PI) {
				currentAngle += 2*Math.PI;
			}
		} else {
			while(currentAngle > movementGroup.rotation.z + Math.PI) {
				currentAngle -= 2*Math.PI;
			}
		}

		player.movementGroup.rotation.z = THREE.MathUtils.lerp(movementGroup.rotation.z, currentAngle, 0.1);

		if (levelSpline != null) {
			const goalPosition = levelSpline.getPointAt(levelProgress);

			player.group.lookAt(levelSpline.getPointAt((levelProgress + player.speed) % 1));
			player.group.position.copy(goalPosition);
		}

		player.levelProgress = levelProgress;
		player.currentAngle = currentAngle;
	}
	requestAnimationFrame(animate);
};

animate();
