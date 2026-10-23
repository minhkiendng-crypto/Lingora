/* =========================================================
   EVERWORLD - 3D GAME ENGINE & LOGIC (PHASE 1 PROTOTYPE)
   ========================================================= */

"use strict";

// CONFIGURATION
const CONFIG = {
    walkSpeed: 8.0,
    sprintSpeed: 16.0,
    acceleration: 40.0,
    deceleration: 30.0,
    jumpForce: 12.0,
    gravity: 30.0,
    playerRadius: 0.6,
    playerHeight: 1.8,
    cameraDistance: 6.0,
    cameraHeight: 2.5,
    mouseSensitivity: 0.003
};

// GLOBAL GAME STATE
const gameState = {
    isStarted: false,
    isPaused: false,
    movementState: "Đứng yên",
    hp: 100,
    chakra: 100
};

// GLOBAL INSTANCES
let world, player, cameraController, inputController;
let lastTime = 0;

/* =========================================================
   1. WORLD ENVIRONMENT & LIGHTING
   ========================================================= */
class World {
    constructor(canvas) {
        this.canvas = canvas;
        this.obstacles = []; // Array of collision Box3 objects

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a263a);
        this.scene.fog = new THREE.FogExp2(0x1a263a, 0.012);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.setupLighting();
        this.buildTerrain();
        this.buildTrainingArea();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        // Ambient Light
        const ambientLight = new THREE.AmbientLight(0x90b0ff, 0.6);
        this.scene.add(ambientLight);

        // Hemisphere Light (Sky & Ground color mix)
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2d6a4f, 0.5);
        hemiLight.position.set(0, 50, 0);
        this.scene.add(hemiLight);

        // Directional Light (Sun)
        const sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
        sunLight.position.set(25, 40, 20);
        sunLight.castShadow = true;

        // Shadow quality
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 100;
        const d = 40;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;

        this.scene.add(sunLight);
    }

    buildTerrain() {
        // Main Ground
        const groundGeo = new THREE.PlaneGeometry(100, 100, 32, 32);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x2d6a4f,
            roughness: 0.8,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Ground grid overlay for depth perception
        const gridHelper = new THREE.GridHelper(100, 50, 0x00f0ff, 0x1e3a5f);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);
    }

    buildTrainingArea() {
        // Center Chakra Monument
        const monumentGeo = new THREE.OctahedronGeometry(1.5, 0);
        const monumentMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00a8ff,
            emissiveIntensity: 0.6,
            roughness: 0.2,
            metalness: 0.8
        });
        const monument = new THREE.Mesh(monumentGeo, monumentMat);
        monument.position.set(0, 2.5, 0);
        monument.castShadow = true;
        this.scene.add(monument);
        this.monument = monument; // for animation

        // Pedestal for monument
        this.addPlatform(0, 0.5, 0, 4, 1, 4, 0x3d4a5d);

        // Training Platforms
        this.addPlatform(12, 1.5, -10, 8, 3, 8, 0x4a586e);
        this.addPlatform(12, 3.5, -10, 5, 1, 5, 0x5c6d84);

        this.addPlatform(-15, 2.0, -12, 10, 4, 6, 0x4a586e);
        this.addPlatform(-15, 4.5, -12, 6, 1, 4, 0x5c6d84);

        // Training Wooden Posts / Pillars
        const postLocations = [
            [5, 5], [8, 5], [11, 5],
            [-6, 8], [-9, 8],
            [5, -15], [-5, -15]
        ];

        postLocations.forEach(([x, z]) => {
            this.addPillar(x, z, 1.2, 3.0, 0x8b5a2b);
        });

        // Boundary Walls
        const wallMaterialColor = 0x1e293b;
        this.addBoundaryWall(0, 2.5, -48, 96, 5, 2, wallMaterialColor); // North
        this.addBoundaryWall(0, 2.5, 48, 96, 5, 2, wallMaterialColor);  // South
        this.addBoundaryWall(-48, 2.5, 0, 2, 5, 96, wallMaterialColor);  // West
        this.addBoundaryWall(48, 2.5, 0, 2, 5, 96, wallMaterialColor);   // East
    }

    addPlatform(x, y, z, width, height, depth, color) {
        const geo = new THREE.BoxGeometry(width, height, depth);
        const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Add bounding box for collision
        const box = new THREE.Box3().setFromObject(mesh);
        this.obstacles.push({ box: box, mesh: mesh, type: 'platform' });
    }

    addPillar(x, z, radius, height, color) {
        const geo = new THREE.CylinderGeometry(radius, radius, height, 16);
        const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, height / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const box = new THREE.Box3().setFromObject(mesh);
        this.obstacles.push({ box: box, mesh: mesh, type: 'pillar' });
    }

    addBoundaryWall(x, y, z, width, height, depth, color) {
        const geo = new THREE.BoxGeometry(width, height, depth);
        const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const box = new THREE.Box3().setFromObject(mesh);
        this.obstacles.push({ box: box, mesh: mesh, type: 'wall' });
    }

    update(time) {
        // Rotate monument crystal
        if (this.monument) {
            this.monument.rotation.y = time * 0.8;
            this.monument.position.y = 2.5 + Math.sin(time * 2.0) * 0.2;
        }
    }

    onWindowResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}


