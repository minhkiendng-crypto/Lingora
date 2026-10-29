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

// Mouse Control State
let isMouseDown = false;
let previousMouseX = 0;
let previousMouseY = 0;

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
    cameraPivot = new THREE.Group();
    scene.add(cameraPivot);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 3.5, 7.5);
    camera.lookAt(0, 1.2, 0);
    cameraPivot.add(camera);

    // Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xd0e0ff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(30, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.camera.left = -40;
    dirLight.shadow.camera.right = 40;
    dirLight.shadow.camera.top = 40;
    dirLight.shadow.camera.bottom = -40;
    scene.add(dirLight);

    // Environment: Ground / Meadow
    createMeadowEnvironment();

    // Player Character Creation
    createPlayerCharacter();

    // Handle Window Resizing
    window.addEventListener('resize', onWindowResize);
}

// Create Meadow Terrain & Props
function createMeadowEnvironment() {
    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(100, 100, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x225533,
        roughness: 0.8,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Center Training Arena Ring
    const arenaGeo = new THREE.RingGeometry(0, 12, 32);
    const arenaMat = new THREE.MeshStandardMaterial({
        color: 0x337744,
        roughness: 0.6,
        side: THREE.DoubleSide
    });
    const arena = new THREE.Mesh(arenaGeo, arenaMat);
    arena.rotation.x = -Math.PI / 2;
    arena.position.y = 0.02;
    arena.receiveShadow = true;
    scene.add(arena);

    // Outer Boundary Wall Obstacles
    const wallGeo = new THREE.BoxGeometry(100, 6, 2);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a2e40, roughness: 0.5 });

    const wallNorth = new THREE.Mesh(wallGeo, wallMat);
    wallNorth.position.set(0, 3, -50);
    wallNorth.castShadow = true;
    wallNorth.receiveShadow = true;
    scene.add(wallNorth);
    obstacles.push({ mesh: wallNorth, radius: 2, minX: -50, maxX: 50, minZ: -51, maxZ: -49 });

    const wallSouth = new THREE.Mesh(wallGeo, wallMat);
    wallSouth.position.set(0, 3, 50);
    wallSouth.castShadow = true;
    wallSouth.receiveShadow = true;
    scene.add(wallSouth);
    obstacles.push({ mesh: wallSouth, radius: 2, minX: -50, maxX: 50, minZ: 49, maxZ: 51 });

    const wallGeoV = new THREE.BoxGeometry(2, 6, 100);
    const wallWest = new THREE.Mesh(wallGeoV, wallMat);
    wallWest.position.set(-50, 3, 0);
    wallWest.castShadow = true;
    wallWest.receiveShadow = true;
    scene.add(wallWest);
    obstacles.push({ mesh: wallWest, radius: 2, minX: -51, maxX: -49, minZ: -50, maxZ: 50 });

    const wallEast = new THREE.Mesh(wallGeoV, wallMat);
    wallEast.position.set(50, 3, 0);
    wallEast.castShadow = true;
    wallEast.receiveShadow = true;
    scene.add(wallEast);
    obstacles.push({ mesh: wallEast, radius: 2, minX: 49, maxX: 51, minZ: -50, maxZ: 50 });

    // Training Dummies and Pillars
    const dummyPositions = [
        { x: -6, z: -8 }, { x: 6, z: -8 },
        { x: -10, z: 6 }, { x: 10, z: 6 },
        { x: 0, z: -15 }
    ];

    dummyPositions.forEach(pos => {
        // Base pillar
        const pillarGeo = new THREE.CylinderGeometry(0.8, 1, 3.5, 12);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x775533, roughness: 0.7 });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(pos.x, 1.75, pos.z);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        scene.add(pillar);

        // Dummy head
        const headGeo = new THREE.SphereGeometry(0.6, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xaa8855 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(pos.x, 3.8, pos.z);
        head.castShadow = true;
        scene.add(head);

        // Target marker
        const markGeo = new THREE.TorusGeometry(0.7, 0.1, 8, 16);
        const markMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });
        const mark = new THREE.Mesh(markGeo, markMat);
        mark.position.set(pos.x, 2.5, pos.z);
        mark.rotation.x = Math.PI / 2;
        scene.add(mark);

        obstacles.push({ position: new THREE.Vector3(pos.x, 0, pos.z), radius: 1.2 });
    });

    // Decorative Glowing Crystals
    const crystalGeo = new THREE.OctahedronGeometry(1.2, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x00d4ff,
        emissive: 0x0088ff,
        emissiveIntensity: 0.6,
        roughness: 0.2
    });

    const crystalCoords = [
        { x: -18, z: -18 }, { x: 18, z: -18 },
        { x: -18, z: 18 }, { x: 18, z: 18 }
    ];

    crystalCoords.forEach(c => {
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.set(c.x, 2, c.z);
        crystal.castShadow = true;
        scene.add(crystal);

        const pointLight = new THREE.PointLight(0x00aaff, 1, 12);
        pointLight.position.set(c.x, 2, c.z);
        scene.add(pointLight);

        obstacles.push({ position: new THREE.Vector3(c.x, 0, c.z), radius: 1.5 });
    });
}

