/**
 * EVERWORLD 3D RPG - SCRIPT.JS
 * Core Three.js Engine & Player Controller
 */

// Global State
const gameState = {
    isStarted: false,
    isPaused: false,
    hp: 100,
    maxHp: 100,
    chakra: 100,
    maxChakra: 100
};

// Player Input State
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    space: false
};

// Player Physics & Movement Specs
const playerState = {
    position: new THREE.Vector3(0, 1.5, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    rotationY: 0,
    pitch: 0,
    isGrounded: true,
    walkSpeed: 7,
    runSpeed: 14,
    jumpForce: 12,
    gravity: 28,
    radius: 0.6,
    height: 1.8
};

// Three.js Core Variables
let scene, camera, renderer;
let playerMesh, playerModelGroup, cameraPivot;
let obstacles = [];
let clock = new THREE.Clock();

// UI Elements
let startScreen, pauseScreen, instructionsModal, hudScreen;
let hpFill, hpText, chakraFill, chakraText;

// Initialize on DOM Load
window.addEventListener('DOMContentLoaded', () => {
    initUI();
    initThreeJS();
    setupEventListeners();
    animate();
});

// Setup UI References and Button Listeners
function initUI() {
    startScreen = document.getElementById('start-screen');
    pauseScreen = document.getElementById('pause-screen');
    instructionsModal = document.getElementById('instructions-modal');
    hudScreen = document.getElementById('hud-screen');

    hpFill = document.getElementById('hp-fill');
    hpText = document.getElementById('hp-text');
    chakraFill = document.getElementById('chakra-fill');
    chakraText = document.getElementById('chakra-text');

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('instructions-btn').addEventListener('click', () => {
        instructionsModal.classList.remove('hidden');
    });
    document.getElementById('close-inst-btn').addEventListener('click', () => {
        instructionsModal.classList.add('hidden');
    });
    document.getElementById('resume-btn').addEventListener('click', resumeGame);
    document.getElementById('respawn-btn').addEventListener('click', respawnPlayer);
    document.getElementById('main-menu-btn').addEventListener('click', exitToMainMenu);
}

// Three.js World & Scene Setup
function initThreeJS() {
    const container = document.getElementById('canvas-container');

    // Scene setup with fantasy fog
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1128);
    scene.fog = new THREE.FogExp2(0x0a1128, 0.015);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Camera setup with Orbit/Pivot system
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraPivot = new THREE.Object3D();
    scene.add(cameraPivot);
    cameraPivot.add(camera);
    camera.position.set(0, 2.5, 6); // Third-person offset behind player
    camera.lookAt(0, 1.2, 0);

    // Lighting
    setupLighting();

    // Environment: Ground Terrain, Training Field, Fantasy Landmarks
    buildEnvironment();

    // Player Avatar creation
    createPlayerAvatar();
}

// Lighting Setup
function setupLighting() {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xdff0ff, 0.6);
    scene.add(ambientLight);

    // Main Directional Sun / Moon Light
    const dirLight = new THREE.DirectionalLight(0x70b0ff, 1.2);
    dirLight.position.set(40, 80, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    const shadowSize = 50;
    dirLight.shadow.camera.left = -shadowSize;
    dirLight.shadow.camera.right = shadowSize;
    dirLight.shadow.camera.top = shadowSize;
    dirLight.shadow.camera.bottom = -shadowSize;
    scene.add(dirLight);

    // Point Light (Chakra Crystal Glow in Center)
    const crystalLight = new THREE.PointLight(0x00ffff, 2, 30);
    crystalLight.position.set(0, 4, -15);
    scene.add(crystalLight);
}

