/**
 * EVERWORLD - 3D Anime Fantasy Action RPG
 * Main Game Script (Phase 1 Prototype)
 */

// Global Game State
const GameState = {
    START: 'START',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED'
};

let currentState = GameState.START;

// Three.js Core Variables
let scene, camera, renderer;
let clock;

// Environment & Collidables
const collidableObjects = [];
let playerGroup;

// Player Physics & Control State
const player = {
    position: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    speed: 0,
    walkSpeed: 7.0,
    sprintSpeed: 14.0,
    jumpForce: 10.5,
    gravity: -26.0,
    isGrounded: true,
    height: 1.8,
    radius: 0.45,
    rotationY: 0
};

// Input State
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    space: false
};

// Camera Control State (Third Person Orbit Camera)
const cameraControls = {
    distance: 6.5,
    heightOffset: 1.8,
    pitch: 0.25, // Vertical angle (radians)
    yaw: 0,       // Horizontal angle (radians)
    minPitch: -0.15,
    maxPitch: 1.25,
    isMouseDown: false,
    previousMousePosition: { x: 0, y: 0 }
};

// UI Elements
let startScreenEl, pauseMenuEl, gameHudEl, pointerHintEl;
let playerStateTextEl, playerSpeedTextEl, playerPositionTextEl;

/**
 * Initialize Application
 */
function init() {
    // DOM Elements
    startScreenEl = document.getElementById('startScreen');
    pauseMenuEl = document.getElementById('pauseMenu');
    gameHudEl = document.getElementById('gameHud');
    pointerHintEl = document.getElementById('pointerLockHint');

    playerStateTextEl = document.getElementById('playerStateText');
    playerSpeedTextEl = document.getElementById('playerSpeedText');
    playerPositionTextEl = document.getElementById('playerPositionText');

    // Setup Clock
    clock = new THREE.Clock();

    // 1. Setup Three.js Scene, Camera, Renderer
    setupThreeJS();

    // 2. Setup Lighting
    setupLighting();

    // 3. Setup Fantasy Training Environment & Obstacles
    setupEnvironment();

    // 4. Setup Player Character
    setupPlayerCharacter();

    // 5. Setup Controls & Event Listeners
    setupEventListeners();

    // 6. Handle Window Resize
    window.addEventListener('resize', onWindowResize);

    // 7. Start Animation Loop
    animate();
}

/**
 * Setup Three.js Engine Components
 */
function setupThreeJS() {
    const canvas = document.getElementById('gameCanvas');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x13182b);
    scene.fog = new THREE.FogExp2(0x13182b, 0.008);

    // Camera (Third Person Perspective)
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        500
    );

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

/**
 * Setup Lighting for Anime Fantasy Aesthetic
 */
function setupLighting() {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0x8993c7, 0.6);
    scene.add(ambientLight);

    // Hemispheric Light
    const hemiLight = new THREE.HemisphereLight(0xa6c0fe, 0x3b2e58, 0.5);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // Directional Sunlight
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    sunLight.position.set(35, 45, 25);
    sunLight.castShadow = true;

    // Shadow Map Settings
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;

    const d = 50;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;

    scene.add(sunLight);
}

/**
 * Create Fantasy Training Arena (Terrain, Platforms, Obstacles, Boundaries)
 */
