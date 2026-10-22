/* =========================================================
   EVERWORLD - 3D Character Controller, Parkour & Combat Arena Engine
   Milestone: Control System + Combat Arena (Stage 3)
   ========================================================= */

"use strict";

window.Everworld = (function () {
    // Canvas & Three.js references
    let container, canvas, renderer, scene, camera;
    let clock, deltaTime = 0;

    // Game objects & lists
    let playerMesh, playerBody;
    let colliders = [];      // Objects player can collide with
    let vaultables = [];     // Low barriers (vault)
    let mantlables = [];     // Ledge / mantle obstacles
    let wallRunWalls = [];   // Vertical walls for wall running
    let grappleAnchors = []; // Grapple target anchors

    // Grapple visual cable line
    let grappleLine;

    // Movement States enum
    const State = {
        GROUNDED: "Grounded",
        SLIDING: "Sliding",
        AIRBORNE: "Airborne",
        WALL_RUNNING: "WallRunning",
        VAULTING: "Vaulting",
        MANTLING: "Mantling",
        LEDGE_GRABBING: "LedgeGrabbing",
        GRAPPLING: "Grappling",
        AIR_DASHING: "AirDashing"
    };

    // Enemy AI States enum
    const EnemyState = {
        IDLE: "Idle",
        DETECT: "Detect",
        APPROACH: "Approach",
        TELEGRAPH: "Telegraph",
        ATTACK: "Attack",
        RECOVER: "Recover",
        RETURN: "Return",
        DEAD: "Dead"
    };

    // Configuration parameters
    const Config = {
        // Basic speeds
        walkSpeed: 6.0,
        runSpeed: 11.0,
        sprintSpeed: 15.0,
        acceleration: 45.0,
        deceleration: 35.0,
        airControl: 18.0,
        gravity: 28.0,

        // Jump parameters
        jumpImpulse: 12.0,
        longJumpForwardImpulse: 9.0,
        longJumpUpImpulse: 10.0,

        // SLIDING PARAMETERS (Exact spec requirements)
        slideInitialSpeed: 20.0,
        slideMaxSpeed: 20.0,
        slideDeceleration: 14.0,
        slideMinSpeedToCancel: 0.0,

        // Wall run
        wallRunSpeed: 13.0,
        wallRunGravity: 4.5,
        wallRunMaxTime: 2.2,
        wallJumpUpImpulse: 12.0,
        wallJumpSideImpulse: 10.0,

        // Vault / Mantle / Ledge
        vaultSpeed: 12.0,
        mantleSpeed: 8.0,

        // Grapple
        grapplePullForce: 45.0,
        grappleMaxDistance: 50.0,

        // Air dash
        airDashImpulse: 24.0,
        airDashDuration: 0.18,

        // Player bounds
        playerRadius: 0.5,
        playerHeight: 1.8,
        crouchHeight: 0.9,
        eyeHeight: 1.6,
        crouchEyeHeight: 0.8
    };

    // Player State Variables
    let currentState = State.GROUNDED;
    let position = new THREE.Vector3(0, 1.0, 0);
    let velocity = new THREE.Vector3(0, 0, 0);

    // Slide specific variables
    let slideSpeed = 0;
    let slideDirection = new THREE.Vector3(0, 0, 1);
    let ctrlWasPressed = false;

    // Camera parameters
    let isFirstPerson = false;
    let cameraPitch = 0;
    let cameraYaw = Math.PI;
    let cameraDistance = 4.5;
    let cameraCurrentOffset = new THREE.Vector3(0, 1.6, 0);

    // Wall run state variables
    let wallRunNormal = new THREE.Vector3();
    let wallRunDirection = new THREE.Vector3();
    let wallRunTimer = 0;

    // Mantle state variables
    let mantleStartPos = new THREE.Vector3();
    let mantleTargetPos = new THREE.Vector3();
    let mantleTimer = 0;
    let mantleDuration = 0.35;

    // Grapple state variables
    let currentGrappleAnchor = null;
    let grapplePoint = new THREE.Vector3();

    // Air dash state variables
    let canAirDash = true;
    let airDashTimer = 0;
    let airDashDir = new THREE.Vector3();

    // =========================================================
    // COMBAT SYSTEM STATE VARIABLES
    // =========================================================
    const PlayerCombat = {
        maxHealth: 100,
        health: 100,
        isDead: false,
        isDodging: false,
        dodgeTimer: 0,
        dodgeDuration: 0.4, // Invulnerability window
        dodgeCooldown: 0.8,
        dodgeCooldownTimer: 0,

        meleeDamage: 25,
        meleeRange: 4.2,
        meleeCooldown: 0.35,
        meleeTimer: 0,

        skillDamage: 55,
        skillRange: 12.0,
        skillCooldown: 3.0,
        skillTimer: 0,

        isAttacking: false,
        attackVisualTimer: 0
    };

    const EnemyCombat = {
        mesh: null,
        spawnPos: new THREE.Vector3(-40, 1.0, -30),
        position: new THREE.Vector3(-40, 1.0, -30),
        velocity: new THREE.Vector3(0, 0, 0),
        state: EnemyState.IDLE,
        maxHealth: 150,
        health: 150,
        detectRadius: 20.0,
        attackRange: 3.8,
        moveSpeed: 6.5,

        telegraphTimer: 0,
        telegraphDuration: 0.8, // Clear warning duration
        telegraphRing: null,

        attackTimer: 0,
        attackDuration: 0.3,
        attackDamage: 20,

        recoverTimer: 0,
        recoverDuration: 1.2,

        hitFlashTimer: 0,
        meshMaterial: null
    };

    let particles = [];
    let damageNumbers = [];
    let matchEnded = false;

    // Input state
    const keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false,
        crouch: false,
        jump: false,
        grapple: false,
        airDash: false,
        melee: false,
        skill: false,
        dodge: false
    };

    let spaceWasPressed = false;
    let grappleWasPressed = false;
    let airDashWasPressed = false;
    let meleeWasPressed = false;
    let skillWasPressed = false;
    let dodgeWasPressed = false;

    let mouseSensitivity = 0.0022;
    let isMouseLocked = false;

    // UI elements
    let hudElement, speedometerEl, stateBadgeEl, viewBtnEl;
    let playerHealthBarEl, enemyHealthBarEl, skillCooldownEl, matchOverlayEl, combatInfoEl;

    /* =========================================================
       INITIALIZATION
       ========================================================= */

    function init(targetContainerId) {
        container = document.getElementById(targetContainerId) || document.body;

        // Clear existing canvas if re-initialized
        const oldCanvas = document.getElementById("everworldCanvas");
        if (oldCanvas) oldCanvas.remove();

        // Create canvas
        canvas = document.createElement("canvas");
        canvas.id = "everworldCanvas";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        container.appendChild(canvas);

        // Three.js Scene Setup
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f172a);
        scene.fog = new THREE.FogExp2(0x0f172a, 0.012);

        // Camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);

        // Renderer
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        clock = new THREE.Clock();

        // Reset combat state
        resetCombatState();

        // Build Scene
        setupLighting();
        buildParkourCourse();
        buildCombatArena();
        createPlayerMesh();
        createEnemyMesh();
        setupHUD();
        setupEventListeners();

        // Start Loop
        requestAnimationFrame(animate);
    }

    function resetCombatState() {
        PlayerCombat.health = PlayerCombat.maxHealth;
        PlayerCombat.isDead = false;
        PlayerCombat.isDodging = false;
        PlayerCombat.dodgeTimer = 0;
        PlayerCombat.dodgeCooldownTimer = 0;
        PlayerCombat.meleeTimer = 0;
        PlayerCombat.skillTimer = 0;

        EnemyCombat.health = EnemyCombat.maxHealth;
        EnemyCombat.state = EnemyState.IDLE;
        EnemyCombat.position.copy(EnemyCombat.spawnPos);
        if (EnemyCombat.mesh) {
            EnemyCombat.mesh.position.copy(EnemyCombat.spawnPos);
            EnemyCombat.mesh.visible = true;
        }

        matchEnded = false;
        position.set(0, 1.0, 0);
        velocity.set(0, 0, 0);
        currentState = State.GROUNDED;

        if (matchOverlayEl) {
            matchOverlayEl.style.display = "none";
        }
    }

    /* =========================================================
       LIGHTING & ENVIRONMENT
       ========================================================= */

    function setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(40, 60, 30);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 150;
        const d = 50;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        scene.add(dirLight);

        const pointLight = new THREE.PointLight(0x1cb0f6, 1.5, 30);
        pointLight.position.set(0, 10, 0);
        scene.add(pointLight);

        // Red spotlight for combat arena
        const arenaLight = new THREE.PointLight(0xef4444, 2.0, 40);
        arenaLight.position.set(-40, 15, -30);
        scene.add(arenaLight);
    }

    /* =========================================================
       3D PARKOUR TEST COURSE
       ========================================================= */

    function buildParkourCourse() {
        colliders = [];
        vaultables = [];
        mantlables = [];
        wallRunWalls = [];
        grappleAnchors = [];

        // Materials
        const matGround = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const matPlatform = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
        const matWall = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 });
        const matVault = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 }); // Orange
        const matMantle = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 }); // Green
        const matRamp = new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.5 });  // Indigo
        const matAnchor = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, roughness: 0.2 });

        function addBox(x, y, z, w, h, d, material, type = "collider") {
            const geo = new THREE.BoxGeometry(w, h, d);
            const mesh = new THREE.Mesh(geo, material);
            mesh.position.set(x, y, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);

            const item = {
                mesh,
                min: new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
                max: new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2),
                type, w, h, d, x, y, z
            };

            colliders.push(item);
            if (type === "vault") vaultables.push(item);
            if (type === "mantle") mantlables.push(item);
            if (type === "wall") wallRunWalls.push(item);

            return item;
        }

        // 1. Main Ground
        addBox(0, -0.5, 0, 140, 1, 140, matGround);

        // Grid
        const grid = new THREE.GridHelper(140, 70, 0x58cc02, 0x334155);
        grid.position.y = 0.01;
        scene.add(grid);

        // 2. Sliding Ramp & Platform
        addBox(-20, 5, 20, 14, 1, 14, matPlatform);
        const rampGeo = new THREE.BoxGeometry(10, 1, 22);
        const rampMesh = new THREE.Mesh(rampGeo, matRamp);
        rampMesh.rotation.x = 0.25;
        rampMesh.position.set(-20, 2.3, 5);
        rampMesh.castShadow = true;
        rampMesh.receiveShadow = true;
        scene.add(rampMesh);

        // 3. Wall Running Channel (Left wall & Right wall)
        addBox(-8, 6, -15, 0.8, 12, 30, matWall, "wall");
        addBox(0, 6, -15, 0.8, 12, 30, matWall, "wall");

        // 4. Vault Barriers (Height ~ 1.2m)
        addBox(12, 0.6, 5, 8, 1.2, 0.8, matVault, "vault");
        addBox(12, 0.6, 15, 8, 1.2, 0.8, matVault, "vault");

        // 5. Mantle / Ledge Blocks (Heights 2.5m, 4.0m, 6.0m)
        addBox(24, 1.25, -5, 6, 2.5, 4, matMantle, "mantle");
        addBox(24, 2.0, -15, 6, 4.0, 4, matMantle, "mantle");
        addBox(24, 3.0, -25, 6, 6.0, 4, matMantle, "mantle");

        // 6. Air Dash & Gap Platforms
        addBox(0, 3, 25, 6, 1, 6, matPlatform);
        addBox(0, 3, 42, 6, 1, 6, matPlatform);
        addBox(0, 3, 62, 6, 1, 6, matPlatform);

        // 7. Grapple Targets
        const anchorPositions = [
            new THREE.Vector3(-4, 12, -15),
            new THREE.Vector3(0, 11, 33.5),
            new THREE.Vector3(0, 12, 52),
            new THREE.Vector3(24, 10, -10),
            new THREE.Vector3(24, 12, -20)
        ];

        anchorPositions.forEach((pos, idx) => {
            const geo = new THREE.SphereGeometry(0.8, 16, 16);
            const mesh = new THREE.Mesh(geo, matAnchor);
            mesh.position.copy(pos);
            scene.add(mesh);

            const ringGeo = new THREE.TorusGeometry(1.2, 0.1, 8, 24);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(pos);
            ring.rotation.x = Math.PI / 2;
            scene.add(ring);

            grappleAnchors.push({ position: pos, mesh, ring, id: idx });
        });

        // Grapple line
        const lineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 3 });
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(),
            new THREE.Vector3()
        ]);
        grappleLine = new THREE.Line(lineGeo, lineMat);
        grappleLine.visible = false;
        scene.add(grappleLine);
    }

    /* =========================================================
       3D COMBAT ARENA
       ========================================================= */

    function buildCombatArena() {
        const arenaCenter = new THREE.Vector3(-40, 0, -30);

        // Arena Platform Ring
        const arenaGeo = new THREE.CylinderGeometry(22, 22, 0.8, 32);
        const arenaMat = new THREE.MeshStandardMaterial({ color: 0x3f1d38, roughness: 0.4, metalness: 0.2 });
        const arenaMesh = new THREE.Mesh(arenaGeo, arenaMat);
        arenaMesh.position.set(arenaCenter.x, -0.4, arenaCenter.z);
        arenaMesh.receiveShadow = true;
        scene.add(arenaMesh);

        // Arena Outer Ring Marker
        const ringGeo = new THREE.RingGeometry(21.5, 22, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.set(arenaCenter.x, 0.02, arenaCenter.z);
        scene.add(ringMesh);

        // Arena Entrance Pillars
        const pillarGeo = new THREE.BoxGeometry(2, 8, 2);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.3 });
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const px = arenaCenter.x + Math.cos(angle) * 22;
            const pz = arenaCenter.z + Math.sin(angle) * 22;
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(px, 4, pz);
            pillar.castShadow = true;
            scene.add(pillar);
        }

        // Telegraph Ring (Red Warning Ring on ground for Telegraph state)
        const teleGeo = new THREE.RingGeometry(0.1, EnemyCombat.attackRange, 32);
        const teleMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
        EnemyCombat.telegraphRing = new THREE.Mesh(teleGeo, teleMat);
        EnemyCombat.telegraphRing.rotation.x = Math.PI / 2;
        EnemyCombat.telegraphRing.position.set(arenaCenter.x, 0.05, arenaCenter.z);
        EnemyCombat.telegraphRing.visible = false;
        scene.add(EnemyCombat.telegraphRing);
    }

    /* =========================================================
       PLAYER & ENEMY MESHES
       ========================================================= */

    function createPlayerMesh() {
        const group = new THREE.Group();

        // Capsule Body
        const bodyGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.4, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1cb0f6, roughness: 0.3, metalness: 0.1 });
        playerBody = new THREE.Mesh(bodyGeo, bodyMat);
        playerBody.position.y = 0.9;
        playerBody.castShadow = true;
        group.add(playerBody);

        // Head
        const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 1.5, 0);
        group.add(head);

        // Visor
        const visorGeo = new THREE.BoxGeometry(0.4, 0.15, 0.25);
        const visorMat = new THREE.MeshBasicMaterial({ color: 0x58cc02 });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.52, 0.2);
        group.add(visor);

        playerMesh = group;
        playerMesh.position.copy(position);
        scene.add(playerMesh);
    }

    function createEnemyMesh() {
        const group = new THREE.Group();

        // Enemy Golem Body
        const bodyGeo = new THREE.CylinderGeometry(0.7, 0.6, 2.2, 16);
        EnemyCombat.meshMaterial = new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.4, metalness: 0.3 });
        const body = new THREE.Mesh(bodyGeo, EnemyCombat.meshMaterial);
        body.position.y = 1.1;
        body.castShadow = true;
        group.add(body);

        // Enemy Head
        const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x4c0519, roughness: 0.2 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 2.3, 0);
        group.add(head);

        // Glowing Eyes
        const eyeGeo = new THREE.BoxGeometry(0.6, 0.15, 0.1);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        const eyes = new THREE.Mesh(eyeGeo, eyeMat);
        eyes.position.set(0, 2.35, 0.41);
        group.add(eyes);

        EnemyCombat.mesh = group;
        EnemyCombat.mesh.position.copy(EnemyCombat.spawnPos);
        scene.add(EnemyCombat.mesh);
    }

    /* =========================================================
       HUD UI & COMBAT OVERLAYS
       ========================================================= */

    function setupHUD() {
        const oldHud = document.getElementById("everworldHud");
        if (oldHud) oldHud.remove();

        const hud = document.createElement("div");
        hud.id = "everworldHud";
        hud.style.position = "absolute";
        hud.style.top = "15px";
        hud.style.left = "15px";
        hud.style.zIndex = "100";
        hud.style.color = "#ffffff";
        hud.style.fontFamily = "system-ui, -apple-system, sans-serif";
        hud.style.pointerEvents = "none";

        hud.innerHTML = `
            <div style="background: rgba(15, 23, 42, 0.9); padding: 16px 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.18); backdrop-filter: blur(10px); min-width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: 800; font-size: 16px; color: #58cc02; letter-spacing: 0.5px;">⚔️ EVERWORLD COMBAT ARENA</span>
                    <span id="ewStateBadge" style="background: #1cb0f6; color: #fff; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 800;">Grounded</span>
                </div>

                <!-- PLAYER HEALTH BAR -->
                <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin-bottom: 4px;">
                        <span>❤️ Player HP</span>
                        <span id="ewPlayerHpText">100/100</span>
                    </div>
                    <div style="width: 100%; height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden;">
                        <div id="ewPlayerHpBar" style="width: 100%; height: 100%; background: linear-gradient(90deg, #22c55e, #16a34a); transition: width 0.2s;"></div>
                    </div>
                </div>

                <!-- ENEMY HEALTH BAR -->
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin-bottom: 4px;">
                        <span>👺 Boss Golem HP [<span id="ewEnemyStateText" style="color:#facc15;">Idle</span>]</span>
                        <span id="ewEnemyHpText">150/150</span>
                    </div>
                    <div style="width: 100%; height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden;">
                        <div id="ewEnemyHpBar" style="width: 100%; height: 100%; background: linear-gradient(90deg, #f43f5e, #e11d48); transition: width 0.2s;"></div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="font-size: 26px; font-weight: 900; color: #facc15; font-family: monospace;">
                        <span id="ewSpeedometer">0.00</span> <span style="font-size: 12px; color: #94a3b8; font-weight: 600;">u/s</span>
                    </div>
                    <div style="font-size: 12px; font-weight: 700; color: #38bdf8;">
                        ⚡ Skill [R]: <span id="ewSkillCdText">READY</span>
                    </div>
                </div>

                <div style="font-size: 11px; color: #cbd5e1; line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.12); padding-top: 8px;">
                    <b>Combat:</b> Left Click / J: Melee Slash | Right Click / R: Energy Skill<br/>
                    <b>Dodge:</b> Alt / K (Invulnerable) | <b>Parkour:</b> WASD, Shift, Ctrl, Space, E, Q
                </div>

                <div style="margin-top: 10px; display: flex; gap: 8px; pointer-events: auto;">
                    <button id="ewToggleViewBtn" style="background: #58cc02; border: none; color: white; padding: 6px 12px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 11px;">
                        📷 3rd Person
                    </button>
                    <button id="ewResetCombatBtn" style="background: #e11d48; border: none; color: white; padding: 6px 12px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 11px;">
                        🔄 Reset Combat
                    </button>
                </div>
            </div>

            <!-- VICTORY / DEFEAT OVERLAY -->
            <div id="ewMatchOverlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px); z-index: 200; pointer-events: auto; flex-direction: column; align-items: center; justify-content: center; color: white;">
                <h1 id="ewMatchTitle" style="font-size: 48px; font-weight: 900; margin-bottom: 12px; text-shadow: 0 0 20px rgba(255,255,255,0.5);">🏆 VICTORY!</h1>
                <p id="ewMatchSub" style="font-size: 18px; color: #cbd5e1; margin-bottom: 24px;">You have defeated the Boss Golem!</p>
                <button id="ewQuickRetryBtn" style="background: linear-gradient(135deg, #1cb0f6, #0284c7); border: none; color: white; padding: 14px 32px; border-radius: 12px; font-size: 18px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 25px rgba(28,176,246,0.4); transition: 0.2s;">
                    🚀 Quick Retry / Fight Again
                </button>
            </div>
        `;

        container.appendChild(hud);
        hudElement = hud;
        speedometerEl = document.getElementById("ewSpeedometer");
        stateBadgeEl = document.getElementById("ewStateBadge");
        viewBtnEl = document.getElementById("ewToggleViewBtn");
        playerHealthBarEl = document.getElementById("ewPlayerHpBar");
        enemyHealthBarEl = document.getElementById("ewEnemyHpBar");
        skillCooldownEl = document.getElementById("ewSkillCdText");
        matchOverlayEl = document.getElementById("ewMatchOverlay");

        if (viewBtnEl) {
            viewBtnEl.addEventListener("click", () => {
                isFirstPerson = !isFirstPerson;
                viewBtnEl.textContent = isFirstPerson ? "📷 1st Person" : "📷 3rd Person";
            });
        }

        const resetBtn = document.getElementById("ewResetCombatBtn");
        if (resetBtn) {
            resetBtn.addEventListener("click", () => resetCombatState());
        }

        const retryBtn = document.getElementById("ewQuickRetryBtn");
        if (retryBtn) {
            retryBtn.addEventListener("click", () => resetCombatState());
        }
    }

    /* =========================================================
       INPUT & EVENT LISTENERS
       ========================================================= */

    function setupEventListeners() {
        window.addEventListener("resize", onWindowResize);

        window.addEventListener("keydown", (e) => {
            handleKey(e.code, true);
        });

        window.addEventListener("keyup", (e) => {
            handleKey(e.code, false);
        });

        canvas.addEventListener("mousedown", (e) => {
            if (e.button === 0) keys.melee = true;
            if (e.button === 2) keys.skill = true;
        });

        canvas.addEventListener("mouseup", (e) => {
            if (e.button === 0) keys.melee = false;
            if (e.button === 2) keys.skill = false;
        });

        canvas.addEventListener("contextmenu", (e) => e.preventDefault());

        canvas.addEventListener("click", () => {
            canvas.requestPointerLock();
        });

        document.addEventListener("pointerlockchange", () => {
            isMouseLocked = (document.pointerLockElement === canvas);
        });

        document.addEventListener("mousemove", (e) => {
            if (!isMouseLocked) return;
            cameraYaw -= e.movementX * mouseSensitivity;
            cameraPitch -= e.movementY * mouseSensitivity;
            cameraPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, cameraPitch));
        });
    }

    function handleKey(code, isDown) {
        switch (code) {
            case "KeyW": case "ArrowUp": keys.forward = isDown; break;
            case "KeyS": case "ArrowDown": keys.backward = isDown; break;
            case "KeyA": case "ArrowLeft": keys.left = isDown; break;
            case "KeyD": case "ArrowRight": keys.right = isDown; break;
            case "ShiftLeft": case "ShiftRight": keys.sprint = isDown; break;
            case "ControlLeft": case "ControlRight": case "KeyC": keys.crouch = isDown; break;
            case "Space": keys.jump = isDown; break;
            case "KeyE": keys.grapple = isDown; break;
            case "KeyQ": keys.airDash = isDown; break;
            case "KeyJ": keys.melee = isDown; break;
            case "KeyR": keys.skill = isDown; break;
            case "AltLeft": case "AltRight": case "KeyK": keys.dodge = isDown; break;
            case "KeyV":
                if (isDown) {
                    isFirstPerson = !isFirstPerson;
                    if (viewBtnEl) {
                        viewBtnEl.textContent = isFirstPerson ? "📷 1st Person" : "📷 3rd Person";
                    }
                }
                break;
        }
    }

    function onWindowResize() {
        if (!camera || !renderer) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    /* =========================================================
       COMBAT SYSTEM LOGIC
       ========================================================= */

    function updateCombat(dt) {
        if (PlayerCombat.isDead || matchEnded) return;

        // Timers update
        if (PlayerCombat.meleeTimer > 0) PlayerCombat.meleeTimer -= dt;
        if (PlayerCombat.skillTimer > 0) PlayerCombat.skillTimer -= dt;
        if (PlayerCombat.dodgeCooldownTimer > 0) PlayerCombat.dodgeCooldownTimer -= dt;

        if (PlayerCombat.isDodging) {
            PlayerCombat.dodgeTimer -= dt;
            if (PlayerCombat.dodgeTimer <= 0) {
                PlayerCombat.isDodging = false;
            }
        }

        // Input triggers
        const meleeTrigger = keys.melee && !meleeWasPressed;
        meleeWasPressed = keys.melee;

        const skillTrigger = keys.skill && !skillWasPressed;
        skillWasPressed = keys.skill;

        const dodgeTrigger = keys.dodge && !dodgeWasPressed;
        dodgeWasPressed = keys.dodge;

        // DODGE ACTION
        if (dodgeTrigger && PlayerCombat.dodgeCooldownTimer <= 0) {
            PlayerCombat.isDodging = true;
            PlayerCombat.dodgeTimer = PlayerCombat.dodgeDuration;
            PlayerCombat.dodgeCooldownTimer = PlayerCombat.dodgeCooldown;

            // Dodge impulse boost
            const forward = new THREE.Vector3(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
            velocity.add(forward.multiplyScalar(16.0));

            // Create dodge ghost particles
            spawnParticle(position, 0x38bdf8, 12, 0.4);
        }

        // MELEE ATTACK
        if (meleeTrigger && PlayerCombat.meleeTimer <= 0) {
            PlayerCombat.meleeTimer = PlayerCombat.meleeCooldown;

            // Visual Slash Arc Effect
            const slashPos = position.clone().add(new THREE.Vector3(Math.sin(cameraYaw) * 1.5, 1.2, Math.cos(cameraYaw) * 1.5));
            spawnSlashEffect(slashPos, cameraYaw);

            // Hitbox Check against Enemy
            if (EnemyCombat.health > 0) {
                const distToEnemy = position.distanceTo(EnemyCombat.position);
                if (distToEnemy <= PlayerCombat.meleeRange) {
                    damageEnemy(PlayerCombat.meleeDamage, "Melee Hit!");
                }
            }
        }

        // FANTASY ENERGY SKILL
        if (skillTrigger && PlayerCombat.skillTimer <= 0) {
            PlayerCombat.skillTimer = PlayerCombat.skillCooldown;

            // Energy Wave Burst
            const skillPos = position.clone().add(new THREE.Vector3(Math.sin(cameraYaw) * 2.0, 1.0, Math.cos(cameraYaw) * 2.0));
            spawnSkillWave(skillPos, cameraYaw);

            // Hit Check
            if (EnemyCombat.health > 0) {
                const distToEnemy = position.distanceTo(EnemyCombat.position);
                if (distToEnemy <= PlayerCombat.skillRange) {
                    damageEnemy(PlayerCombat.skillDamage, "⚡ CRITICAL SKILL!");
                    // Enemy Knockback
                    const kbDir = EnemyCombat.position.clone().sub(position).normalize();
                    EnemyCombat.position.add(kbDir.multiplyScalar(4.0));
                }
            }
        }

        // UPDATE ENEMY AI STATE MACHINE
        updateEnemyAI(dt);

        // UPDATE PARTICLES & DAMAGE NUMBERS
        updateParticles(dt);
    }

    function updateEnemyAI(dt) {
        if (EnemyCombat.health <= 0) {
            EnemyCombat.state = EnemyState.DEAD;
            if (EnemyCombat.mesh) EnemyCombat.mesh.visible = false;
            if (EnemyCombat.telegraphRing) EnemyCombat.telegraphRing.visible = false;

            if (!matchEnded) {
                matchEnded = true;
                showMatchResult(true);
            }
            return;
        }

        const distToPlayer = EnemyCombat.position.distanceTo(position);

        // Flash red if recently hit
        if (EnemyCombat.hitFlashTimer > 0) {
            EnemyCombat.hitFlashTimer -= dt;
            if (EnemyCombat.meshMaterial) EnemyCombat.meshMaterial.color.setHex(0xffffff);
        } else if (EnemyCombat.meshMaterial) {
            EnemyCombat.meshMaterial.color.setHex(0x9f1239);
        }

        switch (EnemyCombat.state) {
            case EnemyState.IDLE:
                if (EnemyCombat.telegraphRing) EnemyCombat.telegraphRing.visible = false;
                if (distToPlayer <= EnemyCombat.detectRadius) {
                    EnemyCombat.state = EnemyState.DETECT;
                }
                break;

            case EnemyState.DETECT:
            case EnemyState.APPROACH:
                if (EnemyCombat.telegraphRing) EnemyCombat.telegraphRing.visible = false;
                if (distToPlayer > EnemyCombat.detectRadius * 1.5) {
                    EnemyCombat.state = EnemyState.RETURN;
                } else if (distToPlayer <= EnemyCombat.attackRange) {
                    EnemyCombat.state = EnemyState.TELEGRAPH;
                    EnemyCombat.telegraphTimer = EnemyCombat.telegraphDuration;
                } else {
                    // Move towards player
                    const moveDir = position.clone().sub(EnemyCombat.position).normalize();
                    moveDir.y = 0;
                    EnemyCombat.position.add(moveDir.multiplyScalar(EnemyCombat.moveSpeed * dt));
                    if (EnemyCombat.mesh) {
                        EnemyCombat.mesh.position.copy(EnemyCombat.position);
                        EnemyCombat.mesh.rotation.y = Math.atan2(moveDir.x, moveDir.z);
                    }
                }
                break;

            case EnemyState.TELEGRAPH:
                // Warning Telegraph Circle under attack zone
                if (EnemyCombat.telegraphRing) {
                    EnemyCombat.telegraphRing.visible = true;
                    EnemyCombat.telegraphRing.position.set(EnemyCombat.position.x, 0.05, EnemyCombat.position.z);
                }

                EnemyCombat.telegraphTimer -= dt;
                if (EnemyCombat.telegraphTimer <= 0) {
                    EnemyCombat.state = EnemyState.ATTACK;
                    EnemyCombat.attackTimer = EnemyCombat.attackDuration;
                }
                break;

            case EnemyState.ATTACK:
                if (EnemyCombat.telegraphRing) EnemyCombat.telegraphRing.visible = false;

                // Execute Attack Shockwave
                spawnAttackShockwave(EnemyCombat.position);

                // Check if player took damage (unless dodging)
                if (distToPlayer <= EnemyCombat.attackRange + 0.5) {
                    if (!PlayerCombat.isDodging) {
                        damagePlayer(EnemyCombat.attackDamage);
                    } else {
                        spawnFloatingText("DODGED!", position, 0x38bdf8);
                    }
                }

                EnemyCombat.state = EnemyState.RECOVER;
                EnemyCombat.recoverTimer = EnemyCombat.recoverDuration;
                break;

            case EnemyState.RECOVER:
                if (EnemyCombat.telegraphRing) EnemyCombat.telegraphRing.visible = false;
                EnemyCombat.recoverTimer -= dt;
                if (EnemyCombat.recoverTimer <= 0) {
                    EnemyCombat.state = EnemyState.APPROACH;
                }
                break;

            case EnemyState.RETURN:
                if (EnemyCombat.telegraphRing) EnemyCombat.telegraphRing.visible = false;
                const returnDir = EnemyCombat.spawnPos.clone().sub(EnemyCombat.position).normalize();
                EnemyCombat.position.add(returnDir.multiplyScalar(EnemyCombat.moveSpeed * dt));
                if (EnemyCombat.mesh) EnemyCombat.mesh.position.copy(EnemyCombat.position);

                if (EnemyCombat.position.distanceTo(EnemyCombat.spawnPos) < 1.0) {
                    EnemyCombat.state = EnemyState.IDLE;
                }
                break;
        }
    }

    function damageEnemy(amount, label) {
        EnemyCombat.health = Math.max(0, EnemyCombat.health - amount);
        EnemyCombat.hitFlashTimer = 0.15;

        // Visual Blood/Spark Particles
        spawnParticle(EnemyCombat.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xfacc15, 15, 0.5);

        // Floating Damage Number
        spawnFloatingText("-" + amount + " " + label, EnemyCombat.position.clone().add(new THREE.Vector3(0, 2.5, 0)), 0xfacc15);
    }

    function damagePlayer(amount) {
        if (PlayerCombat.isDead) return;

        PlayerCombat.health = Math.max(0, PlayerCombat.health - amount);

        // Screen Shake / Damage Particles
        spawnParticle(position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xef4444, 20, 0.6);
        spawnFloatingText("-" + amount + " HP", position.clone().add(new THREE.Vector3(0, 2.0, 0)), 0xef4444);

        if (PlayerCombat.health <= 0) {
            PlayerCombat.isDead = true;
            matchEnded = true;
            showMatchResult(false);
        }
    }

    function showMatchResult(isVictory) {
        if (!matchOverlayEl) return;
        const titleEl = document.getElementById("ewMatchTitle");
        const subEl = document.getElementById("ewMatchSub");

        if (isVictory) {
            if (titleEl) {
                titleEl.textContent = "🏆 VICTORY!";
                titleEl.style.color = "#4ade80";
            }
            if (subEl) subEl.textContent = "Boss Golem defeated! Great skill execution.";
        } else {
            if (titleEl) {
                titleEl.textContent = "💀 DEFEATED!";
                titleEl.style.color = "#f43f5e";
            }
            if (subEl) subEl.textContent = "You ran out of health. Press Quick Retry to try again!";
        }

        matchOverlayEl.style.display = "flex";
    }

    /* =========================================================
       VISUAL EFFECTS & PARTICLES
       ========================================================= */

    function spawnParticle(pos, colorHex, count, duration) {
        const mat = new THREE.MeshBasicMaterial({ color: colorHex });
        const geo = new THREE.SphereGeometry(0.12, 8, 8);

        for (let i = 0; i < count; i++) {
            const p = new THREE.Mesh(geo, mat);
            p.position.copy(pos);
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                Math.random() * 6 + 1,
                (Math.random() - 0.5) * 8
            );
            scene.add(p);
            particles.push({ mesh: p, vel: vel, life: duration, maxLife: duration });
        }
    }

    function spawnSlashEffect(pos, yaw) {
        const geo = new THREE.TorusGeometry(2.2, 0.1, 8, 24, Math.PI * 0.8);
        const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.rotation.y = yaw;
        mesh.rotation.x = Math.PI / 2;
        scene.add(mesh);

        particles.push({ mesh: mesh, vel: new THREE.Vector3(0, 0, 0), life: 0.2, maxLife: 0.2 });
    }

    function spawnSkillWave(pos, yaw) {
        const geo = new THREE.RingGeometry(0.5, 3.5, 32);
        const mat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.rotation.x = Math.PI / 2;
        scene.add(mesh);

        const fwd = new THREE.Vector3(Math.sin(yaw) * 20, 0, Math.cos(yaw) * 20);
        particles.push({ mesh: mesh, vel: fwd, life: 0.4, maxLife: 0.4 });
    }

    function spawnAttackShockwave(pos) {
        const geo = new THREE.RingGeometry(0.5, EnemyCombat.attackRange, 32);
        const mat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos.x, 0.1, pos.z);
        mesh.rotation.x = Math.PI / 2;
        scene.add(mesh);

        particles.push({ mesh: mesh, vel: new THREE.Vector3(0, 0, 0), life: 0.3, maxLife: 0.3 });
    }

    function spawnFloatingText(text, pos, colorHex) {
        const div = document.createElement("div");
        div.textContent = text;
        div.style.position = "absolute";
        div.style.color = "#" + colorHex.toString(16);
        div.style.fontWeight = "900";
        div.style.fontSize = "18px";
        div.style.fontFamily = "sans-serif";
        div.style.pointerEvents = "none";
        div.style.textShadow = "0 0 6px #000";
        div.style.zIndex = "150";
        container.appendChild(div);

        damageNumbers.push({ el: div, pos: pos.clone(), life: 1.0 });
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;
            p.mesh.position.addScaledVector(p.vel, dt);

            if (p.life <= 0) {
                scene.remove(p.mesh);
                if (p.mesh.geometry) p.mesh.geometry.dispose();
                particles.splice(i, 1);
            }
        }

        for (let i = damageNumbers.length - 1; i >= 0; i--) {
            const dn = damageNumbers[i];
            dn.life -= dt;
            dn.pos.y += dt * 1.5;

            // Project 3D pos to 2D Screen
            const screenPos = dn.pos.clone().project(camera);
            const x = (screenPos.x * 0.5 + 0.5) * container.clientWidth;
            const y = (-(screenPos.y * 0.5) + 0.5) * container.clientHeight;

            dn.el.style.left = `${x}px`;
            dn.el.style.top = `${y}px`;
            dn.el.style.opacity = dn.life;

            if (dn.life <= 0) {
                dn.el.remove();
                damageNumbers.splice(i, 1);
            }
        }
    }

    /* =========================================================
       MOVEMENT & STATE MACHINE UPDATES
       ========================================================= */

    function updateMovement(dt) {
        // One-shot key triggers
        const ctrlPressed = keys.crouch;
        const ctrlTrigger = ctrlPressed && !ctrlWasPressed;
        ctrlWasPressed = ctrlPressed;

        const spaceTrigger = keys.jump && !spaceWasPressed;
        spaceWasPressed = keys.jump;

        const grappleTrigger = keys.grapple && !grappleWasPressed;
        grappleWasPressed = keys.grapple;

        const airDashTrigger = keys.airDash && !airDashWasPressed;
        airDashWasPressed = keys.airDash;

        // View-relative vectors
        const forward = new THREE.Vector3(Math.sin(cameraYaw), 0, Math.cos(cameraYaw)).normalize();
        const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw)).normalize();

        const inputDir = new THREE.Vector3();
        if (keys.forward) inputDir.add(forward);
        if (keys.backward) inputDir.sub(forward);
        if (keys.right) inputDir.add(right);
        if (keys.left) inputDir.sub(right);
        if (inputDir.lengthSq() > 0) inputDir.normalize();

        const isGrounded = (position.y <= 0.05);

        if (isGrounded) {
            canAirDash = true;
            wallRunTimer = 0;
        }

        // GRAPPLING HOOK
        if (grappleTrigger && currentState !== State.GRAPPLING) {
            let closestAnchor = null;
            let minDist = Config.grappleMaxDistance;

            grappleAnchors.forEach(anchor => {
                const dist = position.distanceTo(anchor.position);
                if (dist < minDist) {
                    minDist = dist;
                    closestAnchor = anchor;
                }
            });

            if (closestAnchor) {
                currentState = State.GRAPPLING;
                currentGrappleAnchor = closestAnchor;
                grapplePoint.copy(closestAnchor.position);
                if (grappleLine) grappleLine.visible = true;
            }
        }

        if (currentState === State.GRAPPLING) {
            if (!keys.grapple && !grappleTrigger) {
                currentState = State.AIRBORNE;
                if (grappleLine) grappleLine.visible = false;
            } else {
                const pullDir = grapplePoint.clone().sub(position).normalize();
                velocity.x += pullDir.x * Config.grapplePullForce * dt;
                velocity.y += pullDir.y * Config.grapplePullForce * dt;
                velocity.z += pullDir.z * Config.grapplePullForce * dt;

                if (grappleLine) {
                    const positions = grappleLine.geometry.attributes.position.array;
                    positions[0] = position.x;
                    positions[1] = position.y + 1.2;
                    positions[2] = position.z;
                    positions[3] = grapplePoint.x;
                    positions[4] = grapplePoint.y;
                    positions[5] = grapplePoint.z;
                    grappleLine.geometry.attributes.position.needsUpdate = true;
                }
            }
        } else if (grappleLine) {
            grappleLine.visible = false;
        }

        // VAULT / MANTLE / LEDGE GRAB
        if ((currentState === State.GROUNDED || currentState === State.AIRBORNE) && inputDir.lengthSq() > 0) {
            vaultables.forEach(v => {
                const dist = position.distanceTo(new THREE.Vector3(v.x, position.y, v.z));
                if (dist < 1.8 && Math.abs(position.y - v.y) < 1.5) {
                    currentState = State.VAULTING;
                    mantleStartPos.copy(position);
                    mantleTargetPos.set(position.x + inputDir.x * 2.5, v.y + v.h / 2 + 0.9, position.z + inputDir.z * 2.5);
                    mantleTimer = 0;
                }
            });

            if (currentState !== State.VAULTING) {
                mantlables.forEach(m => {
                    const dist = position.distanceTo(new THREE.Vector3(m.x, position.y, m.z));
                    if (dist < 2.0 && position.y < m.y + m.h / 2 && position.y > m.y - m.h / 2 - 1.0) {
                        if (spaceTrigger || keys.forward) {
                            currentState = State.MANTLING;
                            mantleStartPos.copy(position);
                            mantleTargetPos.set(m.x, m.y + m.h / 2 + 0.9, m.z);
                            mantleTimer = 0;
                        }
                    }
                });
            }
        }

        if (currentState === State.VAULTING || currentState === State.MANTLING) {
            mantleTimer += dt;
            const t = Math.min(1.0, mantleTimer / mantleDuration);
            position.lerpVectors(mantleStartPos, mantleTargetPos, t);
            velocity.set(0, 0, 0);

            if (t >= 1.0) {
                currentState = State.GROUNDED;
            }
        }

        // WALL RUNNING
        if (!isGrounded && currentState === State.AIRBORNE) {
            wallRunWalls.forEach(w => {
                const distToWall = Math.abs(position.x - w.x);
                if (distToWall < 1.8 && Math.abs(position.z - w.z) < w.d / 2 && position.y < w.y + w.h / 2) {
                    currentState = State.WALL_RUNNING;
                    wallRunNormal.set(position.x > w.x ? 1 : -1, 0, 0);
                    wallRunDirection.set(0, 0, forward.z >= 0 ? 1 : -1);
                }
            });
        }

        if (currentState === State.WALL_RUNNING) {
            wallRunTimer += dt;
            velocity.x = 0;
            velocity.z = wallRunDirection.z * Config.wallRunSpeed;
            velocity.y = -Config.wallRunGravity;

            if (spaceTrigger) {
                currentState = State.AIRBORNE;
                velocity.y = Config.wallJumpUpImpulse;
                velocity.x = wallRunNormal.x * Config.wallJumpSideImpulse;
            } else if (wallRunTimer > Config.wallRunMaxTime) {
                currentState = State.AIRBORNE;
            }
        }

        // STATE: SLIDING
        if (isGrounded && ctrlTrigger && currentState !== State.SLIDING) {
            currentState = State.SLIDING;
            slideSpeed = Config.slideInitialSpeed; // EXACTLY 20.0 u/s

            if (inputDir.lengthSq() > 0) {
                slideDirection.copy(inputDir);
            } else {
                slideDirection.copy(forward);
            }
        }

        if (currentState === State.SLIDING) {
            slideSpeed = Math.max(0, slideSpeed - Config.slideDeceleration * dt);

            velocity.x = slideDirection.x * slideSpeed;
            velocity.z = slideDirection.z * slideSpeed;
            velocity.y = 0;

            if (spaceTrigger) {
                currentState = State.AIRBORNE;
                velocity.y = Config.longJumpUpImpulse;
                velocity.x += slideDirection.x * Config.longJumpForwardImpulse;
                velocity.z += slideDirection.z * Config.longJumpForwardImpulse;
            } else if (slideSpeed <= 0) {
                currentState = State.GROUNDED;
            }
        }

        // STATE: GROUNDED
        else if (isGrounded && currentState !== State.SLIDING && currentState !== State.VAULTING && currentState !== State.MANTLING) {
            currentState = State.GROUNDED;

            let targetSpeed = Config.walkSpeed;
            if (keys.sprint) targetSpeed = Config.sprintSpeed;
            else if (inputDir.lengthSq() > 0) targetSpeed = Config.runSpeed;

            if (inputDir.lengthSq() > 0) {
                const targetVel = inputDir.clone().multiplyScalar(targetSpeed);
                velocity.x = THREE.MathUtils.lerp(velocity.x, targetVel.x, Config.acceleration * dt / 10);
                velocity.z = THREE.MathUtils.lerp(velocity.z, targetVel.z, Config.acceleration * dt / 10);
            } else {
                velocity.x = THREE.MathUtils.lerp(velocity.x, 0, Config.deceleration * dt / 10);
                velocity.z = THREE.MathUtils.lerp(velocity.z, 0, Config.deceleration * dt / 10);
            }

            velocity.y = 0;

            if (spaceTrigger) {
                currentState = State.AIRBORNE;
                velocity.y = Config.jumpImpulse;
            }
        }

        // STATE: AIRBORNE
        else if (!isGrounded && currentState !== State.SLIDING && currentState !== State.WALL_RUNNING && currentState !== State.GRAPPLING && currentState !== State.VAULTING && currentState !== State.MANTLING && currentState !== State.AIR_DASHING) {
            currentState = State.AIRBORNE;

            velocity.y -= Config.gravity * dt;

            if (inputDir.lengthSq() > 0) {
                velocity.x += inputDir.x * Config.airControl * dt;
                velocity.z += inputDir.z * Config.airControl * dt;

                const horizSpeed = Math.hypot(velocity.x, velocity.z);
                const maxAirSpeed = Math.max(Config.sprintSpeed, slideSpeed);
                if (horizSpeed > maxAirSpeed) {
                    velocity.x = (velocity.x / horizSpeed) * maxAirSpeed;
                    velocity.z = (velocity.z / horizSpeed) * maxAirSpeed;
                }
            }

            if (airDashTrigger && canAirDash) {
                currentState = State.AIR_DASHING;
                canAirDash = false;
                airDashTimer = Config.airDashDuration;
                airDashDir.copy(inputDir.lengthSq() > 0 ? inputDir : forward);
            }
        }

        // STATE: AIR DASHING
        if (currentState === State.AIR_DASHING) {
            airDashTimer -= dt;
            velocity.x = airDashDir.x * Config.airDashImpulse;
            velocity.z = airDashDir.z * Config.airDashImpulse;
            velocity.y = 0;

            if (airDashTimer <= 0) {
                currentState = State.AIRBORNE;
            }
        }

        // Apply Velocity to Position
        position.x += velocity.x * dt;
        position.y += velocity.y * dt;
        position.z += velocity.z * dt;

        // Ground Constraint
        if (position.y < 0) {
            position.y = 0;
            velocity.y = 0;
            if (currentState === State.AIRBORNE || currentState === State.AIR_DASHING) {
                currentState = State.GROUNDED;
            }
        }

        // Update player mesh rotation & position
        if (playerMesh) {
            playerMesh.position.copy(position);

            if (currentState === State.SLIDING) {
                playerBody.scale.set(1, 0.5, 1);
                playerBody.position.y = 0.45;
                const angle = Math.atan2(slideDirection.x, slideDirection.z);
                playerMesh.rotation.y = angle;
            } else {
                playerBody.scale.set(1, 1, 1);
                playerBody.position.y = 0.9;
                if (velocity.x !== 0 || velocity.z !== 0) {
                    const angle = Math.atan2(velocity.x, velocity.z);
                    playerMesh.rotation.y = angle;
                }
            }
        }
    }

    /* =========================================================
       CAMERA CONTROLLER
       ========================================================= */

    function updateCamera() {
        if (!camera) return;

        let targetEyeY = (currentState === State.SLIDING) ? Config.crouchEyeHeight : Config.eyeHeight;
        cameraCurrentOffset.y = THREE.MathUtils.lerp(cameraCurrentOffset.y, targetEyeY, 0.15);

        const targetPos = position.clone().add(cameraCurrentOffset);

        if (isFirstPerson) {
            camera.position.copy(targetPos);
            if (playerMesh) playerMesh.visible = false;
        } else {
            if (playerMesh) playerMesh.visible = true;

            const cx = targetPos.x - Math.sin(cameraYaw) * Math.cos(cameraPitch) * cameraDistance;
            const cy = targetPos.y + Math.sin(cameraPitch) * cameraDistance;
            const cz = targetPos.z - Math.cos(cameraYaw) * Math.cos(cameraPitch) * cameraDistance;

            camera.position.set(cx, cy, cz);
        }

        const lookAtTarget = targetPos.clone().add(
            new THREE.Vector3(
                Math.sin(cameraYaw) * Math.cos(cameraPitch),
                Math.sin(cameraPitch),
                Math.cos(cameraYaw) * Math.cos(cameraPitch)
            )
        );
        camera.lookAt(lookAtTarget);
    }

    /* =========================================================
       UI & HUD UPDATES
       ========================================================= */

    function updateHUD() {
        if (speedometerEl) {
            const currentSpeed = velocity.length();
            speedometerEl.textContent = currentSpeed.toFixed(2);
        }

        if (stateBadgeEl) {
            stateBadgeEl.textContent = currentState;

            let bg = "#1cb0f6";
            if (currentState === State.SLIDING) bg = "#facc15";
            if (currentState === State.AIRBORNE) bg = "#6366f1";
            if (currentState === State.WALL_RUNNING) bg = "#ec4899";
            if (currentState === State.GRAPPLING) bg = "#06b6d4";
            if (currentState === State.AIR_DASHING) bg = "#10b981";
            if (currentState === State.VAULTING || currentState === State.MANTLING) bg = "#f59e0b";

            stateBadgeEl.style.background = bg;
        }

        if (playerHealthBarEl) {
            const pct = Math.max(0, (PlayerCombat.health / PlayerCombat.maxHealth) * 100);
            playerHealthBarEl.style.width = `${pct}%`;
            const textEl = document.getElementById("ewPlayerHpText");
            if (textEl) textEl.textContent = `${Math.ceil(PlayerCombat.health)}/${PlayerCombat.maxHealth}`;
        }

        if (enemyHealthBarEl) {
            const pct = Math.max(0, (EnemyCombat.health / EnemyCombat.maxHealth) * 100);
            enemyHealthBarEl.style.width = `${pct}%`;
            const textEl = document.getElementById("ewEnemyHpText");
            if (textEl) textEl.textContent = `${Math.ceil(EnemyCombat.health)}/${EnemyCombat.maxHealth}`;

            const stateTextEl = document.getElementById("ewEnemyStateText");
            if (stateTextEl) stateTextEl.textContent = EnemyCombat.state;
        }

        if (skillCooldownEl) {
            if (PlayerCombat.skillTimer <= 0) {
                skillCooldownEl.textContent = "READY [R]";
                skillCooldownEl.style.color = "#38bdf8";
            } else {
                skillCooldownEl.textContent = `${PlayerCombat.skillTimer.toFixed(1)}s`;
                skillCooldownEl.style.color = "#94a3b8";
            }
        }
    }

    /* =========================================================
       ANIMATION LOOP
       ========================================================= */

    function animate() {
        requestAnimationFrame(animate);
        deltaTime = Math.min(clock.getDelta(), 0.1);

        // Update movement & physics
        updateMovement(deltaTime);

        // Update combat & AI
        updateCombat(deltaTime);

        // Update camera
        updateCamera();

        // Update HUD
        updateHUD();

        // Render scene
        renderer.render(scene, camera);
    }

    // Public API export
    return {
        init: init,
        getState: () => currentState,
        getSpeed: () => velocity.length(),
        getConfig: () => Config,
        getPosition: () => position.clone(),
        getPlayerCombat: () => ({ ...PlayerCombat }),
        getEnemyCombat: () => ({ ...EnemyCombat }),
        resetCombatState: resetCombatState,
        setState: (s) => { currentState = s; },
        setVelocity: (v) => { velocity.copy(v); },
        setSlideSpeed: (s) => { slideSpeed = s; }
    };
})();
