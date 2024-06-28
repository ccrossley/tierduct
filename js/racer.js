import * as THREE from 'three';

export default class Racer {
	id;
	level;
	ship;
	location;
	tubeLocation;
	speed;
	turnAmount;

	constructor(id, ship) {
		this.id = id;
		this.ship = ship.clone(true);

		this.speed = Math.random() * 0.5 + 0.25;

		this.turnAmount = 0;

		//this.ship.scale.set(10, 10, 10);
	}

	loadIntoLevel(level) {
		this.level = level;
		const locations = this.level.createShipLocation();

		this.location = locations.pathLocation;
		this.tubeLocation = locations.tubeLocation;

		this.tubeLocation.group.add(this.ship);
	}

	update() {
		this.level.advanceShipLocation(this.location, this.speed);
		this.tubeLocation.update(this.turnAmount, this.location.chain.radius);
	}
}
