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

    const isJet = ['fighter', 'f16', 'f35', 'f22'].includes(aircraft.config.id);
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
    } else {
      this.buildTrainer(aircraft);
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

    // Large leading-edge extensions (LEX) — the Hornet's signature.
    const lexGeo = new THREE.BoxGeometry(0.65, 0.05, 2.6);
    const leftLex = new THREE.Mesh(lexGeo, fuselageMat);
    leftLex.position.set(-0.5, 0.06, 1.3);
    leftLex.rotation.y = 0.36;
    aircraft.group.add(leftLex);
    const rightLex = new THREE.Mesh(lexGeo, fuselageMat);
    rightLex.position.set(0.5, 0.06, 1.3);
    rightLex.rotation.y = -0.36;
    aircraft.group.add(rightLex);

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
    const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8);
    const tireGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const noseStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    noseStrutMesh.position.set(0, -1.0, 4.2);
    aircraft.gearGroup.add(noseStrutMesh);
    const noseWheel = new THREE.Mesh(tireGeo, tireMat);
    noseWheel.position.set(0, -1.7, 4.2);
    aircraft.gearGroup.add(noseWheel);
    const leftStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    leftStrutMesh.position.set(-1.4, -1.0, -0.6);
    aircraft.gearGroup.add(leftStrutMesh);
    const leftWheel = new THREE.Mesh(tireGeo, tireMat);
    leftWheel.position.set(-1.5, -1.7, -0.6);
    aircraft.gearGroup.add(leftWheel);
    const rightStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    rightStrutMesh.position.set(1.4, -1.0, -0.6);
    aircraft.gearGroup.add(rightStrutMesh);
    const rightWheel = new THREE.Mesh(tireGeo, tireMat);
    rightWheel.position.set(1.5, -1.7, -0.6);
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

    const halfSpan = 16.0;

    // --- Swept wings that form the main delta planform ---
    const makeWing = (sign) => {
      const geo = new THREE.BoxGeometry(halfSpan, 0.28, 5.5);
      geo.translate(sign * halfSpan / 2, 0, 0);   // inboard edge at centreline
      const wing = new THREE.Mesh(geo, wingMat);
      wing.position.set(0, 0, -0.4);
      wing.rotation.y = sign * 0.62;              // ~35deg leading-edge sweep
      aircraft.group.add(wing);
    };
    makeWing(-1);
    makeWing(1);

    // Raised blended centre spine over the wing roots.
    const body = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.9, 7.5), bodyMat);
    body.position.set(0, 0.25, 0.2);
    aircraft.group.add(body);

    // Pointed nose chine (flattened 4-sided cone), same pattern as the F35 nose.
    const noseGeo = new THREE.ConeGeometry(2.5, 4.6, 4);
    noseGeo.rotateX(Math.PI / 2);
    noseGeo.rotateZ(Math.PI / 4);
    noseGeo.scale(1, 0.3, 1);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.set(0, 0.12, 4.2);
    aircraft.group.add(nose);

    // Central beavertail point at the trailing edge (flat triangle pointing aft).
    const tailGeo = new THREE.ConeGeometry(1.5, 3.2, 4);
    tailGeo.rotateX(-Math.PI / 2);
    tailGeo.rotateZ(Math.PI / 4);
    tailGeo.scale(1, 0.15, 1);
    const beaverTail = new THREE.Mesh(tailGeo, wingMat);
    beaverTail.position.set(0, 0.02, -3.2);
    aircraft.group.add(beaverTail);

    // Cockpit blister.
    const cockpitGeo = new THREE.SphereGeometry(0.9, 16, 12);
    cockpitGeo.scale(1.0, 0.5, 1.7);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 0.62, 2.6);
    aircraft.group.add(cockpit);

    // Engine intake humps and exhaust troughs (4 buried engines, top-mounted).
    const intakeGeo = new THREE.BoxGeometry(1.3, 0.42, 2.0);
    const exhGeo = new THREE.BoxGeometry(1.1, 0.18, 1.3);
    [-2.2, -0.85, 0.85, 2.2].forEach((x) => {
      const intake = new THREE.Mesh(intakeGeo, bodyMat);
      intake.position.set(x, 0.55, 0.7);
      aircraft.group.add(intake);
      const exh = new THREE.Mesh(exhGeo, exhaustMat);
      exh.position.set(x, 0.22, -2.5);
      aircraft.group.add(exh);
    });

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
    const strakeGeo = new THREE.BoxGeometry(0.55, 0.05, 2.4);
    const leftStrake = new THREE.Mesh(strakeGeo, bodyMat);
    leftStrake.position.set(-0.45, 0.03, 1.7);
    leftStrake.rotation.y = 0.32;
    aircraft.group.add(leftStrake);
    const rightStrake = new THREE.Mesh(strakeGeo, bodyMat);
    rightStrake.position.set(0.45, 0.03, 1.7);
    rightStrake.rotation.y = -0.32;
    aircraft.group.add(rightStrake);

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

    // Leading-edge root chines.
    const chineGeo = new THREE.BoxGeometry(0.9, 0.06, 2.8);
    const leftChine = new THREE.Mesh(chineGeo, bodyMat);
    leftChine.position.set(-0.68, 0.05, 2.0);
    leftChine.rotation.y = 0.26;
    aircraft.group.add(leftChine);
    const rightChine = new THREE.Mesh(chineGeo, bodyMat);
    rightChine.position.set(0.68, 0.05, 2.0);
    rightChine.rotation.y = -0.26;
    aircraft.group.add(rightChine);

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
    const lerxGeo = new THREE.BoxGeometry(1.0, 0.06, 3.2);
    const leftLerx = new THREE.Mesh(lerxGeo, bodyMat);
    leftLerx.position.set(-0.75, 0.06, 2.1);
    leftLerx.rotation.y = 0.28;
    aircraft.group.add(leftLerx);
    const rightLerx = new THREE.Mesh(lerxGeo, bodyMat);
    rightLerx.position.set(0.75, 0.06, 2.1);
    rightLerx.rotation.y = -0.28;
    aircraft.group.add(rightLerx);

    // Dorsal spine.
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 4.0), bodyMat);
    spine.position.set(0, 0.32, -0.6);
    aircraft.group.add(spine);

    this.configureShadows(aircraft.group);
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