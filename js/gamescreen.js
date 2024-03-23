import * as THREE from 'three';

export default class GameScreen {

	domElement;
	renderer;
	renderContext = null;

	constructor() {
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.domElement = this.renderer.domElement;

		window.onresize = this.resize;

		const animate = (time) => {
			if (this.renderContext != null) {
				this.renderer.render( this.renderContext.scene, this.renderContext.camera );
				this.renderContext.update?.();
			}
			requestAnimationFrame(animate);
		};

		animate(0);
	}

	resize() {
		if (this.renderContext != null) {
			const { camera } = this.renderContext;
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
		}
		this.renderer.setSize( window.innerWidth, window.innerHeight );
	}
}
