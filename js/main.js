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

const levelObject = (await loadGLTF("houdini/export/combined_non_linear_path_looped.gltf"));
const levelChildren = levelObject.scene.children;

const levelPath = levelChildren.pop().children[0]; //path is the last child

for (const levelChild of levelChildren) {
	const mesh = levelChild.children[0];
	mesh.material.roughness = 1;
	level.add(mesh);
}

const clamp = (x, minVal, maxVal) => {
	if (maxVal < minVal) {
		[maxVal, minVal] = [minVal, maxVal];
	}
	return Math.max(minVal, Math.min(maxVal, x));
}

const clamp01 = x => clamp(x, 0, 1);


// flipNormals: {
// 	let temp;
// 	const {geometry} = levelModel;
// 	for ( let i = 0; i < geometry.index.array.length; i += 3 ) {
// 		temp = geometry.index.array[ i ];
// 		geometry.index.array[ i ] = geometry.index.array[ i + 2 ];
// 		geometry.index.array[ i + 2 ] = temp;
// 	}
// }

const levelPositions = levelPath.geometry.attributes.position;
const numVerts = levelPositions.array.length / 3;
const numGuideposts = numVerts;
// console.log(numGuideposts);


//const nonLinearTrackName = "houdini/export/combined_track_pdg_0.gltf";
const nonLinearTrackName = "houdini/export/combined_non_linear_path_looped.gltf";

const nonLinearMap = (await loadGLTF(nonLinearTrackName));
console.log("Non-Linear path", nonLinearTrackName)
console.log(nonLinearMap);
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

// for (let i = 0; i < numGuideposts; i++) {
// 	const pos = levelSplinePoints[i];
// 	const pointLight = new THREE.PointLight(0xFFAA88, 20);
// 	pointLight.position.copy(pos);
// 	pointLight.position.y += 5;
// 	level.add(pointLight);
// }

levelSpline = new THREE.CatmullRomCurve3( levelSplinePoints, true );

const maxRacers = 35;
const playerIsFasterThanBotScalar = 1.25;
const racers = new Array(maxRacers);

const speedVariance = 0.0001;
const turnVariance = 0.15;
const AIThinkDelay = 200;

const ships = await Promise.all(
	Array(maxRacers)
		.fill()
		.map((_, i) => loadGLTF(`houdini/export/ships/ship_${i}.gltf`))
);

const addRacer = (racerID, isPlayer = false) => {
	const racer = {
		racerID,
		speed: (0.00025 + (speedVariance * Math.random())),
		currentAngle: 360 * Math.random(),
		turnChance: (0.2 + ((turnVariance) * Math.random())),
		levelProgress: Math.random(),
		lap: 1,
		isPlayer,

		group: new THREE.Group(),
		shipGroup: new THREE.Group(),
		movementGroup: new THREE.Group(),
	};

	if (isPlayer) {
		racer.group.add(camera);
		racer.speed *= playerIsFasterThanBotScalar;
	}

	const shipModel = ships[racerID].scene.children[0];

	shipModel.scale.set(1.5, 1.5, 1.5);

	racer.shipGroup.position.y = -orbitRadius;
	racer.group.add(racer.movementGroup);
	racer.movementGroup.add(racer.shipGroup);

	const pyramidLight1 = new THREE.PointLight(0xCC88FF, 5);
	shipModel.add(pyramidLight1);
	pyramidLight1.position.z += 5;
	const pyramidLight2 = new THREE.PointLight(0xCC88FF, 5);
	shipModel.add(pyramidLight2);
	pyramidLight2.position.z -= 5;

	racer.shipGroup.add(shipModel);
	const racerPointLight = new THREE.PointLight(0xCC88FF, 50);
	racerPointLight.position.z += 30;
	racerPointLight.position.y -= 5;

	racer.shipGroup.add(racerPointLight);

	racer.group.rotation.order = "ZXY";

	racers[racerID] = racer;

	level.add(racer.group);

	return racer;
}

const addRacers = (count) => {
	for (let i = 0; i < count; i++) {
		addRacer(i, i === 0);
	}
}

addRacers(maxRacers);

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
let nextAITime = 0;
const animate = (time) => {
	renderer.render( scene, camera );

	const isAITimer = (nextAITime <= time || nextAITime <= 0);

	if (isAITimer) {
		nextAITime = time + AIThinkDelay;
	}

	for (const racer of racers) {
		if (!racer) continue;

		const lastLevelProgress = racer.levelProgress;
		const levelProgress = (lastLevelProgress + racer.speed) % 1;

		let currentAngle = racer.currentAngle;

		if (levelProgress < lastLevelProgress) {
			racer.lap++;
			//console.log(`new lap: ${racer.lap}`);
		}

		let turnAmount = 0;

		if (racer.isPlayer) {
			if (keysDown.get("ArrowLeft")) {
				turnAmount += 0.1;
			}

			if (keysDown.get("ArrowRight")) {
				turnAmount -= 0.1;
			}

			if (keysDown.get("ArrowUp")) {
				racer.speed = clamp01(racer.speed + 0.00001);
			} else if (keysDown.get("ArrowDown")) {
				racer.speed = clamp01(racer.speed - 0.00001);
			} else {
				racer.speed *= 0.999;
			}

		} else if (isAITimer) {

			// "AI"
			if (Math.random() <= racer.turnChance) {
				turnAmount = 0.1;
			} else {
				turnAmount = 0;
			}

			if (Math.random() > 0.25) {
				turnAmount *= -1;
			}
		}

		currentAngle += turnAmount;

		const movementGroup = racer.movementGroup;

		if (turnAmount > 0) {
			while(currentAngle < movementGroup.rotation.z - Math.PI) {
				currentAngle += 2*Math.PI;
			}
		} else {
			while(currentAngle > movementGroup.rotation.z + Math.PI) {
				currentAngle -= 2*Math.PI;
			}
		}

		racer.movementGroup.rotation.z = THREE.MathUtils.lerp(movementGroup.rotation.z, currentAngle, 0.1);

		if (levelSpline != null) {
			const goalPosition = levelSpline.getPointAt(levelProgress);

			racer.group.lookAt(levelSpline.getPointAt((levelProgress + racer.speed) % 1));
			racer.group.position.copy(goalPosition);
		}

		racer.levelProgress = levelProgress;
		racer.currentAngle = currentAngle;
	}
	requestAnimationFrame(animate);
};

animate(0);
