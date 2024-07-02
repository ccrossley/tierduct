import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import "color-scheme";

function loadGLTF(url){ return new Promise(resolve => new GLTFLoader().load(url, resolve));}

function clamp(x, minVal, maxVal) {
    if (maxVal < minVal) {
        [maxVal, minVal] = [minVal, maxVal];
    }
    return Math.max(minVal, Math.min(maxVal, x));
}

function clamp01(x) { return clamp(x, 0, 1)}

function modulo(n, m = 1) { return ((n % m) + m) % m }

function getColorHarmony(baseColor, schemeName, variation = "hard", distance = 1) {
    var scheme = new ColorScheme;
    scheme.from_hue(baseColor).scheme(schemeName)
        .variation(variation)
        .distance(distance)
        .add_complement(true);

    const lightColors = scheme.colors();

    return lightColors.map(color => new THREE.Color(parseInt(`0x${color}`)));
}

export {loadGLTF, modulo, clamp01, clamp, getColorHarmony};