/* =========================================================
   2. PLAYER CHARACTER & PHYSICS/COLLISION LOGIC
   ========================================================= */
class Player {
    constructor(scene) {
        this.scene = scene;
        this.position = new THREE.Vector3(0, 1.0, 10);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.isGrounded = true;
        this.facingAngle = 0;

        this.buildMesh();
        this.resetPosition();
    }

    buildMesh() {
        this.mesh = new THREE.Group();

        // Body (Anime Outfit Torso)
        const bodyGeo = new THREE.CylinderGeometry(0.35, 0.3, 1.0, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        body.castShadow = true;
        this.mesh.add(body);

        // Chest / Coat Accent
        const coatGeo = new THREE.BoxGeometry(0.72, 0.6, 0.45);
        const coatMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
        const coat = new THREE.Mesh(coatGeo, coatMat);
        coat.position.y = 0.65;
        coat.castShadow = true;
        this.mesh.add(coat);

        // Head
        const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 }); // Hair/Skin style
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.25;
        head.castShadow = true;
        this.mesh.add(head);

        // Anime Visor / Eye glow
        const visorGeo = new THREE.BoxGeometry(0.4, 0.12, 0.35);
        const visorMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00a8ff,
            emissiveIntensity: 0.8
        });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.28, 0.12);
        this.mesh.add(visor);

        // Chakra Aura Sphere (subtle)
        const auraGeo = new THREE.SphereGeometry(0.85, 16, 16);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.15,
            wireframe: true
        });
        this.auraMesh = new THREE.Mesh(auraGeo, auraMat);
        this.auraMesh.position.y = 0.8;
        this.mesh.add(this.auraMesh);

        // Shadow blob ground mesh
        const shadowGeo = new THREE.CircleGeometry(0.6, 16);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.4,
            depthWrite: false
        });
        this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadowMesh.rotation.x = -Math.PI / 2;
        this.shadowMesh.position.y = 0.02;
        this.scene.add(this.shadowMesh);

        this.scene.add(this.mesh);
    }

    resetPosition() {
        this.position.set(0, 1.0, 10);
        this.velocity.set(0, 0, 0);
        this.isGrounded = true;
        this.mesh.position.copy(this.position);
        this.shadowMesh.position.set(0, 0.02, 10);
    }

    update(dt, inputKeys, cameraYaw, obstacles) {
        // Calculate Direction based on WASD & Camera Yaw
        let moveX = 0;
        let moveZ = 0;

        if (inputKeys['KeyW'] || inputKeys['ArrowUp']) moveZ -= 1;
        if (inputKeys['KeyS'] || inputKeys['ArrowDown']) moveZ += 1;
        if (inputKeys['KeyA'] || inputKeys['ArrowLeft']) moveX -= 1;
        if (inputKeys['KeyD'] || inputKeys['ArrowRight']) moveX += 1;

        const isMoving = (moveX !== 0 || moveZ !== 0);
        const isSprinting = isMoving && (inputKeys['ShiftLeft'] || inputKeys['ShiftRight']);
        const targetSpeed = isSprinting ? CONFIG.sprintSpeed : CONFIG.walkSpeed;

        // Vector direction relative to camera yaw
        const moveDir = new THREE.Vector3(0, 0, 0);
        if (isMoving) {
            const rawDir = new THREE.Vector3(moveX, 0, moveZ).normalize();
            // Rotate vector by cameraYaw angle
            moveDir.x = rawDir.x * Math.cos(cameraYaw) + rawDir.z * Math.sin(cameraYaw);
            moveDir.z = -rawDir.x * Math.sin(cameraYaw) + rawDir.z * Math.cos(cameraYaw);
            moveDir.normalize();

            // Smooth facing rotation toward movement direction
            this.facingAngle = Math.atan2(moveDir.x, moveDir.z);
            this.mesh.rotation.y = this.facingAngle;
        }

        // Horizontal velocity acceleration & deceleration
        const accel = isMoving ? CONFIG.acceleration : CONFIG.deceleration;
        const targetVelX = isMoving ? moveDir.x * targetSpeed : 0;
        const targetVelZ = isMoving ? moveDir.z * targetSpeed : 0;

        this.velocity.x += (targetVelX - this.velocity.x) * Math.min(accel * dt, 1.0);
        this.velocity.z += (targetVelZ - this.velocity.z) * Math.min(accel * dt, 1.0);

        // Jump handling
        if (this.isGrounded && inputKeys['Space']) {
            this.velocity.y = CONFIG.jumpForce;
            this.isGrounded = false;
        }

        // Gravity
        if (!this.isGrounded) {
            this.velocity.y -= CONFIG.gravity * dt;
        }

        // Predict next position
        const nextPos = this.position.clone();
        nextPos.x += this.velocity.x * dt;
        nextPos.y += this.velocity.y * dt;
        nextPos.z += this.velocity.z * dt;

        // Ground and Platform collision
        let highestSurface = 0.0; // Terrain ground height
        const playerRadius = CONFIG.playerRadius;

        for (const obs of obstacles) {
            const b = obs.box;
            // Check if player X,Z overlaps obstacle X,Z expanded by player radius
            if (nextPos.x >= b.min.x - playerRadius && nextPos.x <= b.max.x + playerRadius &&
                nextPos.z >= b.min.z - playerRadius && nextPos.z <= b.max.z + playerRadius) {

                // If player is falling onto top of platform
                if (this.position.y >= b.max.y - 0.2 && nextPos.y <= b.max.y + 0.1) {
                    if (b.max.y > highestSurface) {
                        highestSurface = b.max.y;
                    }
                }
            }
        }

        // Apply ground height constraint
        if (nextPos.y <= highestSurface) {
            nextPos.y = highestSurface;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        // Horizontal Wall / Box Obstacle Collision
        for (const obs of obstacles) {
            const b = obs.box;
            // Check if player height overlaps obstacle height
            if (nextPos.y < b.max.y && (nextPos.y + CONFIG.playerHeight) > b.min.y) {
                // Check X-Z bounding overlap
                if (nextPos.x > b.min.x - playerRadius && nextPos.x < b.max.x + playerRadius &&
                    nextPos.z > b.min.z - playerRadius && nextPos.z < b.max.z + playerRadius) {

                    // Calculate push-out vectors on X and Z
                    const pushXLeft = Math.abs(nextPos.x - (b.min.x - playerRadius));
                    const pushXRight = Math.abs((b.max.x + playerRadius) - nextPos.x);
                    const pushZBack = Math.abs(nextPos.z - (b.min.z - playerRadius));
                    const pushZFront = Math.abs((b.max.z + playerRadius) - nextPos.z);

                    const minPush = Math.min(pushXLeft, pushXRight, pushZBack, pushZFront);

                    if (minPush === pushXLeft) nextPos.x = b.min.x - playerRadius;
                    else if (minPush === pushXRight) nextPos.x = b.max.x + playerRadius;
                    else if (minPush === pushZBack) nextPos.z = b.min.z - playerRadius;
                    else if (minPush === pushZFront) nextPos.z = b.max.z + playerRadius;
                }
            }
        }

        // Commit updated position
        this.position.copy(nextPos);
        this.mesh.position.copy(this.position);

        // Update ground shadow blob
        this.shadowMesh.position.set(this.position.x, highestSurface + 0.02, this.position.z);

        // Animate aura
        this.auraMesh.rotation.y += dt * 2.0;

        // Update Movement State text for HUD
        if (!this.isGrounded) {
            gameState.movementState = "Đang nhảy (In Air)";
        } else if (isSprinting) {
            gameState.movementState = "Chạy nhanh (Sprint)";
        } else if (isMoving) {
            gameState.movementState = "Di chuyển (Walk)";
        } else {
            gameState.movementState = "Đứng yên (Idle)";
        }
    }
}


