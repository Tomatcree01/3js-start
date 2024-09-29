import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
//yes I know this is a bad idea but I'm just trying to get this to work
import * as TWEEN from 'tween/tween.js';


// Initialize the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e1e1e);

// Initialize the camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 0, 100);

// Initialize the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Initialize OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 30;
controls.maxDistance = 200;

// Add ambient and point lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 0.8);
camera.add(pointLight);
scene.add(camera);

// Neural network parameters
const layers = [
    { size: 5, type: 'input' },
    { size: 10, type: 'hidden' },
    { size: 7, type: 'hidden' },
    { size: 10, type: 'hidden' },
    { size: 5, type: 'output' }
];
const layerDistance = 20;
const nodeDistance = 4;
const nodeRadius = 1;
const nodes = [];
const connections = [];

// Define colors for different layer types
const layerColors = {
    input: 0x1abc9c,
    hidden: 0x3498db,
    output: 0xe74c3c
};

// Create node materials based on layer type
const nodeMaterials = layers.map(layer => {
    return new THREE.MeshPhongMaterial({
        color: layerColors[layer.type],
        emissive: 0x000000,
        shininess: 50
    });
});

// Create nodes for each layer
for (let i = 0; i < layers.length; i++) {
    const layerNodes = [];
    for (let j = 0; j < layers[i].size; j++) {
        const geometry = new THREE.SphereGeometry(nodeRadius, 32, 32);
        const material = nodeMaterials[i];
        const node = new THREE.Mesh(geometry, material);
        node.position.x = (i - (layers.length - 1) / 2) * layerDistance;
        node.position.y = (j - (layers[i].size - 1) / 2) * nodeDistance;
        node.userData = { layer: i, index: j, type: layers[i].type };
        scene.add(node);
        layerNodes.push(node);
    }
    nodes.push(layerNodes);
}

// Create connections between nodes
for (let i = 0; i < nodes.length - 1; i++) {
    const currentLayer = nodes[i];
    const nextLayer = nodes[i + 1];
    for (let j = 0; j < currentLayer.length; j++) {
        for (let k = 0; k < nextLayer.length; k++) {
            const weight = Math.random() * 2 - 1; // Random weight between -1 and 1
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array([
                currentLayer[j].position.x, currentLayer[j].position.y, currentLayer[j].position.z,
                nextLayer[k].position.x, nextLayer[k].position.y, nextLayer[k].position.z
            ]);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const material = new THREE.LineBasicMaterial({
                color: weight > 0 ? 0x00ff00 : 0xff0000,
                linewidth: Math.abs(weight) * 2,
                transparent: true,
                opacity: Math.abs(weight)
            });

            const line = new THREE.Line(geometry, material);
            line.userData = { weight };
            scene.add(line);
            connections.push(line);
        }
    }
}

// Load font and add labels to nodes
const fontLoader = new FontLoader();
const fontUrl = 'fonts/helvetiker_regular.typeface.json'; // Ensure the font file is in the correct path

fontLoader.load(
    fontUrl,
    function (font) {
        for (let i = 0; i < nodes.length; i++) {
            const layerNodes = nodes[i];
            for (let j = 0; j < layerNodes.length; j++) {
                const node = layerNodes[j];
                const textGeometry = new TextGeometry(`L${i}N${j}`, {
                    font: font,
                    size: 0.5,
                    height: 0.05,
                    curveSegments: 12
                });
                const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
                const label = new THREE.Mesh(textGeometry, textMaterial);
                label.position.copy(node.position);
                label.position.x += nodeRadius + 0.5;
                label.position.y += 0.5;
                scene.add(label);
            }
        }
    },
    undefined,
    function (error) {
        console.error('An error occurred while loading the font:', error);
    }
);

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let INTERSECTED = null;

// Event listener for mouse movement
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}
window.addEventListener('mousemove', onMouseMove, false);

// Function to animate weights (simulating training)
function updateWeights() {
    connections.forEach((line, index) => {
        const baseWeight = line.userData.weight;
        // Simulate weight fluctuation
        const fluctuatedWeight = baseWeight + Math.sin(Date.now() * 0.001 + index) * 0.1;
        const clampedWeight = THREE.MathUtils.clamp(fluctuatedWeight, -1, 1);
        line.userData.weight = clampedWeight;

        // Update line color and opacity based on weight
        line.material.color.setHex(clampedWeight > 0 ? 0x00ff00 : 0xff0000);
        line.material.opacity = Math.abs(clampedWeight);
        line.material.linewidth = Math.abs(clampedWeight) * 2;
    });
}

