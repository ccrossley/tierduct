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

const ships = (await loadGLTF("houdini/export/ships/all_ships.gltf")).scene.children.slice();

await level.ready;

const numRacers = 128;
const racers = Array(numRacers).fill().map((_, i) => {
	const shipIndex = i % ships.length;

	const racer = new Racer(i, ships[shipIndex]);
	racer.loadIntoLevel(level);
	return racer;
});

gameScreen.updateFn = () => {
	level.debugOrbitControls.update();

	if (keysDown.get("ArrowUp")) {
		playerRacer.speed = clamp01(playerRacer.speed + 0.1);
	} else if (keysDown.get("ArrowDown")) {
		playerRacer.speed = clamp01(playerRacer.speed - 0.1);
	} else {
		playerRacer.speed *= 0.999;
	}

	const locationCase = playerRacer.location.case;
	if (locationCase != null) {
		console.log(locationCase);
	}

	for (const racer of racers) {
		racer.update();
	}
}

const playerRacer = racers[0];

const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );
camera.position.z = -10;
//camera.position.y = 0.5;
camera.rotation.y = Math.PI;

playerRacer.ship.add(camera);

const racerPointLight = new THREE.PointLight(0xFFFFFF, 50);
racerPointLight.position.z += 30;
racerPointLight.position.y -= 5;
playerRacer.ship.add(racerPointLight);

gameScreen.renderContext = {...level.debugRenderContext, camera};

