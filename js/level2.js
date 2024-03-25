import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let levelData;

class GuidePost {
    index;
    position;
    neighbours;

    constructor(pointData) {
        this.index = pointData[0];
        this.position = new THREE.Vector3(...pointData[1]);
        this.neighbours = [];
    }

    addNeighbour(edge) {
        let neighbourIndex = -1

        if (edge[0] === this.index) {
            neighbourIndex = 1;
        } else if (edge[1] === this.index) {
            neighbourIndex = 0;
        } else {
            return;
        }

        this.neighbours.push(edge[neighbourIndex])
    }
}
export default class Level {

    debugRenderContext;
    debugOrbitControls;
    guidePosts = {};

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

        const update = () => {
            debugOrbitControls.update();
        }

        this.debugRenderContext = { scene, camera, update };

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
                color: Math.floor(0xFFFFFF * Math.random()),
                transparent: true,
                opacity: 0.1
            });
            level.add(mesh)
        }

        const levelSplinePoints = [];

        if (levelData == null) {
            levelData = await (await fetch('../houdini/export/level_path_data.json')).json();
        }

        const points = levelData.points;
        const levelPositions = levelData.points;
        const sectionEdges = levelData.edges;

        const numGuideposts = points.length;

        const sphereMaterial = new THREE.MeshBasicMaterial({color: 0xFFFF00});
        for (let i = 0; i < points.length; i++) {
            const guidePost = new GuidePost(points[i]);

            levelSplinePoints.push(guidePost.position);

            this.guidePosts[guidePost.index] = guidePost;

            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(1),
                sphereMaterial
            );

            sphere.position.copy(guidePost.position);
            level.add(sphere);
        }

        console.log("Section Edges:", sectionEdges);

        const debugPathLines = [];

        for (const sectionEdge of sectionEdges) {
            const gp0 = this.guidePosts[sectionEdge[0]];
            const gp1 = this.guidePosts[sectionEdge[1]];

            gp0.addNeighbour(sectionEdge);
            gp1.addNeighbour(sectionEdge);

            const geometry = new THREE.BufferGeometry().setFromPoints( [gp0.position, gp1.position] );
            const material = new THREE.LineBasicMaterial( { color: Math.floor(0xFFFFFF * Math.random()) } );

            level.add(new THREE.Line(geometry, material));
        }

        console.log("Guide Posts:", this.guidePosts);
        /*
        for (let i = 0; i < numGuideposts; i++) {
            const pos = levelSplinePoints[i];
            const pointLight = new THREE.PointLight(0xFFAA88, 20);
            pointLight.position.copy(pos);
            pointLight.position.y += 5;
            levelModel.add(pointLight);
        }
        */
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
