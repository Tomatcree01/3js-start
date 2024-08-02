// Advanced 3D Julia Sets Explorer
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 1;
controls.maxDistance = 100;
controls.maxPolarAngle = Math.PI;

camera.position.set(5, 5, 5);
controls.target.set(0, 0, 0);

// Advanced Julia set parameters
const params = {
  juliaConstant: new THREE.Vector4(-0.4, 0.6, 0.3, 0.2),
  iterations: 100,
  escapeRadius: 4,
  power: 2,
  colorScheme: 'rainbow',
  marchingCubesResolution: 80,
  isoLevel: 1.0,
  animationSpeed: 0.01,
  bloomStrength: 1.5,
  bloomRadius: 0.4,
  bloomThreshold: 0.85,
  waterLevel: -2,
  waterColor: 0x001e0f,
  sunPosition: new THREE.Vector3(100, 100, 100),
};

// Shader for 4D Julia set calculation
const juliaSetVertexShader = `
  varying vec4 vPosition;
  void main() {
    vPosition = vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const juliaSetFragmentShader = `
  uniform vec4 juliaConstant;
  uniform int iterations;
  uniform float escapeRadius;
  uniform float power;
  varying vec4 vPosition;

  vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
  }

  vec2 cpow(vec2 z, float n) {
    float r = length(z);
    float theta = atan(z.y, z.x);
    return pow(r, n) * vec2(cos(n * theta), sin(n * theta));
  }

  void main() {
    vec4 z = vPosition;
    int i;
    for (i = 0; i < iterations; i++) {
      z = vec4(
        cpow(z.xy, power) + juliaConstant.xy,
        cpow(z.zw, power) + juliaConstant.zw
      );
      if (length(z) > escapeRadius) break;
    }

    float smoothColor = float(i) + 1.0 - log(log(length(z))) / log(power);
    smoothColor = sqrt(smoothColor / float(iterations));

    vec3 color = 0.5 + 0.5 * cos(6.28318 * (vec3(1.0, 2.0 / 3.0, 1.0 / 3.0) * smoothColor + vec3(0.0, 0.1, 0.2)));

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Create marching cubes for Julia set visualization
const resolution = params.marchingCubesResolution;
const material = new THREE.ShaderMaterial({
  uniforms: {
    juliaConstant: { value: params.juliaConstant },
    iterations: { value: params.iterations },
    escapeRadius: { value: params.escapeRadius },
    power: { value: params.power },
  },
  vertexShader: juliaSetVertexShader,
  fragmentShader: juliaSetFragmentShader,
});

let marchingCubes = new MarchingCubes(resolution, material, true, true, 100000);
marchingCubes.position.set(0, 0, 0);
marchingCubes.scale.set(4, 4, 4);
scene.add(marchingCubes);

// Update Julia set
function updateJuliaSet() {
  marchingCubes.reset();
  
  const webbPolynomial = (x, y, z) => {
    const c = params.juliaConstant;
    const n = params.power;
    let zx = x, zy = y, zz = z;
    
    for (let i = 0; i < params.iterations; i++) {
      const r = Math.sqrt(zx*zx + zy*zy + zz*zz);
      if (r > params.escapeRadius) return 0;
      
      const theta = Math.atan2(Math.sqrt(zy*zy + zz*zz), zx);
      const phi = Math.atan2(zz, zy);
      const rn = Math.pow(r, n);
      const newX = rn * Math.cos(n * theta);
      const newY = rn * Math.sin(n * theta) * Math.cos(n * phi);
      const newZ = rn * Math.sin(n * theta) * Math.sin(n * phi);
      
      zx = newX + c.x;
      zy = newY + c.y;
      zz = newZ + c.z;
      
      const sinTerm = 0.1 * Math.sin(zx);
      zx += c.w * sinTerm;
      zy += c.w * sinTerm;
      zz += c.w * sinTerm;
    }
    
    return 1;
  };

  let i = 0;
  for (let z = 0; z < resolution; z++) {
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const fx = (x - (resolution - 1) / 2) / ((resolution - 1) / 4);
        const fy = (y - (resolution - 1) / 2) / ((resolution - 1) / 4);
        const fz = (z - (resolution - 1) / 2) / ((resolution - 1) / 4);
        const value = webbPolynomial(fx, fy, fz);
        marchingCubes.setCell(i++, fx, fy, fz, value);
      }
    }
  }

  marchingCubes.update();
  material.uniforms.juliaConstant.value = params.juliaConstant;
  material.uniforms.iterations.value = params.iterations;
  material.uniforms.escapeRadius.value = params.escapeRadius;
  material.uniforms.power.value = params.power;
}

