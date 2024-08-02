import * as THREE from 'three';
import GameScreen from "./gamescreen.js";
import { keysDown } from "./keyboard.js";
import Racer from "./racer.js";
import Level from "./level2.js";
import {loadGLTF, clamp01} from "./utils.js";

//import {jellyVertexShader, jellyFragmentShader} from "./shaders.js";

const container = document.body;
const gameScreen = new GameScreen();
container.appendChild( gameScreen.domElement );

const stoppedDebug = true;

const level = new Level(gameScreen.domElement);
gameScreen.renderContext = level.debugRenderContext;

const numRacers = 32;

// const ships = (await loadGLTF("houdini/export/ships/all_ships.gltf")).scene.children.slice();
// const jelly = (await loadGLTF("houdini/export/jelly/jelly_6.gltf")).scene;
const jellies = (await Promise.all(
	Array(numRacers)
		.fill()
		.map((_, i) => i.toString())
		.map(i => loadGLTF(`houdini/export/jelly/jelly_${i}.glb`))
));

await level.ready;
const racers = Array(numRacers).fill().map((_, i) => {
	let shipGLTFIndex = i;

	if (i === 0) {
		shipGLTFIndex = Math.floor(Math.random() * jellies.length);
	}

	const shipGLTF = jellies[shipGLTFIndex % jellies.length];
/*
	const shader = new THREE.MeshStandardMaterial({
		color: new THREE.Color(0x0055ff), // A deep blue, adjust as needed
		roughness: 0.3, // Slightly glossy
		metalness: 0.1, // Low metalness for a more organic feel
		transparent: true,
		morphNormals:false,
		morphTargets:false,
		opacity: 0.85, // Slightly translucent
		emissive: new THREE.Color(0x112244), // Soft bioluminescence, adjust color as needed
		emissiveIntensity: 0.2 // Adjust intensity as needed
	});

	const shader = new THREE.ShaderMaterial({
		vertexShader: jellyVertexShader,
		fragmentShader: jellyFragmentShader,
	})
		*/

	shipGLTF.scene.traverse((child) => {
		if (child.isMesh) {
			const standardMaterial = child.material;
			const physicalMaterial = new THREE.MeshPhysicalMaterial({
				color: standardMaterial.color,
				map: standardMaterial.map,
				aoMap: standardMaterial.aoMap,
				roughness: 0.25,
				clearcoat: 0.75,
				clearcoatMap: standardMaterial.aoMap,
				clearcoatRoughness: 0.1,
				specularIntensityMap: standardMaterial.aoMap,
				specularColorMap: standardMaterial.map,
				normalMap: standardMaterial.normalMap,
				normalScale: new THREE.Vector2(0.3, 0.3),
				metalness: 0.1,
				//emissive: new THREE.Color(0x112244),
				//emissiveIntensity: 0.2
			});

			child.material = physicalMaterial;
		}
	});

	if (shipGLTF.animations.length === 0) {
		console.warn("Craig!", `houdini/export/jelly/jelly_${i % jellies.length}.glb`, "has no animations!");
	}
	const racer = new Racer(i, shipGLTF, 0);
	racer.loadIntoLevel(level);
	return racer;
});

let spaceHit = false;
let cHit = false;

gameScreen.updateFn = (deltaTime) => {
	level.debugOrbitControls.update();

	if (keysDown.get("ArrowUp")) {
		playerRacer.speed = clamp01(playerRacer.speed + 0.1);
	} else if (keysDown.get("ArrowDown")) {
		playerRacer.speed = clamp01(playerRacer.speed - 0.1);
	} else {
		playerRacer.speed *= 0.999;
	}

	playerRacer.turnAmount = 0;

	if (keysDown.get("ArrowLeft")) {
		playerRacer.turnAmount -= 0.1;
	}

	if (keysDown.get("ArrowRight")) {
		playerRacer.turnAmount += 0.1;
	}

	if (keysDown.get(" ")) {
		if (!spaceHit) {
			playerRacer.location.changeDirection(-playerRacer.location.direction);

			/*
			const location = playerRacer.location;
			const chainIndex = level.chains.indexOf(location.chain);
			const newIndex = (chainIndex + 1) % level.chains.length;
			console.log(newIndex, "/", level.chains.length);
			location.chain = level.chains[newIndex];
			location.percent = 0.25;
			location.direction = -1;
			location.junction = location.direction > 0 ? location.chain.end : location.chain.start;
			location.updateChoices();
			*/

			spaceHit = true;
		}
	} else {
		spaceHit = false;
	}

	if (keysDown.get("c")) {
		if (!cHit) {
			level.nextLightColor();
			cHit = true;
		}
	} else {
		cHit = false;
	}

	const deltaSeconds = deltaTime / 1000;

	for (const racer of racers) {
		racer.update(deltaSeconds);
	}
}

const playerRacer = racers[0];

const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );
camera.position.z = -24;
camera.position.y = -2;
camera.rotation.y = Math.PI;

playerRacer.location.group.add(camera);

const racerPointLight = new THREE.PointLight(0xFFFFFF, 50);
racerPointLight.position.z += 30;
racerPointLight.position.y -= 5;
playerRacer.ship.add(racerPointLight);

gameScreen.renderContext = {...level.debugRenderContext, camera};

