import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class AircraftMeshBuilder {
  static build(aircraft) {
    const originalGroup = aircraft.group;
    aircraft.visualGroup = new THREE.Group();
    originalGroup.add(aircraft.visualGroup);

    aircraft.gearGroup = new THREE.Group();
    aircraft.visualGroup.add(aircraft.gearGroup);

    aircraft.group = aircraft.visualGroup;

    const scale = aircraft.config.modelScale || { x: 1.0, y: 1.0, z: 1.0 };
    aircraft.visualGroup.scale.set(scale.x, scale.y, scale.z);

    const rot = aircraft.config.modelRotation || { x: 0.0, y: 0.0, z: 0.0 };
    aircraft.visualGroup.rotation.set(
      rot.x * (Math.PI / 180),
      rot.y * (Math.PI / 180),
      rot.z * (Math.PI / 180)
    );

    const pos = aircraft.config.modelPosition || { x: 0.0, y: 0.0, z: 0.0 };
    aircraft.visualGroup.position.set(pos.x, pos.y, pos.z);

    if (aircraft.config && aircraft.config.modelType === 'custom') {
      this.loadCustomModel(aircraft);
      aircraft.group = originalGroup;
      return;
    }

    const isJet = ['fighter', 'f16', 'f35', 'f22', 'f14', 'sr71', 'concorde', 'debug', 't38'].includes(aircraft.config.id);
    if (isJet) {
      aircraft.afterburnerGroup = new THREE.Group();
      aircraft.afterburnerGroup.visible = false;
      aircraft.visualGroup.add(aircraft.afterburnerGroup);
    }

    if (aircraft.config.id === 'fighter') {
      this.buildFighter(aircraft);
    } else if (aircraft.config.id === 'f16') {
      this.buildF16(aircraft);
    } else if (aircraft.config.id === 'f35') {
      this.buildF35(aircraft);
    } else if (aircraft.config.id === 'f22') {
      this.buildF22(aircraft);
    } else if (aircraft.config.id === 'b2') {
      this.buildB2(aircraft);
    } else if (aircraft.config.id === 'stunt') {
      this.buildStunt(aircraft);
    } else if (aircraft.config.id === 'cargo') {
      this.buildCargo(aircraft);
    } else if (aircraft.config.id === 'warbird') {
      this.buildWarbird(aircraft);
    } else if (aircraft.config.id === 'attack') {
      this.buildAttack(aircraft);
    } else if (aircraft.config.id === 'kc135') {
      this.buildKC135(aircraft);
    } else if (aircraft.config.id === 'b52') {
      this.buildB52(aircraft);
    } else if (aircraft.config.id === 'sr71') {
      this.buildSR71(aircraft);
    } else if (aircraft.config.id === 'f14') {
      this.buildF14(aircraft);
    } else if (aircraft.config.id === 'concorde') {
      this.buildConcorde(aircraft);
    } else if (aircraft.config.id === 'glider') {
      this.buildGlider(aircraft);
    } else if (aircraft.config.id === 'airliner') {
      this.buildAirliner(aircraft);
    } else if (aircraft.config.id === 'biplane') {
      this.buildBiplane(aircraft);
    } else if (aircraft.config.id === 'bushplane') {
      this.buildBushplane(aircraft);
    } else if (aircraft.config.id === 'bizjet') {
      this.buildBizjet(aircraft);
    } else if (aircraft.config.id === 't38') {
      this.buildT38(aircraft);
    } else if (aircraft.config.id === 'u2') {
      this.buildU2(aircraft);
    } else if (aircraft.config.id === 'cl1201') {
      this.buildCL1201(aircraft);
    } else if (aircraft.config.id === 'debug') {
      this.buildDebug(aircraft);
    } else {
      this.buildTrainer(aircraft);
    }

    // Calibrate the built model to the physics dimensions. The solver's
    // wingtip/nose/tail crash probes and ground effect all use
    // config.dimensions, so the visual model must occupy the same envelope
    // or collisions appear to happen in mid-air. groundClearanceOffset in the
    // config must equal the scaled wheel-bottom height (checked by
    // scripts/physics-test/audit-models.mjs).
    if (aircraft.config.dimensions) {
      const bbox = new THREE.Box3().setFromObject(originalGroup);
      const size = bbox.getSize(new THREE.Vector3());
      if (size.x > 0.1 && size.z > 0.1) {
        const sx = aircraft.config.dimensions.span / size.x;
        const sz = aircraft.config.dimensions.length / size.z;
        const sy = Math.sqrt(sx * sz); // keep vertical proportions plausible
        aircraft.visualGroup.scale.multiply(new THREE.Vector3(sx, sy, sz));
      }
    }

    aircraft.group = originalGroup;
  }
  static loadCustomModel(aircraft) {
    const loader = new GLTFLoader();
    const modelPath = aircraft.config.modelPath || '';
    loader.load(
      modelPath,
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        aircraft.visualGroup.add(gltf.scene);
      },
      undefined,
      (error) => {
        console.error(`[AircraftMeshBuilder] GLTFLoader failed to load, building placeholder:`, error);
        this.buildPlaceholder(aircraft);
      }
    );
  }
  static buildPlaceholder(aircraft) {
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xff1111, roughness: 0.5 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 });
    const fuseGeo = new THREE.BoxGeometry(0.8, 0.8, 4.0);
    const fuselage = new THREE.Mesh(fuseGeo, baseMat);
    aircraft.group.add(fuselage);
    const wingGeo = new THREE.BoxGeometry(7.0, 0.04, 1.2);
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(0, 0, 0.3);
    aircraft.group.add(wing);
    const stabilizerGeo = new THREE.BoxGeometry(2.2, 0.04, 0.6);
    const stabilizer = new THREE.Mesh(stabilizerGeo, wingMat);
    stabilizer.position.set(0, 0.1, -1.8);
    aircraft.group.add(stabilizer);
    const rudderGeo = new THREE.BoxGeometry(0.04, 1.4, 0.6);
    rudderGeo.translate(0, 0.7, 0);
    const rudder = new THREE.Mesh(rudderGeo, baseMat);
    rudder.position.set(0, 0.1, -1.8);
    aircraft.group.add(rudder);
    this.configureShadows(aircraft.group);
  }
  static buildTrainer(aircraft) {
    const fuselageMat = new THREE.MeshStandardMaterial({ color: 0xeaeaea, roughness: 0.4 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.75 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.6 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b, roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const fuseGeo = new THREE.CylinderGeometry(0.5, 0.25, 6.0, 16);
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuseGeo, fuselageMat);
    aircraft.group.add(fuselage);
    const noseGeo = new THREE.ConeGeometry(0.5, 1.2, 16);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, trimMat);
    nose.position.z = 3.6;
    aircraft.group.add(nose);
    const wingGeo = new THREE.BoxGeometry(aircraft.config.dimensions.span, 0.08, 1.4);
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(0, 0.35, 0.6);
    aircraft.group.add(wing);
    const elevatorGeo = new THREE.BoxGeometry(3.5, 0.05, 0.8);
    const elevator = new THREE.Mesh(elevatorGeo, wingMat);
    elevator.position.set(0, 0.1, -2.6);
    aircraft.group.add(elevator);
    const rudderGeo = new THREE.BoxGeometry(0.06, 1.4, 0.8);
    rudderGeo.translate(0, 0.7, 0);
    const rudder = new THREE.Mesh(rudderGeo, trimMat);
    rudder.position.set(0, 0.3, -2.6);
    aircraft.group.add(rudder);
    const canopyGeo = new THREE.SphereGeometry(0.4, 16, 16);
    canopyGeo.scale(1, 0.8, 2.5);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.45, 0.8);
    aircraft.group.add(canopy);
    aircraft.propellerGroup = new THREE.Group();
    aircraft.propellerGroup.position.set(0, 0, 4.25);
    const bladeGeo = new THREE.BoxGeometry(2.2, 0.12, 0.02);
    const blade = new THREE.Mesh(bladeGeo, propMat);
    aircraft.propellerGroup.add(blade);
    aircraft.group.add(aircraft.propellerGroup);
    const strutGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8);
    const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const noseStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    noseStrutMesh.position.set(0, -0.6, 2.0);
    aircraft.gearGroup.add(noseStrutMesh);
    const noseWheel = new THREE.Mesh(tireGeo, tireMat);
    noseWheel.position.set(0, -1.2, 2.0);
    aircraft.gearGroup.add(noseWheel);
    const leftStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    leftStrutMesh.position.set(-1.1, -0.6, -0.2);
    leftStrutMesh.rotation.z = 0.15;
    aircraft.gearGroup.add(leftStrutMesh);
    const leftWheel = new THREE.Mesh(tireGeo, tireMat);
    leftWheel.position.set(-1.2, -1.2, -0.2);
    aircraft.gearGroup.add(leftWheel);
    const rightStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    rightStrutMesh.position.set(1.1, -0.6, -0.2);
    rightStrutMesh.rotation.z = -0.15;
    aircraft.gearGroup.add(rightStrutMesh);
    const rightWheel = new THREE.Mesh(tireGeo, tireMat);
    rightWheel.position.set(1.2, -1.2, -0.2);
    aircraft.gearGroup.add(rightWheel);

    // Dorsal fin fillet ahead of the rudder.
    const filletGeo = new THREE.BoxGeometry(0.06, 0.5, 1.0);
    filletGeo.translate(0, 0.25, 0);
    const fillet = new THREE.Mesh(filletGeo, trimMat);
    fillet.position.set(0, 0.3, -2.0);
    aircraft.group.add(fillet);

    // Wheel spats (fairings) on the main gear.
    const spatGeo = new THREE.SphereGeometry(0.4, 10, 8);
    spatGeo.scale(1, 1, 1.6);
    [-1.2, 1.2].forEach((x) => {
      const spat = new THREE.Mesh(spatGeo, fuselageMat);
      spat.position.set(x, -1.15, -0.2);
      aircraft.gearGroup.add(spat);
    });

    // Wingtip nav lights: red on the port (+X) tip, green on starboard (-X).
    const navGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const redNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redNav.position.set(aircraft.config.dimensions.span / 2, 0.35, 0.6);
    aircraft.group.add(redNav);
    const greenNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    greenNav.position.set(-aircraft.config.dimensions.span / 2, 0.35, 0.6);
    aircraft.group.add(greenNav);

    this.configureShadows(aircraft.group);
  }
  static buildFighter(aircraft) {
    const fuselageMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.5 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.4 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffab40, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.70 });
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff3d00, transparent: true, opacity: 0.85 });
    const fuseGeo = new THREE.CylinderGeometry(0.4, 0.4, 8.0, 16);
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuseGeo, fuselageMat);
    aircraft.group.add(fuselage);
    const noseGeo = new THREE.ConeGeometry(0.4, 2.4, 16);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, trimMat);
    nose.position.z = 5.2;
    aircraft.group.add(nose);
    const leftWingGeo = new THREE.BoxGeometry(aircraft.config.dimensions.span / 2.2, 0.08, 2.0);
    leftWingGeo.translate(-aircraft.config.dimensions.span / 4.4, 0, 0);
    const leftWing = new THREE.Mesh(leftWingGeo, fuselageMat);
    leftWing.position.set(0, 0, -0.6);
    leftWing.rotation.y = -0.32;
    aircraft.group.add(leftWing);
    const rightWingGeo = new THREE.BoxGeometry(aircraft.config.dimensions.span / 2.2, 0.08, 2.0);
    rightWingGeo.translate(aircraft.config.dimensions.span / 4.4, 0, 0);
    const rightWing = new THREE.Mesh(rightWingGeo, fuselageMat);
    rightWing.position.set(0, 0, -0.6);
    rightWing.rotation.y = 0.32;
    aircraft.group.add(rightWing);
    const leftFinGeo = new THREE.BoxGeometry(0.06, 1.8, 1.2);
    leftFinGeo.translate(0, 0.9, 0);
    const leftFin = new THREE.Mesh(leftFinGeo, trimMat);
    leftFin.position.set(-0.8, 0.3, -3.2);
    leftFin.rotation.z = -0.15;
    aircraft.group.add(leftFin);
    const rightFinGeo = new THREE.BoxGeometry(0.06, 1.8, 1.2);
    rightFinGeo.translate(0, 0.9, 0);
    const rightFin = new THREE.Mesh(rightFinGeo, trimMat);
    rightFin.position.set(0.8, 0.3, -3.2);
    rightFin.rotation.z = 0.15;
    aircraft.group.add(rightFin);
    const leftElevGeo = new THREE.BoxGeometry(2.0, 0.05, 1.0);
    leftElevGeo.translate(-1.0, 0, 0);
    const leftElev = new THREE.Mesh(leftElevGeo, fuselageMat);
    leftElev.position.set(0, 0, -3.4);
    leftElev.rotation.y = -0.4;
    aircraft.group.add(leftElev);
    const rightElevGeo = new THREE.BoxGeometry(2.0, 0.05, 1.0);
    rightElevGeo.translate(1.0, 0, 0);
    const rightElev = new THREE.Mesh(rightElevGeo, fuselageMat);
    rightElev.position.set(0, 0, -3.4);
    rightElev.rotation.y = 0.4;
    aircraft.group.add(rightElev);
    const canopyGeo = new THREE.SphereGeometry(0.35, 16, 16);
    canopyGeo.scale(1, 0.8, 3.2);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.42, 1.4);
    aircraft.group.add(canopy);
    const nozzleGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8);
    nozzleGeo.rotateX(Math.PI / 2);
    const leftNozzle = new THREE.Mesh(nozzleGeo, exhaustMat);
    leftNozzle.position.set(-0.25, 0, -4.1);
    aircraft.group.add(leftNozzle);
    const rightNozzle = new THREE.Mesh(nozzleGeo, exhaustMat);
    rightNozzle.position.set(0.25, 0, -4.1);
    aircraft.group.add(rightNozzle);
    const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8);
    const tireGeo = new THREE.CylinderGeometry(0.40, 0.40, 0.3, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const noseStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    noseStrutMesh.position.set(0, -0.6, 3.2);
    aircraft.gearGroup.add(noseStrutMesh);
    const noseWheel = new THREE.Mesh(tireGeo, tireMat);
    noseWheel.position.set(0, -1.2, 3.2);
    aircraft.gearGroup.add(noseWheel);
    const leftStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    leftStrutMesh.position.set(-0.7, -0.6, -1.0);
    leftStrutMesh.rotation.z = 0.12;
    aircraft.gearGroup.add(leftStrutMesh);
    const leftWheel = new THREE.Mesh(tireGeo, tireMat);
    leftWheel.position.set(-0.8, -1.2, -1.0);
    aircraft.gearGroup.add(leftWheel);
    const rightStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    rightStrutMesh.position.set(0.7, -0.6, -1.0);
    rightStrutMesh.rotation.z = -0.12;
    aircraft.gearGroup.add(rightStrutMesh);
    const rightWheel = new THREE.Mesh(tireGeo, tireMat);
    rightWheel.position.set(0.8, -1.2, -1.0);
    aircraft.gearGroup.add(rightWheel);
    const flameGeo = new THREE.ConeGeometry(0.18, 2.0, 8);
    flameGeo.rotateX(-Math.PI / 2);
    const leftFlame = new THREE.Mesh(flameGeo, flameMat);
    leftFlame.position.set(-0.25, 0, -4.5);
    aircraft.afterburnerGroup.add(leftFlame);
    const rightFlame = new THREE.Mesh(flameGeo, flameMat);
    rightFlame.position.set(0.25, 0, -4.5);
    aircraft.afterburnerGroup.add(rightFlame);

    // Large leading-edge extensions (LEX) — the Hornet's signature. Blended
    // strakes running from the nose back into the wing roots.
    this.addLerx(aircraft.group, fuselageMat, 1, { xRoot: 0.4, xTip: 1.25, zRoot: 0.3, zFront: 3.1, y: 0.05 });
    this.addLerx(aircraft.group, fuselageMat, -1, { xRoot: 0.4, xTip: 1.25, zRoot: 0.3, zFront: 3.1, y: 0.05 });

    // Twin side intakes.
    const intakeGeo = new THREE.BoxGeometry(0.5, 0.5, 2.0);
    const leftIntake = new THREE.Mesh(intakeGeo, trimMat);
    leftIntake.position.set(-0.5, -0.25, 1.4);
    aircraft.group.add(leftIntake);
    const rightIntake = new THREE.Mesh(intakeGeo, trimMat);
    rightIntake.position.set(0.5, -0.25, 1.4);
    aircraft.group.add(rightIntake);

    // Wingtip missile rails.
    const railGeo = new THREE.CylinderGeometry(0.08, 0.06, 1.7, 6);
    railGeo.rotateX(Math.PI / 2);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 });
    [-4.6, 4.6].forEach((x) => {
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(x, 0, -1.9);
      aircraft.group.add(rail);
    });

    this.configureShadows(aircraft.group);
  }
  static buildStunt(aircraft) {
    const fuselageMat = new THREE.MeshStandardMaterial({ color: 0xffea00, roughness: 0.4 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xffea00, roughness: 0.4 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.8 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.6 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const fuseGeo = new THREE.CylinderGeometry(0.45, 0.2, 4.5, 12);
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuseGeo, fuselageMat);
    aircraft.group.add(fuselage);
    const noseGeo = new THREE.ConeGeometry(0.45, 0.8, 12);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, trimMat);
    nose.position.z = 2.65;
    aircraft.group.add(nose);
    const lowerWingGeo = new THREE.BoxGeometry(aircraft.config.dimensions.span, 0.06, 1.1);
    const lowerWing = new THREE.Mesh(lowerWingGeo, wingMat);
    lowerWing.position.set(0, -0.3, 0.4);
    aircraft.group.add(lowerWing);
    const upperWingGeo = new THREE.BoxGeometry(aircraft.config.dimensions.span + 0.4, 0.06, 1.1);
    const upperWing = new THREE.Mesh(upperWingGeo, wingMat);
    upperWing.position.set(0, 0.8, 0.6);
    aircraft.group.add(upperWing);
    const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6);
    const leftStrut = new THREE.Mesh(strutGeo, trimMat);
    leftStrut.position.set(-2.5, 0.25, 0.5);
    aircraft.group.add(leftStrut);
    const rightStrut = new THREE.Mesh(strutGeo, trimMat);
    rightStrut.position.set(2.5, 0.25, 0.5);
    aircraft.group.add(rightStrut);
    const elevatorGeo = new THREE.BoxGeometry(2.4, 0.04, 0.6);
    const elevator = new THREE.Mesh(elevatorGeo, wingMat);
    elevator.position.set(0, 0.1, -1.9);
    aircraft.group.add(elevator);
    const rudderGeo = new THREE.BoxGeometry(0.05, 1.1, 0.6);
    rudderGeo.translate(0, 0.55, 0);
    const rudder = new THREE.Mesh(rudderGeo, trimMat);
    rudder.position.set(0, 0.2, -1.9);
    aircraft.group.add(rudder);
    const canopyGeo = new THREE.SphereGeometry(0.3, 12, 12);
    canopyGeo.scale(1, 0.8, 1.8);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.42, -0.1);
    aircraft.group.add(canopy);
    aircraft.propellerGroup = new THREE.Group();
    aircraft.propellerGroup.position.set(0, 0, 3.1);
    const bladeGeo = new THREE.BoxGeometry(1.8, 0.08, 0.02);
    const blade = new THREE.Mesh(bladeGeo, propMat);
    aircraft.propellerGroup.add(blade);
    aircraft.group.add(aircraft.propellerGroup);
    const gearStrutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6);
    const tireGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10);
    tireGeo.rotateZ(Math.PI / 2);
    const leftStrutMesh = new THREE.Mesh(gearStrutGeo, metalMat);
    leftStrutMesh.position.set(-0.6, -0.5, 1.2);
    leftStrutMesh.rotation.z = 0.25;
    aircraft.gearGroup.add(leftStrutMesh);
    const leftWheel = new THREE.Mesh(tireGeo, tireMat);
    leftWheel.position.set(-0.75, -0.9, 1.2);
    aircraft.gearGroup.add(leftWheel);
    const rightStrutMesh = new THREE.Mesh(gearStrutGeo, metalMat);
    rightStrutMesh.position.set(0.6, -0.5, 1.2);
    rightStrutMesh.rotation.z = -0.25;
    aircraft.gearGroup.add(rightStrutMesh);
    const rightWheel = new THREE.Mesh(tireGeo, tireMat);
    rightWheel.position.set(0.75, -0.9, 1.2);
    aircraft.gearGroup.add(rightWheel);

    // Interplane N-struts and cabane struts tying the biplane wings together.
    const diagStrutGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.25, 6);
    [-1.4, 1.4].forEach((x) => {
      const s = new THREE.Mesh(diagStrutGeo, trimMat);
      s.position.set(x, 0.25, 0.5);
      s.rotation.x = 0.2;
      aircraft.group.add(s);
    });
    const cabaneGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.85, 6);
    [-0.35, 0.35].forEach((x) => {
      const c = new THREE.Mesh(cabaneGeo, trimMat);
      c.position.set(x, 0.45, 0.6);
      aircraft.group.add(c);
    });

    // Tail skid.
    const skidGeo = new THREE.BoxGeometry(0.05, 0.4, 0.5);
    skidGeo.translate(0, -0.2, 0);
    const skid = new THREE.Mesh(skidGeo, metalMat);
    skid.position.set(0, -0.3, -1.9);
    aircraft.group.add(skid);

    this.configureShadows(aircraft.group);
  }
  static buildCargo(aircraft) {
    const fuselageMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.5 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.5 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x10151c, roughness: 0.1, metalness: 0.9 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.6 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    aircraft.cargoPropellers = [];
    const fuseGeo = new THREE.CylinderGeometry(1.2, 0.8, 12.0, 16);
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuseGeo, fuselageMat);
    aircraft.group.add(fuselage);
    const noseGeo = new THREE.SphereGeometry(1.2, 16, 16);
    noseGeo.scale(1, 0.9, 1.4);
    const nose = new THREE.Mesh(noseGeo, fuselageMat);
    nose.position.set(0, -0.1, 6.0);
    aircraft.group.add(nose);
    const wingGeo = new THREE.BoxGeometry(16.0, 0.2, 2.2);
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(0, 1.1, 0.2);
    aircraft.group.add(wing);
    const elevatorGeo = new THREE.BoxGeometry(6.0, 0.1, 1.4);
    const elevator = new THREE.Mesh(elevatorGeo, wingMat);
    elevator.position.set(0, 0.4, -5.0);
    aircraft.group.add(elevator);
    const rudderGeo = new THREE.BoxGeometry(0.12, 3.2, 1.8);
    rudderGeo.translate(0, 1.6, 0);
    const rudder = new THREE.Mesh(rudderGeo, trimMat);
    rudder.position.set(0, 1.0, -5.0);
    aircraft.group.add(rudder);
    const cockpitGeo = new THREE.BoxGeometry(1.4, 0.6, 0.8);
    const cockpit = new THREE.Mesh(cockpitGeo, canopyMat);
    cockpit.position.set(0, 0.7, 5.0);
    aircraft.group.add(cockpit);
    const engineOffsets = [-5.5, -2.5, 2.5, 5.5];
    const nacelleGeo = new THREE.CylinderGeometry(0.35, 0.25, 1.8, 8);
    nacelleGeo.rotateX(Math.PI / 2);
    const bladeGeo = new THREE.BoxGeometry(1.6, 0.06, 0.02);
    engineOffsets.forEach((xOffset) => {
      const nacelle = new THREE.Mesh(nacelleGeo, trimMat);
      nacelle.position.set(xOffset, 1.0, 0.8);
      aircraft.group.add(nacelle);
      const propGroup = new THREE.Group();
      propGroup.position.set(xOffset, 1.0, 1.85);
      const blade = new THREE.Mesh(bladeGeo, propMat);
      propGroup.add(blade);
      aircraft.group.add(propGroup);
      aircraft.cargoPropellers.push(propGroup);
    });
    // Stubby airlifter gear: wheels tucked close to the belly so the fuselage
    // does not tower over the runway once the model is scaled to full size.
    const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8);
    const tireGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const noseStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    noseStrutMesh.position.set(0, -0.5, 4.2);
    aircraft.gearGroup.add(noseStrutMesh);
    const noseWheel = new THREE.Mesh(tireGeo, tireMat);
    noseWheel.position.set(0, -0.85, 4.2);
    aircraft.gearGroup.add(noseWheel);
    const leftStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    leftStrutMesh.position.set(-1.4, -0.5, -0.6);
    aircraft.gearGroup.add(leftStrutMesh);
    const leftWheel = new THREE.Mesh(tireGeo, tireMat);
    leftWheel.position.set(-1.5, -0.85, -0.6);
    aircraft.gearGroup.add(leftWheel);
    const rightStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    rightStrutMesh.position.set(1.4, -0.5, -0.6);
    aircraft.gearGroup.add(rightStrutMesh);
    const rightWheel = new THREE.Mesh(tireGeo, tireMat);
    rightWheel.position.set(1.5, -0.85, -0.6);
    aircraft.gearGroup.add(rightWheel);

    // Upswept rear cargo ramp under the tail.
    const rampGeo = new THREE.BoxGeometry(2.2, 0.15, 2.6);
    const ramp = new THREE.Mesh(rampGeo, fuselageMat);
    ramp.position.set(0, -0.4, -4.6);
    ramp.rotation.x = -0.35;
    aircraft.group.add(ramp);

    // Wingtip nav lights: red on the port (+X) tip, green on starboard (-X).
    const navGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const redNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redNav.position.set(8.0, 1.1, 0.2);
    aircraft.group.add(redNav);
    const greenNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    greenNav.position.set(-8.0, 1.1, 0.2);
    aircraft.group.add(greenNav);

    this.configureShadows(aircraft.group);
  }
  static buildB2(aircraft) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.55, metalness: 0.2 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.6, metalness: 0.15 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0d1116, roughness: 0.1, metalness: 0.9 });
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.85 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x6b7075, roughness: 0.3, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.9 });

    // --- Flying-wing planform (top view, +z = nose, +x = port) ---
    // The B-2's signature is a straight-swept leading edge running out to a
    // sharp wingtip, and a "double-W" sawtooth trailing edge. Build it as one
    // solid extruded polygon so the silhouette is correct from every angle,
    // instead of two crossed boxes that the calibration step then shears.
    const NOSE = 10.6, TIP_X = 26.0, TIP_Z = -3.2, AFT = -8.6;
    const halfTE = [            // trailing edge from wingtip in to centreline
      [TIP_X, TIP_Z],
      [20.5, -6.6],
      [16.0, -4.2],
      [10.6, -7.5],
      [5.2, -5.0],
      [0, AFT]
    ];
    const shape = new THREE.Shape();
    shape.moveTo(0, NOSE);                       // nose point
    shape.lineTo(TIP_X, TIP_Z);                  // port leading edge
    for (const [x, z] of halfTE.slice(1)) shape.lineTo(x, z); // port sawtooth TE
    for (let i = halfTE.length - 2; i >= 0; i--) {            // starboard sawtooth TE
      shape.lineTo(-halfTE[i][0], halfTE[i][1]);
    }
    shape.lineTo(0, NOSE);                        // starboard leading edge back to nose
    const thick = 0.9;
    const wingGeo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
    wingGeo.rotateX(Math.PI / 2);                // planform into XZ, thickness along -Y
    wingGeo.translate(0, thick / 2, 0);          // centre the slab on y = 0
    const wing = new THREE.Mesh(wingGeo, wingMat);
    aircraft.group.add(wing);

    // Blended centre body: a raised dome giving the fuselage its volume and
    // hiding the flat slab's centre seam. Sat so its underside stays flush with
    // the wing so the aircraft keeps the flying-wing's flat belly.
    const bodyGeo = new THREE.SphereGeometry(1, 20, 14);
    bodyGeo.scale(3.6, 1.4, 8.6);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.95, 1.2);
    aircraft.group.add(body);

    // Cockpit canopy: a low faceted blister riding the spine near the nose.
    const cockpitGeo = new THREE.SphereGeometry(0.95, 16, 10);
    cockpitGeo.scale(1.0, 0.55, 1.8);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 1.75, 5.4);
    aircraft.group.add(cockpit);

    // Top-mounted engine intakes and rear exhaust slots (two banks of two).
    const intakeGeo = new THREE.BoxGeometry(1.6, 0.5, 2.4);
    const exhGeo = new THREE.BoxGeometry(1.4, 0.2, 1.6);
    [-3.4, -1.5, 1.5, 3.4].forEach((x) => {
      const intake = new THREE.Mesh(intakeGeo, bodyMat);
      intake.position.set(x, 0.7, 1.8);
      aircraft.group.add(intake);
      const exh = new THREE.Mesh(exhGeo, exhaustMat);
      exh.position.set(x, 0.5, -2.2);
      aircraft.group.add(exh);
    });

    // Wingtip nav lights: red on the port (+X) tip, green on starboard (-X).
    const navGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const redNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redNav.position.set(TIP_X - 0.5, 0.1, TIP_Z);
    aircraft.group.add(redNav);
    const greenNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    greenNav.position.set(-(TIP_X - 0.5), 0.1, TIP_Z);
    aircraft.group.add(greenNav);

    // --- Retractable landing gear: nose + two multi-wheel mains ---
    const strutGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8);
    const tireGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 14);
    tireGeo.rotateZ(Math.PI / 2);

    const noseStrut = new THREE.Mesh(strutGeo, metalMat);
    noseStrut.position.set(0, -0.75, 3.4);
    aircraft.gearGroup.add(noseStrut);
    const noseWheel = new THREE.Mesh(tireGeo, tireMat);
    noseWheel.position.set(0, -1.35, 3.4);
    aircraft.gearGroup.add(noseWheel);

    [-1.8, 1.8].forEach((x) => {
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.position.set(x, -0.75, -0.6);
      aircraft.gearGroup.add(strut);
      [-0.5, 0.5].forEach((dz) => {
        const wheel = new THREE.Mesh(tireGeo, tireMat);
        wheel.position.set(x, -1.35, -0.6 + dz);
        aircraft.gearGroup.add(wheel);
      });
    });

    this.configureShadows(aircraft.group);
  }
  static buildF16(aircraft) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.5 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.5 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.65 });
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const fuseGeo = new THREE.CylinderGeometry(0.35, 0.35, 7.5, 12);
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuseGeo, bodyMat);
    aircraft.group.add(fuselage);
    const noseGeo = new THREE.ConeGeometry(0.35, 2.0, 12);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, trimMat);
    nose.position.z = 4.75;
    aircraft.group.add(nose);
    const intakeGeo = new THREE.BoxGeometry(0.45, 0.3, 1.8);
    const intake = new THREE.Mesh(intakeGeo, trimMat);
    intake.position.set(0, -0.4, 2.5);
    aircraft.group.add(intake);
    const leftWingGeo = new THREE.BoxGeometry(aircraft.config.dimensions.span / 2.2, 0.06, 1.8);
    leftWingGeo.translate(-aircraft.config.dimensions.span / 4.4, 0, 0);
    const leftWing = new THREE.Mesh(leftWingGeo, bodyMat);
    leftWing.position.set(0, 0, -0.5);
    leftWing.rotation.y = -0.35;
    aircraft.group.add(leftWing);
    const rightWingGeo = new THREE.BoxGeometry(aircraft.config.dimensions.span / 2.2, 0.06, 1.8);
    rightWingGeo.translate(aircraft.config.dimensions.span / 4.4, 0, 0);
    const rightWing = new THREE.Mesh(rightWingGeo, bodyMat);
    rightWing.position.set(0, 0, -0.5);
    rightWing.rotation.y = 0.35;
    aircraft.group.add(rightWing);
    const finGeo = new THREE.BoxGeometry(0.05, 1.7, 1.1);
    finGeo.translate(0, 0.85, 0);
    const fin = new THREE.Mesh(finGeo, trimMat);
    fin.position.set(0, 0.3, -2.8);
    aircraft.group.add(fin);
    const elevGeo = new THREE.BoxGeometry(2.4, 0.04, 0.8);
    const elev = new THREE.Mesh(elevGeo, bodyMat);
    elev.position.set(0, 0, -3.2);
    aircraft.group.add(elev);
    const canopyGeo = new THREE.SphereGeometry(0.3, 12, 12);
    canopyGeo.scale(1, 0.8, 2.8);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.38, 1.6);
    aircraft.group.add(canopy);
    const nozzleGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.6, 8);
    nozzleGeo.rotateX(Math.PI / 2);
    const nozzle = new THREE.Mesh(nozzleGeo, exhaustMat);
    nozzle.position.set(0, 0, -4.0);
    aircraft.group.add(nozzle);
    const strutGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6);
    const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 10);
    tireGeo.rotateZ(Math.PI / 2);
    const noseStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    noseStrutMesh.position.set(0, -0.6, 2.8);
    aircraft.gearGroup.add(noseStrutMesh);
    const noseWheel = new THREE.Mesh(tireGeo, tireMat);
    noseWheel.position.set(0, -1.2, 2.8);
    aircraft.gearGroup.add(noseWheel);
    const leftStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    leftStrutMesh.position.set(-0.6, -0.6, -0.8);
    leftStrutMesh.rotation.z = 0.15;
    aircraft.gearGroup.add(leftStrutMesh);
    const leftWheel = new THREE.Mesh(tireGeo, tireMat);
    leftWheel.position.set(-0.75, -1.2, -0.8);
    aircraft.gearGroup.add(leftWheel);
    const rightStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    rightStrutMesh.position.set(0.6, -0.6, -0.8);
    rightStrutMesh.rotation.z = -0.15;
    aircraft.gearGroup.add(rightStrutMesh);
    const rightWheel = new THREE.Mesh(tireGeo, tireMat);
    rightWheel.position.set(0.75, -1.2, -0.8);
    aircraft.gearGroup.add(rightWheel);
    const flameGeo = new THREE.ConeGeometry(0.16, 1.8, 8);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff3d00, transparent: true, opacity: 0.85 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 0, -4.3);
    aircraft.afterburnerGroup.add(flame);

    // Distinctive chin intake lip under the nose.
    const intakeLipGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.55, 12);
    intakeLipGeo.rotateX(Math.PI / 2);
    const intakeLip = new THREE.Mesh(intakeLipGeo, exhaustMat);
    intakeLip.position.set(0, -0.52, 3.1);
    aircraft.group.add(intakeLip);

    // LERX strakes blending the nose into the wing roots.
    this.addLerx(aircraft.group, bodyMat, 1, { xRoot: 0.32, xTip: 1.0, zRoot: 0.2, zFront: 3.4, y: 0.03 });
    this.addLerx(aircraft.group, bodyMat, -1, { xRoot: 0.32, xTip: 1.0, zRoot: 0.2, zFront: 3.4, y: 0.03 });

    // Ventral fins under the tail.
    const ventralGeo = new THREE.BoxGeometry(0.05, 0.55, 0.9);
    ventralGeo.translate(0, -0.27, 0);
    const leftVentral = new THREE.Mesh(ventralGeo, trimMat);
    leftVentral.position.set(-0.4, -0.35, -3.0);
    leftVentral.rotation.z = 0.45;
    aircraft.group.add(leftVentral);
    const rightVentral = new THREE.Mesh(ventralGeo, trimMat);
    rightVentral.position.set(0.4, -0.35, -3.0);
    rightVentral.rotation.z = -0.45;
    aircraft.group.add(rightVentral);

    // Wingtip missile rails.
    const railGeo = new THREE.CylinderGeometry(0.07, 0.05, 1.6, 6);
    railGeo.rotateX(Math.PI / 2);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 });
    [-3.9, 3.9].forEach((x) => {
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(x, 0.05, -1.2);
      aircraft.group.add(rail);
    });

    this.configureShadows(aircraft.group);
  }
  static buildF35(aircraft) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.65 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.6 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.65 });
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const fuseGeo = new THREE.BoxGeometry(0.9, 0.7, 7.2);
    const fuselage = new THREE.Mesh(fuseGeo, bodyMat);
    aircraft.group.add(fuselage);
    const noseGeo = new THREE.ConeGeometry(0.45, 2.2, 4);
    noseGeo.rotateX(Math.PI / 2);
    noseGeo.rotateZ(Math.PI / 4);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.z = 4.7;
    aircraft.group.add(nose);
    const leftWingGeo = new THREE.BoxGeometry(aircraft.config.dimensions.span / 2.2, 0.07, 1.9);
    leftWingGeo.translate(-aircraft.config.dimensions.span / 4.4, 0, 0);
    const leftWing = new THREE.Mesh(leftWingGeo, bodyMat);
    leftWing.position.set(0, 0, -0.6);
    leftWing.rotation.y = -0.4;
    aircraft.group.add(leftWing);
    const rightWingGeo = new THREE.BoxGeometry(aircraft.config.dimensions.span / 2.2, 0.07, 1.9);
    rightWingGeo.translate(aircraft.config.dimensions.span / 4.4, 0, 0);
    const rightWing = new THREE.Mesh(rightWingGeo, bodyMat);
    rightWing.position.set(0, 0, -0.6);
    rightWing.rotation.y = 0.4;
    aircraft.group.add(rightWing);
    const finGeo = new THREE.BoxGeometry(0.04, 1.6, 1.0);
    finGeo.translate(0, 0.8, 0);
    const leftFin = new THREE.Mesh(finGeo, trimMat);
    leftFin.position.set(-0.6, 0.3, -2.6);
    leftFin.rotation.z = -0.25;
    aircraft.group.add(leftFin);
    const rightFin = new THREE.Mesh(finGeo, trimMat);
    rightFin.position.set(0.6, 0.3, -2.6);
    rightFin.rotation.z = 0.25;
    aircraft.group.add(rightFin);
    const leftElev = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.8), bodyMat);
    leftElev.position.set(-1.1, 0, -3.2);
    leftElev.rotation.y = -0.3;
    aircraft.group.add(leftElev);
    const rightElev = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.8), bodyMat);
    rightElev.position.set(1.1, 0, -3.2);
    rightElev.rotation.y = 0.3;
    aircraft.group.add(rightElev);
    const canopyGeo = new THREE.SphereGeometry(0.32, 12, 12);
    canopyGeo.scale(1, 0.85, 2.6);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.4, 1.5);
    aircraft.group.add(canopy);
    const nozzleGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.6, 8);
    nozzleGeo.rotateX(Math.PI / 2);
    const nozzle = new THREE.Mesh(nozzleGeo, exhaustMat);
    nozzle.position.set(0, 0, -3.8);
    aircraft.group.add(nozzle);
    const strutGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6);
    const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 10);
    tireGeo.rotateZ(Math.PI / 2);
    const noseStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    noseStrutMesh.position.set(0, -0.6, 2.5);
    aircraft.gearGroup.add(noseStrutMesh);
    const noseWheel = new THREE.Mesh(tireGeo, tireMat);
    noseWheel.position.set(0, -1.2, 2.5);
    aircraft.gearGroup.add(noseWheel);
    const leftStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    leftStrutMesh.position.set(-0.5, -0.6, -0.8);
    leftStrutMesh.rotation.z = 0.12;
    aircraft.gearGroup.add(leftStrutMesh);
    const leftWheel = new THREE.Mesh(tireGeo, tireMat);
    leftWheel.position.set(-0.65, -1.2, -0.8);
    aircraft.gearGroup.add(leftWheel);
    const rightStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    rightStrutMesh.position.set(0.5, -0.6, -0.8);
    rightStrutMesh.rotation.z = -0.12;
    aircraft.gearGroup.add(rightStrutMesh);
    const rightWheel = new THREE.Mesh(tireGeo, tireMat);
    rightWheel.position.set(0.65, -1.2, -0.8);
    aircraft.gearGroup.add(rightWheel);
    const flameGeo = new THREE.ConeGeometry(0.15, 1.8, 8);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff3d00, transparent: true, opacity: 0.85 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 0, -4.1);
    aircraft.afterburnerGroup.add(flame);

    // DSI (diverterless) intake bumps on the fuselage sides.
    const bumpGeo = new THREE.SphereGeometry(0.42, 12, 10);
    bumpGeo.scale(1.0, 0.85, 1.5);
    const leftBump = new THREE.Mesh(bumpGeo, bodyMat);
    leftBump.position.set(-0.58, -0.12, 2.0);
    aircraft.group.add(leftBump);
    const rightBump = new THREE.Mesh(bumpGeo, bodyMat);
    rightBump.position.set(0.58, -0.12, 2.0);
    aircraft.group.add(rightBump);

    // Weapons-bay belly bulge (the F-35's characteristically deep fuselage).
    const belly = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.45, 4.2), bodyMat);
    belly.position.set(0, -0.42, 0.4);
    aircraft.group.add(belly);

    // Leading-edge root chines blending the nose into the wing roots.
    this.addLerx(aircraft.group, bodyMat, 1, { xRoot: 0.42, xTip: 1.15, zRoot: 0.35, zFront: 3.5, y: 0.05 });
    this.addLerx(aircraft.group, bodyMat, -1, { xRoot: 0.42, xTip: 1.15, zRoot: 0.35, zFront: 3.5, y: 0.05 });

    this.configureShadows(aircraft.group);
  }
  static buildF22(aircraft) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x607d8b, roughness: 0.6 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.6 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.65 });
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const fuseGeo = new THREE.BoxGeometry(1.0, 0.65, 7.8);
    const fuselage = new THREE.Mesh(fuseGeo, bodyMat);
    aircraft.group.add(fuselage);
    const noseGeo = new THREE.ConeGeometry(0.5, 2.4, 4);
    noseGeo.rotateX(Math.PI / 2);
    noseGeo.rotateZ(Math.PI / 4);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.z = 5.1;
    aircraft.group.add(nose);
    const leftWingGeo = new THREE.BoxGeometry(aircraft.config.dimensions.span / 2.2, 0.07, 2.2);
    leftWingGeo.translate(-aircraft.config.dimensions.span / 4.4, 0, 0);
    const leftWing = new THREE.Mesh(leftWingGeo, bodyMat);
    leftWing.position.set(0, 0, -0.6);
    leftWing.rotation.y = -0.42;
    aircraft.group.add(leftWing);
    const rightWingGeo = new THREE.BoxGeometry(aircraft.config.dimensions.span / 2.2, 0.07, 2.2);
    rightWingGeo.translate(aircraft.config.dimensions.span / 4.4, 0, 0);
    const rightWing = new THREE.Mesh(rightWingGeo, bodyMat);
    rightWing.position.set(0, 0, -0.6);
    rightWing.rotation.y = 0.42;
    aircraft.group.add(rightWing);
    const finGeo = new THREE.BoxGeometry(0.04, 1.8, 1.1);
    finGeo.translate(0, 0.9, 0);
    const leftFin = new THREE.Mesh(finGeo, trimMat);
    leftFin.position.set(-0.7, 0.35, -2.8);
    leftFin.rotation.z = -0.28;
    aircraft.group.add(leftFin);
    const rightFin = new THREE.Mesh(finGeo, trimMat);
    rightFin.position.set(0.7, 0.35, -2.8);
    rightFin.rotation.z = 0.28;
    aircraft.group.add(rightFin);
    const leftElev = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.9), bodyMat);
    leftElev.position.set(-1.2, 0, -3.5);
    leftElev.rotation.y = -0.35;
    aircraft.group.add(leftElev);
    const rightElev = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.9), bodyMat);
    rightElev.position.set(1.2, 0, -3.5);
    rightElev.rotation.y = 0.35;
    aircraft.group.add(rightElev);
    const canopyGeo = new THREE.SphereGeometry(0.34, 12, 12);
    canopyGeo.scale(1, 0.85, 2.8);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.42, 1.5);
    aircraft.group.add(canopy);
    const nozzleGeo = new THREE.BoxGeometry(0.3, 0.15, 0.6);
    const leftNozzle = new THREE.Mesh(nozzleGeo, exhaustMat);
    leftNozzle.position.set(-0.25, 0, -4.1);
    aircraft.group.add(leftNozzle);
    const rightNozzle = new THREE.Mesh(nozzleGeo, exhaustMat);
    rightNozzle.position.set(0.25, 0, -4.1);
    aircraft.group.add(rightNozzle);
    const strutGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6);
    const tireGeo = new THREE.CylinderGeometry(0.38, 0.36, 0.25, 10);
    tireGeo.rotateZ(Math.PI / 2);
    const noseStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    noseStrutMesh.position.set(0, -0.6, 2.8);
    aircraft.gearGroup.add(noseStrutMesh);
    const noseWheel = new THREE.Mesh(tireGeo, tireMat);
    noseWheel.position.set(0, -1.2, 2.8);
    aircraft.gearGroup.add(noseWheel);
    const leftStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    leftStrutMesh.position.set(-0.55, -0.6, -1.0);
    leftStrutMesh.rotation.z = 0.12;
    aircraft.gearGroup.add(leftStrutMesh);
    const leftWheel = new THREE.Mesh(tireGeo, tireMat);
    leftWheel.position.set(-0.7, -1.2, -1.0);
    aircraft.gearGroup.add(leftWheel);
    const rightStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    rightStrutMesh.position.set(0.55, -0.6, -1.0);
    rightStrutMesh.rotation.z = -0.12;
    aircraft.gearGroup.add(rightStrutMesh);
    const rightWheel = new THREE.Mesh(tireGeo, tireMat);
    rightWheel.position.set(0.7, -1.2, -1.0);
    aircraft.gearGroup.add(rightWheel);
    const flameGeo = new THREE.ConeGeometry(0.14, 1.8, 8);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff3d00, transparent: true, opacity: 0.85 });
    const leftFlame = new THREE.Mesh(flameGeo, flameMat);
    leftFlame.position.set(-0.25, 0, -4.3);
    aircraft.afterburnerGroup.add(leftFlame);
    const rightFlame = new THREE.Mesh(flameGeo, flameMat);
    rightFlame.position.set(0.25, 0, -4.3);
    aircraft.afterburnerGroup.add(rightFlame);

    // Caret engine intakes under the wing roots.
    const intakeGeo = new THREE.BoxGeometry(0.55, 0.5, 2.4);
    const leftIntake = new THREE.Mesh(intakeGeo, trimMat);
    leftIntake.position.set(-0.62, -0.22, 1.9);
    leftIntake.rotation.y = 0.09;
    aircraft.group.add(leftIntake);
    const rightIntake = new THREE.Mesh(intakeGeo, trimMat);
    rightIntake.position.set(0.62, -0.22, 1.9);
    rightIntake.rotation.y = -0.09;
    aircraft.group.add(rightIntake);

    // Leading-edge root extensions (chines) blending the nose into the wings.
    this.addLerx(aircraft.group, bodyMat, 1, { xRoot: 0.48, xTip: 1.3, zRoot: 0.4, zFront: 3.7, y: 0.06 });
    this.addLerx(aircraft.group, bodyMat, -1, { xRoot: 0.48, xTip: 1.3, zRoot: 0.4, zFront: 3.7, y: 0.06 });

    // Dorsal spine.
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 4.0), bodyMat);
    spine.position.set(0, 0.32, -0.6);
    aircraft.group.add(spine);

    this.configureShadows(aircraft.group);
  }
  static buildWarbird(aircraft) {
    // P-51: polished-aluminum fuselage, red empennage, bubble canopy, belly
    // radiator scoop and a four-blade prop on a big spinner. Taildragger gear.
    const alumMat = new THREE.MeshStandardMaterial({ color: 0xc7ccd1, roughness: 0.25, metalness: 0.75 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.4 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.08, metalness: 0.9, transparent: true, opacity: 0.75 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.5 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    const fuseGeo = new THREE.CylinderGeometry(0.5, 0.26, 7.4, 16);
    fuseGeo.rotateX(Math.PI / 2); // wide end forward (+Z)
    const fuselage = new THREE.Mesh(fuseGeo, alumMat);
    fuselage.position.z = 0.3;
    aircraft.group.add(fuselage);

    // Spinner + four-blade prop.
    const spinnerGeo = new THREE.ConeGeometry(0.42, 1.0, 14);
    spinnerGeo.rotateX(Math.PI / 2); // apex forward
    const spinner = new THREE.Mesh(spinnerGeo, redMat);
    spinner.position.z = 4.4;
    aircraft.group.add(spinner);
    aircraft.propellerGroup = new THREE.Group();
    aircraft.propellerGroup.position.set(0, 0, 4.15);
    // Four blades as an X so no blade hangs straight down (ground clearance).
    const bladeGeo = new THREE.BoxGeometry(3.2, 0.20, 0.05);
    const blade1 = new THREE.Mesh(bladeGeo, propMat);
    blade1.rotation.z = Math.PI / 4;
    const blade2 = new THREE.Mesh(bladeGeo, propMat);
    blade2.rotation.z = -Math.PI / 4;
    aircraft.propellerGroup.add(blade1, blade2);
    aircraft.group.add(aircraft.propellerGroup);

    // Signature belly radiator scoop aft of the wing.
    const scoopGeo = new THREE.BoxGeometry(0.7, 0.55, 2.4);
    const scoop = new THREE.Mesh(scoopGeo, alumMat);
    scoop.position.set(0, -0.55, -0.6);
    aircraft.group.add(scoop);

    // Low-set laminar wing with a touch of dihedral.
    const halfSpan = aircraft.config.dimensions.span / 2;
    [1, -1].forEach((side) => {
      const wingGeo = new THREE.BoxGeometry(halfSpan, 0.12, 1.9);
      wingGeo.translate(side * halfSpan / 2, 0, 0);
      const wing = new THREE.Mesh(wingGeo, alumMat);
      wing.position.set(0, -0.15, 0.6);
      wing.rotation.z = side * 0.06;  // dihedral: tips slightly up
      wing.rotation.y = side * -0.06; // gentle taper-line sweep
      aircraft.group.add(wing);
    });

    // Bubble canopy.
    const canopyGeo = new THREE.SphereGeometry(0.42, 16, 16);
    canopyGeo.scale(0.9, 0.85, 2.1);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.5, 0.5);
    aircraft.group.add(canopy);

    // Red empennage (the Redtail scheme): stabilizer, fin and rudder.
    const elevGeo = new THREE.BoxGeometry(3.6, 0.08, 1.0);
    const elevator = new THREE.Mesh(elevGeo, redMat);
    elevator.position.set(0, 0.15, -3.9);
    aircraft.group.add(elevator);
    const finGeo = new THREE.BoxGeometry(0.08, 1.5, 1.2);
    finGeo.translate(0, 0.75, 0);
    const fin = new THREE.Mesh(finGeo, redMat);
    fin.position.set(0, 0.25, -3.9);
    aircraft.group.add(fin);
    const filletGeo = new THREE.BoxGeometry(0.07, 0.45, 1.2);
    filletGeo.translate(0, 0.22, 0);
    const fillet = new THREE.Mesh(filletGeo, redMat);
    fillet.position.set(0, 0.3, -3.0);
    aircraft.group.add(fillet);

    // Chin carburetor intake under the cowl.
    const chinGeo = new THREE.BoxGeometry(0.55, 0.35, 1.4);
    const chin = new THREE.Mesh(chinGeo, alumMat);
    chin.position.set(0, -0.45, 3.0);
    aircraft.group.add(chin);

    // Taildragger gear: wide-track mains under the wing, small tailwheel.
    const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8);
    const tireGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 12);
    tireGeo.rotateZ(Math.PI / 2);
    [-1.7, 1.7].forEach((x) => {
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.position.set(x, -0.7, 0.9);
      strut.rotation.z = x < 0 ? 0.12 : -0.12;
      aircraft.gearGroup.add(strut);
      const wheel = new THREE.Mesh(tireGeo, tireMat);
      wheel.position.set(x * 1.06, -1.25, 0.9);
      aircraft.gearGroup.add(wheel);
    });
    const tailStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 6), metalMat);
    tailStrut.position.set(0, -0.55, -3.8);
    aircraft.gearGroup.add(tailStrut);
    const tailTireGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.14, 10);
    tailTireGeo.rotateZ(Math.PI / 2);
    const tailWheel = new THREE.Mesh(tailTireGeo, tireMat);
    tailWheel.position.set(0, -1.05, -3.8);
    aircraft.gearGroup.add(tailWheel);

    // Exhaust stack rows on the cowl sides.
    const stackGeo = new THREE.BoxGeometry(0.1, 0.12, 1.5);
    [-0.42, 0.42].forEach((x) => {
      const stack = new THREE.Mesh(stackGeo, trimMat);
      stack.position.set(x, 0.18, 3.0);
      aircraft.group.add(stack);
    });

    // Wingtip nav lights: red on the port (+X) tip, green on starboard (-X).
    const navGeo = new THREE.SphereGeometry(0.11, 8, 8);
    const redNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redNav.position.set(halfSpan, 0.18, 0.55);
    aircraft.group.add(redNav);
    const greenNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    greenNav.position.set(-halfSpan, 0.18, 0.55);
    aircraft.group.add(greenNav);

    this.configureShadows(aircraft.group);
  }
  static buildAttack(aircraft) {
    // A-10: straight low wing, two turbofans podded high on the aft fuselage,
    // twin tails on the stabilizer tips and the gun muzzle under the nose.
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7d8a80, roughness: 0.65 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x59665c, roughness: 0.6 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1c2a33, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.75 });
    const nacelleMat = new THREE.MeshStandardMaterial({ color: 0xaab4ad, roughness: 0.4, metalness: 0.4 });
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    const fuseGeo = new THREE.CylinderGeometry(0.85, 0.65, 11.0, 16);
    fuseGeo.rotateX(Math.PI / 2); // wide end forward (+Z)
    const fuselage = new THREE.Mesh(fuseGeo, bodyMat);
    fuselage.position.z = 0.2;
    aircraft.group.add(fuselage);
    const noseGeo = new THREE.ConeGeometry(0.85, 2.4, 16);
    noseGeo.rotateX(Math.PI / 2); // apex forward
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.z = 6.9;
    aircraft.group.add(nose);

    // GAU-8 cannon muzzle poking out under the nose tip.
    const gunGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.6, 10);
    gunGeo.rotateX(Math.PI / 2);
    const gun = new THREE.Mesh(gunGeo, gunMat);
    gun.position.set(0, -0.35, 7.6);
    aircraft.group.add(gun);

    // Bathtub cockpit with a big bubble canopy well forward.
    const canopyGeo = new THREE.SphereGeometry(0.55, 16, 16);
    canopyGeo.scale(0.9, 0.85, 1.9);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.7, 4.4);
    aircraft.group.add(canopy);

    // Long straight wing, slightly low-set, with wheel fairing pods.
    const halfSpan = aircraft.config.dimensions.span / 2;
    [1, -1].forEach((side) => {
      const wingGeo = new THREE.BoxGeometry(halfSpan, 0.16, 2.6);
      wingGeo.translate(side * halfSpan / 2, 0, 0);
      const wing = new THREE.Mesh(wingGeo, bodyMat);
      wing.position.set(0, -0.35, 0.8);
      wing.rotation.z = side * 0.03;
      aircraft.group.add(wing);
      // Main-gear pod fairing part-way out the wing.
      const podGeo = new THREE.SphereGeometry(0.5, 12, 10);
      podGeo.scale(0.9, 0.8, 2.2);
      const pod = new THREE.Mesh(podGeo, trimMat);
      pod.position.set(side * 2.6, -0.55, 0.9);
      aircraft.group.add(pod);
    });

    // Podded turbofans high on the aft fuselage sides.
    [1, -1].forEach((side) => {
      const nacelleGeo = new THREE.CylinderGeometry(0.72, 0.62, 3.4, 14);
      nacelleGeo.rotateX(Math.PI / 2);
      const nacelle = new THREE.Mesh(nacelleGeo, nacelleMat);
      nacelle.position.set(side * 1.5, 1.05, -3.4);
      aircraft.group.add(nacelle);
      const inletGeo = new THREE.TorusGeometry(0.62, 0.1, 8, 16);
      const inlet = new THREE.Mesh(inletGeo, trimMat);
      inlet.position.set(side * 1.5, 1.05, -1.7);
      aircraft.group.add(inlet);
      const pylonGeo = new THREE.BoxGeometry(0.25, 0.8, 1.8);
      const pylon = new THREE.Mesh(pylonGeo, bodyMat);
      pylon.position.set(side * 0.95, 0.6, -3.4);
      pylon.rotation.z = side * 0.5;
      aircraft.group.add(pylon);
    });

    // Tailplane with the twin fins mounted at its tips.
    const stabGeo = new THREE.BoxGeometry(5.8, 0.12, 1.7);
    const stab = new THREE.Mesh(stabGeo, bodyMat);
    stab.position.set(0, 0.1, -6.8);
    aircraft.group.add(stab);
    const finGeo = new THREE.BoxGeometry(0.12, 2.0, 1.6);
    finGeo.translate(0, 1.0, 0);
    [-2.8, 2.8].forEach((x) => {
      const fin = new THREE.Mesh(finGeo, trimMat);
      fin.position.set(x, 0.1, -6.8);
      aircraft.group.add(fin);
    });

    // Underwing pylons with stores.
    const pylonGeo = new THREE.BoxGeometry(0.12, 0.4, 0.9);
    const storeGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.6, 8);
    storeGeo.rotateX(Math.PI / 2);
    [-5.2, -3.8, 3.8, 5.2].forEach((x) => {
      const pylon = new THREE.Mesh(pylonGeo, trimMat);
      pylon.position.set(x, -0.6, 0.8);
      aircraft.group.add(pylon);
      const store = new THREE.Mesh(storeGeo, gunMat);
      store.position.set(x, -0.85, 0.8);
      aircraft.group.add(store);
    });

    // Gear: nose strut + mains dropping from the wing pods.
    const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
    const tireGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.34, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const noseStrut = new THREE.Mesh(strutGeo, metalMat);
    noseStrut.position.set(0.25, -0.9, 5.0); // offset right of the gun, like the real one
    aircraft.gearGroup.add(noseStrut);
    const noseWheel = new THREE.Mesh(tireGeo, tireMat);
    noseWheel.position.set(0.25, -1.45, 5.0);
    aircraft.gearGroup.add(noseWheel);
    [-2.6, 2.6].forEach((x) => {
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.position.set(x, -0.9, 0.7);
      aircraft.gearGroup.add(strut);
      const wheel = new THREE.Mesh(tireGeo, tireMat);
      wheel.position.set(x, -1.45, 0.7);
      aircraft.gearGroup.add(wheel);
    });

    // Wingtip nav lights: red on the port (+X) tip, green on starboard (-X).
    const navGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const redNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redNav.position.set(halfSpan, -0.1, 0.8);
    aircraft.group.add(redNav);
    const greenNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    greenNav.position.set(-halfSpan, -0.1, 0.8);
    aircraft.group.add(greenNav);

    this.configureShadows(aircraft.group);
  }
  // A leading-edge root extension (LERX/strake): a thin flat triangle that
  // tapers from a point near the nose back to the wing-root leading edge,
  // hugging the fuselage. Built as a solid so it blends into the wing instead
  // of splaying outward like a canard foreplane.
  // KC-135 Stratotanker: four podded turbofans on a 35-degree swept low wing,
  // narrow-body fuselage, and the signature refueling boom trailing the tail.
  // Built near true meters; the calibration pass in build() trues it to config.
  static buildKC135(aircraft) {
    const fuseMat = new THREE.MeshStandardMaterial({ color: 0x9ea7ad, roughness: 0.45, metalness: 0.35 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x8d969c, roughness: 0.5, metalness: 0.3 });
    const podMat = new THREE.MeshStandardMaterial({ color: 0x5c666d, roughness: 0.4, metalness: 0.5 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x10151c, roughness: 0.1, metalness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const g = aircraft.group;

    const fuseGeo = new THREE.CylinderGeometry(1.9, 1.6, 34.0, 16);
    fuseGeo.rotateX(Math.PI / 2);
    g.add(new THREE.Mesh(fuseGeo, fuseMat));
    const noseGeo = new THREE.SphereGeometry(1.9, 16, 16);
    noseGeo.scale(1, 0.95, 1.6);
    const nose = new THREE.Mesh(noseGeo, fuseMat);
    nose.position.set(0, 0, 17.0);
    g.add(nose);
    const tailGeo = new THREE.ConeGeometry(1.6, 6.0, 12);
    tailGeo.rotateX(-Math.PI / 2); // apex aft
    const tailCone = new THREE.Mesh(tailGeo, fuseMat);
    tailCone.position.set(0, 0.4, -20.0);
    tailCone.rotation.x = -0.06;
    g.add(tailCone);
    const cockpitGeo = new THREE.BoxGeometry(2.2, 0.8, 1.6);
    const cockpit = new THREE.Mesh(cockpitGeo, canopyMat);
    cockpit.position.set(0, 1.2, 14.5);
    g.add(cockpit);

    // Swept low wing: boxes with the inboard edge on the centreline, tips aft.
    const sweep = 0.42;
    for (const side of [1, -1]) {
      const wGeo = new THREE.BoxGeometry(19.0, 0.4, 5.6);
      wGeo.translate(side * 9.5, 0, 0);
      const w = new THREE.Mesh(wGeo, wingMat);
      w.position.set(0, -1.1, 2.5);
      w.rotation.y = side * sweep;
      g.add(w);
    }

    // Four podded engines slung ahead of and below the wing.
    const podGeo = new THREE.CylinderGeometry(0.85, 0.75, 4.4, 12);
    podGeo.rotateX(Math.PI / 2);
    const pylonGeo = new THREE.BoxGeometry(0.25, 1.0, 2.6);
    for (const x of [-13.0, -7.0, 7.0, 13.0]) {
      const podZ = 3.6 - Math.abs(x) * 0.44;
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(x, -2.5, podZ);
      g.add(pod);
      const pylon = new THREE.Mesh(pylonGeo, wingMat);
      pylon.position.set(x, -1.7, podZ - 0.4);
      g.add(pylon);
    }

    // Swept empennage.
    const finGeo = new THREE.BoxGeometry(0.35, 7.0, 4.6);
    finGeo.translate(0, 3.5, 0);
    const fin = new THREE.Mesh(finGeo, wingMat);
    fin.position.set(0, 1.2, -18.0);
    fin.rotation.x = 0.35; // rake the tip aft
    g.add(fin);
    for (const side of [1, -1]) {
      const sGeo = new THREE.BoxGeometry(6.5, 0.25, 3.2);
      sGeo.translate(side * 3.25, 0, 0);
      const s = new THREE.Mesh(sGeo, wingMat);
      s.position.set(0, 0.8, -18.5);
      s.rotation.y = side * 0.45;
      g.add(s);
    }

    // Refueling boom trailing down and aft from under the tail.
    const boomGeo = new THREE.CylinderGeometry(0.16, 0.10, 9.0, 8);
    boomGeo.rotateX(Math.PI / 2);
    boomGeo.translate(0, 0, -4.5);
    const boom = new THREE.Mesh(boomGeo, metalMat);
    boom.position.set(0, -1.0, -19.0);
    boom.rotation.x = -0.18; // droop
    g.add(boom);
    const ruddevGeo = new THREE.BoxGeometry(2.4, 0.08, 0.9);
    const ruddev = new THREE.Mesh(ruddevGeo, wingMat);
    ruddev.position.set(0, 0.4, -24.0);
    g.add(ruddev);

    // Tricycle gear: nose strut plus twin main bogies.
    const strutGeo = new THREE.CylinderGeometry(0.14, 0.14, 2.2, 8);
    const tireGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.45, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const addGear = (x, z) => {
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.position.set(x, -2.2, z);
      aircraft.gearGroup.add(strut);
      for (const dz of [-0.55, 0.55]) {
        const wheel = new THREE.Mesh(tireGeo, tireMat);
        wheel.position.set(x, -3.2, z + dz);
        aircraft.gearGroup.add(wheel);
      }
    };
    addGear(0, 13.0);
    addGear(-2.6, -2.0);
    addGear(2.6, -2.0);

    // Nav lights: red on the port (+X) tip, green on starboard (-X).
    const navGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const tipZ = 2.5 - 19.0 * Math.sin(sweep);
    const redNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redNav.position.set(19.0 * Math.cos(sweep), -1.1, tipZ);
    g.add(redNav);
    const greenNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    greenNav.position.set(-19.0 * Math.cos(sweep), -1.1, tipZ);
    g.add(greenNav);

    this.configureShadows(g);
  }

  // B-52 Stratofortress: eight engines in four twin pods on a huge swept
  // shoulder wing, long slab fuselage, tall fin, tandem bicycle gear with
  // wingtip outriggers. Near true meters; calibration in build() trues it.
  static buildB52(aircraft) {
    const fuseMat = new THREE.MeshStandardMaterial({ color: 0x4a5257, roughness: 0.6, metalness: 0.25 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x424a4f, roughness: 0.6, metalness: 0.25 });
    const podMat = new THREE.MeshStandardMaterial({ color: 0x33393d, roughness: 0.45, metalness: 0.45 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x10151c, roughness: 0.1, metalness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const g = aircraft.group;

    const fuseGeo = new THREE.CylinderGeometry(1.75, 1.55, 42.0, 14);
    fuseGeo.rotateX(Math.PI / 2);
    const fuse = new THREE.Mesh(fuseGeo, fuseMat);
    fuse.position.set(0, 0, -1.0);
    g.add(fuse);
    const noseGeo = new THREE.SphereGeometry(1.75, 14, 14);
    noseGeo.scale(1, 0.95, 1.7);
    const nose = new THREE.Mesh(noseGeo, fuseMat);
    nose.position.set(0, 0, 20.0);
    g.add(nose);
    const tailGeo = new THREE.ConeGeometry(1.55, 5.5, 12);
    tailGeo.rotateX(-Math.PI / 2);
    const tailCone = new THREE.Mesh(tailGeo, fuseMat);
    tailCone.position.set(0, 0.2, -24.5);
    g.add(tailCone);
    const cockpitGeo = new THREE.BoxGeometry(2.0, 0.7, 1.8);
    const cockpit = new THREE.Mesh(cockpitGeo, canopyMat);
    cockpit.position.set(0, 1.4, 17.0);
    g.add(cockpit);

    // Huge swept shoulder wing.
    const sweep = 0.55;
    for (const side of [1, -1]) {
      const wGeo = new THREE.BoxGeometry(27.5, 0.45, 7.0);
      wGeo.translate(side * 13.75, 0, 0);
      const w = new THREE.Mesh(wGeo, wingMat);
      w.position.set(0, 1.35, 4.0);
      w.rotation.y = side * sweep;
      g.add(w);
    }

    // Four twin-engine pods (eight engines) on forward-raked pylons.
    const engGeo = new THREE.CylinderGeometry(0.62, 0.55, 4.2, 10);
    engGeo.rotateX(Math.PI / 2);
    const pylonGeo = new THREE.BoxGeometry(0.25, 1.6, 2.8);
    for (const x of [-17.0, -10.0, 10.0, 17.0]) {
      const podZ = 5.2 - Math.abs(x) * 0.55;
      for (const dx of [-0.72, 0.72]) {
        const eng = new THREE.Mesh(engGeo, podMat);
        eng.position.set(x + dx, -0.4 + 1.35 - 1.9, podZ);
        g.add(eng);
      }
      const pylon = new THREE.Mesh(pylonGeo, wingMat);
      pylon.position.set(x, 1.35 - 1.0, podZ - 0.6);
      g.add(pylon);
    }

    // Tall swept fin and low-set stabilizers.
    const finGeo = new THREE.BoxGeometry(0.4, 9.5, 5.0);
    finGeo.translate(0, 4.75, 0);
    const fin = new THREE.Mesh(finGeo, wingMat);
    fin.position.set(0, 1.4, -21.0);
    fin.rotation.x = 0.30;
    g.add(fin);
    for (const side of [1, -1]) {
      const sGeo = new THREE.BoxGeometry(8.5, 0.28, 3.6);
      sGeo.translate(side * 4.25, 0, 0);
      const s = new THREE.Mesh(sGeo, wingMat);
      s.position.set(0, 0.5, -22.0);
      s.rotation.y = side * 0.5;
      g.add(s);
    }

    // Quadricycle gear: tandem twin-wheel bogies under the fuselage...
    const strutGeo = new THREE.CylinderGeometry(0.14, 0.14, 2.0, 8);
    const tireGeo = new THREE.CylinderGeometry(0.60, 0.60, 0.42, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const addBogie = (x, z) => {
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.position.set(x, -2.0, z);
      aircraft.gearGroup.add(strut);
      for (const dz of [-0.55, 0.55]) {
        const wheel = new THREE.Mesh(tireGeo, tireMat);
        wheel.position.set(x, -2.95, z + dz);
        aircraft.gearGroup.add(wheel);
      }
    };
    addBogie(-1.5, 9.0);
    addBogie(1.5, 9.0);
    addBogie(-1.5, -8.0);
    addBogie(1.5, -8.0);
    // ...plus outrigger wheels near the wingtips (kept just above the mains
    // so they don't set the resting ground clearance).
    const outriggerTireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.28, 10);
    outriggerTireGeo.rotateZ(Math.PI / 2);
    for (const side of [1, -1]) {
      const ox = side * 22.0 * Math.cos(sweep);
      const oz = 4.0 - 22.0 * Math.sin(sweep);
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.scale.y = 1.6;
      strut.position.set(ox, -0.4, oz);
      aircraft.gearGroup.add(strut);
      const wheel = new THREE.Mesh(outriggerTireGeo, tireMat);
      wheel.position.set(ox, -2.45, oz);
      aircraft.gearGroup.add(wheel);
    }

    // Nav lights: red on the port (+X) tip, green on starboard (-X).
    const navGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const tipZ = 4.0 - 27.5 * Math.sin(sweep);
    const redNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redNav.position.set(27.5 * Math.cos(sweep), 1.35, tipZ);
    g.add(redNav);
    const greenNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    greenNav.position.set(-27.5 * Math.cos(sweep), 1.35, tipZ);
    g.add(greenNav);

    this.configureShadows(g);
  }

  static buildSR71(aircraft) {
    // SR-71: chined black fuselage, big mid-wing nacelles with inlet spikes,
    // delta wing and inward-canted fins on the nacelles. Tricycle gear.
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.45, metalness: 0.55 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x191c21, roughness: 0.5, metalness: 0.5 });
    const nacelleMat = new THREE.MeshStandardMaterial({ color: 0x0f1114, roughness: 0.4, metalness: 0.6 });
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.3, metalness: 0.8 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x223038, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.7 });
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x33271c, roughness: 0.7, metalness: 0.4 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const g = aircraft.group;

    // Slender fuselage, slightly flattened for the chined cross-section.
    const fuseGeo = new THREE.CylinderGeometry(0.95, 0.85, 26.0, 14);
    fuseGeo.rotateX(Math.PI / 2);
    fuseGeo.scale(1.25, 0.8, 1);
    const fuse = new THREE.Mesh(fuseGeo, bodyMat);
    fuse.position.set(0, 0, 2.0);
    g.add(fuse);
    const noseGeo = new THREE.ConeGeometry(0.95, 5.0, 14);
    noseGeo.rotateX(Math.PI / 2);
    noseGeo.scale(1.25, 0.8, 1);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.set(0, 0, 17.5);
    g.add(nose);
    const tailGeo = new THREE.ConeGeometry(0.85, 5.0, 12);
    tailGeo.rotateX(-Math.PI / 2);
    tailGeo.scale(1.25, 0.8, 1);
    const tailCone = new THREE.Mesh(tailGeo, bodyMat);
    tailCone.position.set(0, 0, -13.5);
    g.add(tailCone);

    // Forebody chines blending the nose into the wing.
    this.addLerx(g, bodyMat, 1, { xRoot: 1.0, xTip: 2.3, zRoot: 1.5, zFront: 16.0, y: 0.0, thick: 0.10 });
    this.addLerx(g, bodyMat, -1, { xRoot: 1.0, xTip: 2.3, zRoot: 1.5, zFront: 16.0, y: 0.0, thick: 0.10 });

    // Tandem cockpit canopy.
    const canopyGeo = new THREE.SphereGeometry(0.62, 12, 12);
    canopyGeo.scale(1, 0.75, 3.0);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.68, 11.5);
    g.add(canopy);

    // Delta wing with a straight trailing edge (swept leading edge).
    for (const side of [1, -1]) {
      const wGeo = new THREE.BoxGeometry(8.0, 0.22, 9.0);
      wGeo.translate(side * 4.0, 0, 0);
      const w = new THREE.Mesh(wGeo, wingMat);
      w.position.set(0, -0.15, -5.0);
      w.rotation.y = side * 0.52;
      g.add(w);
    }

    // Engine nacelles mid-wing with the signature inlet spikes.
    const nacGeo = new THREE.CylinderGeometry(1.05, 1.0, 11.0, 12);
    nacGeo.rotateX(Math.PI / 2);
    const spikeGeo = new THREE.ConeGeometry(0.75, 3.2, 12);
    spikeGeo.rotateX(Math.PI / 2); // apex forward (+Z)
    const nozzleGeo = new THREE.CylinderGeometry(0.85, 0.95, 1.4, 12);
    nozzleGeo.rotateX(Math.PI / 2);
    const flameGeo = new THREE.ConeGeometry(0.55, 5.0, 10);
    flameGeo.rotateX(-Math.PI / 2); // apex aft
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff4d00, transparent: true, opacity: 0.85 });
    for (const side of [1, -1]) {
      const x = side * 4.6;
      const nac = new THREE.Mesh(nacGeo, nacelleMat);
      nac.position.set(x, -0.15, -3.5);
      g.add(nac);
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(x, -0.15, 2.8);
      g.add(spike);
      const nozzle = new THREE.Mesh(nozzleGeo, exhaustMat);
      nozzle.position.set(x, -0.15, -9.6);
      g.add(nozzle);
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(x, -0.15, -12.5);
      aircraft.afterburnerGroup.add(flame);

      // All-moving fin on each nacelle, canted inward.
      const finGeo = new THREE.BoxGeometry(0.14, 3.0, 3.4);
      finGeo.translate(0, 1.5, 0);
      const fin = new THREE.Mesh(finGeo, wingMat);
      fin.position.set(x, 0.8, -7.2);
      fin.rotation.z = side * 0.30; // top leans toward the centreline
      g.add(fin);
    }

    // Tricycle gear: nose leg plus tall mains under the wing roots.
    const strutGeo = new THREE.CylinderGeometry(0.13, 0.13, 2.2, 8);
    const tireGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.34, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const noseStrut = new THREE.Mesh(strutGeo, metalMat);
    noseStrut.position.set(0, -1.5, 10.0);
    aircraft.gearGroup.add(noseStrut);
    const noseWheel = new THREE.Mesh(tireGeo, tireMat);
    noseWheel.position.set(0, -2.6, 10.0);
    aircraft.gearGroup.add(noseWheel);
    for (const side of [1, -1]) {
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.position.set(side * 2.9, -1.5, -3.0);
      aircraft.gearGroup.add(strut);
      // Three-wheel main bogies like the real article.
      for (const dz of [-0.6, 0, 0.6]) {
        const wheel = new THREE.Mesh(tireGeo, tireMat);
        wheel.position.set(side * 2.9, -2.6, -3.0 + dz);
        aircraft.gearGroup.add(wheel);
      }
    }

    // Nav lights: red on the port (+X) tip, green on starboard (-X).
    const navGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const tipX = 8.0 * Math.cos(0.52);
    const tipZ = -5.0 - 8.0 * Math.sin(0.52);
    const redNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redNav.position.set(tipX, -0.15, tipZ);
    g.add(redNav);
    const greenNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    greenNav.position.set(-tipX, -0.15, tipZ);
    g.add(greenNav);

    this.configureShadows(g);
  }
  static buildDebug(aircraft) {
    // XD-1 test article: high-visibility orange/white paint so it reads as an
    // instrumented testbed, with simple dart geometry. Not a real aircraft.
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff6d00, roughness: 0.4 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.35 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.5 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x102027, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.7 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const g = aircraft.group;

    const fuseGeo = new THREE.CylinderGeometry(0.62, 0.5, 9.0, 14);
    fuseGeo.rotateX(Math.PI / 2);
    const fuse = new THREE.Mesh(fuseGeo, orangeMat);
    g.add(fuse);
    const noseGeo = new THREE.ConeGeometry(0.62, 2.4, 14);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, whiteMat);
    nose.position.z = 5.7;
    g.add(nose);
    // Instrumentation boom sticking out of the nose (alpha/beta vanes).
    const boomGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.0, 6);
    boomGeo.rotateX(Math.PI / 2);
    const boom = new THREE.Mesh(boomGeo, trimMat);
    boom.position.z = 7.6;
    g.add(boom);

    // Straight mid wing with white tip panels.
    const span = aircraft.config.dimensions.span;
    const wingGeo = new THREE.BoxGeometry(span * 0.78, 0.14, 2.4);
    const wing = new THREE.Mesh(wingGeo, whiteMat);
    wing.position.set(0, 0, 0.2);
    g.add(wing);
    for (const side of [1, -1]) {
      const tipGeo = new THREE.BoxGeometry(span * 0.11, 0.14, 2.0);
      const tip = new THREE.Mesh(tipGeo, orangeMat);
      tip.position.set(side * span * 0.445, 0, 0.2);
      g.add(tip);
    }

    // Tall fin + stabilizers.
    const finGeo = new THREE.BoxGeometry(0.1, 2.2, 1.6);
    finGeo.translate(0, 1.1, 0);
    const fin = new THREE.Mesh(finGeo, orangeMat);
    fin.position.set(0, 0.3, -4.0);
    g.add(fin);
    const stabGeo = new THREE.BoxGeometry(4.4, 0.08, 1.2);
    const stab = new THREE.Mesh(stabGeo, whiteMat);
    stab.position.set(0, 0.25, -4.2);
    g.add(stab);

    const canopyGeo = new THREE.SphereGeometry(0.42, 12, 12);
    canopyGeo.scale(1, 0.8, 2.4);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.5, 1.8);
    g.add(canopy);

    // Afterburner flame.
    const flameGeo = new THREE.ConeGeometry(0.32, 2.6, 8);
    flameGeo.rotateX(-Math.PI / 2);
    const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: 0xff3d00, transparent: true, opacity: 0.85 }));
    flame.position.set(0, 0, -5.6);
    aircraft.afterburnerGroup.add(flame);

    // Tricycle gear.
    const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8);
    const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const noseStrut = new THREE.Mesh(strutGeo, metalMat);
    noseStrut.position.set(0, -0.7, 3.0);
    aircraft.gearGroup.add(noseStrut);
    const noseWheel = new THREE.Mesh(tireGeo, tireMat);
    noseWheel.position.set(0, -1.35, 3.0);
    aircraft.gearGroup.add(noseWheel);
    for (const side of [1, -1]) {
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.position.set(side * 1.3, -0.7, -0.6);
      aircraft.gearGroup.add(strut);
      const wheel = new THREE.Mesh(tireGeo, tireMat);
      wheel.position.set(side * 1.3, -1.35, -0.6);
      aircraft.gearGroup.add(wheel);
    }

    // High-visibility anti-collision beacon on the fin tip, plus nav lights.
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
    beacon.position.set(0, 2.6, -4.0);
    g.add(beacon);
    const navGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const redNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redNav.position.set(span / 2, 0, 0.2);
    g.add(redNav);
    const greenNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    greenNav.position.set(-span / 2, 0, 0.2);
    g.add(greenNav);

    this.configureShadows(g);
  }

  static buildF14(aircraft) {
    // F-14: wide flat "pancake" fuselage between two spaced engine trunks,
    // swing wings shown at mid sweep, twin canted vertical tails and big
    // all-moving stabilators. Gray navy scheme.
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8a99a5, roughness: 0.55 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x53616c, roughness: 0.55 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1d2c38, roughness: 0.08, metalness: 0.9, transparent: true, opacity: 0.7 });
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff3d00, transparent: true, opacity: 0.85 });

    // Central pancake deck joining the engine trunks.
    const deckGeo = new THREE.BoxGeometry(2.4, 0.45, 6.5);
    const deck = new THREE.Mesh(deckGeo, bodyMat);
    deck.position.set(0, 0.1, -0.8);
    aircraft.group.add(deck);

    // Forward fuselage and radome.
    const fwdGeo = new THREE.CylinderGeometry(0.55, 0.5, 4.6, 14);
    fwdGeo.rotateX(Math.PI / 2);
    const fwd = new THREE.Mesh(fwdGeo, bodyMat);
    fwd.position.set(0, 0.15, 3.6);
    aircraft.group.add(fwd);
    const noseGeo = new THREE.ConeGeometry(0.5, 1.9, 14);
    noseGeo.rotateX(Math.PI / 2); // apex forward
    const nose = new THREE.Mesh(noseGeo, trimMat);
    nose.position.set(0, 0.15, 6.85);
    aircraft.group.add(nose);

    // Tandem canopy.
    const canopyGeo = new THREE.SphereGeometry(0.42, 14, 14);
    canopyGeo.scale(0.95, 0.8, 2.9);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.62, 3.6);
    aircraft.group.add(canopy);

    // Widely-spaced engine trunks with box intakes and round nozzles.
    [-1.15, 1.15].forEach((x) => {
      const trunkGeo = new THREE.BoxGeometry(0.85, 0.75, 7.6);
      const trunk = new THREE.Mesh(trunkGeo, trimMat);
      trunk.position.set(x, -0.15, -0.9);
      aircraft.group.add(trunk);
      const intakeGeo = new THREE.BoxGeometry(0.85, 0.85, 1.2);
      const intake = new THREE.Mesh(intakeGeo, exhaustMat);
      intake.position.set(x, -0.1, 3.0);
      aircraft.group.add(intake);
      const nozzleGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.8, 10);
      nozzleGeo.rotateX(Math.PI / 2);
      const nozzle = new THREE.Mesh(nozzleGeo, exhaustMat);
      nozzle.position.set(x, -0.15, -4.9);
      aircraft.group.add(nozzle);
      const flameGeo = new THREE.ConeGeometry(0.26, 2.2, 8);
      flameGeo.rotateX(-Math.PI / 2); // apex aft
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(x, -0.15, -5.6);
      aircraft.afterburnerGroup.add(flame);
    });

    // Fixed wing gloves + swing wings at mid sweep.
    const halfSpan = aircraft.config.dimensions.span / 2;
    [1, -1].forEach((side) => {
      this.addLerx(aircraft.group, bodyMat, side, { xRoot: 1.2, xTip: 2.6, zRoot: 0.9, zFront: 3.2, y: 0.28 });
      const wingGeo = new THREE.BoxGeometry(halfSpan, 0.09, 1.7);
      wingGeo.translate(side * halfSpan / 2, 0, 0);
      const wing = new THREE.Mesh(wingGeo, bodyMat);
      wing.position.set(side * 1.3, 0.3, 0.2);
      wing.rotation.y = side * -0.42; // swept aft at mid sweep
      aircraft.group.add(wing);
    });

    // Twin vertical tails, canted slightly outboard.
    const finGeo = new THREE.BoxGeometry(0.07, 1.9, 1.5);
    finGeo.translate(0, 0.95, 0);
    [-1.15, 1.15].forEach((x) => {
      const fin = new THREE.Mesh(finGeo, trimMat);
      fin.position.set(x, 0.25, -3.6);
      fin.rotation.z = x < 0 ? -0.12 : 0.12;
      aircraft.group.add(fin);
    });

    // Big all-moving stabilators.
    [1, -1].forEach((side) => {
      const stabGeo = new THREE.BoxGeometry(2.6, 0.06, 1.3);
      stabGeo.translate(side * 1.3, 0, 0);
      const stab = new THREE.Mesh(stabGeo, bodyMat);
      stab.position.set(side * 1.1, -0.05, -4.2);
      stab.rotation.y = side * -0.35;
      aircraft.group.add(stab);
    });

    // Tricycle gear: twin-wheel nose (carrier style), single-wheel mains.
    const strutGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.3, 8);
    const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.26, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const noseStrut = new THREE.Mesh(strutGeo, metalMat);
    noseStrut.position.set(0, -0.65, 4.4);
    aircraft.gearGroup.add(noseStrut);
    [-0.16, 0.16].forEach((dx) => {
      const noseWheel = new THREE.Mesh(tireGeo, tireMat);
      noseWheel.position.set(dx, -1.3, 4.4);
      aircraft.gearGroup.add(noseWheel);
    });
    [-1.5, 1.5].forEach((x) => {
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.position.set(x, -0.65, -1.0);
      strut.rotation.z = x < 0 ? 0.1 : -0.1;
      aircraft.gearGroup.add(strut);
      const wheel = new THREE.Mesh(tireGeo, tireMat);
      wheel.position.set(x * 1.05, -1.3, -1.0);
      aircraft.gearGroup.add(wheel);
    });

    // Wingtip nav lights: red on the port (+X) tip, green on starboard (-X).
    const navGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const redNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redNav.position.set(halfSpan + 1.0, 0.3, -2.0);
    aircraft.group.add(redNav);
    const greenNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    greenNav.position.set(-(halfSpan + 1.0), 0.3, -2.0);
    aircraft.group.add(greenNav);

    this.configureShadows(aircraft.group);
  }
  static buildConcorde(aircraft) {
    // Concorde: needle fuselage, ogival delta built as one extruded slab (same
    // technique as the B-2), paired underwing engine boxes with reheat flames,
    // tall stalky gear and the drooped nose. All-white scheme.
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f5f7, roughness: 0.35 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xb9c4cc, roughness: 0.45 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x10161c, roughness: 0.1, metalness: 0.9 });
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff5d00, transparent: true, opacity: 0.85 });

    // Slender fuselage tube with a long tail cone.
    const fuseGeo = new THREE.CylinderGeometry(0.95, 0.9, 22.0, 16);
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuseGeo, whiteMat);
    fuselage.position.set(0, 0.55, 1.0);
    aircraft.group.add(fuselage);
    const tailConeGeo = new THREE.ConeGeometry(0.9, 6.5, 14);
    tailConeGeo.rotateX(-Math.PI / 2); // apex aft
    const tailCone = new THREE.Mesh(tailConeGeo, whiteMat);
    tailCone.position.set(0, 0.55, -13.2);
    aircraft.group.add(tailCone);

    // Drooped nose: forward cone pitched a few degrees down, with the visor
    // windscreen strip behind it.
    const noseGeo = new THREE.ConeGeometry(0.92, 6.0, 14);
    noseGeo.rotateX(Math.PI / 2); // apex forward
    const noseCone = new THREE.Mesh(noseGeo, whiteMat);
    noseCone.position.set(0, 0.38, 14.8);
    noseCone.rotation.x = -0.06; // droop
    aircraft.group.add(noseCone);
    const visorGeo = new THREE.BoxGeometry(0.9, 0.35, 1.6);
    const visor = new THREE.Mesh(visorGeo, glassMat);
    visor.position.set(0, 0.95, 11.6);
    aircraft.group.add(visor);

    // Ogival delta planform as one symmetric extruded slab (+z nose, +x port).
    const shape = new THREE.Shape();
    shape.moveTo(0.9, 9.5);
    shape.quadraticCurveTo(2.2, -1.0, 10.6, -9.8);   // port ogee leading edge
    shape.lineTo(10.6, -11.2);                        // port tip chord
    shape.lineTo(0.9, -11.2);                         // port trailing edge
    shape.lineTo(-0.9, -11.2);                        // across the belly
    shape.lineTo(-10.6, -11.2);                       // starboard trailing edge
    shape.lineTo(-10.6, -9.8);                        // starboard tip chord
    shape.quadraticCurveTo(-2.2, -1.0, -0.9, 9.5);    // starboard ogee LE
    shape.lineTo(0.9, 9.5);
    const wingThick = 0.42;
    const wingGeo = new THREE.ExtrudeGeometry(shape, { depth: wingThick, bevelEnabled: false });
    wingGeo.rotateX(Math.PI / 2);            // planform into XZ
    wingGeo.translate(0, wingThick / 2, 0);  // centre the slab on y = 0
    const wing = new THREE.Mesh(wingGeo, whiteMat);
    wing.position.set(0, -0.1, 0);
    aircraft.group.add(wing);

    // Tall swept fin (no horizontal stabilizer on a tailless delta): two
    // stacked boxes, the upper one shifted aft to suggest the sweep.
    const finLowGeo = new THREE.BoxGeometry(0.14, 2.2, 3.4);
    finLowGeo.translate(0, 1.1, 0);
    const finLow = new THREE.Mesh(finLowGeo, whiteMat);
    finLow.position.set(0, 1.2, -10.6);
    aircraft.group.add(finLow);
    const finTopGeo = new THREE.BoxGeometry(0.12, 1.9, 2.2);
    finTopGeo.translate(0, 0.95, 0);
    const finTop = new THREE.Mesh(finTopGeo, whiteMat);
    finTop.position.set(0, 3.3, -11.4);
    aircraft.group.add(finTop);

    // Paired underwing engine boxes, two per side, with reheat flames.
    [-3.6, 3.6].forEach((x) => {
      const boxGeo = new THREE.BoxGeometry(2.0, 0.95, 6.2);
      const box = new THREE.Mesh(boxGeo, trimMat);
      box.position.set(x, -0.75, -6.2);
      aircraft.group.add(box);
      const lipGeo = new THREE.BoxGeometry(2.0, 0.95, 0.5);
      const lip = new THREE.Mesh(lipGeo, exhaustMat);
      lip.position.set(x, -0.75, -3.0);
      aircraft.group.add(lip);
      [-0.5, 0.5].forEach((dx) => {
        const flameGeo = new THREE.ConeGeometry(0.28, 2.6, 8);
        flameGeo.rotateX(-Math.PI / 2); // apex aft
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(x + dx, -0.75, -10.4);
        aircraft.afterburnerGroup.add(flame);
      });
    });

    // Stalky gear: long struts, four-wheel main bogies, twin nosewheels.
    const strutGeo = new THREE.CylinderGeometry(0.14, 0.14, 2.6, 10);
    const tireGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.34, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const noseStrut = new THREE.Mesh(strutGeo, metalMat);
    noseStrut.position.set(0, -1.5, 9.5);
    aircraft.gearGroup.add(noseStrut);
    [-0.28, 0.28].forEach((dx) => {
      const wheel = new THREE.Mesh(tireGeo, tireMat);
      wheel.position.set(dx, -2.8, 9.5);
      aircraft.gearGroup.add(wheel);
    });
    [-2.6, 2.6].forEach((x) => {
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.position.set(x, -1.5, -3.4);
      aircraft.gearGroup.add(strut);
      [-0.6, 0.6].forEach((dz) => {
        [-0.3, 0.3].forEach((dx) => {
          const wheel = new THREE.Mesh(tireGeo, tireMat);
          wheel.position.set(x + dx, -2.8, -3.4 + dz);
          aircraft.gearGroup.add(wheel);
        });
      });
    });

    // Wingtip nav lights: red on the port (+X) tip, green on starboard (-X).
    const navGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const redNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redNav.position.set(10.3, -0.1, -10.5);
    aircraft.group.add(redNav);
    const greenNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    greenNav.position.set(-10.3, -0.1, -10.5);
    aircraft.group.add(greenNav);

    this.configureShadows(aircraft.group);
  }
  static buildGlider(aircraft) {
    // Motor glider: pencil fuselage, enormous slender wings with visible
    // dihedral, a T-tail and a small nose prop. Monowheel + tailwheel gear
    // with tiny wingtip outrigger wheels.
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.4 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0d2033, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.7 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    // Slim teardrop fuselage tapering to a boom.
    const fuseGeo = new THREE.CylinderGeometry(0.42, 0.14, 5.4, 14);
    fuseGeo.rotateX(Math.PI / 2); // wide end forward
    const fuselage = new THREE.Mesh(fuseGeo, bodyMat);
    fuselage.position.set(0, 0, -0.4);
    aircraft.group.add(fuselage);
    const noseGeo = new THREE.SphereGeometry(0.42, 14, 12);
    noseGeo.scale(1, 1, 1.5);
    const noseCap = new THREE.Mesh(noseGeo, accentMat);
    noseCap.position.set(0, 0, 2.3);
    aircraft.group.add(noseCap);

    // Long reclined canopy.
    const canopyGeo = new THREE.SphereGeometry(0.34, 14, 12);
    canopyGeo.scale(0.9, 0.75, 2.4);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.3, 1.1);
    aircraft.group.add(canopy);

    // 17 m sailplane wings: very high aspect ratio, gentle dihedral, slight
    // taper suggested by a narrower outboard panel.
    const halfSpan = aircraft.config.dimensions.span / 2;
    [1, -1].forEach((side) => {
      const inboardGeo = new THREE.BoxGeometry(halfSpan * 0.55, 0.09, 0.95);
      inboardGeo.translate(side * halfSpan * 0.275, 0, 0);
      const inboard = new THREE.Mesh(inboardGeo, wingMat);
      inboard.position.set(0, 0.32, 0.4);
      inboard.rotation.z = side * 0.045;
      aircraft.group.add(inboard);
      const outboardGeo = new THREE.BoxGeometry(halfSpan * 0.48, 0.06, 0.62);
      outboardGeo.translate(side * halfSpan * 0.24, 0, 0);
      const outboard = new THREE.Mesh(outboardGeo, wingMat);
      outboard.position.set(side * halfSpan * 0.53, 0.32 + halfSpan * 0.53 * 0.045, 0.42);
      outboard.rotation.z = side * 0.075;
      aircraft.group.add(outboard);
    });

    // T-tail: fin with the stabilizer perched on top.
    const finGeo = new THREE.BoxGeometry(0.05, 1.25, 0.72);
    finGeo.translate(0, 0.625, 0);
    const fin = new THREE.Mesh(finGeo, accentMat);
    fin.position.set(0, 0.05, -3.3);
    aircraft.group.add(fin);
    const stabGeo = new THREE.BoxGeometry(2.5, 0.05, 0.55);
    const stab = new THREE.Mesh(stabGeo, wingMat);
    stab.position.set(0, 1.32, -3.35);
    aircraft.group.add(stab);

    // Small self-launch prop on the nose.
    aircraft.propellerGroup = new THREE.Group();
    aircraft.propellerGroup.position.set(0, 0, 2.95);
    const bladeGeo = new THREE.BoxGeometry(1.3, 0.09, 0.02);
    aircraft.propellerGroup.add(new THREE.Mesh(bladeGeo, propMat));
    aircraft.group.add(aircraft.propellerGroup);

    // Monowheel under the CG + tailwheel + tip outrigger rollers.
    const mainTireGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.18, 12);
    mainTireGeo.rotateZ(Math.PI / 2);
    const mainStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 8), metalMat);
    mainStrut.position.set(0, -0.45, 0.3);
    aircraft.gearGroup.add(mainStrut);
    const mainWheel = new THREE.Mesh(mainTireGeo, tireMat);
    mainWheel.position.set(0, -0.72, 0.3);
    aircraft.gearGroup.add(mainWheel);
    const tailTireGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 10);
    tailTireGeo.rotateZ(Math.PI / 2);
    const tailWheel = new THREE.Mesh(tailTireGeo, tireMat);
    tailWheel.position.set(0, -0.35, -3.1);
    aircraft.gearGroup.add(tailWheel);
    const tipTireGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.08, 8);
    tipTireGeo.rotateZ(Math.PI / 2);
    [1, -1].forEach((side) => {
      const tip = new THREE.Mesh(tipTireGeo, tireMat);
      tip.position.set(side * halfSpan * 0.72, -0.15, 0.4);
      aircraft.gearGroup.add(tip);
    });

    // Wingtip nav lights: red on the port (+X) tip, green on starboard (-X).
    const navGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const redNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redNav.position.set(halfSpan, 0.32 + halfSpan * 0.075, 0.42);
    aircraft.group.add(redNav);
    const greenNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    greenNav.position.set(-halfSpan, 0.32 + halfSpan * 0.075, 0.42);
    aircraft.group.add(greenNav);

    this.configureShadows(aircraft.group);
  }

  // 737-class narrow-body airliner: white tube fuselage, low swept wing with
  // blended winglets, two podded turbofans under the wing, swept tail.
  // Built near true meters; the calibration pass in build() trues it to config.
  static buildAirliner(aircraft) {
    const fuseMat = new THREE.MeshStandardMaterial({ color: 0xf2f4f5, roughness: 0.35, metalness: 0.25 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xb7bfc4, roughness: 0.45, metalness: 0.3 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xcfd6da, roughness: 0.45, metalness: 0.3 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x1552a3, roughness: 0.4, metalness: 0.3 });
    const podMat = new THREE.MeshStandardMaterial({ color: 0x8b959c, roughness: 0.35, metalness: 0.55 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x10151c, roughness: 0.1, metalness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const g = aircraft.group;

    // Fuselage tube with a rounded nose and an up-swept tail cone.
    const fuseGeo = new THREE.CylinderGeometry(1.85, 1.75, 28.0, 16);
    fuseGeo.rotateX(Math.PI / 2);
    g.add(new THREE.Mesh(fuseGeo, fuseMat));
    const noseGeo = new THREE.SphereGeometry(1.85, 16, 16);
    noseGeo.scale(1, 0.95, 1.5);
    const nose = new THREE.Mesh(noseGeo, fuseMat);
    nose.position.set(0, 0, 14.0);
    g.add(nose);
    const tailGeo = new THREE.ConeGeometry(1.75, 7.0, 14);
    tailGeo.rotateX(-Math.PI / 2); // apex aft
    const tailCone = new THREE.Mesh(tailGeo, fuseMat);
    tailCone.position.set(0, 0.55, -17.4);
    tailCone.rotation.x = -0.08;
    g.add(tailCone);

    // Belly stripe (two-tone livery) and cockpit windows.
    const bellyGeo = new THREE.CylinderGeometry(1.87, 1.77, 26.0, 16, 1, false, Math.PI * 0.60, Math.PI * 0.80);
    bellyGeo.rotateX(Math.PI / 2);
    g.add(new THREE.Mesh(bellyGeo, bellyMat));
    const cockpitGeo = new THREE.BoxGeometry(2.3, 0.7, 1.5);
    const cockpit = new THREE.Mesh(cockpitGeo, canopyMat);
    cockpit.position.set(0, 1.0, 12.6);
    g.add(cockpit);

    // Low swept wing (~25 deg), inboard edge on the centreline, tips aft.
    const sweep = 0.44;
    for (const side of [1, -1]) {
      const wGeo = new THREE.BoxGeometry(17.2, 0.38, 4.9);
      wGeo.translate(side * 8.6, 0, 0);
      const w = new THREE.Mesh(wGeo, wingMat);
      w.position.set(0, -1.15, 1.6);
      w.rotation.y = side * sweep;
      w.rotation.z = side * 0.10; // pronounced airliner dihedral
      g.add(w);
      // Blended winglet standing up from the tip.
      const tipX = side * 17.2 * Math.cos(sweep);
      const tipZ = 1.6 - 17.2 * Math.sin(sweep);
      const wingletGeo = new THREE.BoxGeometry(0.10, 2.4, 1.3);
      wingletGeo.translate(0, 1.2, 0);
      const winglet = new THREE.Mesh(wingletGeo, accentMat);
      winglet.position.set(tipX, -1.15 + Math.abs(tipX) * 0.10, tipZ);
      winglet.rotation.z = -side * 0.25; // cant outboard
      g.add(winglet);
    }

    // Two podded turbofans slung ahead of and below the wing.
    const podGeo = new THREE.CylinderGeometry(1.05, 0.9, 4.2, 14);
    podGeo.rotateX(Math.PI / 2);
    const pylonGeo = new THREE.BoxGeometry(0.28, 0.9, 2.6);
    for (const x of [-5.9, 5.9]) {
      const podZ = 3.4;
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(x, -2.15, podZ);
      g.add(pod);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.10, 8, 18), metalMat);
      lip.position.set(x, -2.15, podZ + 2.1);
      g.add(lip);
      const pylon = new THREE.Mesh(pylonGeo, wingMat);
      pylon.position.set(x, -1.45, podZ - 0.6);
      g.add(pylon);
    }

    // Swept fin with the airline accent, and swept low stabilizers.
    const finGeo = new THREE.BoxGeometry(0.32, 6.8, 4.2);
    finGeo.translate(0, 3.4, 0);
    const fin = new THREE.Mesh(finGeo, accentMat);
    fin.position.set(0, 1.3, -15.6);
    fin.rotation.x = 0.38; // rake the tip aft
    g.add(fin);
    for (const side of [1, -1]) {
      const sGeo = new THREE.BoxGeometry(6.6, 0.24, 2.8);
      sGeo.translate(side * 3.3, 0, 0);
      const s = new THREE.Mesh(sGeo, wingMat);
      s.position.set(0, 0.7, -16.6);
      s.rotation.y = side * 0.42;
      s.rotation.z = side * 0.06;
      g.add(s);
    }

    // Tricycle gear: nose strut + twin-wheel main bogies under the wing root.
    const strutGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.9, 8);
    const tireGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const addGear = (x, z) => {
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.position.set(x, -2.0, z);
      aircraft.gearGroup.add(strut);
      for (const dx of [-0.34, 0.34]) {
        const wheel = new THREE.Mesh(tireGeo, tireMat);
        wheel.position.set(x + dx, -2.9, z);
        aircraft.gearGroup.add(wheel);
      }
    };
    addGear(0, 11.5);
    addGear(-2.9, -0.4);
    addGear(2.9, -0.4);

    // Nav lights: red on the port (+X) tip, green on starboard (-X).
    const navGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const tipZNav = 1.6 - 17.2 * Math.sin(sweep);
    const redNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redNav.position.set(17.2 * Math.cos(sweep), 0.4, tipZNav);
    g.add(redNav);
    const greenNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    greenNav.position.set(-17.2 * Math.cos(sweep), 0.4, tipZNav);
    g.add(greenNav);

    this.configureShadows(g);
  }

  // PT-17 Stearman: yellow two-bay biplane with a blue fuselage, radial cowl,
  // N-struts and cabane struts, tandem open cockpits and fixed taildragger
  // gear. Built near true meters; the calibration pass trues it to config.
  static buildBiplane(aircraft) {
    const fuseMat = new THREE.MeshStandardMaterial({ color: 0x1a3f8f, roughness: 0.5 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xf5c518, roughness: 0.55 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5 });
    const cowlMat = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.3, metalness: 0.6 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x6d4c2f, roughness: 0.6 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const g = aircraft.group;

    // Slab-sided fuselage tapering to the tail post.
    const fuseGeo = new THREE.CylinderGeometry(0.52, 0.22, 5.6, 10);
    fuseGeo.rotateX(Math.PI / 2); // wide end forward
    const fuselage = new THREE.Mesh(fuseGeo, fuseMat);
    fuselage.position.z = -0.2;
    g.add(fuselage);

    // Radial engine cowl ring and crankcase.
    const cowlGeo = new THREE.CylinderGeometry(0.55, 0.5, 0.7, 14);
    cowlGeo.rotateX(Math.PI / 2);
    const cowl = new THREE.Mesh(cowlGeo, cowlMat);
    cowl.position.z = 2.8;
    g.add(cowl);
    // Radial cylinder heads poking around the crankcase.
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2;
      const jugGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.28, 6);
      jugGeo.rotateX(Math.PI / 2);
      const jug = new THREE.Mesh(jugGeo, cowlMat);
      jug.position.set(Math.cos(ang) * 0.36, Math.sin(ang) * 0.36, 3.05);
      g.add(jug);
    }

    // Wooden two-blade propeller.
    aircraft.propellerGroup = new THREE.Group();
    aircraft.propellerGroup.position.set(0, 0, 3.3);
    const bladeGeo = new THREE.BoxGeometry(2.4, 0.16, 0.04);
    aircraft.propellerGroup.add(new THREE.Mesh(bladeGeo, propMat));
    g.add(aircraft.propellerGroup);

    // Two wings: upper wing sits high on cabane struts and slightly forward
    // (positive stagger), lower wing shoulders the fuselage bottom.
    const span = aircraft.config.dimensions.span; // upper span
    const upperY = 1.35, lowerY = -0.45;
    const upperZ = 0.85, lowerZ = 0.35;
    const upperGeo = new THREE.BoxGeometry(span, 0.11, 1.5);
    const upper = new THREE.Mesh(upperGeo, wingMat);
    upper.position.set(0, upperY, upperZ);
    g.add(upper);
    const lowerGeo = new THREE.BoxGeometry(span * 0.92, 0.11, 1.4);
    const lower = new THREE.Mesh(lowerGeo, wingMat);
    lower.position.set(0, lowerY, lowerZ);
    g.add(lower);

    // Interplane N-struts out near the tips, cabane struts over the fuselage.
    const strutBarGeo = new THREE.CylinderGeometry(0.035, 0.035, upperY - lowerY, 6);
    for (const x of [-span * 0.38, span * 0.38, -0.55, 0.55]) {
      for (const dz of [-0.35, 0.35]) {
        const strut = new THREE.Mesh(strutBarGeo, metalMat);
        strut.position.set(x, (upperY + lowerY) / 2, (upperZ + lowerZ) / 2 + dz);
        strut.rotation.x = dz > 0 ? -0.14 : 0.14; // lean into the stagger
        g.add(strut);
      }
    }

    // Tandem open cockpits: two dark cutouts with tiny windscreens.
    for (const z of [0.9, -0.3]) {
      const pitGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.16, 10);
      const pit = new THREE.Mesh(pitGeo, cowlMat);
      pit.position.set(0, 0.48, z);
      g.add(pit);
      const shieldGeo = new THREE.BoxGeometry(0.5, 0.22, 0.05);
      const shield = new THREE.Mesh(shieldGeo, metalMat);
      shield.position.set(0, 0.62, z + 0.35);
      shield.rotation.x = -0.35;
      g.add(shield);
    }

    // Red empennage: stabilizer, fin and rudder.
    const stabGeo = new THREE.BoxGeometry(2.9, 0.07, 1.0);
    const stab = new THREE.Mesh(stabGeo, tailMat);
    stab.position.set(0, 0.12, -3.0);
    g.add(stab);
    const finGeo = new THREE.BoxGeometry(0.07, 1.15, 0.95);
    finGeo.translate(0, 0.57, 0);
    const fin = new THREE.Mesh(finGeo, tailMat);
    fin.position.set(0, 0.18, -3.05);
    g.add(fin);

    // Fixed taildragger gear: splayed mains under the lower wing, tail skid.
    const strutGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8);
    const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.2, 12);
    tireGeo.rotateZ(Math.PI / 2);
    [-1.0, 1.0].forEach((x) => {
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.position.set(x, -0.85, 1.1);
      strut.rotation.z = x < 0 ? 0.18 : -0.18;
      aircraft.gearGroup.add(strut);
      const wheel = new THREE.Mesh(tireGeo, tireMat);
      wheel.position.set(x * 1.15, -1.3, 1.1);
      aircraft.gearGroup.add(wheel);
    });
    const tailStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 6), metalMat);
    tailStrut.position.set(0, -0.35, -3.1);
    aircraft.gearGroup.add(tailStrut);
    const tailTireGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.1, 8);
    tailTireGeo.rotateZ(Math.PI / 2);
    const tailWheel = new THREE.Mesh(tailTireGeo, tireMat);
    tailWheel.position.set(0, -0.7, -3.1);
    aircraft.gearGroup.add(tailWheel);

    // Nav lights on the UPPER wing tips: red port (+X), green starboard (-X).
    const navGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const redNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redNav.position.set(span / 2, upperY + 0.1, upperZ);
    g.add(redNav);
    const greenNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    greenNav.position.set(-span / 2, upperY + 0.1, upperZ);
    g.add(greenNav);

    this.configureShadows(g);
  }

  // DHC-2 Beaver: a high-wing radial bush plane on a fixed taildragger. Fat
  // strut-braced wing, big squared tail, a radial cowl and a fat tundra-tyre
  // main gear. Built near true meters; the calibration pass trues it to config.
  static buildBushplane(aircraft) {
    const fuseMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.5 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.5 });
    const cowlMat = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.3, metalness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0d1a2b, roughness: 0.1, metalness: 0.85, transparent: true, opacity: 0.8 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
    const g = aircraft.group;
    const span = aircraft.config.dimensions.span;

    // Deep slab-sided fuselage tapering to the tailpost.
    const fuseGeo = new THREE.CylinderGeometry(0.78, 0.42, 7.4, 14);
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuseGeo, fuseMat);
    fuselage.position.set(0, 0.1, -0.3);
    g.add(fuselage);

    // Radial engine cowl with a spinner and a two-blade prop out front.
    const cowlGeo = new THREE.CylinderGeometry(0.82, 0.72, 0.9, 16);
    cowlGeo.rotateX(Math.PI / 2);
    const cowl = new THREE.Mesh(cowlGeo, cowlMat);
    cowl.position.set(0, 0.1, 3.6);
    g.add(cowl);
    const spinnerGeo = new THREE.ConeGeometry(0.28, 0.6, 12);
    spinnerGeo.rotateX(Math.PI / 2);
    const spinner = new THREE.Mesh(spinnerGeo, trimMat);
    spinner.position.set(0, 0.1, 4.2);
    g.add(spinner);
    aircraft.propellerGroup = new THREE.Group();
    aircraft.propellerGroup.position.set(0, 0.1, 4.05);
    const bladeGeo = new THREE.BoxGeometry(2.9, 0.18, 0.05);
    aircraft.propellerGroup.add(new THREE.Mesh(bladeGeo, propMat));
    g.add(aircraft.propellerGroup);

    // High wing sitting on a shallow cabane above the cabin roof, full span.
    const wingGeo = new THREE.BoxGeometry(span, 0.16, 1.75);
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(0, 1.15, 0.35);
    g.add(wing);
    // Lift struts: a V from the lower fuselage out to mid-span each side.
    const strutGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.15, 6);
    for (const side of [1, -1]) {
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.position.set(side * (span * 0.24), 0.35, 0.35);
      strut.rotation.z = side * 0.95;
      g.add(strut);
    }

    // Boxy cabin glass: wraparound windscreen and side windows.
    const wsGeo = new THREE.BoxGeometry(1.2, 0.7, 0.9);
    const windscreen = new THREE.Mesh(wsGeo, glassMat);
    windscreen.position.set(0, 0.72, 2.05);
    g.add(windscreen);
    const cabinGeo = new THREE.BoxGeometry(1.32, 0.62, 2.2);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.66, 0.7);
    g.add(cabin);

    // Big squared empennage: stabilizer, swept fin and rudder.
    const stabGeo = new THREE.BoxGeometry(3.9, 0.12, 1.15);
    const stab = new THREE.Mesh(stabGeo, wingMat);
    stab.position.set(0, 0.32, -3.35);
    g.add(stab);
    const finGeo = new THREE.BoxGeometry(0.12, 1.55, 1.35);
    finGeo.translate(0, 0.78, 0);
    const fin = new THREE.Mesh(finGeo, fuseMat);
    fin.position.set(0, 0.3, -3.35);
    fin.rotation.x = 0.14;
    g.add(fin);

    // Fixed taildragger gear: tall sprung mains on fat tyres, plus a tailwheel.
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.15, 8);
    const tireGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.32, 14);
    tireGeo.rotateZ(Math.PI / 2);
    [-1.0, 1.0].forEach((x) => {
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(x, -0.55, 1.5);
      leg.rotation.z = x < 0 ? 0.32 : -0.32;
      aircraft.gearGroup.add(leg);
      const wheel = new THREE.Mesh(tireGeo, tireMat);
      wheel.position.set(x * 1.35, -1.1, 1.5);
      aircraft.gearGroup.add(wheel);
    });
    const tailLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), metalMat);
    tailLeg.position.set(0, -0.15, -3.45);
    aircraft.gearGroup.add(tailLeg);
    const tailTireGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10);
    tailTireGeo.rotateZ(Math.PI / 2);
    const tailWheel = new THREE.Mesh(tailTireGeo, tireMat);
    tailWheel.position.set(0, -0.42, -3.45);
    aircraft.gearGroup.add(tailWheel);

    // Nav lights: red on the port (+X) tip, green on starboard (-X).
    const navGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const redNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redNav.position.set(span / 2, 1.15, 0.35);
    g.add(redNav);
    const greenNav = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    greenNav.position.set(-span / 2, 1.15, 0.35);
    g.add(greenNav);

    this.configureShadows(g);
  }

  // Business jet (Learjet-style): slim fuselage, low swept winglet-tipped wings,
  // two turbofans podded on the aft fuselage, and a T-tail. Retractable
  // tricycle gear. Built near true meters; the calibration pass trues it.
  static buildBizjet(aircraft) {
    const fuseMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.3, metalness: 0.25 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x0d3b66, roughness: 0.35, metalness: 0.3 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xdfe4e8, roughness: 0.4, metalness: 0.3 });
    const podMat = new THREE.MeshStandardMaterial({ color: 0x8b959c, roughness: 0.3, metalness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0b1622, roughness: 0.1, metalness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const g = aircraft.group;

    // Slim fuselage with a pointed nose and an up-swept tail cone.
    const fuseGeo = new THREE.CylinderGeometry(0.95, 0.85, 13.0, 16);
    fuseGeo.rotateX(Math.PI / 2);
    g.add(new THREE.Mesh(fuseGeo, fuseMat));
    const noseGeo = new THREE.SphereGeometry(0.95, 16, 14);
    noseGeo.scale(1, 0.95, 1.9);
    const nose = new THREE.Mesh(noseGeo, fuseMat);
    nose.position.set(0, 0, 7.0);
    g.add(nose);
    const tailGeo = new THREE.ConeGeometry(0.85, 4.4, 14);
    tailGeo.rotateX(-Math.PI / 2); // apex aft
    const tailCone = new THREE.Mesh(tailGeo, fuseMat);
    tailCone.position.set(0, 0.45, -8.1);
    tailCone.rotation.x = -0.12;
    g.add(tailCone);

    // Blue cheatline and the cockpit windscreen wrap.
    const stripeGeo = new THREE.CylinderGeometry(0.97, 0.87, 12.0, 16, 1, false, Math.PI * 0.02, Math.PI * 0.30);
    stripeGeo.rotateX(Math.PI / 2);
    const stripe = new THREE.Mesh(stripeGeo, accentMat);
    stripe.rotation.z = Math.PI;
    g.add(stripe);
    const wsGeo = new THREE.SphereGeometry(0.72, 14, 12);
    wsGeo.scale(1, 0.75, 1.6);
    const windscreen = new THREE.Mesh(wsGeo, glassMat);
    windscreen.position.set(0, 0.42, 5.4);
    g.add(windscreen);

    // Low swept wing (~28 deg), inboard edge on the centreline, tips aft, with
    // upright winglets. Slight dihedral.
    const sweep = 0.50;
    for (const side of [1, -1]) {
      const wGeo = new THREE.BoxGeometry(7.4, 0.22, 2.5);
      wGeo.translate(side * 3.7, 0, 0);
      const w = new THREE.Mesh(wGeo, wingMat);
      w.position.set(0, -0.55, -0.6);
      w.rotation.y = side * sweep;
      w.rotation.z = side * 0.06;
      g.add(w);
      const tipX = side * 7.4 * Math.cos(sweep);
      const tipZ = -0.6 - 7.4 * Math.sin(sweep);
      const wingletGeo = new THREE.BoxGeometry(0.09, 1.15, 1.0);
      wingletGeo.translate(0, 0.57, 0);
      const winglet = new THREE.Mesh(wingletGeo, accentMat);
      winglet.position.set(tipX, -0.5, tipZ);
      winglet.rotation.z = -side * 0.18;
      g.add(winglet);
      // Nav light at the tip.
      const nav = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8),
        new THREE.MeshBasicMaterial({ color: side > 0 ? 0xff2222 : 0x22ff22 }));
      nav.position.set(tipX, -0.5, tipZ);
      g.add(nav);
    }

    // Two turbofans podded on the aft fuselage sides on short pylons.
    const podGeo = new THREE.CylinderGeometry(0.62, 0.55, 2.9, 14);
    podGeo.rotateX(Math.PI / 2);
    const pylonGeo = new THREE.BoxGeometry(0.9, 0.28, 0.9);
    for (const side of [1, -1]) {
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(side * 1.35, 0.35, -5.2);
      g.add(pod);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 8, 16), metalMat);
      lip.position.set(side * 1.35, 0.35, -3.8);
      g.add(lip);
      const pylon = new THREE.Mesh(pylonGeo, fuseMat);
      pylon.position.set(side * 0.85, 0.35, -5.2);
      g.add(pylon);
    }

    // T-tail: a tall swept fin capped by the horizontal stabilizer up top.
    const finGeo = new THREE.BoxGeometry(0.2, 3.2, 2.4);
    finGeo.translate(0, 1.6, 0);
    const fin = new THREE.Mesh(finGeo, accentMat);
    fin.position.set(0, 0.5, -8.0);
    fin.rotation.x = 0.42;
    g.add(fin);
    for (const side of [1, -1]) {
      const sGeo = new THREE.BoxGeometry(3.0, 0.16, 1.25);
      sGeo.translate(side * 1.5, 0, 0);
      const s = new THREE.Mesh(sGeo, wingMat);
      s.position.set(0, 3.35, -9.05);
      s.rotation.y = side * 0.30;
      g.add(s);
    }

    // Retractable tricycle gear: nose strut + twin-wheel mains under the wing.
    const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.15, 8);
    const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const noseStrut = new THREE.Mesh(strutGeo, metalMat);
    noseStrut.position.set(0, -0.65, 5.0);
    aircraft.gearGroup.add(noseStrut);
    const noseWheel = new THREE.Mesh(tireGeo, tireMat);
    noseWheel.position.set(0, -1.2, 5.0);
    aircraft.gearGroup.add(noseWheel);
    [-0.95, 0.95].forEach((x) => {
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.position.set(x, -0.65, -1.1);
      strut.rotation.z = x < 0 ? 0.1 : -0.1;
      aircraft.gearGroup.add(strut);
      const wheel = new THREE.Mesh(tireGeo, tireMat);
      wheel.position.set(x * 1.08, -1.2, -1.1);
      aircraft.gearGroup.add(wheel);
    });

    this.configureShadows(g);
  }

  static buildT38(aircraft) {
    // Northrop T-38 Talon: white supersonic trainer. Slim area-ruled fuselage,
    // stubby low wings, tandem bubble canopies and two tiny afterburning
    // turbojets exiting under a swept fin.
    const fuseMat = new THREE.MeshStandardMaterial({ color: 0xf5f7f9, roughness: 0.35, metalness: 0.3 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x1f4f9e, roughness: 0.4, metalness: 0.3 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xe3e7ea, roughness: 0.4, metalness: 0.35 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x101c28, roughness: 0.1, metalness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x6f7377, roughness: 0.25, metalness: 0.85 });
    const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.4, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const g = aircraft.group;

    // Fuselage: slender tube with a needle nose and a gently tapered aft end.
    const fuseGeo = new THREE.CylinderGeometry(0.72, 0.66, 10.6, 16);
    fuseGeo.rotateX(Math.PI / 2);
    g.add(new THREE.Mesh(fuseGeo, fuseMat));
    const noseGeo = new THREE.ConeGeometry(0.72, 3.2, 16);
    noseGeo.rotateX(Math.PI / 2); // apex forward
    const nose = new THREE.Mesh(noseGeo, fuseMat);
    nose.position.set(0, 0, 6.9);
    g.add(nose);
    const aftGeo = new THREE.CylinderGeometry(0.66, 0.52, 2.2, 16);
    aftGeo.rotateX(Math.PI / 2);
    const aft = new THREE.Mesh(aftGeo, fuseMat);
    aft.position.set(0, 0, -6.4);
    g.add(aft);

    // Tandem canopies: two glass bubbles over a shared spine fairing.
    for (const [zPos, len] of [[3.6, 1.7], [1.7, 1.7]]) {
      const cGeo = new THREE.SphereGeometry(0.55, 14, 12);
      cGeo.scale(0.85, 0.8, len);
      const canopy = new THREE.Mesh(cGeo, glassMat);
      canopy.position.set(0, 0.55, zPos);
      g.add(canopy);
    }
    const spineGeo = new THREE.BoxGeometry(0.6, 0.35, 5.2);
    const spine = new THREE.Mesh(spineGeo, fuseMat);
    spine.position.set(0, 0.5, -1.6);
    g.add(spine);

    // Stubby low wing (~24 deg sweep) with a razor-thin section.
    const sweep = 0.42;
    for (const side of [1, -1]) {
      const wGeo = new THREE.BoxGeometry(3.3, 0.12, 2.1);
      wGeo.translate(side * 1.65, 0, 0);
      const w = new THREE.Mesh(wGeo, wingMat);
      w.position.set(0, -0.35, -1.6);
      w.rotation.y = side * sweep;
      g.add(w);
      const tipX = side * 3.3 * Math.cos(sweep);
      const nav = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 8),
        new THREE.MeshBasicMaterial({ color: side > 0 ? 0xff2222 : 0x22ff22 }));
      nav.position.set(tipX, -0.35, -1.6 - 3.3 * Math.sin(sweep));
      g.add(nav);
    }

    // Cheek intakes feeding the buried turbojets.
    for (const side of [1, -1]) {
      const inGeo = new THREE.BoxGeometry(0.34, 0.6, 2.4);
      const intake = new THREE.Mesh(inGeo, metalMat);
      intake.position.set(side * 0.85, -0.05, 1.3);
      g.add(intake);
    }

    // Swept fin with a blue tip flash, low all-moving stabs.
    const finGeo = new THREE.BoxGeometry(0.16, 2.5, 1.9);
    finGeo.translate(0, 1.25, 0);
    const fin = new THREE.Mesh(finGeo, fuseMat);
    fin.position.set(0, 0.35, -6.1);
    fin.rotation.x = -0.55; // negative x rakes the tip aft (+x would lean it forward)
    g.add(fin);
    const flashGeo = new THREE.BoxGeometry(0.18, 0.7, 1.5);
    const flash = new THREE.Mesh(flashGeo, accentMat);
    flash.position.set(0, 2.45, -7.35);
    flash.rotation.x = -0.55;
    g.add(flash);
    for (const side of [1, -1]) {
      const sGeo = new THREE.BoxGeometry(2.1, 0.10, 1.15);
      sGeo.translate(side * 1.05, 0, 0);
      const s = new THREE.Mesh(sGeo, wingMat);
      s.position.set(0, 0.1, -6.6);
      s.rotation.y = side * 0.42;
      g.add(s);
    }

    // Twin turbojet nozzles side by side under the fin.
    for (const side of [1, -1]) {
      const nzGeo = new THREE.CylinderGeometry(0.30, 0.36, 0.9, 12);
      nzGeo.rotateX(Math.PI / 2);
      const nz = new THREE.Mesh(nzGeo, nozzleMat);
      nz.position.set(side * 0.38, -0.1, -7.4);
      g.add(nz);
      if (aircraft.afterburnerGroup) {
        const abGeo = new THREE.ConeGeometry(0.30, 2.4, 12);
        abGeo.rotateX(-Math.PI / 2); // apex aft
        const flame = new THREE.Mesh(abGeo, new THREE.MeshBasicMaterial({
          color: 0xff7722, transparent: true, opacity: 0.85
        }));
        flame.position.set(side * 0.38, -0.1, -8.9);
        aircraft.afterburnerGroup.add(flame);
      }
    }

    // Tricycle gear: tall nose strut, single-wheel mains under the intakes.
    const strutGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.15, 8);
    const tireGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.22, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const noseStrut = new THREE.Mesh(strutGeo, metalMat);
    noseStrut.position.set(0, -0.85, 4.6);
    aircraft.gearGroup.add(noseStrut);
    const noseWheel = new THREE.Mesh(tireGeo, tireMat);
    noseWheel.position.set(0, -1.4, 4.6);
    aircraft.gearGroup.add(noseWheel);
    for (const side of [1, -1]) {
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.position.set(side * 1.15, -0.85, -1.0);
      strut.rotation.z = -side * 0.12;
      aircraft.gearGroup.add(strut);
      const wheel = new THREE.Mesh(tireGeo, tireMat);
      wheel.position.set(side * 1.25, -1.4, -1.0);
      aircraft.gearGroup.add(wheel);
    }

    this.configureShadows(g);
  }

  static buildU2(aircraft) {
    // Lockheed U-2 Dragon Lady: matte-black high-altitude glider-jet. A long
    // slim fuselage with cheek intakes, enormous unswept sailplane wings, a
    // dorsal spine, and the famous bicycle undercarriage with wingtip pogos.
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.75, metalness: 0.25 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.7, metalness: 0.25 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.15, metalness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x4a4e54, roughness: 0.3, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
    const g = aircraft.group;

    // Long slender fuselage: cylinder + rounded nose + tapered tail cone.
    const fuseGeo = new THREE.CylinderGeometry(0.85, 0.8, 13.5, 16);
    fuseGeo.rotateX(Math.PI / 2);
    g.add(new THREE.Mesh(fuseGeo, bodyMat));
    const noseGeo = new THREE.SphereGeometry(0.85, 16, 14);
    noseGeo.scale(1, 0.9, 2.6);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.set(0, 0, 6.75);
    g.add(nose);
    const tailGeo = new THREE.ConeGeometry(0.8, 4.6, 14);
    tailGeo.rotateX(-Math.PI / 2); // apex aft
    const tailCone = new THREE.Mesh(tailGeo, bodyMat);
    tailCone.position.set(0, 0, -9.05);
    g.add(tailCone);

    // Cockpit canopy well forward, and the sensor spine running aft of it.
    const cGeo = new THREE.SphereGeometry(0.62, 14, 12);
    cGeo.scale(0.9, 0.72, 1.5);
    const canopy = new THREE.Mesh(cGeo, glassMat);
    canopy.position.set(0, 0.72, 4.6);
    g.add(canopy);
    const spineGeo = new THREE.BoxGeometry(0.7, 0.42, 7.5);
    const spine = new THREE.Mesh(spineGeo, bodyMat);
    spine.position.set(0, 0.72, -0.4);
    g.add(spine);

    // Cheek intakes flanking the fuselage behind the cockpit.
    for (const side of [1, -1]) {
      const inGeo = new THREE.SphereGeometry(0.55, 12, 10);
      inGeo.scale(0.75, 0.75, 2.2);
      const intake = new THREE.Mesh(inGeo, bodyMat);
      intake.position.set(side * 1.1, -0.1, 2.4);
      g.add(intake);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 8, 14), metalMat);
      lip.position.set(side * 1.1, -0.1, 3.9);
      g.add(lip);
    }

    // Sailplane wings: very high aspect ratio, unswept, a hair of dihedral.
    for (const side of [1, -1]) {
      const wGeo = new THREE.BoxGeometry(14.5, 0.16, 2.7);
      wGeo.translate(side * 7.25, 0, 0);
      const w = new THREE.Mesh(wGeo, wingMat);
      w.position.set(0, 0.15, 0.4);
      w.rotation.z = side * 0.025;
      g.add(w);
      const nav = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: side > 0 ? 0xff2222 : 0x22ff22 }));
      nav.position.set(side * 14.5, 0.5, 0.4);
      g.add(nav);
    }

    // Tall unswept fin and generous sailplane stabs.
    const finGeo = new THREE.BoxGeometry(0.18, 3.1, 2.3);
    finGeo.translate(0, 1.55, 0);
    const fin = new THREE.Mesh(finGeo, bodyMat);
    fin.position.set(0, 0.3, -9.6);
    fin.rotation.x = -0.22; // negative x rakes the tip aft
    g.add(fin);
    for (const side of [1, -1]) {
      const sGeo = new THREE.BoxGeometry(3.4, 0.12, 1.5);
      sGeo.translate(side * 1.7, 0, 0);
      const s = new THREE.Mesh(sGeo, wingMat);
      s.position.set(0, 0.55, -9.6);
      s.rotation.y = side * 0.10;
      g.add(s);
    }

    // Single fat turbofan exhaust at the very tail.
    const nzGeo = new THREE.CylinderGeometry(0.5, 0.58, 1.0, 14);
    nzGeo.rotateX(Math.PI / 2);
    const nozzle = new THREE.Mesh(nzGeo, metalMat);
    nozzle.position.set(0, 0, -11.2);
    g.add(nozzle);

    // Bicycle undercarriage: twin-wheel main truck forward, tail truck aft,
    // plus the outrigger pogo struts that keep those long wings off the runway.
    const mainStrutGeo = new THREE.CylinderGeometry(0.11, 0.11, 1.5, 8);
    const mainStrut = new THREE.Mesh(mainStrutGeo, metalMat);
    mainStrut.position.set(0, -1.2, 1.6);
    aircraft.gearGroup.add(mainStrut);
    const mainTireGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
    mainTireGeo.rotateZ(Math.PI / 2);
    for (const x of [-0.22, 0.22]) {
      const wheel = new THREE.Mesh(mainTireGeo, tireMat);
      wheel.position.set(x, -1.85, 1.6);
      aircraft.gearGroup.add(wheel);
    }
    const tailStrutGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.1, 8);
    const tailStrut = new THREE.Mesh(tailStrutGeo, metalMat);
    tailStrut.position.set(0, -1.0, -6.8);
    aircraft.gearGroup.add(tailStrut);
    const tailTireGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.24, 12);
    tailTireGeo.rotateZ(Math.PI / 2);
    const tailWheel = new THREE.Mesh(tailTireGeo, tireMat);
    tailWheel.position.set(0, -1.6, -6.8);
    aircraft.gearGroup.add(tailWheel);
    for (const side of [1, -1]) {
      const pogoGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8);
      const pogo = new THREE.Mesh(pogoGeo, metalMat);
      pogo.position.set(side * 7.2, -0.85, 0.4);
      aircraft.gearGroup.add(pogo);
      const pogoTireGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.16, 10);
      pogoTireGeo.rotateZ(Math.PI / 2);
      const pogoWheel = new THREE.Mesh(pogoTireGeo, tireMat);
      pogoWheel.position.set(side * 7.2, -1.7, 0.4);
      aircraft.gearGroup.add(pogoWheel);
    }

    this.configureShadows(g);
  }

  static buildCL1201(aircraft) {
    // Lockheed CL-1201: the 1969 nuclear-powered flying-aircraft-carrier study.
    // A 341 m span leviathan — cathedral-thick swept wings, four colossal
    // underwing turbofans, a reactor dome amidships and a forest of gear
    // trucks. Built in true metres; the calibration pass squares up the rest.
    const fuseMat = new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.5, metalness: 0.45 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xc6ccd2, roughness: 0.55, metalness: 0.4 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xb3392e, roughness: 0.45, metalness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x14202c, roughness: 0.12, metalness: 0.85 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x5b6066, roughness: 0.3, metalness: 0.85 });
    const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x26282b, roughness: 0.4, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.9 });
    const g = aircraft.group;

    // Fuselage: a 19 m wide pressure tube with a whale nose and long tail cone.
    const fuseGeo = new THREE.CylinderGeometry(9.5, 9.5, 110, 24);
    fuseGeo.rotateX(Math.PI / 2);
    g.add(new THREE.Mesh(fuseGeo, fuseMat));
    const noseGeo = new THREE.SphereGeometry(9.5, 20, 16);
    noseGeo.scale(1.0, 0.95, 3.2);
    const nose = new THREE.Mesh(noseGeo, fuseMat);
    nose.position.set(0, 0, 55);
    g.add(nose);
    const tailGeo = new THREE.ConeGeometry(9.5, 32, 20);
    tailGeo.rotateX(-Math.PI / 2); // apex aft
    const tailCone = new THREE.Mesh(tailGeo, fuseMat);
    tailCone.position.set(0, 0, -71);
    g.add(tailCone);

    // Flight-deck glazing: a wrapped band high on the nose.
    const deckGeo = new THREE.SphereGeometry(6.2, 16, 12);
    deckGeo.scale(1.05, 0.55, 1.8);
    const deck = new THREE.Mesh(deckGeo, glassMat);
    deck.position.set(0, 6.4, 66);
    g.add(deck);

    // Reactor containment dome on the spine, where the concept art puts it.
    const domeGeo = new THREE.SphereGeometry(7.0, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, metalMat);
    dome.position.set(0, 8.6, -12);
    g.add(dome);

    // Wings: ~24 deg of sweep and a section deep enough to hold crew decks.
    const sweep = 0.42;
    for (const side of [1, -1]) {
      const wGeo = new THREE.BoxGeometry(165, 5.5, 48);
      wGeo.translate(side * 82.5, 0, 0);
      const w = new THREE.Mesh(wGeo, wingMat);
      w.position.set(0, 1.5, 6);
      w.rotation.y = side * sweep;
      w.rotation.z = -side * 0.02; // a whisper of dihedral
      g.add(w);
      const tipX = side * 165 * Math.cos(sweep);
      const tipZ = 6 - 165 * Math.sin(sweep);
      const nav = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8),
        new THREE.MeshBasicMaterial({ color: side > 0 ? 0xff2222 : 0x22ff22 }));
      nav.position.set(tipX, 1.5, tipZ);
      g.add(nav);

      // Two colossal turbofan pods per wing, hung on the sweep line.
      for (const [podX, podZ] of [[38, -6], [78, -22]]) {
        const podGeo = new THREE.CylinderGeometry(4.2, 3.8, 20, 16);
        podGeo.rotateX(Math.PI / 2);
        const pod = new THREE.Mesh(podGeo, metalMat);
        pod.position.set(side * podX, -6.5, podZ);
        g.add(pod);
        const lip = new THREE.Mesh(new THREE.TorusGeometry(4.0, 0.7, 10, 20), nozzleMat);
        lip.position.set(side * podX, -6.5, podZ + 10);
        g.add(lip);
        const nz = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.9, 4.5, 14), nozzleMat);
        nz.rotateX(Math.PI / 2);
        nz.position.set(side * podX, -6.5, podZ - 12);
        g.add(nz);
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5.0, 12), wingMat);
        pylon.position.set(side * podX, -2.2, podZ + 2);
        g.add(pylon);
      }
    }

    // Tail group: a skyscraper of a swept fin with a red flash, low stabs.
    const finGeo = new THREE.BoxGeometry(2.2, 38, 26);
    finGeo.translate(0, 19, 0);
    const fin = new THREE.Mesh(finGeo, fuseMat);
    fin.position.set(0, 6, -74);
    fin.rotation.x = -0.5; // negative x rakes the tip aft
    g.add(fin);
    const flashGeo = new THREE.BoxGeometry(2.4, 9, 20);
    const flash = new THREE.Mesh(flashGeo, accentMat);
    flash.position.set(0, 38.5, -91.5);
    flash.rotation.x = -0.5;
    g.add(flash);
    for (const side of [1, -1]) {
      const sGeo = new THREE.BoxGeometry(42, 2.2, 17);
      sGeo.translate(side * 21, 0, 0);
      const s = new THREE.Mesh(sGeo, wingMat);
      s.position.set(0, 7, -76);
      s.rotation.y = side * 0.35;
      g.add(s);
    }

    // Undercarriage: a nose truck, four multi-wheel main bogies under the
    // belly, and outrigger struts steadying those city-block wings.
    const mkTruck = (x, z, wheelR, wheelW, strutR, strutLen) => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(strutR, strutR, strutLen, 10), metalMat);
      strut.position.set(x, -9.5 - strutLen / 2 + 0.5, z);
      aircraft.gearGroup.add(strut);
      const tireGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 14);
      tireGeo.rotateZ(Math.PI / 2);
      for (const dz of [-wheelR - 0.15, wheelR + 0.15]) {
        const wheel = new THREE.Mesh(tireGeo, tireMat);
        wheel.position.set(x, -9.5 - strutLen + 0.5, z + dz);
        aircraft.gearGroup.add(wheel);
      }
    };
    mkTruck(0, 52, 1.5, 1.1, 0.55, 5.0);                       // nose truck
    for (const side of [1, -1]) {
      mkTruck(side * 6.5, 2, 1.9, 1.4, 0.75, 4.6);             // fore mains
      mkTruck(side * 6.5, -24, 1.9, 1.4, 0.75, 4.6);           // aft mains
      // Wing outrigger: a slender pogo about a third of the way out.
      const outX = side * 52;
      const pogo = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 9.0, 8), metalMat);
      pogo.position.set(outX, -6.5, -12);
      aircraft.gearGroup.add(pogo);
      const oTireGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.8, 12);
      oTireGeo.rotateZ(Math.PI / 2);
      const oWheel = new THREE.Mesh(oTireGeo, tireMat);
      oWheel.position.set(outX, -11.5, -12);
      aircraft.gearGroup.add(oWheel);
    }

    this.configureShadows(g);
  }

  static addLerx(group, mat, side, { xRoot, xTip, zRoot, zFront, y = 0.04, thick = 0.06 }) {
    const pts = [
      [side * xRoot, zRoot],   // inboard, at the wing-root leading edge
      [side * xTip, zRoot],    // outboard, at the wing-root leading edge
      [side * xRoot, zFront]   // forward point, near the nose
    ];
    if (side < 0) pts.reverse(); // keep winding CCW so the top face lights correctly
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    shape.lineTo(pts[1][0], pts[1][1]);
    shape.lineTo(pts[2][0], pts[2][1]);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
    geo.rotateX(Math.PI / 2);       // planform into XZ, thickness along -Y
    geo.translate(0, y + thick / 2, 0);
    group.add(new THREE.Mesh(geo, mat));
  }
  static configureShadows(group) {
    group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }
}