updateJuliaSet();

// Water setup
const waterGeometry = new THREE.PlaneGeometry(100, 100);
const water = new Water(waterGeometry, {
  textureWidth: 512,
  textureHeight: 512,
  waterNormals: new THREE.TextureLoader().load('textures/waternormals.jpg', function(texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  }),
  sunDirection: params.sunPosition.clone().normalize(),
  sunColor: 0xffffff,
  waterColor: params.waterColor,
  distortionScale: 3.7,
  fog: scene.fog !== undefined
});
water.rotation.x = -Math.PI / 2;
water.position.y = params.waterLevel;
scene.add(water);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.copy(params.sunPosition);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

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

// Custom shader pass for chromatic aberration and vignette
const customShader = {
  uniforms: {
    "tDiffuse": { value: null },
    "time": { value: 0 },
    "aberrationStrength": { value: 0.01 },
    "vignetteStrength": { value: 1.5 }
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
    uniform float aberrationStrength;
    uniform float vignetteStrength;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      
      vec2 dir = uv - 0.5;
      float dist = length(dir);
      vec2 offset = dir * (sin(dist * 50.0 - time * 2.0) + 0.5) * aberrationStrength;
      vec4 r = texture2D(tDiffuse, uv + offset);
      vec4 g = texture2D(tDiffuse, uv);
      vec4 b = texture2D(tDiffuse, uv - offset);
      
      float vignette = smoothstep(0.8, 0.1, dist * vignetteStrength);
      
      gl_FragColor = vec4(r.r, g.g, b.b, 1.0) * vignette;
    }
  `
};

const customPass = new ShaderPass(customShader);
composer.addPass(customPass);

// GUI setup
const gui = new GUI();
const juliaFolder = gui.addFolder('Julia Set');
juliaFolder.add(params.juliaConstant, 'x', -2, 2).name('Real 1').onChange(updateJuliaSet);
juliaFolder.add(params.juliaConstant, 'y', -2, 2).name('Imag 1').onChange(updateJuliaSet);
juliaFolder.add(params.juliaConstant, 'z', -2, 2).name('Real 2').onChange(updateJuliaSet);
juliaFolder.add(params.juliaConstant, 'w', -2, 2).name('Imag 2').onChange(updateJuliaSet);
juliaFolder.add(params, 'iterations', 1, 200).step(1).onChange(updateJuliaSet);
juliaFolder.add(params, 'escapeRadius', 1, 10).onChange(updateJuliaSet);
juliaFolder.add(params, 'power', 1, 5).step(0.1).onChange(updateJuliaSet);
juliaFolder.add(params, 'marchingCubesResolution', 20, 120).step(1).onChange(() => {
  scene.remove(marchingCubes);
  marchingCubes = new MarchingCubes(params.marchingCubesResolution, material, true, true, 100000);
  marchingCubes.position.set(0, 0, 0);
  marchingCubes.scale.set(4, 4, 4);
  scene.add(marchingCubes);
  updateJuliaSet();
});
juliaFolder.add(params, 'isoLevel', 0, 2).onChange(() => marchingCubes.isolation = params.isoLevel);

const renderingFolder = gui.addFolder('Rendering');
renderingFolder.add(params, 'bloomStrength', 0, 5).onChange(() => bloomPass.strength = params.bloomStrength);
renderingFolder.add(params, 'bloomRadius', 0, 1).onChange(() => bloomPass.radius = params.bloomRadius);
renderingFolder.add(params, 'bloomThreshold', 0, 1).onChange(() => bloomPass.threshold = params.bloomThreshold);
renderingFolder.add(customShader.uniforms.aberrationStrength, 'value', 0, 0.05).name('Chromatic Aberration');
renderingFolder.add(customShader.uniforms.vignetteStrength, 'value', 0, 3).name('Vignette Strength');

const environmentFolder = gui.addFolder('Environment');
environmentFolder.add(params, 'waterLevel', -10, 10).onChange(() => water.position.y = params.waterLevel);
environmentFolder.addColor(params, 'waterColor').onChange(() => water.material.uniforms.waterColor.value.setHex(params.waterColor));
environmentFolder.add(params.sunPosition, 'x', -100, 100).onChange(updateSunPosition);
environmentFolder.add(params.sunPosition, 'y', 0, 100).onChange(updateSunPosition);
environmentFolder.add(params.sunPosition, 'z', -100, 100).onChange(updateSunPosition);

function updateSunPosition() {
  directionalLight.position.copy(params.sunPosition);
  water.material.uniforms.sunDirection.value.copy(params.sunPosition).normalize();
}

// Particle system for atmospheric effect
class ParticleSystem {
  constructor(count = 5000) {
    this.count = count;
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      this.positions[i3] = (Math.random() - 0.5) * 20;
      this.positions[i3 + 1] = (Math.random() - 0.5) * 20;
      this.positions[i3 + 2] = (Math.random() - 0.5) * 20;
      this.velocities[i3] = (Math.random() - 0.5) * 0.01;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
      this.sizes[i] = Math.random() * 0.1 + 0.05;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pointTexture: { value: new THREE.TextureLoader().load('textures/particle.png') }
      },
      vertexShader: `
        uniform float time;
        attribute float size;
        varying float vSize;
        void main() {
          vSize = size;
          vec3 pos = position;
          pos += vec3(sin(time + position.x * 10.0) * 0.1,
                      cos(time + position.y * 10.0) * 0.1,
                      sin(time + position.z * 10.0) * 0.1);
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying float vSize;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          gl_FragColor = vec4(1.0, 1.0, 1.0, 0.1) * texColor;
          gl_FragColor.a *= pow(vSize, 2.0);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  update(delta) {
    const positions = this.geometry.attributes.position.array;
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      positions[i3] += this.velocities[i3] * delta * 1000;
      positions[i3 + 1] += this.velocities[i3 + 1] * delta * 1000;
      positions[i3 + 2] += this.velocities[i3 + 2] * delta * 1000;

      if (positions[i3] < -10 || positions[i3] > 10) this.velocities[i3] *= -1;
      if (positions[i3 + 1] < -10 || positions[i3 + 1] > 10) this.velocities[i3 + 1] *= -1;
      if (positions[i3 + 2] < -10 || positions[i3 + 2] > 10) this.velocities[i3 + 2] *= -1;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.material.uniforms.time.value += delta;
  }
}

const particleSystem = new ParticleSystem();
scene.add(particleSystem.points);

// Improved mouse interaction
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
  mouseX = (event.clientX - windowHalfX) / 100;
  mouseY = (event.clientY - windowHalfY) / 100;
});

