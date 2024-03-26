import * as THREE from 'three';

export default class Racer {

	id;
	level;
	ship;

	constructor(id) {
		this.id = id;
	}

	loadIntoLevel(level) {
		this.level = level;

		this.ship = new THREE.Mesh(
			new THREE.SphereGeometry(2),
			new THREE.MeshBasicMaterial({color: Math.random() * 0xFFFFFF})
		);

		this.level.placeShip(this.ship);
	}

	update() {
		this.level.advanceShip(this.ship, 0.01);
	}
}
