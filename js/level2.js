import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {loadGLTF, clamp01, modulo} from "./utils.js";

let levelData;

class GuidePost {
    position;
    neighbors = new Set();
    chains = [];

    constructor(position) {
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
    spline;
    length;
    startChoices = [];
    endChoices = [];
    isBezier;

    constructor(guidePosts, isBezier = false) {
        this.isBezier = isBezier;
        this.guidePosts = guidePosts.slice();
    }

    get start() {
        return this.guidePosts[0];
    }

    get end() {
        return this.guidePosts[this.guidePosts.length - 1];
    }

    makeSpline() {
        const positions = this.guidePosts.map(gp => gp.position);
        this.spline = this.isBezier
            ? new THREE.QuadraticBezierCurve3(...positions)
            : new THREE.CatmullRomCurve3(positions);
        this.length = this.spline.getLength();
    }
}

export default class Level {

    debugRenderContext;
    debugOrbitControls;

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

        const guidePosts = levelData.points.map((data) => new GuidePost(new THREE.Vector3(...data)));

        const debugPathLines = [];

        for (const sectionEdge of sectionEdges) {
            const gp0 = guidePosts[sectionEdge[0]];
            const gp1 = guidePosts[sectionEdge[1]];
            gp0.addNeighbor(gp1);
            gp1.addNeighbor(gp0);
        }

        const junctions = guidePosts.filter(gp => gp.neighbors.size > 2);
        junctions.forEach(junction => junction.findChains());

        this.chains = Array.from(new Set(junctions.map(junction => junction.chains).flat()));

        const truncation = 3; // Try changing this value to smooth the ramps

        for (const junction of junctions) {

            const chainEnds = junction.chains.map(chain => {
                let guidePosts = chain.guidePosts.slice();
                if (chain.start !== junction) {
                    guidePosts.reverse();
                }
                return guidePosts[truncation];
            });

            const numJunctionChains = junction.chains.length;

            for (let i = 0; i < numJunctionChains; i++) {

                const chain1 = junction.chains[i];
                const chain1Choices = chain1.start === junction
                    ? chain1.startChoices
                    : chain1.endChoices;

                for (let j = i + 1; j < numJunctionChains; j++) {

                    const chain2 = junction.chains[j];
                    const chain2Choices = chain2.start === junction
                        ? chain2.startChoices
                        : chain2.endChoices;

                    const ramp = new Chain([chainEnds[i], junction, chainEnds[j]], true);
                    chain1Choices.push(ramp);
                    chain2Choices.push(ramp);
                    ramp.startChoices.push(chain1);
                    ramp.endChoices.push(chain2);
                    this.chains.push(ramp);
                }
            }

            // truncate the non-ramp chains
            for (const chain of junction.chains) {
                if (chain.start === junction) {
                    chain.guidePosts.splice(0, truncation);
                } else {
                    chain.guidePosts.splice(-truncation, truncation);
                }
            }
        }

        // const sphereMaterial = new THREE.MeshBasicMaterial({color: 0xFFFF00});
        // for (const guidePost of guidePosts) {
        //     if (guidePost.chains.length > 0) {
        //         continue;
        //     }
        //     const sphere = new THREE.Mesh(
        //         new THREE.SphereGeometry(1),
        //         sphereMaterial
        //     );

        //     sphere.position.copy(guidePost.position);
        //     this.level.add(sphere);
        // }

        for (const chain of this.chains) {
            chain.makeSpline();
            this.level.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints( chain.spline.getPoints(15 * chain.spline.getLength()) ),
                new THREE.LineBasicMaterial( { color: Math.floor(0xFFFFFF * Math.random()) } )
            ));
        }

        const average = guidePosts.reduce(
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
        const percent = Math.random();
        const direction = Math.random() > 0.5 ? -1 : 1;
        const group = new THREE.Group();

        // const racerPointLight = new THREE.PointLight(0xFFFFFF, 50);
        // racerPointLight.position.z += 30;
        // racerPointLight.position.y -= 5;

        // group.add(racerPointLight);

        this.level.add(group);

        const randomChain = this.chains[Math.floor(Math.random() * this.chains.length)]
        const location = new PathLocation(randomChain, percent, direction, group);
        location.spheres.forEach(sphere => this.level.add(sphere));

        this.advanceShipLocation(location);

        return location;
    }

    advanceShipLocation(location, speed = 0) {
        location.advance(speed);
        location.group.position.copy(location.chain.spline.getPointAt(location.percent));

        const numSpheres = location.spheres.length;

        for (let i = 0; i < numSpheres; i++) {
            let goalPercent = location.percent + (0.05 * location.direction * (i + 1));
            let futurePosition;

            if (goalPercent > 1 || goalPercent < 0) {

                const junction = location.junction;
                const isChainReversed = junction === location.chain.end;
                const isNextChainReversed = junction === location.chosenNextChain.end;

                if (isChainReversed === isNextChainReversed) {
                    goalPercent = 1 - goalPercent;
                }

                goalPercent = modulo(goalPercent);

                // TODO: convert goal percent into distance on current chain, then to distance on next chain, then to percent on next chain
                // TODO: explain why this is annoying ( we don't have a next next chain, so we need to clamp to next chain, and consider length ratio )
                // Craig's idea: instead of using a modulo, we should decide on a direction +/- and then set the distance along the next chain in that direction (clamped to the terminus of the next chain)

                futurePosition = location.chosenNextChain.spline.getPointAt(goalPercent);
            } else {
                futurePosition = location.chain.spline.getPointAt(goalPercent);
            }

            location.spheres[i].position.copy(futurePosition);

            if (i === 0) {
                location.group.lookAt(futurePosition);
            }
        }


    }
}

class PathLocation {
    chain;
    percent;
    direction;
    group;
    junction;
    choices;
    choice;
    sphere;

    constructor(chain, percent, direction, group) {
        this.chain = chain;
        this.percent = percent;
        this.direction = direction;
        this.group = group;
        this.junction = this.direction > 0 ? chain.end : chain.start;
        this.#updateChoices();

        const sphereMaterial = new THREE.MeshBasicMaterial({color: 0xFFFF00});
        this.spheres = Array(20).fill().map(_ => new THREE.Mesh(
            new THREE.SphereGeometry(0.5),
            sphereMaterial
        ));
    }

    advance = (speed) => {

        this.percent = this.percent + (speed * this.direction) / this.chain.length;

        if (this.percent >= 0 && this.percent <= 1) {
            return;
        }

        this.chain = this.chosenNextChain;
        const chain = this.chain;
        if (this.junction === this.chain.start) {
            this.direction = 1;
            this.percent = 0;
            this.junction = this.chain.end;
        } else if (this.junction === this.chain.end) {
            this.direction = -1;
            this.percent = 1;
            this.junction = this.chain.start;
        } else {
            throw new Error("Current guidepost is missing from new chain");
        }
        this.#updateChoices();
    }

    get chosenNextChain() {
        return this.choices[this.choice];
    }

    changeDirection(newDirection) {
        newDirection = (newDirection < 0) ? -1 : 1;
        if (this.direction === newDirection) {
            return;
        }
        this.direction = newDirection;
        this.junction = this.direction > 0 ? this.chain.end : this.chain.start;
        this.#updateChoices();
    }

    #updateChoices() {
        this.choices = this.direction == -1 ? this.chain.startChoices : this.chain.endChoices;
        this.chooseNextChain();
    }

    chooseNextChain(choice = null) {
        this.choice = choice ?? Math.floor(Math.random() * this.choices.length);
    }
}
