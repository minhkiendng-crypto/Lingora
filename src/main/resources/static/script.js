/* =========================================================
   EVERWORLD - 3D ANIME ACTION RPG ENGINE
   Phase 1 Playable Prototype: Training Meadow & 3D Movement
   ========================================================= */

"use strict";

(function () {
    // Game Global State
    const STATE = {
        isRunning: false,
        isPaused: false,
        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,
        staminaRegenRate: 20, // per sec
        staminaDrainRate: 35, // per sec
        speed: 0,
        playerStateStr: "Đứng yên"
    };

    // Movement Constants
    const MOVE_CONFIG = {
        walkSpeed: 7.0,
        sprintSpeed: 13.5,
        accel: 25.0,
        decel: 18.0,
        jumpForce: 11.5,
        gravity: 28.0,
        playerRadius: 0.6,
        playerHeight: 1.8
    };

    // DOM Elements
    const elements = {
        startScreen: document.getElementById("startScreen"),
        pauseScreen: document.getElementById("pauseScreen"),
        hud: document.getElementById("hud"),
        hpBar: document.getElementById("hp-bar"),
        staminaBar: document.getElementById("stamina-bar"),
        playerStateText: document.getElementById("player-state"),
        playerSpeedText: document.getElementById("player-speed"),
        playerPosText: document.getElementById("player-pos"),
        container: document.getElementById("canvas-container")
    };

    // Input Controller
    const keys = {
        w: false,
        a: false,
        s: false,
        d: false,
        shift: false,
        space: false
    };

    // Three.js Core Objects
    let scene, camera, renderer;
    let clock;
    let playerMesh, playerBody, characterGroup;
    let obstacles = []; // Bounding boxes for collision

    // Player Velocity & Physics
    const playerPos = new THREE.Vector3(0, MOVE_CONFIG.playerHeight / 2, 0);
    const playerVel = new THREE.Vector3(0, 0, 0);
    let isGrounded = true;
    let playerYaw = 0;

    // Third-person Camera Parameters
    const cameraConfig = {
        distance: 7.5,
        height: 3.2,
        yaw: 0,
        pitch: 0.25,
        minPitch: -0.2,
        maxPitch: 1.1,
        smoothFactor: 12.0
    };

    let isMouseDown = false;
    let previousMousePosition = { x: 0, y: 0 };

    /* =========================================================
       1. WORLD & SCENE SETUP
       ========================================================= */
    function initScene() {
        clock = new THREE.Clock();

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a1026);
        scene.fog = new THREE.FogExp2(0x0a1026, 0.015);

        // Camera
        camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        elements.container.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.6);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
        dirLight.position.set(30, 50, 20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 150;
        const d = 40;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        scene.add(dirLight);

        // Hemisphere Light for soft sky/ground contrast
        const hemiLight = new THREE.HemisphereLight(0x00f0ff, 0x111e38, 0.5);
        scene.add(hemiLight);

        // Environment Construction
        createEnvironment();

        // Player Character Construction
        createPlayerCharacter();

        // Event Listeners
        window.addEventListener("resize", onWindowResize, false);
        setupControls();
    }

    /* =========================================================
       2. ENVIRONMENT & TRAINING AREA
       ========================================================= */
    function createEnvironment() {
        // Ground Terrain
        const groundGeo = new THREE.PlaneGeometry(200, 200, 64, 64);

        // Custom Grid Grass Material
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x1b3b2b,
            roughness: 0.8,
            metalness: 0.1
        });

        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Grid overlay
        const gridHelper = new THREE.GridHelper(200, 40, 0x00f0ff, 0x1e3a5f);
        gridHelper.position.y = 0.02;
        scene.add(gridHelper);

        // Central Arena Platform
        const arenaGeo = new THREE.CylinderGeometry(18, 18.5, 0.4, 32);
        const arenaMat = new THREE.MeshStandardMaterial({
            color: 0x2a3d5e,
            roughness: 0.5,
            metalness: 0.2
        });
        const arena = new THREE.Mesh(arenaGeo, arenaMat);
        arena.position.set(0, 0.2, 0);
        arena.receiveShadow = true;
        arena.castShadow = true;
        scene.add(arena);

        // Arena Glowing Ring Accent
        const ringGeo = new THREE.RingGeometry(17, 18, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(0, 0.41, 0);
        scene.add(ring);

        // Training Dummies / Target Pillars
        const dummyPositions = [
            { x: -8, z: -8 },
            { x: 8, z: -8 },
            { x: -10, z: 6 },
            { x: 10, z: 6 },
            { x: 0, z: -14 }
        ];

        dummyPositions.forEach((pos) => {
            createTrainingDummy(pos.x, pos.z);
        });

        // Boundary Stone Pillars & Fantasy Trees
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const radius = 35 + (i % 2) * 5;
            const px = Math.cos(angle) * radius;
            const pz = Math.sin(angle) * radius;
            createStonePillar(px, pz);
        }

        // Energy Crystals
        const crystalPositions = [
            { x: -18, z: -20 },
            { x: 20, z: -15 },
            { x: -22, z: 18 },
            { x: 19, z: 22 }
        ];
        crystalPositions.forEach((pos) => {
            createCrystal(pos.x, pos.z);
        });
    }

    function createTrainingDummy(x, z) {
        const group = new THREE.Group();

        // Base post
        const postGeo = new THREE.CylinderGeometry(0.3, 0.35, 2.4, 16);
        const postMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.y = 1.2;
        post.castShadow = true;
        post.receiveShadow = true;
        group.add(post);

        // Target Body
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.6 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.6;
        body.castShadow = true;
        group.add(body);

        // Target Mark
        const markGeo = new THREE.CircleGeometry(0.25, 16);
        const markMat = new THREE.MeshBasicMaterial({ color: 0xff3366, side: THREE.DoubleSide });
        const mark = new THREE.Mesh(markGeo, markMat);
        mark.position.set(0, 1.6, 0.51);
        group.add(mark);

        group.position.set(x, 0, z);
        scene.add(group);

        // Add collision box
        const bbox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(x, 1.2, z),
            new THREE.Vector3(1.1, 2.4, 1.1)
        );
        obstacles.push(bbox);
    }

    function createStonePillar(x, z) {
        const height = 4 + Math.random() * 3;
        const pillarGeo = new THREE.CylinderGeometry(0.8, 1.2, height, 8);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3a4b68, roughness: 0.9 });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(x, height / 2, z);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        scene.add(pillar);

        const bbox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(x, height / 2, z),
            new THREE.Vector3(2.0, height, 2.0)
        );
        obstacles.push(bbox);
    }

    function createCrystal(x, z) {
        const crystalGeo = new THREE.OctahedronGeometry(1.2, 0);
        const crystalMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x0088cc,
            emissiveIntensity: 0.6,
            roughness: 0.2,
            metalness: 0.8
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.set(x, 2.0, z);
        crystal.castShadow = true;
        scene.add(crystal);

        // Point Light
        const light = new THREE.PointLight(0x00f0ff, 1.5, 12);
        light.position.set(x, 2.0, z);
        scene.add(light);
    }

    /* =========================================================
       3. PLAYER CHARACTER CREATION
       ========================================================= */
    function createPlayerCharacter() {
        characterGroup = new THREE.Group();

        // Main Torso / Body (Anime Stylized Outfit)
        const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.9, 8, 16);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.4,
            metalness: 0.2
        });
        playerBody = new THREE.Mesh(bodyGeo, bodyMat);
        playerBody.position.y = 0.85;
        playerBody.castShadow = true;
        characterGroup.add(playerBody);

        // Head
        const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.5 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 1.55, 0);
        head.castShadow = true;
        characterGroup.add(head);

        // Anime Hair / Headband Accent
        const bandGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.1, 16);
        const bandMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.set(0, 1.62, 0);
        characterGroup.add(band);

        // Face Eyes (Forward Indicator)
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const eyeGeo = new THREE.BoxGeometry(0.08, 0.06, 0.05);

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.11, 1.58, 0.28);
        characterGroup.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.11, 1.58, 0.28);
        characterGroup.add(rightEye);

        // Scarf / Cape Accent
        const capeGeo = new THREE.BoxGeometry(0.5, 0.8, 0.08);
        const capeMat = new THREE.MeshStandardMaterial({ color: 0x8a2be2, roughness: 0.3 });
        const cape = new THREE.Mesh(capeGeo, capeMat);
        cape.position.set(0, 1.1, -0.38);
        cape.rotation.x = 0.2;
        characterGroup.add(cape);

        // Direction Arrow Pointer on Ground
        const arrowGeo = new THREE.ConeGeometry(0.2, 0.5, 3);
        arrowGeo.rotateX(Math.PI / 2);
        const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.position.set(0, 0.05, 0.8);
        characterGroup.add(arrow);

        characterGroup.position.copy(playerPos);
        scene.add(characterGroup);
    }

    /* =========================================================
       4. INPUT & EVENT HANDLERS
       ========================================================= */
    function setupControls() {
        window.addEventListener("keydown", (e) => {
            if (!STATE.isRunning) return;

            switch (e.code) {
                case "KeyW": keys.w = true; break;
                case "KeyA": keys.a = true; break;
                case "KeyS": keys.s = true; break;
                case "KeyD": keys.d = true; break;
                case "ShiftLeft":
                case "ShiftRight": keys.shift = true; break;
                case "Space":
                    keys.space = true;
                    e.preventDefault();
                    break;
                case "Escape":
                    togglePause();
                    break;
            }
        });

        window.addEventListener("keyup", (e) => {
            switch (e.code) {
                case "KeyW": keys.w = false; break;
                case "KeyA": keys.a = false; break;
                case "KeyS": keys.s = false; break;
                case "KeyD": keys.d = false; break;
                case "ShiftLeft":
                case "ShiftRight": keys.shift = false; break;
                case "Space": keys.space = false; break;
            }
        });

        // Mouse Drag / Look controls
        const canvas = renderer.domElement;

        canvas.addEventListener("mousedown", (e) => {
            if (e.button === 0 || e.button === 2) {
                isMouseDown = true;
                previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener("mouseup", () => {
            isMouseDown = false;
        });

        window.addEventListener("mousemove", (e) => {
            if (!isMouseDown || STATE.isPaused) return;

            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            cameraConfig.yaw -= deltaX * 0.005;
            cameraConfig.pitch += deltaY * 0.005;

            // Clamp pitch angle
            cameraConfig.pitch = Math.max(
                cameraConfig.minPitch,
                Math.min(cameraConfig.maxPitch, cameraConfig.pitch)
            );

            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        // Touch support for camera rotation
        canvas.addEventListener("touchstart", (e) => {
            if (e.touches.length === 1) {
                isMouseDown = true;
                previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });

        canvas.addEventListener("touchmove", (e) => {
            if (!isMouseDown || STATE.isPaused || e.touches.length === 0) return;

            const deltaX = e.touches[0].clientX - previousMousePosition.x;
            const deltaY = e.touches[0].clientY - previousMousePosition.y;

            cameraConfig.yaw -= deltaX * 0.007;
            cameraConfig.pitch += deltaY * 0.007;
            cameraConfig.pitch = Math.max(
                cameraConfig.minPitch,
                Math.min(cameraConfig.maxPitch, cameraConfig.pitch)
            );

            previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        });

        canvas.addEventListener("touchend", () => {
            isMouseDown = false;
        });
    }

    function onWindowResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /* =========================================================
       5. GAME LOOP & PHYSICS UPDATE
       ========================================================= */
    function updatePhysics(dt) {
        if (!STATE.isRunning || STATE.isPaused) return;

        // 1. Determine Movement Direction from Input relative to Camera Yaw
        const inputDir = new THREE.Vector3(0, 0, 0);

        if (keys.w) inputDir.z += 1;
        if (keys.s) inputDir.z -= 1;
        if (keys.a) inputDir.x += 1;
        if (keys.d) inputDir.x -= 1;

        const isMoving = inputDir.lengthSq() > 0;

        // 2. Stamina & Sprint Logic
        let currentTargetSpeed = MOVE_CONFIG.walkSpeed;

        if (isMoving && keys.shift && STATE.stamina > 5) {
            currentTargetSpeed = MOVE_CONFIG.sprintSpeed;
            STATE.stamina = Math.max(0, STATE.stamina - MOVE_CONFIG.staminaDrainRate * dt);
        } else {
            STATE.stamina = Math.min(STATE.maxStamina, STATE.stamina + MOVE_CONFIG.staminaRegenRate * dt);
        }

        // 3. Accelerate / Decelerate Horizontal Velocity
        if (isMoving) {
            inputDir.normalize();

            // Transform input vector according to Camera's Yaw angle
            const forward = new THREE.Vector3(
                -Math.sin(cameraConfig.yaw),
                0,
                -Math.cos(cameraConfig.yaw)
            ).normalize();

            const right = new THREE.Vector3(
                Math.cos(cameraConfig.yaw),
                0,
                -Math.sin(cameraConfig.yaw)
            ).normalize();

            const moveDir = new THREE.Vector3()
                .addScaledVector(forward, inputDir.z)
                .addScaledVector(right, inputDir.x)
                .normalize();

            // Desired Horizontal Velocity
            const targetVelX = moveDir.x * currentTargetSpeed;
            const targetVelZ = moveDir.z * currentTargetSpeed;

            playerVel.x = THREE.MathUtils.lerp(playerVel.x, targetVelX, MOVE_CONFIG.accel * dt);
            playerVel.z = THREE.MathUtils.lerp(playerVel.z, targetVelZ, MOVE_CONFIG.accel * dt);

            // Orient Character facing direction
            playerYaw = Math.atan2(moveDir.x, moveDir.z);
        } else {
            // Decelerate smoothly to 0
            playerVel.x = THREE.MathUtils.lerp(playerVel.x, 0, MOVE_CONFIG.decel * dt);
            playerVel.z = THREE.MathUtils.lerp(playerVel.z, 0, MOVE_CONFIG.decel * dt);
        }

        // 4. Vertical Gravity & Jump Logic
        if (isGrounded) {
            if (keys.space) {
                playerVel.y = MOVE_CONFIG.jumpForce;
                isGrounded = false;
            } else {
                playerVel.y = 0;
            }
        } else {
            playerVel.y -= MOVE_CONFIG.gravity * dt;
        }

        // 5. Apply Position Updates with Obstacle Collision
        const nextPos = playerPos.clone().addScaledVector(playerVel, dt);

        // Check Ground Plane
        if (nextPos.y <= MOVE_CONFIG.playerHeight / 2) {
            nextPos.y = MOVE_CONFIG.playerHeight / 2;
            playerVel.y = 0;
            isGrounded = true;
        } else {
            isGrounded = false;
        }

        // Check Obstacle Bounding Box Collisions
        const nextPlayerBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(nextPos.x, nextPos.y, nextPos.z),
            new THREE.Vector3(MOVE_CONFIG.playerRadius * 2, MOVE_CONFIG.playerHeight, MOVE_CONFIG.playerRadius * 2)
        );

        for (let obs of obstacles) {
            if (nextPlayerBox.intersectsBox(obs)) {
                // Revert horizontal movement on collision
                nextPos.x = playerPos.x;
                nextPos.z = playerPos.z;
                playerVel.x = 0;
                playerVel.z = 0;
                break;
            }
        }

        playerPos.copy(nextPos);

        // Update Mesh Position and Smooth Rotation
        characterGroup.position.copy(playerPos);
        characterGroup.rotation.y = THREE.MathUtils.lerp(characterGroup.rotation.y, playerYaw, 15.0 * dt);

        // Update Speed State Metrics
        const horizontalSpeed = Math.sqrt(playerVel.x * playerVel.x + playerVel.z * playerVel.z);
        STATE.speed = horizontalSpeed;

        if (!isGrounded) {
            STATE.playerStateStr = "Đang nhảy";
        } else if (horizontalSpeed > 8.0) {
            STATE.playerStateStr = "Đang chạy nhanh";
        } else if (horizontalSpeed > 0.5) {
            STATE.playerStateStr = "Đang đi bộ";
        } else {
            STATE.playerStateStr = "Đứng yên";
        }

        // Update Camera Position (Third-Person Orbit Follow)
        updateCamera(dt);

        // Update HUD Display
        updateHUD();
    }

    function updateCamera(dt) {
        // Desired camera target position behind player
        const cosP = Math.cos(cameraConfig.pitch);
        const sinP = Math.sin(cameraConfig.pitch);
        const sinY = Math.sin(cameraConfig.yaw);
        const cosY = Math.cos(cameraConfig.yaw);

        const offsetX = cameraConfig.distance * cosP * sinY;
        const offsetY = cameraConfig.distance * sinP + cameraConfig.height;
        const offsetZ = cameraConfig.distance * cosP * cosY;

        const targetCamPos = new THREE.Vector3(
            playerPos.x + offsetX,
            playerPos.y + offsetY,
            playerPos.z + offsetZ
        );

        // Smooth camera follow
        camera.position.lerp(targetCamPos, cameraConfig.smoothFactor * dt);

        // Look at player chest height
        const lookTarget = new THREE.Vector3(
            playerPos.x,
            playerPos.y + 1.2,
            playerPos.z
        );
        camera.lookAt(lookTarget);
    }

    function updateHUD() {
        if (!elements.hud) return;

        elements.staminaBar.style.width = `${(STATE.stamina / STATE.maxStamina) * 100}%`;
        elements.hpBar.style.width = `${(STATE.hp / STATE.maxHp) * 100}%`;

        elements.playerStateText.textContent = `Trạng thái: ${STATE.playerStateStr}`;
        elements.playerSpeedText.textContent = `Tốc độ: ${STATE.speed.toFixed(1)} m/s`;
        elements.playerPosText.textContent = `Vị trí: X: ${playerPos.x.toFixed(1)} | Y: ${playerPos.y.toFixed(1)} | Z: ${playerPos.z.toFixed(1)}`;
    }

    /* =========================================================
       6. UI & STATE CONTROL API
       ========================================================= */
    function startGame() {
        console.log("EVERWORLD: Khởi chạy game!");

        STATE.isRunning = true;
        STATE.isPaused = false;

        elements.startScreen.classList.remove("active");
        elements.startScreen.classList.add("hidden");

        elements.pauseScreen.classList.add("hidden");
        elements.hud.classList.remove("hidden");

        resetPlayerPosition();
    }

    function togglePause() {
        if (!STATE.isRunning) return;

        STATE.isPaused = !STATE.isPaused;

        if (STATE.isPaused) {
            elements.pauseScreen.classList.remove("hidden");
            elements.pauseScreen.classList.add("active");
        } else {
            elements.pauseScreen.classList.remove("active");
            elements.pauseScreen.classList.add("hidden");
        }
    }

    function resumeGame() {
        STATE.isPaused = false;
        elements.pauseScreen.classList.remove("active");
        elements.pauseScreen.classList.add("hidden");
    }

    function resetPlayerPosition() {
        playerPos.set(0, MOVE_CONFIG.playerHeight / 2, 0);
        playerVel.set(0, 0, 0);
        STATE.stamina = STATE.maxStamina;
        STATE.hp = STATE.maxHp;
        cameraConfig.yaw = 0;
        cameraConfig.pitch = 0.25;
        if (characterGroup) {
            characterGroup.position.copy(playerPos);
            characterGroup.rotation.y = 0;
        }
    }

    function animate() {
        requestAnimationFrame(animate);

        const dt = Math.min(clock.getDelta(), 0.1);

        updatePhysics(dt);

        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    // Initialize when DOM ready
    document.addEventListener("DOMContentLoaded", () => {
        initScene();
        animate();
    });

    // Global Export
    window.EVERWORLD = {
        startGame,
        togglePause,
        resumeGame,
        resetPlayerPosition,
        STATE
    };
})();