function setupEnvironment() {
    // A. Main Training Ground
    const terrainSize = 120;
    const groundGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x3a5f43, // Emerald grass color
        roughness: 0.8,
        metalness: 0.1
    });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Decorative Ground Pattern (Center Ring)
    const centerRingGeo = new THREE.RingGeometry(2, 12, 32);
    const centerRingMat = new THREE.MeshBasicMaterial({
        color: 0x6c5ce7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
    });
    const centerRing = new THREE.Mesh(centerRingGeo, centerRingMat);
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.y = 0.02;
    scene.add(centerRing);

    // B. Arena Boundary Walls
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d3436,
        roughness: 0.7,
        metalness: 0.2
    });

    const halfSize = terrainSize / 2;
    const wallThickness = 2;
    const wallHeight = 8;

    const wallConfigs = [
        { pos: [0, wallHeight / 2, -halfSize], size: [terrainSize, wallHeight, wallThickness] },
        { pos: [0, wallHeight / 2, halfSize], size: [terrainSize, wallHeight, wallThickness] },
        { pos: [-halfSize, wallHeight / 2, 0], size: [wallThickness, wallHeight, terrainSize] },
        { pos: [halfSize, wallHeight / 2, 0], size: [wallThickness, wallHeight, terrainSize] }
    ];

    wallConfigs.forEach(cfg => {
        const wallGeo = new THREE.BoxGeometry(...cfg.size);
        const wall = new THREE.Mesh(wallGeo, wallMaterial);
        wall.position.set(...cfg.pos);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);

        // Save bounding box info for collision
        wall.userData = {
            box: new THREE.Box3().setFromObject(wall)
        };
        collidableObjects.push(wall);
    });

    // C. Training Ledges & Jump Platforms (Various Heights)
    const platformMaterial = new THREE.MeshStandardMaterial({
        color: 0x636e72,
        roughness: 0.5
    });

    const platformData = [
        // Low platform (top at y = 1.5)
        { pos: [-10, 0.75, -8], size: [6, 1.5, 6] },
        // Medium platform (top at y = 3.5)
        { pos: [-10, 1.75, -16], size: [6, 3.5, 6] },
        // High platform (top at y = 5.5)
        { pos: [-10, 2.75, -24], size: [6, 5.5, 6] },

        // Step obstacles on right side
        { pos: [12, 1.0, -10], size: [8, 2.0, 4] },
        { pos: [12, 2.0, -18], size: [8, 4.0, 4] },
        { pos: [12, 3.0, -26], size: [8, 6.0, 4] },

        // Central Stone Pillars
        { pos: [-15, 3.0, 10], size: [3, 6.0, 3] },
        { pos: [15, 3.0, 10], size: [3, 6.0, 3] },
        { pos: [-15, 3.0, 25], size: [3, 6.0, 3] },
        { pos: [15, 3.0, 25], size: [3, 6.0, 3] }
    ];

    platformData.forEach(p => {
        const pGeo = new THREE.BoxGeometry(...p.size);
        const mesh = new THREE.Mesh(pGeo, platformMaterial);
        mesh.position.set(...p.pos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        mesh.userData = {
            box: new THREE.Box3().setFromObject(mesh)
        };
        collidableObjects.push(mesh);
    });

    // D. Training Dummies
    const dummyMat = new THREE.MeshStandardMaterial({ color: 0xe17055, roughness: 0.6 });
    const dummyPositions = [
        { x: -5, z: 8 },
        { x: 0, z: 12 },
        { x: 5, z: 8 }
    ];

    dummyPositions.forEach(dp => {
        const dummyGroup = new THREE.Group();

        // Pole
        const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.5, 12);
        const pole = new THREE.Mesh(poleGeo, platformMaterial);
        pole.position.y = 1.25;
        pole.castShadow = true;
        dummyGroup.add(pole);

        // Body Target
        const bodyGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12);
        const body = new THREE.Mesh(bodyGeo, dummyMat);
        body.position.y = 1.6;
        body.castShadow = true;
        dummyGroup.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const head = new THREE.Mesh(headGeo, dummyMat);
        head.position.y = 2.4;
        head.castShadow = true;
        dummyGroup.add(head);

        dummyGroup.position.set(dp.x, 0, dp.z);
        scene.add(dummyGroup);

        const dummyCollider = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 2.5, 0.8),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        dummyCollider.position.set(dp.x, 1.25, dp.z);
        scene.add(dummyCollider);

        dummyCollider.userData = {
            box: new THREE.Box3().setFromObject(dummyCollider)
        };
        collidableObjects.push(dummyCollider);
    });

    // E. Glowing Crystals
    const crystalGeo = new THREE.OctahedronGeometry(1.2, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x00cec9,
        emissive: 0x00cec9,
        emissiveIntensity: 0.6,
        roughness: 0.2
    });

    const crystalPositions = [
        { x: 0, y: 3.0, z: -20 },
        { x: -10, y: 6.5, z: -24 },
        { x: 12, y: 7.5, z: -26 }
    ];

    crystalPositions.forEach(cp => {
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.set(cp.x, cp.y, cp.z);
        crystal.castShadow = true;
        scene.add(crystal);

        crystal.userData = { isCrystal: true, initialY: cp.y };
    });
}

/**
 * Setup Stylized Anime Character Mesh
 */
