import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { Refractor } from 'three/examples/jsm/objects/Refractor.js';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// OrbitControls for better navigation
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 1;
controls.maxDistance = 100;
controls.maxPolarAngle = Math.PI;

// Set initial camera position
camera.position.set(10, 10, 10);
controls.target.set(0, 0, 0);

// Advanced Julia set parameters
const params = {
  realPart: -0.4,
  imagPart: 0.6,
  iterations: 50,
  colorScheme: 'rainbow',
  backgroundColor: '#000000',
  customColor1: '#ff0000',
  customColor2: '#00ff00',
  customColor3: '#0000ff',
  customColor4: '#ffff00',
  bloomStrength: 1.5,
  bloomRadius: 0.4,
  bloomThreshold: 0.85,
  quality: 1,
  shape: 'sphere',
  shapeSize: 2,
  animationSpeed: 0.01,
  reflectivity: 0.5,
  refractivity: 0.5,
  lensFlareIntensity: 1,
  fogDensity: 0.01,
  particleCount: 1000,
  particleSize: 0.05,
  lightIntensity: 1,
};

// Create geometry for the 3D Julia set
let geometry, positions, colors;
let points;

function createGeometry() {
  switch (params.shape) {
    case 'sphere':
      geometry = new THREE.SphereGeometry(params.shapeSize, Math.floor(100 * params.quality), Math.floor(100 * params.quality));
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(params.shapeSize, params.shapeSize / 3, Math.floor(100 * params.quality), Math.floor(100 * params.quality));
      break;
    case 'knot':
      geometry = new THREE.TorusKnotGeometry(params.shapeSize, params.shapeSize / 3, Math.floor(200 * params.quality), Math.floor(50 * params.quality));
      break;
    default:
      geometry = new THREE.SphereGeometry(params.shapeSize, Math.floor(100 * params.quality), Math.floor(100 * params.quality));
  }

  positions = geometry.attributes.position.array;
  colors = new Float32Array(positions.length);

  // Create material for the points
  const material = new THREE.PointsMaterial({
    size: 0.02,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
  });

  // Create points and add to the scene
  if (points) scene.remove(points);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  points = new THREE.Points(geometry, material);
  scene.add(points);
}

createGeometry();

// 3D Julia set calculation
const julia3D = (x, y, z, real, imag, maxIterations) => {
  let zx = x;
  let zy = y;
  let zz = z;
  let iteration = 0;

  while (zx * zx + zy * zy + zz * zz < 4 && iteration < maxIterations) {
    const xtemp = zx * zx - zy * zy - zz * zz + real;
    const ytemp = 2 * zx * zy + imag;
    zz = 2 * zx * zz;
    zx = xtemp;
    zy = ytemp;
    iteration++;
  }

  return iteration;
};

// Advanced color schemes
const colorSchemes = {
  rainbow: (t) => new THREE.Color(`hsl(${t * 360}, 100%, 50%)`),
  fire: (t) => new THREE.Color(t * 1.5, t * t, t * 0.5),
  ocean: (t) => new THREE.Color(0, t, 1 - t * 0.5),
  night: (t) => new THREE.Color(t * 0.2, t * 0.1, t * 0.5),
  custom: (t) => {
    const color1 = new THREE.Color(params.customColor1);
    const color2 = new THREE.Color(params.customColor2);
    const color3 = new THREE.Color(params.customColor3);
    const color4 = new THREE.Color(params.customColor4);
    if (t < 0.33) {
      return color1.lerp(color2, t * 3);
    } else if (t < 0.66) {
      return color2.lerp(color3, (t - 0.33) * 3);
    } else {
      return color3.lerp(color4, (t - 0.66) * 3);
    }
  },
};

// Update Julia set
const updateJuliaSet = () => {
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    const iteration = julia3D(x, y, z, params.realPart, params.imagPart, params.iterations);
    const t = iteration / params.iterations;

    const color = colorSchemes[params.colorScheme](t);

    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;
  }

  geometry.attributes.color.needsUpdate = true;
};

