/* =========================================================
   EVERWORLD 3D - GIAI ĐOẠN 1: NỀN MÓNG CHƠI ĐƯỢC
   Engine: Three.js
   ========================================================= */

"use strict";

// --- GAME STATE MANAGEMENT ---
const GameState = {
    START: 'START',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED'
};

let currentState = GameState.START;

// --- DOM ELEMENTS ---
const startScreen = document.getElementById('start-screen');
const hudScreen = document.getElementById('hud-screen');
const pauseScreen = document.getElementById('pause-screen');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const resetPosBtn = document.getElementById('reset-pos-btn');
const hudPos = document.getElementById('hud-pos');
const hudState = document.getElementById('hud-state');

// --- THREE.JS GLOBALS ---
let scene, camera, renderer, clock;
let playerGroup, playerBody, playerHead;
let obstacles = [];

// --- CONTROLS & CAMERA STATE ---
const keyState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false
};

let isPointerLocked = false;
let cameraYaw = 0;      // Horizontal rotation angle in radians
let cameraPitch = 0.25; // Vertical rotation angle in radians
const cameraDistance = 6.5;
const cameraHeight = 2.2;

// --- PHYSICS & MOVEMENT CONFIG ---
const physics = {
    position: new THREE.Vector3(0, 0.4, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    isGrounded: true,
    gravity: -22.0,
    walkSpeed: 7.0,
    sprintSpeed: 12.0,
    jumpForce: 9.0,
    acceleration: 35.0,
    deceleration: 20.0,
    playerRadius: 0.5,
    worldLimit: 90.0
};

// --- INITIALIZATION ---
function init() {
    clock = new THREE.Clock();

    // 1. Scene & Environment Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x68a0e8);
    scene.fog = new THREE.FogExp2(0x68a0e8, 0.008);

    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // 4. Lights Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.3);
    sunLight.position.set(40, 70, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200;
    const d = 60;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // 5. Build 3D World Environment
    buildEnvironment();

    // 6. Build Character 3D Model
    buildCharacter();

    // 7. Event Listeners Setup
    setupEventListeners();

    // 8. Start Render Loop
    requestAnimationFrame(animate);
}

// --- WORLD BUILDING ---
function buildEnvironment() {
    // Ground Grass Plane (Large landscape)
    const groundGeo = new THREE.PlaneGeometry(300, 300);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x3d7a42,
        roughness: 0.8,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Central Training Arena Platform (Stone Ring)
    const platformGeo = new THREE.CylinderGeometry(18, 19, 0.8, 32);
    const platformMat = new THREE.MeshStandardMaterial({
        color: 0x7a808a,
        roughness: 0.6,
        metalness: 0.2
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, 0.4, 0);
    platform.receiveShadow = true;
    platform.castShadow = true;
    scene.add(platform);

    // Arena Ring Marker
    const ringGeo = new THREE.RingGeometry(16.5, 17.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x58a6ff, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.81, 0);
    scene.add(ring);

    // Decorative Ancient Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.9, 1.1, 7, 16);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xc0c7d0, roughness: 0.4 });

    const pillarPositions = [
        [-14, 3.5, -14], [14, 3.5, -14],
        [-14, 3.5, 14],  [14, 3.5, 14]
    ];

    pillarPositions.forEach(pos => {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(pos[0], pos[1], pos[2]);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        scene.add(pillar);

        obstacles.push({
            type: 'cylinder',
            center: new THREE.Vector2(pos[0], pos[2]),
            radius: 1.3
        });

        // Floating Crystal Top Effect
        const crystalGeo = new THREE.OctahedronGeometry(0.8);
        const crystalMat = new THREE.MeshStandardMaterial({
            color: 0x388bfd,
            emissive: 0x1f6feb,
            emissiveIntensity: 0.7,
            roughness: 0.1
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.set(pos[0], pos[1] + 4.5, pos[2]);
        scene.add(crystal);
    });

    // Practice Training Target (Dummy)
    const dummyGeo = new THREE.CylinderGeometry(0.5, 0.5, 2.2, 16);
    const dummyMat = new THREE.MeshStandardMaterial({ color: 0xda3633 });
    const dummy = new THREE.Mesh(dummyGeo, dummyMat);
    dummy.position.set(0, 1.9, -10);
    dummy.castShadow = true;
    scene.add(dummy);

    obstacles.push({
        type: 'cylinder',
        center: new THREE.Vector2(0, -10),
        radius: 0.8
    });

    // Parkour Step Platforms
    const boxGeo = new THREE.BoxGeometry(4.5, 1.2, 4.5);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x21262d, roughness: 0.5 });

    const boxPositions = [
        [-24, 0.6, 6],
        [-28, 1.8, 12],
        [-32, 3.0, 18]
    ];

    boxPositions.forEach(pos => {
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(pos[0], pos[1], pos[2]);
        box.castShadow = true;
        box.receiveShadow = true;
        scene.add(box);
    });

    // Decorative Low Poly Trees around the area
    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 3, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    const leavesGeo = new THREE.ConeGeometry(2.5, 5, 8);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e6f40, roughness: 0.8 });

    const treePositions = [
        [-35, -20], [35, -20], [-35, 20], [35, 20],
        [0, 40], [0, -40], [45, 0], [-45, 0]
    ];

    treePositions.forEach(pos => {
        const treeGroup = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        treeGroup.add(trunk);

        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.y = 4.5;
        leaves.castShadow = true;
        treeGroup.add(leaves);

        treeGroup.position.set(pos[0], 0, pos[1]);
        scene.add(treeGroup);
    });
}

// --- CHARACTER MODEL ---
function buildCharacter() {
    playerGroup = new THREE.Group();

    // Body / Torso
    const torsoGeo = new THREE.CylinderGeometry(0.4, 0.35, 1.1, 12);
    const torsoMat = new THREE.MeshStandardMaterial({
        color: 0x1f6feb,
        roughness: 0.4,
        metalness: 0.2
    });
    playerBody = new THREE.Mesh(torsoGeo, torsoMat);
    playerBody.position.y = 0.85;
    playerBody.castShadow = true;
    playerGroup.add(playerBody);

    // Head
    const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf0e6d2 });
    playerHead = new THREE.Mesh(headGeo, headMat);
    playerHead.position.y = 1.6;
    playerHead.castShadow = true;
    playerGroup.add(playerHead);

    // Visor Direction Indicator (Facing +Z in character local space)
    const visorGeo = new THREE.BoxGeometry(0.35, 0.1, 0.15);
    const visorMat = new THREE.MeshStandardMaterial({
        color: 0x58a6ff,
        emissive: 0x388bfd,
        emissiveIntensity: 0.8
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.62, 0.22);
    playerGroup.add(visor);

    // Shoulder Pads
    const shoulderGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x30363d });

    const leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    leftShoulder.position.set(-0.48, 1.25, 0);
    playerGroup.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    rightShoulder.position.set(0.48, 1.25, 0);
    playerGroup.add(rightShoulder);

    playerGroup.position.copy(physics.position);
    scene.add(playerGroup);
}