function setupPlayerCharacter() {
    playerGroup = new THREE.Group();

    // Body / Torso
    const torsoGeo = new THREE.CylinderGeometry(0.35, 0.28, 0.9, 12);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.4 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.9;
    torso.castShadow = true;
    playerGroup.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffeaa7, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.5;
    head.castShadow = true;
    playerGroup.add(head);

    // Hair
    const hairGeo = new THREE.ConeGeometry(0.32, 0.4, 8);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x6c5ce7, roughness: 0.3 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.72, -0.05);
    hair.rotation.x = -0.2;
    hair.castShadow = true;
    playerGroup.add(hair);

    // Visor (Front Facing Marker)
    const visorGeo = new THREE.BoxGeometry(0.3, 0.1, 0.15);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0xfdcb6e, emissive: 0xfdcb6e, emissiveIntensity: 0.4 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.5, 0.2);
    playerGroup.add(visor);

    // Scarf
    const scarfGeo = new THREE.BoxGeometry(0.12, 0.5, 0.05);
    const scarfMat = new THREE.MeshStandardMaterial({ color: 0xd63031 });
    const scarf = new THREE.Mesh(scarfGeo, scarfMat);
    scarf.position.set(0, 1.2, -0.3);
    scarf.rotation.x = 0.4;
    scarf.castShadow = true;
    playerGroup.add(scarf);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2d3436 });
    const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.6, 8);

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.15, 0.3, 0);
    leftLeg.castShadow = true;
    playerGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.15, 0.3, 0);
    rightLeg.castShadow = true;
    playerGroup.add(rightLeg);

    // Position player group
    playerGroup.position.copy(player.position);
    scene.add(playerGroup);
}

/**
 * Event Listeners (Keyboard, Mouse Drag / Pointer Lock, Buttons)
 */
function setupEventListeners() {
    // Keyboard Down
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();

        if (key === 'w') keys.w = true;
        if (key === 'a') keys.a = true;
        if (key === 's') keys.s = true;
        if (key === 'd') keys.d = true;
        if (e.key === 'Shift') keys.shift = true;
        if (e.code === 'Space') {
            keys.space = true;
            e.preventDefault();
        }

        // Toggle Pause
        if (e.key === 'Escape' || key === 'p') {
            if (currentState === GameState.PLAYING) {
                pauseGame();
            } else if (currentState === GameState.PAUSED) {
                resumeGame();
            }
        }

        // Reset position shortcut
        if (key === 'r') {
            resetPlayerPosition();
        }
    });

    // Keyboard Up
    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();

        if (key === 'w') keys.w = false;
        if (key === 'a') keys.a = false;
        if (key === 's') keys.s = false;
        if (key === 'd') keys.a = false;
        if (key === 'd') keys.d = false;
        if (e.key === 'Shift') keys.shift = false;
        if (e.code === 'Space') keys.space = false;
    });

    // Canvas Mouse Look Controls (Drag or PointerLock)
    const canvas = document.getElementById('gameCanvas');

    canvas.addEventListener('mousedown', (e) => {
        if (currentState !== GameState.PLAYING) return;
        cameraControls.isMouseDown = true;
        cameraControls.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
        cameraControls.isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
        if (currentState !== GameState.PLAYING) return;

        if (document.pointerLockElement === canvas) {
            // Pointer lock active
            const sensitivity = 0.003;
            cameraControls.yaw -= e.movementX * sensitivity;
            cameraControls.pitch += e.movementY * sensitivity;
            clampCameraPitch();
        } else if (cameraControls.isMouseDown) {
            // Mouse drag fallback
            const deltaX = e.clientX - cameraControls.previousMousePosition.x;
            const deltaY = e.clientY - cameraControls.previousMousePosition.y;

            const sensitivity = 0.005;
            cameraControls.yaw -= deltaX * sensitivity;
            cameraControls.pitch += deltaY * sensitivity;
            clampCameraPitch();

            cameraControls.previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });

    // Double click or click to request Pointer Lock
    canvas.addEventListener('click', () => {
        if (currentState === GameState.PLAYING) {
            canvas.requestPointerLock();
        }
    });

    // Buttons
    document.getElementById('btnStart').addEventListener('click', startGame);
    document.getElementById('btnPause').addEventListener('click', pauseGame);
    document.getElementById('btnResume').addEventListener('click', resumeGame);
    document.getElementById('btnReset').addEventListener('click', () => {
        resetPlayerPosition();
        resumeGame();
    });
}

