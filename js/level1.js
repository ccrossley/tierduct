import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import {loadGLTF} from "./utils.js";

export default class Level {

	debugRenderContext;
	debugOrbitControls;

	constructor(orbitMouseTarget) {
		const scene = new THREE.Scene();
		scene.background = new THREE.Color( 0x222222 );

		const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );
		camera.position.set( 1000, 0, 0 );

		const debugOrbitControls = new OrbitControls( camera, orbitMouseTarget );
		this.debugOrbitControls = debugOrbitControls;

		debugOrbitControls.update();
		debugOrbitControls.enablePan = false;
		debugOrbitControls.enableDamping = true;

		this.debugRenderContext = { scene, camera, };

		this.loadLevel();
	}

	async loadLevel() {

		const { scene } = this.debugRenderContext;

		let level = new THREE.Group();

		const levelModel = (await loadGLTF("houdini/export/level_geom.gltf")).scene.children[0];
		level.add(levelModel);

		levelModel.material.roughness = 1;

		const levelPositions = (await loadGLTF("houdini/export/level_path.gltf")).scene.children[0].geometry.attributes.position;
		const numVerts = levelPositions.array.length / 3;
		const numGuideposts = numVerts;

		let levelSplinePoints;
		const {array, itemSize} = levelPositions;
		levelSplinePoints = Array(numGuideposts)
			.fill()
			.map((_, index) => new THREE.Vector3(
				...array.slice(index * itemSize, index * itemSize + 3)
			)
		);

		const geometry = new THREE.BufferGeometry().setFromPoints( [...levelSplinePoints, levelSplinePoints[0]] );
		const material = new THREE.LineBasicMaterial( { color: 0xFFFF00 } );
		const curveObject = new THREE.Line( geometry, material );
		scene.add(curveObject);

		for (const pos of levelSplinePoints) {
			let sphere = new THREE.Mesh(
				new THREE.SphereGeometry(1),
				new THREE.MeshBasicMaterial({color: 0xFFFF00})
			);
			sphere.position.copy(pos);
			levelModel.add(sphere);
		}

		for (let i = 0; i < numGuideposts; i++) {
			const pos = levelSplinePoints[i];
			const pointLight = new THREE.PointLight(0xFFAA88, 20);
			pointLight.position.copy(pos);
			pointLight.position.y += 5;
			levelModel.add(pointLight);
		}

		const average = levelSplinePoints.reduce(
			(sum, pos) => {
				sum.add(pos);
				return sum;
			},
			new THREE.Vector3()
		).multiplyScalar( 1 / numGuideposts );

		this.debugOrbitControls.target.copy( average );

		scene.add(level);
	}
}
