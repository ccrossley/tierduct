import * as THREE from 'three';
import GameScreen from "./gamescreen.js";
import { keysDown } from "./keyboard.js";
import Racer from "./racer.js";
import Level from "./level2.js";
import {loadGLTF, clamp01} from "./utils.js";

const container = document.body;
const gameScreen = new GameScreen();
container.appendChild( gameScreen.domElement );

const level = new Level(gameScreen.domElement);
gameScreen.renderContext = level.debugRenderContext;

const numRacers = 128;
	const ships = Array(numRacers).fill().map((_, i) => {
	return loadGLTF(`houdini/export/jelly_${i}.gltf`);
});

//const ships = (await loadGLTF("houdini/export/ships/all_ships.gltf")).scene.children.slice();

await level.ready;
const racers = Array(numRacers).fill().map((_, i) => {
	const shipIndex = i % ships.length;

	const racer = new Racer(i, ships[shipIndex]);
	racer.loadIntoLevel(level);
	return racer;
});

let spaceHit = false;

gameScreen.updateFn = () => {
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
		playerRacer.turnAmount += 0.1;
	}

	if (keysDown.get("ArrowRight")) {
		playerRacer.turnAmount -= 0.1;
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

	for (const racer of racers) {
		racer.update();
	}
}

const playerRacer = racers[0];

const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );
camera.position.z = -10;
camera.position.y = 0;
camera.rotation.y = Math.PI;

playerRacer.location.group.add(camera);

const racerPointLight = new THREE.PointLight(0xFFFFFF, 50);
racerPointLight.position.z += 30;
racerPointLight.position.y -= 5;
playerRacer.ship.add(racerPointLight);

gameScreen.renderContext = {...level.debugRenderContext, camera};