/* =========================================================
   3. CAMERA CONTROLLER & INPUT SYSTEM
   ========================================================= */
class CameraController {
    constructor() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );

        this.yaw = 0.0;     // Horizontal angle around target
        this.pitch = 0.35;  // Vertical angle around target
        this.distance = CONFIG.cameraDistance;

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });
    }

    addMouseDelta(deltaX, deltaY) {
        this.yaw -= deltaX * CONFIG.mouseSensitivity;
        this.pitch += deltaY * CONFIG.mouseSensitivity;

        // Clamp pitch to prevent camera flip
        this.pitch = Math.max(-0.2, Math.min(1.2, this.pitch));
    }

    update(targetPosition) {
        // Target focus point (Player chest/head height)
        const target = targetPosition.clone();
        target.y += CONFIG.cameraHeight;

        // Calculate camera offset position based on spherical angles
        const offsetX = this.distance * Math.sin(this.yaw) * Math.cos(this.pitch);
        const offsetY = this.distance * Math.sin(this.pitch);
        const offsetZ = this.distance * Math.cos(this.yaw) * Math.cos(this.pitch);

        const idealCameraPos = new THREE.Vector3(
            target.x + offsetX,
            target.y + offsetY,
            target.z + offsetZ
        );

        // Smooth camera movement interpolation
        this.camera.position.lerp(idealCameraPos, 0.2);
        this.camera.lookAt(target);
    }
}