// --- KEYBOARD HANDLERS ---
function handleKey(e, isPressed) {
    const code = e.code;
    const key = e.key ? e.key.toLowerCase() : '';

    if (code === 'KeyW' || key === 'w' || code === 'ArrowUp') keyState.forward = isPressed;
    if (code === 'KeyS' || key === 's' || code === 'ArrowDown') keyState.backward = isPressed;
    if (code === 'KeyA' || key === 'a' || code === 'ArrowLeft') keyState.left = isPressed;
    if (code === 'KeyD' || key === 'd' || code === 'ArrowRight') keyState.right = isPressed;
    if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift') keyState.sprint = isPressed;
    if (code === 'Space' || key === ' ') keyState.jump = isPressed;
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    window.addEventListener('resize', onWindowResize, false);

    window.addEventListener('keydown', (e) => {
        handleKey(e, true);
        if (e.code === 'Escape' || e.key === 'Escape') {
            togglePause();
        }
    });

    window.addEventListener('keyup', (e) => {
        handleKey(e, false);
    });

    // Reset keys if window loses focus
    window.addEventListener('blur', () => {
        keyState.forward = false;
        keyState.backward = false;
        keyState.left = false;
        keyState.right = false;
        keyState.sprint = false;
        keyState.jump = false;
    });

    // Mouse Look (Pointer Lock & Drag)
    document.addEventListener('mousemove', (e) => {
        if (isPointerLocked || (currentState === GameState.PLAYING && e.buttons === 1)) {
            const sensitivity = 0.003;
            cameraYaw -= e.movementX * sensitivity;
            cameraPitch += e.movementY * sensitivity;

            // Clamp pitch to prevent camera flipping
            cameraPitch = Math.max(-0.3, Math.min(1.1, cameraPitch));
        }
    });

    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = (document.pointerLockElement === renderer.domElement);
    });

    renderer.domElement.addEventListener('click', () => {
        if (currentState === GameState.PLAYING && !isPointerLocked) {
            renderer.domElement.requestPointerLock();
        }
    });

    // UI Buttons
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', () => setGameState(GameState.PAUSED));
    resumeBtn.addEventListener('click', resumeGame);
    resetPosBtn.addEventListener('click', resetPlayerPosition);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- GAME STATE FLOW ---
