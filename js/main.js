import GameScreen from "./gamescreen.js";
import { keysDown } from "./keyboard.js";
import Racer from "./racer.js";
import Level from "./level2.js";
import {loadGLTF} from "./utils.js";

const container = document.body;
const gameScreen = new GameScreen();
container.appendChild( gameScreen.domElement );

const level = new Level(gameScreen.domElement);
gameScreen.renderContext = level.debugRenderContext;

const ships = (await loadGLTF("houdini/export/ships/all_ships.gltf")).scene.children.slice();

console.log("allShips:", ships, ships.length);

await level.ready;

const numRacers = ships.length;
const racers = Array(numRacers).fill().map((_, i) => {
	console.log("ship:", i, ships[i]);
	const racer = new Racer(i, ships[i]);
	racer.loadIntoLevel(level);
	return racer;
});

gameScreen.updateFn = () => {
	level.debugOrbitControls.update();
	for (const racer of racers) {
		racer.update();
	}
}
