import * as THREE from 'three';

export default class Racer {
	id;
	level;
	ship;
	location;
	tubeLocation;
	speed;
	turnAmount;

	constructor(id, shipGLTF) {
		this.id = id;
		this.ship = shipGLTF.scene.clone(true);
		this.mixer = new THREE.AnimationMixer(this.ship);
		this.animation = shipGLTF.animations[0];
		if (this.animation != null) {
			this.mixer.clipAction( this.animation ).play();
		}

		this.speed = Math.random() * 0.5 + 0.25;

		this.turnAmount = 0;

		this.ship.scale.set(0.4, 0.4, 0.4);
	}

	loadIntoLevel(level) {
		this.level = level;
		const locations = this.level.createShipLocation();

		this.location = locations.pathLocation;
		this.tubeLocation = locations.tubeLocation;

		this.tubeLocation.group.add(this.ship);
	}

	update(deltaSeconds) {
		this.mixer.update(deltaSeconds);
		this.level.advanceShipLocation(this.location, this.speed * 2);
		this.tubeLocation.update(this.turnAmount, this.location.chain.radius);
	}
}