// Function to handle node activation animation
function activateNode(node) {
    const initialScale = node.scale.clone();
    const targetScale = initialScale.clone().multiplyScalar(1.5);

    new TWEEN.Tween(node.scale)
        .to({ x: targetScale.x, y: targetScale.y, z: targetScale.z }, 300)
        .easing(TWEEN.Easing.Elastic.Out)
        .yoyo(true)
        .repeat(1)
        .start();
}

// Function to simulate activation flow (forward pass)
function simulateActivationFlow() {
    nodes.forEach((layer, layerIndex) => {
        setTimeout(() => {
            layer.forEach(node => {
                activateNode(node);
            });
        }, layerIndex * 500); // Delay based on layer index
    });
}

// Function to display node information
function displayNodeInfo(node) {
    const infoBox = document.getElementById('info-box');
    if (!infoBox) {
        const div = document.createElement('div');
        div.id = 'info-box';
        div.style.position = 'absolute';
        div.style.bottom = '20px';
        div.style.left = '50%';
        div.style.transform = 'translateX(-50%)';
        div.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        div.style.color = '#fff';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.fontSize = '14px';
        div.style.pointerEvents = 'none';
        document.body.appendChild(div);
    }

    if (node) {
        const div = document.getElementById('info-box');
        div.innerHTML = `<strong>Node Info</strong><br>Layer: ${node.userData.layer}<br>Index: ${node.userData.index}<br>Type: ${node.userData.type}`;
    } else {
        const div = document.getElementById('info-box');
        div.innerHTML = '';
    }
}

// Animation loop
function animate(time) {
    requestAnimationFrame(animate);

    // Update controls
    controls.update();

    // Update weights
    updateWeights();

    // Handle raycasting for interaction
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodes.flat());

    if (intersects.length > 0) {
        if (INTERSECTED !== intersects[0].object) {
            if (INTERSECTED) {
                INTERSECTED.material.emissive.setHex(0x000000);
            }
            INTERSECTED = intersects[0].object;
            INTERSECTED.material.emissive.setHex(0xffff00);
            displayNodeInfo(INTERSECTED);
        }
    } else {
        if (INTERSECTED) {
            INTERSECTED.material.emissive.setHex(0x000000);
        }
        INTERSECTED = null;
        displayNodeInfo(null);
    }

    // Update TWEEN animations
    TWEEN.update(time);

    // Render the scene
    renderer.render(scene, camera);
}
animate();

// Handle window resizing
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize, false);

// Add GUI controls (basic example, can be expanded)
const guiContainer = document.createElement('div');
guiContainer.id = 'gui-container';
guiContainer.style.position = 'absolute';
guiContainer.style.top = '20px';
guiContainer.style.right = '20px';
guiContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
guiContainer.style.padding = '10px';
guiContainer.style.borderRadius = '5px';
guiContainer.style.color = '#fff';
guiContainer.style.fontFamily = 'Arial, sans-serif';
guiContainer.style.zIndex = '100';
document.body.appendChild(guiContainer);

// Rotation Speed Control
const rotationSpeedLabel = document.createElement('label');
rotationSpeedLabel.textContent = 'Rotation Speed';
const rotationSpeedSlider = document.createElement('input');
rotationSpeedSlider.type = 'range';
rotationSpeedSlider.min = '0';
rotationSpeedSlider.max = '0.05';
rotationSpeedSlider.step = '0.001';
rotationSpeedSlider.value = '0.002';
rotationSpeedSlider.style.width = '100%';
rotationSpeedLabel.appendChild(rotationSpeedSlider);
guiContainer.appendChild(rotationSpeedLabel);

// Zoom Speed Control
const zoomSpeedLabel = document.createElement('label');
zoomSpeedLabel.textContent = 'Zoom Speed';
const zoomSpeedSlider = document.createElement('input');
zoomSpeedSlider.type = 'range';
zoomSpeedSlider.min = '0.5';
zoomSpeedSlider.max = '2.0';
zoomSpeedSlider.step = '0.1';
zoomSpeedSlider.value = '1.0';
zoomSpeedSlider.style.width = '100%';
zoomSpeedLabel.appendChild(zoomSpeedSlider);
guiContainer.appendChild(zoomSpeedLabel);