// Touch controls for mobile devices
document.addEventListener('touchstart', (event) => {
  if (event.touches.length === 1) {
    event.preventDefault();
    mouseX = event.touches[0].pageX - windowHalfX;
    mouseY = event.touches[0].pageY - windowHalfY;
  }
});

document.addEventListener('touchmove', (event) => {
  if (event.touches.length === 1) {
    event.preventDefault();
    mouseX = event.touches[0].pageX - windowHalfX;
    mouseY = event.touches[0].pageY - windowHalfY;
  }
});

// Render loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // Smooth camera movement
  targetX = mouseX * .001;
  targetY = mouseY * .001;
  camera.position.x += (targetX - camera.position.x) * .05;
  camera.position.y += (-targetY - camera.position.y) * .05;
  camera.lookAt(scene.position);

  // Update Julia set parameters based on camera position
  params.juliaConstant.x = THREE.MathUtils.lerp(params.juliaConstant.x, camera.position.x * 0.1, 0.01);
  params.juliaConstant.y = THREE.MathUtils.lerp(params.juliaConstant.y, camera.position.y * 0.1, 0.01);
  updateJuliaSet();

  // Animate water
  water.material.uniforms.time.value += delta;

  // Update particle system
  particleSystem.update(delta);

  // Update custom shader uniforms
  customPass.uniforms.time.value = elapsedTime;

  // Rotate the Julia set
  marchingCubes.rotation.y += delta * 0.1;

  controls.update();
  composer.render();
}

