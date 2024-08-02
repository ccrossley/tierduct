import * as THREE from 'three';
import {clamp} from "./utils.js";

export default class Racer {
	id;
	level;
	ship;
	location;
	tubeLocation;
	speed;
	turnAmount;
	time = 0;

	constructor(id, shipGLTF, speed = null) {
		this.id = id;
		this.ship = shipGLTF.scene.clone(true);
		this.mixer = new THREE.AnimationMixer(this.ship);
		this.animation = shipGLTF.animations[0];
		if (this.animation != null) {
			this.mixer.clipAction(this.animation).play();
		}

		this.speed = speed == null ? Math.random() * 0.5 + 0.25 : speed;
		this.turnAmount = 0;

		this.ship.scale.set(0.5, 0.5, 0.5);
	}

	loadIntoLevel(level) {
		this.level = level;
		const locations = this.level.createShipLocation();

		this.location = locations.pathLocation;
		this.tubeLocation = locations.tubeLocation;

		this.ship.position.y = -4;

		this.tubeLocation.group.add(this.ship);
	}

	update(deltaSeconds) {
		this.time += deltaSeconds
		this.mixer.update(deltaSeconds)

		const minSpeed = 0.25;
		const maxSpeed = 2;

		//const cyclicJetSpeed = 2 * Math.sin( this.time * 2 ) + 1;
		this.level.advanceShipLocation(this.location, clamp(
			this.speed,// * cyclicJetSpeed,
			minSpeed,
			maxSpeed
		));

		this.tubeLocation.update(this.turnAmount, this.location.chain.radius);
	}
}