// Show Connections Control
const showConnectionsLabel = document.createElement('label');
showConnectionsLabel.textContent = 'Show Connections';
const showConnectionsCheckbox = document.createElement('input');
showConnectionsCheckbox.type = 'checkbox';
showConnectionsCheckbox.checked = true;
showConnectionsLabel.appendChild(showConnectionsCheckbox);
guiContainer.appendChild(showConnectionsLabel);

// Event listeners for GUI controls
rotationSpeedSlider.addEventListener('input', (event) => {
    const speed = parseFloat(event.target.value);
    scene.rotation.y = speed;
});

zoomSpeedSlider.addEventListener('input', (event) => {
    const speed = parseFloat(event.target.value);
    controls.zoomSpeed = speed;
});

showConnectionsCheckbox.addEventListener('change', (event) => {
    const isVisible = event.target.checked;
    connections.forEach(line => {
        line.visible = isVisible;
    });
});

// Advanced Features

// Function to visualize gradients (simulated)
function visualizeGradients() {
    connections.forEach((line, index) => {
        const gradientMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            opacity: 0.5,
            transparent: true
        });
        const gradientGeometry = new THREE.BufferGeometry();
        const positions = line.geometry.attributes.position.array;
        gradientGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const gradientLine = new THREE.Line(gradientGeometry, gradientMaterial);
        gradientLine.userData = { originalLine: line };
        scene.add(gradientLine);
        // Animate gradient
        new TWEEN.Tween(gradientMaterial)
            .to({ opacity: 1.0 }, 1000)
            .yoyo(true)
            .repeat(Infinity)
            .start();
    });
}

// Uncomment the following line to visualize gradients
// visualizeGradients();

// Function to dynamically add layers (for educational purposes)
function addLayer(size, type) {
    const i = layers.length;
    layers.push({ size, type });

    // Create new layer nodes
    const layerNodes = [];
    for (let j = 0; j < size; j++) {
        const geometry = new THREE.SphereGeometry(nodeRadius, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: layerColors[type],
            emissive: 0x000000,
            shininess: 50
        });
        const node = new THREE.Mesh(geometry, material);
        node.position.x = (i - (layers.length - 1) / 2) * layerDistance;
        node.position.y = (j - (size - 1) / 2) * nodeDistance;
        node.userData = { layer: i, index: j, type };
        scene.add(node);
        layerNodes.push(node);
    }
    nodes.push(layerNodes);

    // Create connections from the previous layer
    const previousLayer = nodes[i - 1];
    const newLayer = nodes[i];
    previousLayer.forEach((prevNode, prevIndex) => {
        newLayer.forEach((newNode, newIndex) => {
            const weight = Math.random() * 2 - 1;
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array([
                prevNode.position.x, prevNode.position.y, prevNode.position.z,
                newNode.position.x, newNode.position.y, newNode.position.z
            ]);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const material = new THREE.LineBasicMaterial({
                color: weight > 0 ? 0x00ff00 : 0xff0000,
                linewidth: Math.abs(weight) * 2,
                transparent: true,
                opacity: Math.abs(weight)
            });

            const line = new THREE.Line(geometry, material);
            line.userData = { weight };
            scene.add(line);
            connections.push(line);
        });
    });

    // Add labels to new nodes
    fontLoader.load(
        fontUrl,
        function (font) {
            for (let j = 0; j < newLayer.length; j++) {
                const node = newLayer[j];
                const textGeometry = new TextGeometry(`L${i}N${j}`, {
                    font: font,
                    size: 0.5,
                    height: 0.05,
                    curveSegments: 12
                });
                const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
                const label = new THREE.Mesh(textGeometry, textMaterial);
                label.position.copy(node.position);
                label.position.x += nodeRadius + 0.5;
                label.position.y += 0.5;
                scene.add(label);
            }
        },
        undefined,
        function (error) {
            console.error('An error occurred while loading the font:', error);
        }
    );
}

// Example: Dynamically add a hidden layer after 5 seconds
setTimeout(() => {
    addLayer(8, 'hidden');
}, 5000);

// Function to simulate backpropagation (for visualization purposes)
function simulateBackpropagation() {
    connections.forEach((line, index) => {
        new TWEEN.Tween(line.material)
            .to({ color: 0x0000ff, linewidth: 4 }, 500)
            .easing(TWEEN.Easing.Cubic.Out)
            .yoyo(true)
            .repeat(1)
            .start();
    });
}

// Example: Trigger backpropagation simulation on double-click
window.addEventListener('dblclick', simulateBackpropagation, false);

