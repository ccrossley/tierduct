import GameScreen from "./gamescreen.js";
import { keysDown } from "./keyboard.js";
import Racer from "./racer.js";
import Level from "./level2.js";

const container = document.body;
const gameScreen = new GameScreen();
container.appendChild( gameScreen.domElement );

const level = new Level(gameScreen.domElement);
gameScreen.renderContext = level.debugRenderContext;

const numRacers = 5;
const racers = Array(numRacers).fill().map(i => {
	const racer = new Racer(i);
	racer.loadIntoLevel(level);
	return racer;
});

gameScreen.updateFn = () => {
	level.debugOrbitControls.update();
	for (const racer of racers) {
		racer.update();
	}
}
