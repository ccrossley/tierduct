import GameScreen from "./gamescreen.js";
import { keysDown } from "./keyboard.js";
import Level from "./level1.js";

const container = document.body;
const gameScreen = new GameScreen();
container.appendChild( gameScreen.domElement );

const level = new Level(gameScreen.domElement);
gameScreen.renderContext = level.debugRenderContext;