// Window resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Advanced GUI setup
const gui = new GUI();
const juliaFolder = gui.addFolder('Julia Set');
juliaFolder.add(params, 'realPart', -2, 2).onChange(updateJuliaSet);
juliaFolder.add(params, 'imagPart', -2, 2).onChange(updateJuliaSet);
juliaFolder.add(params, 'iterations', 1, 200).step(1).onChange(updateJuliaSet);
juliaFolder.add(params, 'colorScheme', Object.keys(colorSchemes)).onChange(updateJuliaSet);
juliaFolder.addColor(params, 'backgroundColor').onChange(() => {
  scene.background = new THREE.Color(params.backgroundColor);
});
const customColorFolder = juliaFolder.addFolder('Custom Colors');
customColorFolder.addColor(params, 'customColor1').onChange(updateJuliaSet);
customColorFolder.addColor(params, 'customColor2').onChange(updateJuliaSet);
customColorFolder.addColor(params, 'customColor3').onChange(updateJuliaSet);
customColorFolder.addColor(params, 'customColor4').onChange(updateJuliaSet);

const bloomFolder = gui.addFolder('Bloom');
bloomFolder.add(params, 'bloomStrength', 0, 5).onChange(() => {
  bloomPass.strength = params.bloomStrength;
});
bloomFolder.add(params, 'bloomRadius', 0, 1).onChange(() => {
  bloomPass.radius = params.bloomRadius;
});
bloomFolder.add(params, 'bloomThreshold', 0, 1).onChange(() => {
  bloomPass.threshold = params.bloomThreshold;
});

const shapeFolder = gui.addFolder('Shape');
shapeFolder.add(params, 'shape', ['sphere', 'torus', 'knot']).onChange(() => {
  createGeometry();
  updateJuliaSet();
});
shapeFolder.add(params, 'shapeSize', 0.5, 5).onChange(() => {
  createGeometry();
  updateJuliaSet();
});
shapeFolder.add(params, 'quality', 0.1, 1).step(0.1).onChange(() => {
  createGeometry();
  updateJuliaSet();
});

const effectsFolder = gui.addFolder('Effects');
effectsFolder.add(params, 'animationSpeed', 0, 0.1);
effectsFolder.add(params, 'reflectivity', 0, 1);
effectsFolder.add(params, 'refractivity', 0, 1);
effectsFolder.add(params, 'lensFlareIntensity', 0, 5);
effectsFolder.add(params, 'fogDensity', 0, 0.1).onChange(() => {
  scene.fog.density = params.fogDensity;
});
effectsFolder.add(params, 'particleCount', 0, 10000).step(100).onChange(createParticles);
effectsFolder.add(params, 'particleSize', 0.01, 0.1).onChange(() => {
  if (particles) particles.material.size = params.particleSize;
});
effectsFolder.add(params, 'lightIntensity', 0, 5).onChange(() => {
  directionalLight.intensity = params.lightIntensity;
});

// Reset button
gui.add({ reset: function() {
  // Reset all parameters to their default values
  Object.assign(params, {
    realPart: -0.4,
    imagPart: 0.6,
    iterations: 50,
    colorScheme: 'redish',
    backgroundColor: '#000000',
    customColor1: '#ff0000',
    customColor2: '#00ff00',
    customColor3: '#0000ff',
    customColor4: '#ffff00',
    bloomStrength: 1.5,
    bloomRadius: 0.4,
    bloomThreshold: 0.85,
    quality: 1,
    shape: 'sphere',
    shapeSize: 2,
    animationSpeed: 0.01,
    reflectivity: 0.5,
    refractivity: 0.5,
    lensFlareIntensity: 1,
    fogDensity: 0.01,
    particleCount: 1000,
    particleSize: 0.05,
    lightIntensity: 1,
  });

  // Update all affected components
  try {
    updateJuliaSet();
  } catch (error) {
    console.error("Error updating Julia Set:", error);
  }

  scene.background = new THREE.Color(params.backgroundColor);
  bloomPass.strength = params.bloomStrength;
  bloomPass.radius = params.bloomRadius;
  bloomPass.threshold = params.bloomThreshold;
  
  try {
    createGeometry();
  } catch (error) {
    console.error("Error creating geometry:", error);
  }

  if (scene.fog) {
    scene.fog.density = params.fogDensity;
  }

  try {
    createParticles();
  } catch (error) {
    console.error("Error creating particles:", error);
  }

  if (directionalLight) {
    directionalLight.intensity = params.lightIntensity;
  }

  // Reset camera position
  camera.position.set(10, 10, 10);
  controls.target.set(0, 0, 0);
  controls.update();

  // Update GUI
  for (let i in gui.__folders) {
    const folder = gui.__folders[i];
    for (let j in folder.__controllers) {
      folder.__controllers[j].updateDisplay();
    }
  }
} }, 'reset');