function setGameState(newState) {
    currentState = newState;

    const pauseScreenEl = document.getElementById('pause-screen');

    if (currentState === GameState.START) {
        startScreen.classList.remove('hidden');
        startScreen.classList.add('active');
        hudScreen.classList.add('hidden');
        if (pauseScreenEl) pauseScreenEl.classList.add('hidden');
        if (isPointerLocked) document.exitPointerLock();
    } else if (currentState === GameState.PLAYING) {
        startScreen.classList.add('hidden');
        startScreen.classList.remove('active');
        hudScreen.classList.remove('hidden');
        if (pauseScreenEl) {
            pauseScreenEl.classList.add('hidden');
            pauseScreenEl.classList.remove('active');
        }
    } else if (currentState === GameState.PAUSED) {
        if (pauseScreenEl) {
            pauseScreenEl.classList.remove('hidden');
            pauseScreenEl.classList.add('active');
        }
        hudScreen.classList.add('hidden');
        if (isPointerLocked) document.exitPointerLock();
    }
}

function startGame() {
    setGameState(GameState.PLAYING);
    renderer.domElement.requestPointerLock();
}

function resumeGame() {
    setGameState(GameState.PLAYING);
    renderer.domElement.requestPointerLock();
}

function togglePause() {
    if (currentState === GameState.PLAYING) {
        setGameState(GameState.PAUSED);
    } else if (currentState === GameState.PAUSED) {
        resumeGame();
    }
}

function resetPlayerPosition() {
    physics.position.set(0, 0.4, 0);
    physics.velocity.set(0, 0, 0);
    playerGroup.position.copy(physics.position);
    resumeGame();
}

