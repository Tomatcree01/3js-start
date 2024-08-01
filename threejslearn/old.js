import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from "https://cdn.jsdelivr.net/npm/three@0.128/examples/jsm/libs/stats.module.js";
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Orbit controls for smooth camera movement
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

// Set initial camera position
camera.position.z = 50;

// Julia set parameters
let params = {
  realPart: 0,
  imagPart: 0,
  iterations: 8,
  colorScheme: 'rainbow',
  backgroundColor: 'black',
  customColor1: '#ff0000',
  customColor2: '#00ff00',
  pulseSpeed: 1,
};

// Create geometry for the Julia set
const geometry = new THREE.BufferGeometry();
const positions = [];
const colors = [];

const size = 100;
const segments = 200;

for (let i = 0; i <= segments; i++) {
  for (let j = 0; j <= segments; j++) {
    const x = (i / segments - 0.5) * size;
    const y = (j / segments - 0.5) * size;
    positions.push(x, y, 0);
    colors.push(0, 0, 0);
  }
}

geometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(positions, 3)
);
geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

// Create material for the points
const material = new THREE.PointsMaterial({
  size: 0.1,
  vertexColors: true,
});

// Create points and add to the scene
const points = new THREE.Points(geometry, material);
scene.add(points);

// Julia set calculation
function julia(x, y, real, imag, maxIterations) {
  let zx = x;
  let zy = y;
  let iteration = 0;

  while (zx * zx + zy * zy < 4 && iteration < maxIterations) {
    const xtemp = zx * zx - zy * zy + real;
    zy = 2 * zx * zy + imag;
    zx = xtemp;
    iteration++;
  }

  return iteration;
}

// Color schemes
const colorSchemes = {
  rainbow: (t) => new THREE.Color(`hsl(${t * 360}, 100%, 50%)`),
  fire: (t) => new THREE.Color(t * 1.5, t * t, t * 0.5),
  ocean: (t) => new THREE.Color(0, t, 1 - t * 0.5),
  night: (t) => new THREE.Color(0, 0, t * 0.5),
  custom: (t) => {
    const color1 = new THREE.Color(params.customColor1);
    const color2 = new THREE.Color(params.customColor2);
    return color1.lerp(color2, t);
  },
};

// Update Julia set
function updateJuliaSet() {
  const positions = geometry.attributes.position.array;
  const colors = geometry.attributes.color.array;

  for (let i = 0; i < positions.length; i += 3) {
    const x = (positions[i] / size) * 4;
    const y = (positions[i + 1] / size) * 4;

    const iteration = julia(
      x,
      y,
      params.realPart,
      params.imagPart,
      params.iterations
    );
    const t = iteration / params.iterations;
    
    const color = colorSchemes[params.colorScheme](t);

    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;

    positions[i + 2] = t * 5;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
}

// Window resize handler
window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// GUI setup
const gui = new GUI();
gui.add(params, "realPart", -1, 1).onChange(updateJuliaSet);
gui.add(params, "imagPart", -1, 1).onChange(updateJuliaSet);
gui.add(params, "iterations", 1, 50).step(1).onChange(updateJuliaSet);
gui.add(params, "colorScheme", [...Object.keys(colorSchemes)]).onChange(updateJuliaSet);
gui.addColor(params, "backgroundColor").onChange(updateBackground);
gui.addColor(params, "customColor1").onChange(updateJuliaSet);
gui.addColor(params, "customColor2").onChange(updateJuliaSet);
gui.add(params, "pulseSpeed", 0.1, 5).step(0.1);

// Update background color
function updateBackground() {
  scene.background = new THREE.Color(params.backgroundColor);
}

// Initial updates
updateJuliaSet();
updateBackground();

// Lighting setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Starfield background
function createStarfield() {
  const starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  });

  const starVertices = [];
  for (let i = 0; i < 10000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starVertices.push(x, y, z);
  }

  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starVertices, 3)
  );
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}

createStarfield();

// Particle system
function createParticleSystem() {
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesCnt = 5000;
  const posArray = new Float32Array(particlesCnt * 3);

  for (let i = 0; i < particlesCnt * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 100;
  }

  particlesGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(posArray, 3)
  );

  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.05,
    transparent: true,
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
  });

  const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particlesMesh);

  return particlesMesh;
}

const particles = createParticleSystem();

// Animate particles
let time = 0;
function animateParticles() {
  const positions = particles.geometry.attributes.position.array;

  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += Math.sin(time + i) * 0.01;
    positions[i + 1] += Math.cos(time + i) * 0.01;
    positions[i + 2] += Math.sin(time + i) * 0.01;
  }

  particles.geometry.attributes.position.needsUpdate = true;
}

// Mouse interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(points);

  if (intersects.length > 0) {
    const intersect = intersects[0];
    const index = intersect.index;

    const positions = geometry.attributes.position.array;
    const colors = geometry.attributes.color.array;

    positions[index * 3 + 2] += 0.1;
    colors[index * 3] = 1;
    colors[index * 3 + 1] = 1;
    colors[index * 3 + 2] = 1;

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }
}

window.addEventListener("mousemove", onMouseMove, false);

// Explosion effect
function explode() {
  const positions = geometry.attributes.position.array;
  const colors = geometry.attributes.color.array;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    const distance = Math.sqrt(x * x + y * y + z * z);
    const force = 1 / (1 + distance * distance);

    positions[i] += x * force * 2;
    positions[i + 1] += y * force * 2;
    positions[i + 2] += z * force * 2;

    colors[i] = Math.random();
    colors[i + 1] = Math.random();
    colors[i + 2] = Math.random();
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
}

window.addEventListener("dblclick", explode, false);

// Performance monitoring
const stats = new Stats();
document.body.appendChild(stats.dom);

// Pulsating effect
function pulsate() {
  const positions = geometry.attributes.position.array;
  const scale = Math.sin(time * params.pulseSpeed) * 0.5 + 1;

  for (let i = 0; i < positions.length; i += 3) {
    positions[i] *= scale;
    positions[i + 1] *= scale;
    positions[i + 2] *= scale;
  }

  geometry.attributes.position.needsUpdate = true;
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  animateParticles();
  pulsate();
  time += 0.01;
  renderer.render(scene, camera);
  // stats.update();
}

animate();



// Hey, if you've made it this far, you're awesome! This code creates a mesmerizing 
// Julia set visualization with some cool extras. Feel free to play around with the 
// parameters and see what crazy fractals you can create. The math might look 
// intimidating, but it's just a bunch of iterations and pretty colors. Have fun!