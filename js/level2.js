import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {loadGLTF, clamp01, modulo} from "./utils.js";

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
            const members = [this, scout];
            while (scout.neighbors.size <= 2) {
                findNewNeighbor: for (const neighbor of scout.neighbors) {
                    if (!members.includes(neighbor)) {
                        scout = neighbor;
                        break findNewNeighbor;
                    }
                }
                members.push(scout);
            }

            const chain = new Chain(members);

            for (const member of members) {
                member.chains.push(chain);
            }
        }
    }
}

class Chain {
    guidePosts;
    start;
    end;
    spline;
    length;
    constructor(guideposts) {
        this.guidePosts = guideposts;
        this.spline = new THREE.CatmullRomCurve3( this.guidePosts.map(gp => gp.position) );
        this.end =  this.guidePosts[this.guidePosts.length - 1];
        this.start = this.guidePosts[0];
        this.length = this.spline.getLength();
    }
}

export default class Level {

    debugRenderContext;
    debugOrbitControls;

    guidePosts = [];
    chains = [];
    level;
    ready;

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

        this.ready = this.loadLevel();
    }

    async loadLevel() {

        const { scene } = this.debugRenderContext;

        this.level = new THREE.Group();

        const levelModel = (await loadGLTF("houdini/export/combined_non_linear_path_looped.gltf")).scene;

        for (const levelChild of levelModel.children) {
            const mesh = levelChild.children[0];
            mesh.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(
                    0.5 + 0.5 * Math.random(),
                    0.5 + 0.5 * Math.random(),
                    0.5 + 0.5 * Math.random()
                ),
                side: THREE.DoubleSide,
                roughness: 1,
            });
            this.level.add(mesh)
        }

        const bigLight = new THREE.DirectionalLight(0x00fffc, 0.9)

        bigLight.position.set(0, 1000, 0);

        this.level.add(bigLight);

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

        this.chains = Array.from(new Set(junctions.map(junction => junction.chains).flat()));

        for (const chain of this.chains) {
            const geometry = new THREE.BufferGeometry().setFromPoints( chain.guidePosts.map(gp => gp.position) );
            const material = new THREE.LineBasicMaterial( { color: Math.floor(0xFFFFFF * Math.random()) } );
            this.level.add(new THREE.Line(geometry, material));


        }

        const sphereMaterial = new THREE.MeshBasicMaterial({color: 0xFFFF00});
        for (const guidePost of this.guidePosts) {
            if (guidePost.chains.length === 0) {
                const sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(1),
                    sphereMaterial
                );

                sphere.position.copy(guidePost.position);
                this.level.add(sphere);
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

        scene.add(this.level);
    }

    createShipLocation() {
        const chainIndex = Math.floor(Math.random() * this.chains.length);

        const percent = Math.random();
        const direction = Math.random() > 0.5 ? -1 : 1;
        const group = new THREE.Group();

        const racerPointLight = new THREE.PointLight(0xFFFFFF, 50);
        racerPointLight.position.z += 30;
        racerPointLight.position.y -= 5;

        group.add(racerPointLight);

        this.level.add(group);

        const location = new PathLocation(this.chains[chainIndex], percent, direction, group);

        this.advanceShipLocation(location);

        return location;
    }

    advanceShipLocation(location, speed = 0) {
        location.advance(speed);

        location.group.position.copy(location.chain.spline.getPointAt(location.percent));

        let goalPercent = location.percent + (speed * location.direction);

        location.group.lookAt(location.chain.spline.getPointAt(clamp01(goalPercent)));
    }
}

class PathLocation {
    chain;
    percent;
    direction;
    group;

    constructor(chain, percent, direction, group) {
        this.chain = chain;
        this.percent = percent;
        this.direction = direction;
        this.group = group;
    }

    advance = (speed) => {

        //TODO: account for different lengths of chain

        this.percent = this.percent + (speed * this.direction) * this.chain.length;
        let activeChain = this.chain;
        let currentGuidePost;
        if (this.percent >= 1) {
            //last index of guideposts (which is always a junction) then randomize on chains
            currentGuidePost = activeChain.end;
        }else if(this.percent <= 0) {
            currentGuidePost = activeChain.start;
        } else {
            return;
        }

        let nextChains = currentGuidePost.chains.filter((chain) => chain !== activeChain);

        this.chain = nextChains[Math.floor(Math.random() * nextChains.length)];

        if (currentGuidePost === this.chain.start) {
            this.direction = 1;
            this.percent = 0;
        } else if (currentGuidePost === this.chain.end) {
            this.direction = -1;
            this.percent = 1;
        } else {
            throw new Error("DICKS");
        }
    }
}