// Build 3D Anime Character Mesh
function createPlayerCharacter() {
    playerModelGroup = new THREE.Group();

    // Body / Torso
    const torsoGeo = new THREE.CylinderGeometry(0.4, 0.35, 1.2, 12);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x0066cc, roughness: 0.4 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.9;
    torso.castShadow = true;
    playerModelGroup.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffddaa, roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.7;
    head.castShadow = true;
    playerModelGroup.add(head);

    // Direction Pointer / Sword
    const bladeGeo = new THREE.BoxGeometry(0.1, 0.05, 1.2);
    const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x00d4ff,
        emissive: 0x0088ff,
        emissiveIntensity: 0.5
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0.4, 1.0, -0.5);
    blade.castShadow = true;
    playerModelGroup.add(blade);

    // Energy Aura Halo Ring
    const ringGeo = new THREE.RingGeometry(0.5, 0.7, 16);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    playerModelGroup.add(ring);

    // Player Root Mesh Position
    playerMesh = playerModelGroup;
    playerMesh.position.copy(playerState.position);
    scene.add(playerMesh);
}

// Event Listeners (Keyboard & Mouse)
function setupEventListeners() {
    // Keyboard Key Down
    window.addEventListener('keydown', (e) => {
        if (!gameState.isStarted) return;

        const key = e.key.toLowerCase();
        if (key === 'w' || key === 'arrowup') keys.w = true;
        if (key === 'a' || key === 'arrowleft') keys.a = true;
        if (key === 's' || key === 'arrowdown') keys.s = true;
        if (key === 'd' || key === 'arrowright') keys.d = true;
        if (e.key === 'Shift') keys.shift = true;
        if (e.key === ' ' || e.code === 'Space') {
            keys.space = true;
            e.preventDefault();
        }
        if (e.key === 'Escape') {
            togglePause();
        }
    });

    // Keyboard Key Up
    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (key === 'w' || key === 'arrowup') keys.w = false;
        if (key === 'a' || key === 'arrowleft') keys.a = false;
        if (key === 's' || key === 'arrowdown') keys.s = false;
        if (key === 'd' || key === 'arrowright') keys.d = false;
        if (e.key === 'Shift') keys.shift = false;
        if (e.key === ' ' || e.code === 'Space') keys.space = false;
    });

    // Mouse Drag Camera Rotation
    window.addEventListener('mousedown', (e) => {
        if (!gameState.isStarted || gameState.isPaused) return;
        if (e.target.closest('#hud-screen') && !e.target.closest('#canvas-container')) return;
        isMouseDown = true;
        previousMouseX = e.clientX;
        previousMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
        if (!gameState.isStarted || gameState.isPaused || !isMouseDown) return;

        const deltaX = e.clientX - previousMouseX;
        const deltaY = e.clientY - previousMouseY;

        playerState.rotationY -= deltaX * 0.005;
        playerState.pitch -= deltaY * 0.003;

        // Clamp camera vertical pitch
        playerState.pitch = Math.max(-0.6, Math.min(0.8, playerState.pitch));

        previousMouseX = e.clientX;
        previousMouseY = e.clientY;
    });
}

