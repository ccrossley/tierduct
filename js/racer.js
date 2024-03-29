import * as THREE from 'three';

export default class Racer {

	id;
	level;
	ship;
	location;
	speed;

	constructor(id, ship) {
		this.id = id;
		this.ship = ship.clone(true);

		this.speed = Math.random() * 0.5 + 0.25;

		this.speed *= 0.0001;

		console.log(ship)

		//this.ship.scale.set(10, 10, 10);
	}

	loadIntoLevel(level) {
		this.level = level;
		this.location = this.level.createShipLocation();
		this.location.group.add(this.ship);
	}

	update() {
		this.level.advanceShipLocation(this.location, this.speed);
	}
}
