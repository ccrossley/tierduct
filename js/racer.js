import * as THREE from 'three';

export default class Racer {

	id;
	level;
	ship;
	location;

	constructor(id, ship) {
		this.id = id;
		this.ship = ship;

		console.log(ship)

		this.ship.scale.set(10, 10, 10);
	}

	loadIntoLevel(level) {
		this.level = level;
		this.location = this.level.createShipLocation();
		this.location.group.add(this.ship);
	}

	update() {
		this.level.advanceShipLocation(this.location, 0.01);
	}
}