// Window Resize Handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start Game Session
function startGame() {
    gameState.isStarted = true;
    gameState.isPaused = false;
    startScreen.classList.remove('active');
    startScreen.classList.add('hidden');
    hudScreen.classList.remove('hidden');
}

// Toggle Pause Screen
function togglePause() {
    if (!gameState.isStarted) return;

    gameState.isPaused = !gameState.isPaused;
    if (gameState.isPaused) {
        pauseScreen.classList.remove('hidden');
        pauseScreen.classList.add('active');
    } else {
        pauseScreen.classList.remove('active');
        pauseScreen.classList.add('hidden');
    }
}

// Resume Game
function resumeGame() {
    gameState.isPaused = false;
    pauseScreen.classList.remove('active');
    pauseScreen.classList.add('hidden');
}

// Respawn Player
function respawnPlayer() {
    playerState.position.set(0, 1.5, 0);
    playerState.velocity.set(0, 0, 0);
    playerState.rotationY = 0;
    playerState.pitch = 0;
    playerState.isGrounded = true;
    resumeGame();
}

// Exit to Main Menu
function exitToMainMenu() {
    gameState.isStarted = false;
    gameState.isPaused = false;
    pauseScreen.classList.remove('active');
    pauseScreen.classList.add('hidden');
    hudScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    startScreen.classList.add('active');
}

// Check Collision against Obstacles
function checkCollisions(newPos) {
    // Ground floor check
    if (newPos.y < 0) {
        newPos.y = 0;
    }

    // Boundary box check (-48 to +48)
    if (newPos.x < -48) newPos.x = -48;
    if (newPos.x > 48) newPos.x = 48;
    if (newPos.z < -48) newPos.z = -48;
    if (newPos.z > 48) newPos.z = 48;

    // Cylinder/Obstacle check
    for (let obs of obstacles) {
        if (obs.position) {
            const dx = newPos.x - obs.position.x;
            const dz = newPos.z - obs.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const minDist = playerState.radius + obs.radius;

            if (dist < minDist && dist > 0) {
                const overlap = minDist - dist;
                newPos.x += (dx / dist) * overlap;
                newPos.z += (dz / dist) * overlap;
            }
        }
    }
}

// Main Game Physics & Loop
function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);

    if (gameState.isStarted && !gameState.isPaused) {
        // Player Physics Update
        const moveSpeed = keys.shift ? playerState.runSpeed : playerState.walkSpeed;

        // Direction vectors relative to camera rotation
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerState.rotationY);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerState.rotationY);

        let moveDir = new THREE.Vector3(0, 0, 0);

        if (keys.w) moveDir.add(forward);
        if (keys.s) moveDir.sub(forward);
        if (keys.d) moveDir.add(right);
        if (keys.a) moveDir.sub(right);

        if (moveDir.lengthSq() > 0) {
            moveDir.normalize();

            // Rotate character visual towards movement direction
            const targetAngle = Math.atan2(moveDir.x, moveDir.z);
            playerMesh.rotation.y = targetAngle;
        }

        // Apply Horizontal Velocity
        playerState.position.x += moveDir.x * moveSpeed * delta;
        playerState.position.z += moveDir.z * moveSpeed * delta;

        // Jump & Gravity Physics
        if (keys.space && playerState.isGrounded) {
            playerState.velocity.y = playerState.jumpForce;
            playerState.isGrounded = false;
        }

        // Apply Gravity
        playerState.velocity.y -= playerState.gravity * delta;
        playerState.position.y += playerState.velocity.y * delta;

        // Ground Collision Check
        if (playerState.position.y <= 0) {
            playerState.position.y = 0;
            playerState.velocity.y = 0;
            playerState.isGrounded = true;
        }

        // Obstacle Collisions
        checkCollisions(playerState.position);

        // Update 3D Mesh Position
        playerMesh.position.copy(playerState.position);

        // Camera Pivot Follows Player
        cameraPivot.position.copy(playerState.position);
        cameraPivot.position.y += 1.2;
        cameraPivot.rotation.y = playerState.rotationY;
        cameraPivot.rotation.x = playerState.pitch;
    }

    renderer.render(scene, camera);
}