function clampCameraPitch() {
    cameraControls.pitch = Math.max(
        cameraControls.minPitch,
        Math.min(cameraControls.maxPitch, cameraControls.pitch)
    );
}

/**
 * Game Loop (Animation & Physics Update)
 */
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = Math.min(clock.getDelta(), 0.1);

    if (currentState === GameState.PLAYING) {
        updatePlayerPhysics(deltaTime);
        updateCamera();
        animateEnvironment(deltaTime);
        updateHUD();
    } else {
        // Subtle background camera rotation when on start/pause screen
        cameraControls.yaw += deltaTime * 0.1;
        updateCamera();
    }

    renderer.render(scene, camera);
}

/**
 * Player Physics & Movement Logic
 */
function updatePlayerPhysics(deltaTime) {
    // 1. Calculate Movement Vector from WASD relative to Camera Yaw
    let moveForward = 0;
    let moveRight = 0;

    if (keys.w) moveForward += 1;
    if (keys.s) moveForward -= 1;
    if (keys.d) moveRight += 1;
    if (keys.a) moveRight -= 1;

    const targetSpeed = keys.shift ? player.sprintSpeed : player.walkSpeed;

    const moveVector = new THREE.Vector3();

    if (moveForward !== 0 || moveRight !== 0) {
        // Forward vector in world space based on camera yaw
        const forward = new THREE.Vector3(
            Math.sin(cameraControls.yaw),
            0,
            Math.cos(cameraControls.yaw)
        ).normalize();

        // Right vector
        const right = new THREE.Vector3(
            Math.cos(cameraControls.yaw),
            0,
            -Math.sin(cameraControls.yaw)
        ).normalize();

        moveVector.addScaledVector(forward, moveForward);
        moveVector.addScaledVector(right, moveRight);
        moveVector.normalize();

        // Target rotation angle for character model
        const targetAngle = Math.atan2(moveVector.x, moveVector.z);

        // Smooth character rotation
        let diff = targetAngle - player.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        player.rotationY += diff * 12 * deltaTime;

        player.speed = THREE.MathUtils.lerp(player.speed, targetSpeed, 10 * deltaTime);
    } else {
        player.speed = THREE.MathUtils.lerp(player.speed, 0, 12 * deltaTime);
    }

    // Velocity X, Z
    player.velocity.x = moveVector.x * player.speed;
    player.velocity.z = moveVector.z * player.speed;

    // 2. Jumping & Gravity
    if (keys.space && player.isGrounded) {
        player.velocity.y = player.jumpForce;
        player.isGrounded = false;
    }

    // Apply gravity
    player.velocity.y += player.gravity * deltaTime;

    // Proposed next position
    const nextX = player.position.x + player.velocity.x * deltaTime;
    const nextY = player.position.y + player.velocity.y * deltaTime;
    const nextZ = player.position.z + player.velocity.z * deltaTime;

    // 3. Collision Checks
    const prevY = player.position.y;
    player.position.x = nextX;
    player.position.z = nextZ;

    // Check Ground / Platform Landings
    let groundedY = 0;
    let landedOnPlatform = false;

    collidableObjects.forEach(obj => {
        if (!obj.userData || !obj.userData.box) return;

        const box = obj.userData.box;

        // Check if player's X, Z is over this platform box
        const playerRadius = player.radius;
        const isOverBoxX = player.position.x >= (box.min.x - playerRadius) && player.position.x <= (box.max.x + playerRadius);
        const isOverBoxZ = player.position.z >= (box.min.z - playerRadius) && player.position.z <= (box.max.z + playerRadius);

        if (isOverBoxX && isOverBoxZ) {
            const platformTop = box.max.y;
            // If player was falling down and was previously at or above platform top
            if (player.velocity.y <= 0 && prevY >= platformTop - 0.2 && nextY <= platformTop) {
                if (platformTop > groundedY) {
                    groundedY = platformTop;
                    landedOnPlatform = true;
                }
            }
        }
    });

    if (nextY <= groundedY) {
        player.position.y = groundedY;
        player.velocity.y = 0;
        player.isGrounded = true;
    } else {
        player.position.y = nextY;
        player.isGrounded = false;
    }

    // Horizontal Wall / Obstacle Collision Pushback
    collidableObjects.forEach(obj => {
        if (!obj.userData || !obj.userData.box) return;

        const box = obj.userData.box;
        const playerHeight = player.height;

        // Vertical overlap check
        const playerMinY = player.position.y;
        const playerMaxY = player.position.y + playerHeight;

        if (playerMinY < box.max.y && playerMaxY > box.min.y) {
            // Horizontal penetration check
            const closestX = Math.max(box.min.x, Math.min(player.position.x, box.max.x));
            const closestZ = Math.max(box.min.z, Math.min(player.position.z, box.max.z));

            const distX = player.position.x - closestX;
            const distZ = player.position.z - closestZ;
            const distanceSq = distX * distX + distZ * distZ;

            const radiusSq = player.radius * player.radius;

            if (distanceSq < radiusSq && distanceSq > 0.0001) {
                const distance = Math.sqrt(distanceSq);
                const overlap = player.radius - distance;

                // Push player out
                player.position.x += (distX / distance) * overlap;
                player.position.z += (distZ / distance) * overlap;
            }
        }
    });

    // Arena Boundary Clamp
    const arenaBoundary = 58;
    player.position.x = THREE.MathUtils.clamp(player.position.x, -arenaBoundary, arenaBoundary);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -arenaBoundary, arenaBoundary);

    // 4. Sync 3D Mesh
    playerGroup.position.copy(player.position);
    playerGroup.rotation.y = player.rotationY;
}

