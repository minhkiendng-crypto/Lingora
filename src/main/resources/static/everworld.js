/* =========================================================
   EVERWORLD - 3D Character Controller & Parkour Engine
   Milestone: Control System Only
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
        // Initial speed is EXACTLY 20.0 u/s immediately upon sliding
        slideInitialSpeed: 20.0,
        slideMaxSpeed: 20.0,
        slideDeceleration: 14.0, // Configurable deceleration rate (u/s²)
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
    let ctrlWasPressed = false; // Prevents holding Ctrl from repeatedly resetting slide speed!

    // Camera parameters
    let isFirstPerson = false;
    let cameraPitch = 0; // Pitch angle (-PI/2 to PI/2)
    let cameraYaw = Math.PI;   // Yaw angle facing forward
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
        airDash: false
    };

    let spaceWasPressed = false;
    let grappleWasPressed = false;
    let airDashWasPressed = false;

    let mouseSensitivity = 0.0022;
    let isMouseLocked = false;

    // UI elements
    let hudElement, speedometerEl, stateBadgeEl, viewBtnEl;

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

        // Build Scene
        setupLighting();
        buildParkourCourse();
        createPlayerMesh();
        setupHUD();
        setupEventListeners();

        // Start Loop
        requestAnimationFrame(animate);
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
       PLAYER MESH
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

    /* =========================================================
       HUD UI
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
            <div style="background: rgba(15, 23, 42, 0.88); padding: 16px 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.18); backdrop-filter: blur(10px); min-width: 280px; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: 800; font-size: 16px; color: #58cc02; letter-spacing: 0.5px;">🎮 EVERWORLD PARKOUR</span>
                    <span id="ewStateBadge" style="background: #1cb0f6; color: #fff; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 800;">Grounded</span>
                </div>

                <div style="font-size: 32px; font-weight: 900; color: #facc15; font-family: monospace;">
                    <span id="ewSpeedometer">0.00</span> <span style="font-size: 14px; color: #94a3b8; font-weight: 600;">u/s</span>
                </div>

                <div style="margin-top: 12px; font-size: 12px; color: #cbd5e1; line-height: 1.6; border-top: 1px solid rgba(255,255,255,0.12); padding-top: 10px;">
                    <b>Controls:</b> WASD to Move | Shift to Sprint<br/>
                    <b>Ctrl (Press once):</b> Slide (Exact 20 u/s &rarr; 0 u/s)<br/>
                    <b>Space:</b> Jump / Long Jump / Wall Jump / Mantle<br/>
                    <b>E / Click:</b> Grapple Hook | <b>Q:</b> Air Dash<br/>
                    <b>V:</b> Switch 1st / 3rd Person Camera
                </div>

                <div style="margin-top: 12px; pointer-events: auto;">
                    <button id="ewToggleViewBtn" style="background: #58cc02; border: none; color: white; padding: 8px 14px; border-radius: 10px; font-weight: 800; cursor: pointer; font-size: 12px; transition: 0.2s;">
                        📷 Switch View (3rd Person)
                    </button>
                </div>
            </div>
        `;

        container.appendChild(hud);
        hudElement = hud;
        speedometerEl = document.getElementById("ewSpeedometer");
        stateBadgeEl = document.getElementById("ewStateBadge");
        viewBtnEl = document.getElementById("ewToggleViewBtn");

        if (viewBtnEl) {
            viewBtnEl.addEventListener("click", () => {
                isFirstPerson = !isFirstPerson;
                viewBtnEl.textContent = isFirstPerson ? "📷 Switch View (1st Person)" : "📷 Switch View (3rd Person)";
            });
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
            case "ControlLeft": case "ControlRight": case "KeyC":
                keys.crouch = isDown;
                break;
            case "Space": keys.jump = isDown; break;
            case "KeyE": keys.grapple = isDown; break;
            case "KeyQ": keys.airDash = isDown; break;
            case "KeyV":
                if (isDown) {
                    isFirstPerson = !isFirstPerson;
                    if (viewBtnEl) {
                        viewBtnEl.textContent = isFirstPerson ? "📷 Switch View (1st Person)" : "📷 Switch View (3rd Person)";
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

        // ==========================================
        // ADVANCED MECHANIC: GRAPPLING HOOK
        // ==========================================
        if (grappleTrigger && currentState !== State.GRAPPLING) {
            // Find closest grapple anchor within range
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
                // Detach grapple and PRESERVE MOMENTUM
                currentState = State.AIRBORNE;
                if (grappleLine) grappleLine.visible = false;
            } else {
                // Pull player toward grapple point
                const pullDir = grapplePoint.clone().sub(position).normalize();
                velocity.x += pullDir.x * Config.grapplePullForce * dt;
                velocity.y += pullDir.y * Config.grapplePullForce * dt;
                velocity.z += pullDir.z * Config.grapplePullForce * dt;

                // Update grapple visual cable line
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

        // ==========================================
        // ADVANCED MECHANIC: VAULT / MANTLE / LEDGE GRAB
        // ==========================================
        if ((currentState === State.GROUNDED || currentState === State.AIRBORNE) && inputDir.lengthSq() > 0) {
            // Check vault obstacles ahead
            vaultables.forEach(v => {
                const dist = position.distanceTo(new THREE.Vector3(v.x, position.y, v.z));
                if (dist < 1.8 && Math.abs(position.y - v.y) < 1.5) {
                    // Vault over low obstacle!
                    currentState = State.VAULTING;
                    mantleStartPos.copy(position);
                    mantleTargetPos.set(position.x + inputDir.x * 2.5, v.y + v.h / 2 + 0.9, position.z + inputDir.z * 2.5);
                    mantleTimer = 0;
                }
            });

            // Check mantle / ledge obstacles ahead
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

        // ==========================================
        // ADVANCED MECHANIC: WALL RUNNING & WALL JUMPING
        // ==========================================
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

            // Wall Jump off wall!
            if (spaceTrigger) {
                currentState = State.AIRBORNE;
                velocity.y = Config.wallJumpUpImpulse;
                velocity.x = wallRunNormal.x * Config.wallJumpSideImpulse;
            } else if (wallRunTimer > Config.wallRunMaxTime) {
                currentState = State.AIRBORNE;
            }
        }

        // ==========================================
        // STATE: SLIDING (Exact Spec Mechanics)
        // ==========================================
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
            // Gradually decrease slide speed down to exactly 0
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

        // ==========================================
        // STATE: GROUNDED (Walk / Run / Sprint)
        // ==========================================
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

        // ==========================================
        // STATE: AIRBORNE
        // ==========================================
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

        // ==========================================
        // STATE: AIR DASHING
        // ==========================================
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
    }

    /* =========================================================
       ANIMATION LOOP
       ========================================================= */

    function animate() {
        requestAnimationFrame(animate);
        deltaTime = Math.min(clock.getDelta(), 0.1);

        // Update movement & physics
        updateMovement(deltaTime);

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
        setState: (s) => { currentState = s; },
        setVelocity: (v) => { velocity.copy(v); },
        setSlideSpeed: (s) => { slideSpeed = s; }
    };
})();