// --- UPDATE & PHYSICS LOOP ---
function update(delta) {
    if (currentState !== GameState.PLAYING) return;

    // 1. Calculate Input Vector
    let inputZ = 0;
    let inputX = 0;

    if (keyState.forward) inputZ += 1;
    if (keyState.backward) inputZ -= 1;
    if (keyState.right) inputX += 1;
    if (keyState.left) inputX -= 1;

    const currentSpeed = keyState.sprint ? physics.sprintSpeed : physics.walkSpeed;
    let targetStateText = 'Đứng yên';

    if (inputX !== 0 || inputZ !== 0) {
        targetStateText = keyState.sprint ? 'Chạy nhanh ⚡' : 'Di chuyển 🚶';

        // Calculate angle of input vector relative to forward
        const inputAngle = Math.atan2(inputX, inputZ);
        // Add camera yaw to get global world movement direction angle
        const moveAngle = cameraYaw + inputAngle;

        const moveDir = new THREE.Vector3(
            Math.sin(moveAngle),
            0,
            Math.cos(moveAngle)
        );

        // Accelerate velocity towards target direction
        physics.velocity.x = THREE.MathUtils.lerp(physics.velocity.x, moveDir.x * currentSpeed, physics.acceleration * delta);
        physics.velocity.z = THREE.MathUtils.lerp(physics.velocity.z, moveDir.z * currentSpeed, physics.acceleration * delta);

        // Rotate player model towards movement direction
        const targetRotY = moveAngle;
        let diff = targetRotY - playerGroup.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        playerGroup.rotation.y += diff * Math.min(1.0, 16.0 * delta);

    } else {
        // Decelerate horizontal velocity when no movement key pressed
        physics.velocity.x = THREE.MathUtils.lerp(physics.velocity.x, 0, physics.deceleration * delta);
        physics.velocity.z = THREE.MathUtils.lerp(physics.velocity.z, 0, physics.deceleration * delta);
    }

    // 2. Jump & Gravity Physics
    if (keyState.jump && physics.isGrounded) {
        physics.velocity.y = physics.jumpForce;
        physics.isGrounded = false;
    }

    if (!physics.isGrounded) {
        physics.velocity.y += physics.gravity * delta;
        targetStateText = 'Nhảy 🦘';
    }

    // Apply Velocity to Position
    physics.position.x += physics.velocity.x * delta;
    physics.position.y += physics.velocity.y * delta;
    physics.position.z += physics.velocity.z * delta;

    // 3. Ground & Obstacle Collisions
    const groundLevel = 0.4; // Base platform/ground Y level
    if (physics.position.y <= groundLevel) {
        physics.position.y = groundLevel;
        physics.velocity.y = 0;
        physics.isGrounded = true;
    }

    // World Boundary Clamp
    physics.position.x = Math.max(-physics.worldLimit, Math.min(physics.worldLimit, physics.position.x));
    physics.position.z = Math.max(-physics.worldLimit, Math.min(physics.worldLimit, physics.position.z));

    // Obstacle Cylindrical Collisions
    obstacles.forEach(obs => {
        if (obs.type === 'cylinder') {
            const playerPos2D = new THREE.Vector2(physics.position.x, physics.position.z);
            const dist = playerPos2D.distanceTo(obs.center);
            const minDist = obs.radius + physics.playerRadius;

            if (dist < minDist) {
                const pushDir = playerPos2D.clone().sub(obs.center).normalize();
                if (pushDir.lengthSq() === 0) pushDir.set(1, 0);

                physics.position.x = obs.center.x + pushDir.x * minDist;
                physics.position.z = obs.center.y + pushDir.y * minDist;
            }
        }
    });

    // Update Player Group Mesh Position
    playerGroup.position.copy(physics.position);

    // 4. Update Camera Position & Rotation (Third-Person Follower)
    const horizDist = cameraDistance * Math.cos(cameraPitch);
    const vertDist = cameraDistance * Math.sin(cameraPitch);

    // Camera sits behind the player along cameraYaw vector
    const cameraX = physics.position.x - horizDist * Math.sin(cameraYaw);
    const cameraY = physics.position.y + cameraHeight + vertDist;
    const cameraZ = physics.position.z - horizDist * Math.cos(cameraYaw);

    camera.position.set(cameraX, cameraY, cameraZ);
    camera.lookAt(
        physics.position.x,
        physics.position.y + 1.2,
        physics.position.z
    );

    // 5. Update HUD Info
    hudPos.textContent = `${physics.position.x.toFixed(1)}, ${physics.position.y.toFixed(1)}, ${physics.position.z.toFixed(1)}`;
    hudState.textContent = targetStateText;
}

// --- RENDER ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);

    // Cap delta time to max 0.05s to prevent massive jumps when tab is inactive or loading
    const delta = Math.min(clock.getDelta(), 0.05);

    update(delta);

    renderer.render(scene, camera);
}

// Initialize application when page loads
window.addEventListener('DOMContentLoaded', init);