// Initial updates
updateJuliaSet();
scene.background = new THREE.Color(params.backgroundColor);

// Advanced lighting setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, params.lightIntensity);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

// Performance monitoring
const stats = new Stats();
document.body.appendChild(stats.dom);

// Post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  params.bloomStrength,
  params.bloomRadius,
  params.bloomThreshold
);
composer.addPass(bloomPass);

// Custom shader pass
const customShader = {
  uniforms: {
    "tDiffuse": { value: null },
    "time": { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      color.rgb *= 0.8 + 0.2 * sin(vUv.x * 10.0 + time);
      gl_FragColor = color;
    }
  `
};

const customPass = new ShaderPass(customShader);
composer.addPass(customPass);

// Reflector and Refractor setup
const reflectorGeometry = new THREE.PlaneGeometry(10, 10);
const reflector = new Reflector(reflectorGeometry, {
  clipBias: 0.003,
  textureWidth: window.innerWidth * window.devicePixelRatio,
  textureHeight: window.innerHeight * window.devicePixelRatio,
  color: 0x777777,
});
reflector.position.y = -1;
reflector.rotateX(-Math.PI / 2);
scene.add(reflector);

const refractorGeometry = new THREE.PlaneGeometry(10, 10);
const refractor = new Refractor(refractorGeometry, {
  color: 0x999999,
});
refractor.position.y = -1.1;
refractor.rotateX(-Math.PI / 2);
scene.add(refractor);

// Lensflare setup
const lensflare = new Lensflare();
lensflare.addElement(new LensflareElement(new THREE.TextureLoader().load('textures/lensflare0.png'), 512, 0));
lensflare.addElement(new LensflareElement(new THREE.TextureLoader().load('textures/lensflare3.png'), 60, 0.6));
lensflare.addElement(new LensflareElement(new THREE.TextureLoader().load('textures/lensflare3.png'), 70, 0.7));
lensflare.addElement(new LensflareElement(new THREE.TextureLoader().load('textures/lensflare3.png'), 120, 0.9));
lensflare.addElement(new LensflareElement(new THREE.TextureLoader().load('textures/lensflare3.png'), 70, 1));
scene.add(lensflare);

// Particle system
let particles;

function createParticles() {
  if (particles) scene.remove(particles);

  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(params.particleCount * 3);
  const particleColors = new Float32Array(params.particleCount * 3);

  for (let i = 0; i < params.particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 20;
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 20;

    const color = new THREE.Color(Math.random(), Math.random(), Math.random());
    particleColors[i * 3] = color.r;
    particleColors[i * 3 + 1] = color.g;
    particleColors[i * 3 + 2] = color.b;
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

  const particleMaterial = new THREE.PointsMaterial({
    size: params.particleSize,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
  });

  particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);
}

createParticles();

// Fog setup
scene.fog = new THREE.FogExp2(params.backgroundColor, params.fogDensity);

// Animation loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // Update custom shader time uniform
  customPass.uniforms.time.value = elapsedTime;

  // Update Julia set animation
  params.realPart += params.animationSpeed * delta;
  params.imagPart += params.animationSpeed * delta;
  updateJuliaSet();

  // Update controls
  controls.update();

  // Render scene with composer
  composer.render();

  // Update stats
  stats.update();
}

animate();

// Load GLTF model
const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
gltfLoader.setDRACOLoader(dracoLoader);

gltfLoader.load('Back_to_the_future_time_machine_DeLorean_.glb', (gltf) => {
  const model = gltf.scene;
  model.position.set(0, -5, 0);
  scene.add(model);
}, undefined, (error) => {
  console.error('An error happened while loading the GLTF model', error);
});

// Load HDR environment map
const rgbeLoader = new RGBELoader();
rgbeLoader.load('map.hdr', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.background = texture;
});

// Helper for vertex normals
const vertexNormalsHelper = new VertexNormalsHelper(points, 0.1, 0xff0000);
scene.add(vertexNormalsHelper);

// Add more GUI controls if needed
// ...

// End of the script