/**
 * Update Third Person Camera Position & LookAt
 */
function updateCamera() {
    const targetY = player.position.y + cameraControls.heightOffset;

    // Calculate camera position relative to player
    const camX = player.position.x - Math.sin(cameraControls.yaw) * Math.cos(cameraControls.pitch) * cameraControls.distance;
    const camY = targetY + Math.sin(cameraControls.pitch) * cameraControls.distance;
    const camZ = player.position.z - Math.cos(cameraControls.yaw) * Math.cos(cameraControls.pitch) * cameraControls.distance;

    camera.position.set(camX, Math.max(camY, 0.5), camZ);
    camera.lookAt(player.position.x, targetY, player.position.z);
}

/**
 * Environment Animations (Crystals, Light effects)
 */
function animateEnvironment(deltaTime) {
    scene.traverse(child => {
        if (child.userData && child.userData.isCrystal) {
            child.rotation.y += deltaTime * 1.2;
            child.rotation.x += deltaTime * 0.5;
            child.position.y = child.userData.initialY + Math.sin(clock.getElapsedTime() * 2) * 0.3;
        }
    });
}

/**
 * Update UI HUD Elements
 */
function updateHUD() {
    if (!playerStateTextEl) return;

    // Player State
    let stateStr = "Trên mặt đất";
    if (!player.isGrounded) {
        stateStr = "Đang nhảy / Rơi";
    } else if (player.speed > 8) {
        stateStr = "Đang chạy nhanh ⚡";
    } else if (player.speed > 0.5) {
        stateStr = "Đang đi bộ 🚶";
    }

    playerStateTextEl.textContent = stateStr;

    // Speed in km/h
    const kmh = Math.round(player.speed * 3.6);
    playerSpeedTextEl.textContent = `${kmh} km/h`;

    // Position
    const posX = player.position.x.toFixed(1);
    const posY = player.position.y.toFixed(1);
    const posZ = player.position.z.toFixed(1);
    playerPositionTextEl.textContent = `${posX}, ${posY}, ${posZ}`;
}

/**
 * Game State Management Functions
 */
function startGame() {
    currentState = GameState.PLAYING;
    startScreenEl.classList.remove('active');
    startScreenEl.classList.add('hidden');

    pauseMenuEl.classList.remove('active');
    pauseMenuEl.classList.add('hidden');

    gameHudEl.classList.remove('hidden');

    // Pointer lock hint auto-hide after 5s
    setTimeout(() => {
        if (pointerHintEl) pointerHintEl.style.opacity = '0';
    }, 5000);
}

function pauseGame() {
    currentState = GameState.PAUSED;
    pauseMenuEl.classList.remove('hidden');
    pauseMenuEl.classList.add('active');

    if (document.exitPointerLock) {
        document.exitPointerLock();
    }
}

function resumeGame() {
    currentState = GameState.PLAYING;
    pauseMenuEl.classList.remove('active');
    pauseMenuEl.classList.add('hidden');
}

function resetPlayerPosition() {
    player.position.set(0, 0, 0);
    player.velocity.set(0, 0, 0);
    player.speed = 0;
    player.isGrounded = true;
    playerGroup.position.copy(player.position);
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', init);