// Build Fantasy Training Environment
function buildEnvironment() {
    // Ground Grass Field
    const groundGeo = new THREE.PlaneGeometry(200, 200, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x1a3a2a,
        roughness: 0.8,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Stone Training Platform in center
    const platformGeo = new THREE.CylinderGeometry(15, 16, 0.8, 32);
    const platformMat = new THREE.MeshStandardMaterial({
        color: 0x3d4a5d,
        roughness: 0.5
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, 0.4, -15);
    platform.receiveShadow = true;
    platform.castShadow = true;
    scene.add(platform);

    // Floating Chakra Crystal Pillar
    const crystalGeo = new THREE.OctahedronGeometry(2, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x00f2ff,
        emissive: 0x0088cc,
        roughness: 0.2,
        transparent: true,
        opacity: 0.85
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(0, 4, -15);
    crystal.name = 'chakraCrystal';
    scene.add(crystal);

    // Decorative Pillars / Training Obstacles
    const pillarGeo = new THREE.CylinderGeometry(0.8, 1, 6, 16);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x5a687a });

    const pillarPositions = [
        [-10, 3, -10], [10, 3, -10],
        [-10, 3, -20], [10, 3, -20],
        [-18, 3, 0], [18, 3, 0],
        [-12, 3, 15], [12, 3, 15]
    ];

    pillarPositions.forEach(pos => {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(pos[0], pos[1], pos[2]);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        scene.add(pillar);

        // Store bounding cylinder info for collision
        obstacles.push({
            x: pos[0],
            z: pos[2],
            radius: 1.2
        });
    });

    // Stylized Trees around boundary
    for (let i = 0; i < 30; i++) {
        const angle = (i / 30) * Math.PI * 2;
        const radius = 45 + Math.random() * 15;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        createTree(x, z);
        obstacles.push({ x: x, z: z, radius: 1.5 });
    }
}

// Helper to create tree mesh
function createTree(x, z) {
    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 4, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 2, z);
    trunk.castShadow = true;

    const foliageGeo = new THREE.ConeGeometry(3, 7, 8);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x0f5231, roughness: 0.7 });
    const foliage = new THREE.Mesh(foliageGeo, foliageMat);
    foliage.position.set(x, 6, z);
    foliage.castShadow = true;

    scene.add(trunk);
    scene.add(foliage);
}

// Anime-style Player Avatar Construction
function createPlayerAvatar() {
    playerModelGroup = new THREE.Group();

    // Body / Torso
    const torsoGeo = new THREE.CylinderGeometry(0.4, 0.3, 1.1, 12);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a }); // Navy Blue Outfit
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.85;
    torso.castShadow = true;
    playerModelGroup.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac }); // Skin tone
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.6;
    head.castShadow = true;
    playerModelGroup.add(head);

    // Anime Hair
    const hairGeo = new THREE.ConeGeometry(0.42, 0.5, 8);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x00f2ff }); // Glowing Cyan Hair
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.85, -0.05);
    hair.rotation.x = -0.2;
    playerModelGroup.add(hair);

    // Scarf / Cape Detail
    const scarfGeo = new THREE.BoxGeometry(0.8, 0.2, 0.4);
    const scarfMat = new THREE.MeshStandardMaterial({ color: 0xff3366 });
    const scarf = new THREE.Mesh(scarfGeo, scarfMat);
    scarf.position.set(0, 1.35, -0.2);
    playerModelGroup.add(scarf);

    playerMesh = playerModelGroup;
    scene.add(playerMesh);

    // Sync pivot to player mesh
    cameraPivot.position.copy(playerMesh.position);
}

// Controls & Keyboard Listeners
function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (key === 'w' || key === 'arrowup') keys.w = true;
        if (key === 'a' || key === 'arrowleft') keys.a = true;
        if (key === 's' || key === 'arrowdown') keys.s = true;
        if (key === 'd' || key === 'arrowright') keys.d = true;
        if (e.key === 'Shift') keys.shift = true;
        if (e.code === 'Space') {
            keys.space = true;
            e.preventDefault();
        }
        if (e.key === 'Escape') {
            if (gameState.isStarted) {
                togglePause();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (key === 'w' || key === 'arrowup') keys.w = false;
        if (key === 'a' || key === 'arrowleft') keys.a = false;
        if (key === 's' || key === 'arrowdown') keys.s = false;
        if (key === 'd' || key === 'arrowright') keys.d = false;
        if (e.key === 'Shift') keys.shift = false;
        if (e.code === 'Space') keys.space = false;
    });

    // Mouse Look (Pointer Lock)
    renderer.domElement.addEventListener('click', () => {
        if (gameState.isStarted && !gameState.isPaused) {
            renderer.domElement.requestPointerLock();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === renderer.domElement && !gameState.isPaused) {
            const mouseSensitivity = 0.0025;
            playerState.rotationY -= e.movementX * mouseSensitivity;

            // Pitch controls vertical camera angle
            playerState.pitch -= e.movementY * mouseSensitivity;
            playerState.pitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 3, playerState.pitch));
        }
    });

    // Window Resize Handler
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Game Controls: Start, Pause, Resume, Respawn
function startGame() {
    gameState.isStarted = true;
    gameState.isPaused = false;
    startScreen.classList.add('hidden');
    hudScreen.classList.remove('hidden');
    renderer.domElement.requestPointerLock();
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    if (gameState.isPaused) {
        pauseScreen.classList.remove('hidden');
        document.exitPointerLock();
    } else {
        pauseScreen.classList.add('hidden');
        renderer.domElement.requestPointerLock();
    }
}