// Function to display activation levels on nodes
function updateActivationLevels() {
    nodes.forEach(layer => {
        layer.forEach(node => {
            const activation = Math.random(); // Simulated activation value between 0 and 1
            node.material.emissive.setHSL(activation * 0.3, 1.0, 0.5);
        });
    });
}

// Example: Update activation levels every second
setInterval(updateActivationLevels, 1000);

// Advanced Feature: Highlight paths with high weights
function highlightHighWeightConnections(threshold = 0.8) {
    connections.forEach(line => {
        if (Math.abs(line.userData.weight) > threshold) {
            line.material.color.setHex(0xffff00); // Highlight color
            line.material.opacity = 1.0;
        } else {
            // Reset to original based on weight
            line.material.color.setHex(line.userData.weight > 0 ? 0x00ff00 : 0xff0000);
            line.material.opacity = Math.abs(line.userData.weight);
        }
    });
}

// Example: Highlight high-weight connections every 3 seconds
setInterval(() => {
    highlightHighWeightConnections(0.8);
}, 3000);

// Function to reset connection highlights
function resetConnectionHighlights() {
    connections.forEach(line => {
        line.material.color.setHex(line.userData.weight > 0 ? 0x00ff00 : 0xff0000);
        line.material.opacity = Math.abs(line.userData.weight);
    });
}

// Example: Reset highlights after 1 second
setInterval(resetConnectionHighlights, 3500);

// Function to visualize activation flow using particle system
const particleCount = 1000;
const particlesGeometry = new THREE.BufferGeometry();
const particlesMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    transparent: true,
    opacity: 0.7
});
const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);

const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

function emitParticles() {
    for (let i = 0; i < particleCount; i++) {
        const layerIndex = Math.floor(Math.random() * layers.length);
        const nodeIndex = Math.floor(Math.random() * layers[layerIndex].size);
        const node = nodes[layerIndex][nodeIndex];
        const direction = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        );
        const velocity = direction.multiplyScalar(0.05);
        particles.geometry.attributes.position.setXYZ(i, node.position.x, node.position.y, node.position.z);
        particles.geometry.attributes.position.needsUpdate = true;
    }
}

function animateParticles() {
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += (Math.random() - 0.5) * 0.05;
        positions[i * 3 + 1] += (Math.random() - 0.5) * 0.05;
        positions[i * 3 + 2] += (Math.random() - 0.5) * 0.05;
    }
    particles.geometry.attributes.position.needsUpdate = true;
}

// Emit particles periodically
setInterval(() => {
    emitParticles();
}, 1000);

// Animate particle movement
function animateParticleSystem() {
    animateParticles();
    requestAnimationFrame(animateParticleSystem);
}
animateParticleSystem();

// Function to add tooltips (advanced)
function addTooltips() {
    const tooltip = document.createElement('div');
    tooltip.id = 'tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.padding = '5px 10px';
    tooltip.style.background = 'rgba(0, 0, 0, 0.7)';
    tooltip.style.color = '#fff';
    tooltip.style.borderRadius = '4px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);

    function updateTooltip() {
        if (INTERSECTED) {
            tooltip.style.display = 'block';
            tooltip.style.left = `${mouse.x * window.innerWidth / 2 + window.innerWidth / 2 + 10}px`;
            tooltip.style.top = `${-mouse.y * window.innerHeight / 2 + window.innerHeight / 2 + 10}px`;
            tooltip.innerHTML = `
                <strong>Layer:</strong> ${INTERSECTED.userData.layer}<br>
                <strong>Node:</strong> ${INTERSECTED.userData.index}<br>
                <strong>Type:</strong> ${INTERSECTED.userData.type}
            `;
        } else {
            tooltip.style.display = 'none';
        }
    }

    function animateTooltip() {
        requestAnimationFrame(animateTooltip);
        updateTooltip();
    }
    animateTooltip();
}

addTooltips();

// Function to visualize activation functions (e.g., sigmoid)
function visualizeActivationFunction() {
    ///TODO"
}

// Function to show layer-wise activations
function showLayerActivations() {
    nodes.forEach(layer => {
        layer.forEach(node => {
            const activationLevel = Math.random(); // Simulated activation
            node.scale.set(1 + activationLevel * 0.5, 1 + activationLevel * 0.5, 1 + activationLevel * 0.5);
            node.material.emissiveIntensity = activationLevel;
        });
    });
}

// Example: Update activations every 2 seconds
setInterval(showLayerActivations, 2000);

// Advanced Feature: Performance Optimization using InstancedMesh (optional)
// Not implemented here due to complexity, but recommended for larger networks

// End of main.js