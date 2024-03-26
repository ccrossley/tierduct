import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let levelData;

class GuidePost {
    index;
    position;
    neighbors = new Set();
    chains = [];

    constructor(index, position) {
        this.index = index;
        this.position = position;
    }

    addNeighbor(neighbor) {
        this.neighbors.add(neighbor);
    }

    findChains() {
        for (let scout of this.neighbors.values()) {
            if (scout.chains.length > 0) {
                continue;
            }
            const chain = [this, scout];
            while (scout.neighbors.size <= 2) {
                findNewNeighbor: for (const neighbor of scout.neighbors) {
                    if (!chain.includes(neighbor)) {
                        scout = neighbor;
                        break findNewNeighbor;
                    }
                }
                chain.push(scout);
            }
            for (const member of chain) {
                member.chains.push(chain);
            }
        }
    }
}

export default class Level {

    debugRenderContext;
    debugOrbitControls;
    guidePosts = [];

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

        this.debugRenderContext = { scene, camera };

        this.loadLevel();
    }

    async loadLevel() {

        const { scene } = this.debugRenderContext;

        let level = new THREE.Group();

        const loadGLTF = (url) => new Promise(resolve => new GLTFLoader().load(url, resolve));

        const levelModel = (await loadGLTF("houdini/export/combined_non_linear_path_looped.gltf")).scene;

        for (const levelChild of levelModel.children) {
            const mesh = levelChild.children[0];
            mesh.material = new THREE.MeshBasicMaterial({
                color: new THREE.Color(
                    0.5 + 0.5 * Math.random(),
                    0.5 + 0.5 * Math.random(),
                    0.5 + 0.5 * Math.random()
                ),
                transparent: true,
                opacity: 0.25
            });
            level.add(mesh)
        }

        if (levelData == null) {
            levelData = await (await fetch('../houdini/export/level_path_data.json')).json();
        }

        const points = levelData.points;
        const sectionEdges = levelData.edges;

        this.guidePosts = levelData.points
            .map((data, index) => new GuidePost(index, new THREE.Vector3(...data)));

        console.log("Section Edges:", sectionEdges);

        const debugPathLines = [];

        for (const sectionEdge of sectionEdges) {
            const gp0 = this.guidePosts[sectionEdge[0]];
            const gp1 = this.guidePosts[sectionEdge[1]];
            gp0.addNeighbor(gp1);
            gp1.addNeighbor(gp0);
        }

        console.log("Guide Posts:", this.guidePosts);

        const junctions = this.guidePosts.filter(gp => gp.neighbors.size > 2);
        junctions.forEach(junction => junction.findChains());

        const allChains = new Set(junctions.map(junction => junction.chains).flat());

        console.log(allChains);

        for (const chain of allChains) {
            const geometry = new THREE.BufferGeometry().setFromPoints( chain.map(gp => gp.position) );
            const material = new THREE.LineBasicMaterial( { color: Math.floor(0xFFFFFF * Math.random()) } );
            level.add(new THREE.Line(geometry, material));

            // make splines for chains above
        }

        const sphereMaterial = new THREE.MeshBasicMaterial({color: 0xFFFF00});
        for (const guidePost of this.guidePosts) {
            if (guidePost.chains.length === 0) {
                const sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(1),
                    sphereMaterial
                );

                sphere.position.copy(guidePost.position);
                level.add(sphere);
            }
        }

        const average = this.guidePosts.reduce(
            (sum, guidePost) => {
                sum.add(guidePost.position);
                return sum;
            },
            new THREE.Vector3()
        ).multiplyScalar( 1 / points.length );

        this.debugOrbitControls.target.copy( average );

        scene.add(level);
    }

    placeShip(ship) {
        // TODO:
        // pick a random chain and place the ship along its spline at random position
        // Persist chain, direction, and percent along chain on ship
    }

    advanceShip(ship, speed) {
        // TODO:
        // Grab persisted chain and percent along chain on the ship
        // increment percent by speed
        // if percent is now > 100%, randomly pick a neighboring chain
    }
}