class InputController {
    constructor(canvas, cameraController) {
        this.canvas = canvas;
        this.cameraController = cameraController;
        this.keys = {};
        this.isMouseDown = false;

        this.setupKeyboardListeners();
        this.setupMouseListeners();
    }

    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            // Esc key toggles Pause
            if (e.code === 'Escape' && gameState.isStarted) {
                togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    setupMouseListeners() {
        // Mouse Drag or Pointer Look
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0 || e.button === 2) { // Left or Right click
                this.isMouseDown = true;
            }
        });

        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (!gameState.isStarted || gameState.isPaused) return;

            // Rotate camera if dragging mouse or pointer locked
            if (this.isMouseDown || document.pointerLockElement === this.canvas) {
                this.cameraController.addMouseDelta(e.movementX, e.movementY);
            }
        });

        // Click canvas to request pointer lock if desired
        this.canvas.addEventListener('click', () => {
            if (gameState.isStarted && !gameState.isPaused && document.pointerLockElement !== this.canvas) {
                this.canvas.requestPointerLock?.();
            }
        });
    }
}


/* =========================================================
   4. GAME LOOPS & UI STATE MANAGERS
   ========================================================= */
function startGame() {
    const startScreen = document.getElementById('startScreen');
    const hudOverlay = document.getElementById('hudOverlay');

    startScreen.classList.remove('active');
    startScreen.classList.add('hidden');

    hudOverlay.classList.remove('hidden');
    hudOverlay.classList.add('active');

    gameState.isStarted = true;
    gameState.isPaused = false;
}

function togglePause() {
    if (!gameState.isStarted) return;

    const pauseScreen = document.getElementById('pauseScreen');
    gameState.isPaused = !gameState.isPaused;

    if (gameState.isPaused) {
        pauseScreen.classList.remove('hidden');
        pauseScreen.classList.add('active');
        if (document.pointerLockElement) {
            document.exitPointerLock?.();
        }
    } else {
        pauseScreen.classList.remove('active');
        pauseScreen.classList.add('hidden');
    }
}

function resumeGame() {
    if (gameState.isPaused) {
        togglePause();
    }
}

function resetPlayerPosition() {
    if (player) {
        player.resetPosition();
    }
    resumeGame();
}

function animate(timestamp) {
    requestAnimationFrame(animate);

    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000.0, 0.1); // clamp delta time
    lastTime = timestamp;

    if (gameState.isStarted && !gameState.isPaused) {
        // Update 3D World
        world.update(timestamp / 1000.0);

        // Update Player Physics and Collision
        player.update(dt, inputController.keys, cameraController.yaw, world.obstacles);

        // Update Third Person Camera
        cameraController.update(player.position);

        // Update HUD text
        const stateBadge = document.getElementById('stateBadge');
        if (stateBadge) {
            stateBadge.textContent = "Trạng thái: " + gameState.movementState;
        }
    }

    // Render Scene
    if (world && cameraController) {
        world.renderer.render(world.scene, cameraController.camera);
    }
}

/* =========================================================
   INITIALIZATION
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');

    // Initialize 3D Engine Modules
    world = new World(canvas);
    player = new Player(world.scene);
    cameraController = new CameraController();
    inputController = new InputController(canvas, cameraController);

    // Initial camera position before start
    cameraController.update(player.position);

    // Bind UI Buttons
    document.getElementById('btnStartGame')?.addEventListener('click', startGame);
    document.getElementById('btnPauseGame')?.addEventListener('click', togglePause);
    document.getElementById('btnResumeGame')?.addEventListener('click', resumeGame);
    document.getElementById('btnResetPlayer')?.addEventListener('click', resetPlayerPosition);

    // Start render loop
    requestAnimationFrame(animate);
});
