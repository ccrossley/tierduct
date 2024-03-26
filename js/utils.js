import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadGLTF(url){ return new Promise(resolve => new GLTFLoader().load(url, resolve));}