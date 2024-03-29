import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function loadGLTF(url){ return new Promise(resolve => new GLTFLoader().load(url, resolve));}

function clamp(x, minVal, maxVal) {
    if (maxVal < minVal) {
        [maxVal, minVal] = [minVal, maxVal];
    }
    return Math.max(minVal, Math.min(maxVal, x));
}

function clamp01(x) { return clamp(x, 0, 1)}

function modulo(n, m) { return ((n % m) + m) % m }

export {loadGLTF, modulo, clamp01, clamp};