animate();

// Window resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Load environment map
new RGBELoader()
  .setPath('textures/')
  .load('environment.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = texture;
  });

// Load decorative 3D model
const loader = new GLTFLoader();
loader.load('models/sci_fi_structure.glb', (gltf) => {
  const model = gltf.scene;
  model.position.set(0, -2, 0);
  model.scale.set(0.5, 0.5, 0.5);
  scene.add(model);

  // Add emissive material to make the model glow
  model.traverse((child) => {
    if (child.isMesh) {
      child.material.emissive = new THREE.Color(0x00ff00);
      child.material.emissiveIntensity = 0.5;
    }
  });
});

// Add interactive sound
const listener = new THREE.AudioListener();
camera.add(listener);

const sound = new THREE.PositionalAudio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('sounds/ambient.mp3', (buffer) => {
  sound.setBuffer(buffer);
  sound.setRefDistance(20);
  sound.setLoop(true);
  sound.setVolume(0.5);
});

// Add button to start audio
const audioButton = document.createElement('button');
audioButton.textContent = 'Start Audio';
audioButton.style.position = 'absolute';
audioButton.style.bottom = '20px';
audioButton.style.left = '20px';
document.body.appendChild(audioButton);

audioButton.addEventListener('click', () => {
  if (sound.isPlaying) {
    sound.pause();
    audioButton.textContent = 'Resume Audio';
  } else {
    sound.play();
    audioButton.textContent = 'Pause Audio';
  }
});

marchingCubes.add(sound);

// Add VR support
renderer.xr.enabled = true;
document.body.appendChild(VRButton.createButton(renderer));

// Performance monitoring
const stats = new Stats();
document.body.appendChild(stats.dom);

// Implement a simple physics system for floating objects
class FloatingObject {
  constructor(mesh, amplitude = 0.1, frequency = 1) {
    this.mesh = mesh;
    this.amplitude = amplitude;
    this.frequency = frequency;
    this.initialY = mesh.position.y;
    this.time = Math.random() * Math.PI * 2;
  }

  update(delta) {
    this.time += delta * this.frequency;
    this.mesh.position.y = this.initialY + Math.sin(this.time) * this.amplitude;
  }
}

const floatingObjects = [];

// Create some floating crystals
for (let i = 0; i < 10; i++) {
  const geometry = new THREE.OctahedronGeometry(0.2, 0);
  const material = new THREE.MeshPhongMaterial({ 
    color: 0x00ffff, 
    emissive: 0x0088ff,
    shininess: 100,
    transparent: true,
    opacity: 0.7
  });
  const crystal = new THREE.Mesh(geometry, material);
  crystal.position.set(
    (Math.random() - 0.5) * 10,
    Math.random() * 5,
    (Math.random() - 0.5) * 10
  );
  scene.add(crystal);
  floatingObjects.push(new FloatingObject(crystal, 0.2, 0.5 + Math.random()));
}

// Update floating objects in the animation loop
// TODO: Implement this and other physics-related functions
function updateFloatingObjects(delta) {
  floatingObjects.forEach((obj, index) => {
    obj.update(delta);
    
    // Add subtle rotation to each object
    obj.rotation.x += 0.001 * Math.sin(Date.now() * 0.001 + index);
    obj.rotation.y += 0.001 * Math.cos(Date.now() * 0.001 + index);
    
    // Add subtle oscillation to position
    obj.position.y += Math.sin(Date.now() * 0.002 + index * 0.5) * 0.01;
    
    // Check if object is out of bounds and reset if necessary
    if (obj.position.y > 10 || obj.position.y < -10) {
      obj.position.y = 0;
    }
  });
}

console.log("Advanced 3D Julia Sets Explorer loaded successfully!");