function resumeGame() {
    gameState.isPaused = false;
    pauseScreen.classList.add('hidden');
    renderer.domElement.requestPointerLock();
}

function respawnPlayer() {
    playerState.position.set(0, 1.5, 0);
    playerState.velocity.set(0, 0, 0);
    playerState.rotationY = 0;
    playerState.pitch = 0;
    gameState.hp = gameState.maxHp;
    gameState.chakra = gameState.maxChakra;
    updateHUD();
    resumeGame();
}

function exitToMainMenu() {
    gameState.isStarted = false;
    gameState.isPaused = false;
    pauseScreen.classList.add('hidden');
    hudScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    document.exitPointerLock();
}

function updateHUD() {
    if (hpFill) hpFill.style.width = `${(gameState.hp / gameState.maxHp) * 100}%`;
    if (hpText) hpText.textContent = `${Math.round(gameState.hp)} / ${gameState.maxHp}`;
    if (chakraFill) chakraFill.style.width = `${(gameState.chakra / gameState.maxChakra) * 100}%`;
    if (chakraText) chakraText.textContent = `${Math.round(gameState.chakra)} / ${gameState.maxChakra}`;
}

// Main Animation & Physics Loop
function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);

    if (gameState.isStarted && !gameState.isPaused) {
        updatePlayerPhysics(delta);
        animateSceneElements();
    }

    renderer.render(scene, camera);
}

// Player Movement Physics & Collision Logic
function updatePlayerPhysics(delta) {
    // 1. Calculate Movement Vector relative to Camera Rotation
    const moveDir = new THREE.Vector3(0, 0, 0);

    if (keys.w) moveDir.z -= 1;
    if (keys.s) moveDir.z += 1;
    if (keys.a) moveDir.x -= 1;
    if (keys.d) moveDir.x += 1;

    const currentSpeed = keys.shift ? playerState.runSpeed : playerState.walkSpeed;

    if (moveDir.lengthSq() > 0) {
        moveDir.normalize();

        // Rotate movement vector according to player camera yaw
        moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerState.rotationY);

        // Apply velocity smoothly
        playerState.velocity.x = moveDir.x * currentSpeed;
        playerState.velocity.z = moveDir.z * currentSpeed;

        // Orient character mesh in direction of movement
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        playerMesh.rotation.y = targetAngle;
    } else {
        // Smooth deceleration
        playerState.velocity.x *= 0.8;
        playerState.velocity.z *= 0.8;
    }

    // 2. Jump & Gravity
    if (keys.space && playerState.isGrounded) {
        playerState.velocity.y = playerState.jumpForce;
        playerState.isGrounded = false;
    }

    // Apply gravity
    playerState.velocity.y -= playerState.gravity * delta;

    // 3. Position Update & Ground Collision
    playerState.position.x += playerState.velocity.x * delta;
    playerState.position.z += playerState.velocity.z * delta;
    playerState.position.y += playerState.velocity.y * delta;

    // Ground check (Height = 1.5)
    if (playerState.position.y <= 1.5) {
        playerState.position.y = 1.5;
        playerState.velocity.y = 0;
        playerState.isGrounded = true;
    }

    // 4. Obstacle Cylindrical Collisions
    obstacles.forEach(obs => {
        const dx = playerState.position.x - obs.x;
        const dz = playerState.position.z - obs.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = obs.radius + playerState.radius;

        if (dist < minDist && dist > 0) {
            // Push player outside obstacle radius
            const pushX = (dx / dist) * (minDist - dist);
            const pushZ = (dz / dist) * (minDist - dist);
            playerState.position.x += pushX;
            playerState.position.z += pushZ;
        }
    });

    // 5. Sync Three.js Meshes & Camera Pivot
    playerMesh.position.copy(playerState.position);

    // Camera Pivot follows player position with pitch and yaw
    cameraPivot.position.copy(playerState.position);
    cameraPivot.rotation.y = playerState.rotationY;
    cameraPivot.rotation.x = playerState.pitch;
}

// Decorative Scene Animations (Floating crystal, etc.)
function animateSceneElements() {
    const time = clock.getElapsedTime();
    const crystal = scene.getObjectByName('chakraCrystal');
    if (crystal) {
        crystal.rotation.y = time * 0.8;
        crystal.position.y = 4 + Math.sin(time * 2) * 0.4;
    }
}
