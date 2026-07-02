import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class AircraftMeshBuilder {
  static build(aircraft) {
    // Preserve master physics group reference
    const originalGroup = aircraft.group;

    // Create a visual content sub-group to cleanly apply JSON scale/rotation without altering physics axes [3]
    aircraft.visualGroup = new THREE.Group();
    originalGroup.add(aircraft.visualGroup);

    aircraft.gearGroup = new THREE.Group(); 
    aircraft.visualGroup.add(aircraft.gearGroup);

    // Swap reference so existing .add() calls automatically append to the visual group
    aircraft.group = aircraft.visualGroup;

    // Apply JSON scale configuration [3]
    const scale = aircraft.config.modelScale || { x: 1.0, y: 1.0, z: 1.0 };
    aircraft.visualGroup.scale.set(scale.x, scale.y, scale.z);

    // Apply JSON rotation configuration (degrees to radians conversion) [3]
    const rot = aircraft.config.modelRotation || { x: 0.0, y: 0.0, z: 0.0 };
    aircraft.visualGroup.rotation.set(
      rot.x * (Math.PI / 180),
      rot.y * (Math.PI / 180),
      rot.z * (Math.PI / 180)
    );

    // Apply JSON position offset configuration [3]
    const pos = aircraft.config.modelPosition || { x: 0.0, y: 0.0, z: 0.0 };
    aircraft.visualGroup.position.set(pos.x, pos.y, pos.z);

    // Attempt to load external custom GLTF mesh if configured [3, 4]
    if (aircraft.config && aircraft.config.modelType === 'custom') {
      this.loadCustomModel(aircraft);
      
      // Restore master reference before returning
      aircraft.group = originalGroup;
      return;
    }

    // Dynamic Afterburner group initialization for all tactical jets [3]
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
    } else if (aircraft.config.id === 'trainer') {
      this.buildTrainer(aircraft);
    } else if (aircraft.config.id === 'cargo') {
      this.buildCargo(aircraft);
    }
  }

  static buildTrainer(aircraft) {
    const fuselageMat = new THREE.MeshStandardMaterial({ color: 0xeaeaea, roughness: 0.4 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.75 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.6 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b, roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 }); // Struts
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });  // Wheels

    // 1. Fuselage
    const fuseGeo = new THREE.CylinderGeometry(0.5, 0.25, 6.0, 16);
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuseGeo, fuselageMat);
    aircraft.group.add(fuselage);

    // 2. Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.5, 1.2, 16);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, trimMat);
    nose.position.z = 3.6;
    aircraft.group.add(nose);

    // 3. Main Wings
    const wingGeo = new THREE.BoxGeometry(aircraft.config.dimensions.span, 0.08, 1.4);
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(0, 0.35, 0.6);
    aircraft.group.add(wing);

    // 4. Horizontal Stabilizer
    const elevatorGeo = new THREE.BoxGeometry(3.5, 0.05, 0.8);
    const elevator = new THREE.Mesh(elevatorGeo, wingMat);
    elevator.position.set(0, 0.1, -2.6);
    aircraft.group.add(elevator);

    // 5. Vertical Stabilizer
    const rudderGeo = new THREE.BoxGeometry(0.06, 1.4, 0.8);
    rudderGeo.translate(0, 0.7, 0);
    const rudder = new THREE.Mesh(rudderGeo, trimMat);
    rudder.position.set(0, 0.3, -2.6);
    aircraft.group.add(rudder);

    // 6. Canopy
    const canopyGeo = new THREE.SphereGeometry(0.4, 16, 16);
    canopyGeo.scale(1, 0.8, 2.5);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.45, 0.8);
    aircraft.group.add(canopy);

    // 7. Propeller Spinner
    aircraft.propellerGroup = new THREE.Group();
    aircraft.propellerGroup.position.set(0, 0, 4.25);

    const bladeGeo = new THREE.BoxGeometry(2.2, 0.12, 0.02);
    const blade = new THREE.Mesh(bladeGeo, propMat);
    aircraft.propellerGroup.add(blade);
    aircraft.group.add(aircraft.propellerGroup);

    // 8. Procedural Tricycle Landing Gear
    const strutGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8);
    const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
    tireGeo.rotateZ(Math.PI / 2); 

    // Nose Gear (Forward center strut & tire)
    const noseStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    noseStrutMesh.position.set(0, -0.6, 2.0);
    aircraft.gearGroup.add(noseStrutMesh);

    const noseWheel = new THREE.Mesh(tireGeo, tireMat);
    noseWheel.position.set(0, -1.2, 2.0);
    aircraft.gearGroup.add(noseWheel);

    // Left Main Gear
    const leftStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    leftStrutMesh.position.set(-1.1, -0.6, -0.2);
    leftStrutMesh.rotation.z = 0.15; // Angled slightly outward
    aircraft.gearGroup.add(leftStrutMesh);

    const leftWheel = new THREE.Mesh(tireGeo, tireMat);
    leftWheel.position.set(-1.2, -1.2, -0.2);
    aircraft.gearGroup.add(leftWheel);

    // Right Main Gear
    const rightStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    rightStrutMesh.position.set(1.1, -0.6, -0.2);
    rightStrutMesh.rotation.z = -0.15;
    aircraft.gearGroup.add(rightStrutMesh);

    const rightWheel = new THREE.Mesh(tireGeo, tireMat);
    rightWheel.position.set(1.2, -1.2, -0.2);
    aircraft.gearGroup.add(rightWheel);

    AircraftMeshBuilder.addNavLights(aircraft, -5.5, 5.5, 0.35, 0.6);
    this.configureShadows(aircraft.group);
  }

  static buildFighter(aircraft) {
    const fuselageMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.5 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.4 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffab40, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.70 });
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff3d00, transparent: true, opacity: 0.85 }); // Glow orange basic material for jet exhaust

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

    // 8. Retractable Tricycle Struts gear
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

    // 9. Procedural Afterburner Exhaust Flame cones
    const flameGeo = new THREE.ConeGeometry(0.18, 2.0, 8);
    flameGeo.rotateX(-Math.PI / 2); // Point backward along local -Z

    const leftFlame = new THREE.Mesh(flameGeo, flameMat);
    leftFlame.position.set(-0.25, 0, -4.5);
    aircraft.afterburnerGroup.add(leftFlame);

    const rightFlame = new THREE.Mesh(flameGeo, flameMat);
    rightFlame.position.set(0.25, 0, -4.5);
    aircraft.afterburnerGroup.add(rightFlame);

    AircraftMeshBuilder.addNavLights(aircraft, -5.7, 5.7, 0, -0.6);
    this.configureShadows(aircraft.group);
  }

  static buildStunt(aircraft) {
    const fuselageMat = new THREE.MeshStandardMaterial({ color: 0xffea00, roughness: 0.4 }); // Acrobatic yellow
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xffea00, roughness: 0.4 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.8 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.6 }); // Black racing stripes
    const propMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    // 1. Fuselage
    const fuseGeo = new THREE.CylinderGeometry(0.45, 0.2, 4.5, 12);
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuseGeo, fuselageMat);
    aircraft.group.add(fuselage);

    // 2. Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.45, 0.8, 12);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, trimMat);
    nose.position.z = 2.65;
    aircraft.group.add(nose);

    // 3. Lower Main Wing
    const lowerWingGeo = new THREE.BoxGeometry(aircraft.config.dimensions.span, 0.06, 1.1);
    const lowerWing = new THREE.Mesh(lowerWingGeo, wingMat);
    lowerWing.position.set(0, -0.3, 0.4);
    aircraft.group.add(lowerWing);

    // 4. Upper Main Wing (Biplane Offset structure)
    const upperWingGeo = new THREE.BoxGeometry(aircraft.config.dimensions.span + 0.4, 0.06, 1.1);
    const upperWing = new THREE.Mesh(upperWingGeo, wingMat);
    upperWing.position.set(0, 0.8, 0.6); 
    aircraft.group.add(upperWing);

    // 5. Biplane wing struts
    const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6);
    const leftStrut = new THREE.Mesh(strutGeo, trimMat);
    leftStrut.position.set(-2.5, 0.25, 0.5);
    aircraft.group.add(leftStrut);

    const rightStrut = new THREE.Mesh(strutGeo, trimMat);
    rightStrut.position.set(2.5, 0.25, 0.5);
    aircraft.group.add(rightStrut);

    // 6. Stabilizers
    const elevatorGeo = new THREE.BoxGeometry(2.4, 0.04, 0.6);
    const elevator = new THREE.Mesh(elevatorGeo, wingMat);
    elevator.position.set(0, 0.1, -1.9);
    aircraft.group.add(elevator);

    const rudderGeo = new THREE.BoxGeometry(0.05, 1.1, 0.6);
    rudderGeo.translate(0, 0.55, 0);
    const rudder = new THREE.Mesh(rudderGeo, trimMat);
    rudder.position.set(0, 0.2, -1.9);
    aircraft.group.add(rudder);

    // 7. Cockpit Canopy
    const canopyGeo = new THREE.SphereGeometry(0.3, 12, 12);
    canopyGeo.scale(1, 0.8, 1.8);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.42, -0.1);
    aircraft.group.add(canopy);

    // 8. Propeller Spinner
    aircraft.propellerGroup = new THREE.Group();
    aircraft.propellerGroup.position.set(0, 0, 3.1);
    const bladeGeo = new THREE.BoxGeometry(1.8, 0.08, 0.02);
    const blade = new THREE.Mesh(bladeGeo, propMat);
    aircraft.propellerGroup.add(blade);
    aircraft.group.add(aircraft.propellerGroup);

    // 9. Classic Tail-dragger landing gear
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

    AircraftMeshBuilder.addNavLights(aircraft, -3.3, 3.3, 0.8, 0.6);
    this.configureShadows(aircraft.group);
  }

  static buildCargo(aircraft) {
    const fuselageMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.5 }); // Slate military grey
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.5 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x10151c, roughness: 0.1, metalness: 0.9 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.6 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    aircraft.cargoPropellers = []; // Store the 4 engines' propellers

    // 1. Thick Cargo Fuselage
    const fuseGeo = new THREE.CylinderGeometry(1.2, 0.8, 12.0, 16);
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuseGeo, fuselageMat);
    aircraft.group.add(fuselage);

    // 2. Nose
    const noseGeo = new THREE.SphereGeometry(1.2, 16, 16);
    noseGeo.scale(1, 0.9, 1.4);
    const nose = new THREE.Mesh(noseGeo, fuselageMat);
    nose.position.set(0, -0.1, 6.0);
    aircraft.group.add(nose);

    // 3. High Wings
    const wingGeo = new THREE.BoxGeometry(16.0, 0.2, 2.2); 
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(0, 1.1, 0.2);
    aircraft.group.add(wing);

    // 4. Stabilizers
    const elevatorGeo = new THREE.BoxGeometry(6.0, 0.1, 1.4);
    const elevator = new THREE.Mesh(elevatorGeo, wingMat);
    elevator.position.set(0, 0.4, -5.0);
    aircraft.group.add(elevator);

    const rudderGeo = new THREE.BoxGeometry(0.12, 3.2, 1.8);
    rudderGeo.translate(0, 1.6, 0);
    const rudder = new THREE.Mesh(rudderGeo, trimMat);
    rudder.position.set(0, 1.0, -5.0);
    aircraft.group.add(rudder);

    // 5. Cockpit Sponson
    const cockpitGeo = new THREE.BoxGeometry(1.4, 0.6, 0.8);
    const cockpit = new THREE.Mesh(cockpitGeo, canopyMat);
    cockpit.position.set(0, 0.7, 5.0);
    aircraft.group.add(cockpit);

    // 6. Quad Propeller Engines Nacelles
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

    // 7. Heavy Tricycle Landing Gear
    const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8);
    const tireGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 12);
    tireGeo.rotateZ(Math.PI / 2);

    // Nose Gear
    const noseStrutMesh = new THREE.Mesh(strutGeo, metalMat);
    noseStrutMesh.position.set(0, -1.0, 4.2);
    aircraft.gearGroup.add(noseStrutMesh);

    const noseWheel = new THREE.Mesh(tireGeo, tireMat);
    noseWheel.position.set(0, -1.7, 4.2);
    aircraft.gearGroup.add(noseWheel);

    // Dual Main Gears
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

    AircraftMeshBuilder.addNavLights(aircraft, -8.0, 8.0, 1.1, 0.2);
    this.configureShadows(aircraft.group);
  }

  static buildB2(aircraft) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.6 }); // Stealth charcoal grey
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x11161b, roughness: 0.1, metalness: 0.9 });
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

    // 1. Center flattened blended fuselage hump
    const bodyGeo = new THREE.BoxGeometry(2.4, 0.6, 6.0);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    aircraft.group.add(body);

    // 2. Large swept-back flying wings
    const leftWingGeo = new THREE.BoxGeometry(18.0, 0.12, 4.0);
    leftWingGeo.translate(-9.0, 0, 0); 
    const leftWing = new THREE.Mesh(leftWingGeo, bodyMat);
    leftWing.position.set(-0.8, -0.1, -1.0);
    leftWing.rotation.y = -0.65; 
    aircraft.group.add(leftWing);

    const rightWingGeo = new THREE.BoxGeometry(18.0, 0.12, 4.0);
    rightWingGeo.translate(9.0, 0, 0);
    const rightWing = new THREE.Mesh(rightWingGeo, bodyMat);
    rightWing.position.set(0.8, -0.1, -1.0);
    rightWing.rotation.y = 0.65;
    aircraft.group.add(rightWing);

    // 3. Cockpit window strips
    const cockpitGeo = new THREE.BoxGeometry(1.6, 0.25, 0.8);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 0.25, 1.8);
    aircraft.group.add(cockpit);

    // 4. Flat stealth exhaust nozzles
    const nozzleGeo = new THREE.BoxGeometry(1.2, 0.15, 0.8);
    const nozzle = new THREE.Mesh(nozzleGeo, exhaustMat);
    nozzle.position.set(0, -0.1, -2.8);
    aircraft.group.add(nozzle);

    AircraftMeshBuilder.addNavLights(aircraft, -9.0, 9.0, -0.1, -1.0);
    this.configureShadows(aircraft.group);
  }

  static buildF16(aircraft) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.5 }); // Falcon light-grey
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.5 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.65 });
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    // 1. Fuselage
    const fuseGeo = new THREE.CylinderGeometry(0.35, 0.35, 7.5, 12);
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuseGeo, bodyMat);
    aircraft.group.add(fuselage);

    // 2. Nose Cone (Radome)
    const noseGeo = new THREE.ConeGeometry(0.35, 2.0, 12);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, trimMat);
    nose.position.z = 4.75;
    aircraft.group.add(nose);

    // 3. Under-belly chin air intake (Classic F-16 signature)
    const intakeGeo = new THREE.BoxGeometry(0.45, 0.3, 1.8);
    const intake = new THREE.Mesh(intakeGeo, trimMat);
    intake.position.set(0, -0.4, 2.5);
    aircraft.group.add(intake);

    // 4. Swept wings
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

    // 5. Single vertical tail fin
    const finGeo = new THREE.BoxGeometry(0.05, 1.7, 1.1);
    finGeo.translate(0, 0.85, 0);
    const fin = new THREE.Mesh(finGeo, trimMat);
    fin.position.set(0, 0.3, -2.8);
    aircraft.group.add(fin);

    // 6. Horizontal elevators
    const elevGeo = new THREE.BoxGeometry(2.4, 0.04, 0.8);
    const elev = new THREE.Mesh(elevGeo, bodyMat);
    elev.position.set(0, 0, -3.2);
    aircraft.group.add(elev);

    // 7. Bubble Canopy
    const canopyGeo = new THREE.SphereGeometry(0.3, 12, 12);
    canopyGeo.scale(1, 0.8, 2.8);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.38, 1.6);
    aircraft.group.add(canopy);

    // 8. Single Exhaust Nozzle
    const nozzleGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.6, 8);
    nozzleGeo.rotateX(Math.PI / 2);
    const nozzle = new THREE.Mesh(nozzleGeo, exhaustMat);
    nozzle.position.set(0, 0, -4.0);
    aircraft.group.add(nozzle);

    // 9. Standard tricycle gear struts
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

    AircraftMeshBuilder.addNavLights(aircraft, -4.98, 4.98, 0, -0.5);
    this.configureShadows(aircraft.group);
  }

  static buildF35(aircraft) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.65 }); // Dark stealth grey
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.6 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.65 }); // Gold tinted canopy
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    // 1. Angular stealth fuselage
    const fuseGeo = new THREE.BoxGeometry(0.9, 0.7, 7.2);
    const fuselage = new THREE.Mesh(fuseGeo, bodyMat);
    aircraft.group.add(fuselage);

    // 2. Sharp angular Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.45, 2.2, 4); // 4-sided radar-deflecting nose
    noseGeo.rotateX(Math.PI / 2);
    noseGeo.rotateZ(Math.PI / 4);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.z = 4.7;
    aircraft.group.add(nose);

    // 3. Trapezoidal stealth wings
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

    // 4. Twin canted vertical tails (angled outward)
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

    // 5. Canted elevators
    const leftElev = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.8), bodyMat);
    leftElev.position.set(-1.1, 0, -3.2);
    leftElev.rotation.y = -0.3;
    aircraft.group.add(leftElev);

    const rightElev = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.8), bodyMat);
    rightElev.position.set(1.1, 0, -3.2);
    rightElev.rotation.y = 0.3;
    aircraft.group.add(rightElev);

    // 6. Canopy
    const canopyGeo = new THREE.SphereGeometry(0.32, 12, 12);
    canopyGeo.scale(1, 0.85, 2.6);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.4, 1.5);
    aircraft.group.add(canopy);

    // 7. Exhaust nozzle
    const nozzleGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.6, 8);
    nozzleGeo.rotateX(Math.PI / 2);
    const nozzle = new THREE.Mesh(nozzleGeo, exhaustMat);
    nozzle.position.set(0, 0, -3.8);
    aircraft.group.add(nozzle);

    // 8. Stealth Tricycle Gear Struts
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

    AircraftMeshBuilder.addNavLights(aircraft, -5.35, 5.35, 0, -0.6);
    this.configureShadows(aircraft.group);
  }

  static buildF22(aircraft) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x607d8b, roughness: 0.6 }); // Raptor slate blue-grey steel
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.6 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.65 });
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    // 1. Sleek stealth angular fuselage
    const fuseGeo = new THREE.BoxGeometry(1.0, 0.65, 7.8);
    const fuselage = new THREE.Mesh(fuseGeo, bodyMat);
    aircraft.group.add(fuselage);

    // 2. Diamond-profile angular Nose
    const noseGeo = new THREE.ConeGeometry(0.5, 2.4, 4);
    noseGeo.rotateX(Math.PI / 2);
    noseGeo.rotateZ(Math.PI / 4);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.z = 5.1;
    aircraft.group.add(nose);

    // 3. Stealth diamond wings (span = 13.56m)
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

    // 4. Twin canted vertical stabilizers (angled outward)
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

    // 5. Canted elevators
    const leftElev = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.9), bodyMat);
    leftElev.position.set(-1.2, 0, -3.5);
    leftElev.rotation.y = -0.35;
    aircraft.group.add(leftElev);

    const rightElev = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.9), bodyMat);
    rightElev.position.set(1.2, 0, -3.5);
    rightElev.rotation.y = 0.35;
    aircraft.group.add(rightElev);

    // 6. Gold Tinted Canopy
    const canopyGeo = new THREE.SphereGeometry(0.34, 12, 12);
    canopyGeo.scale(1, 0.85, 2.8);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.42, 1.5);
    aircraft.group.add(canopy);

    // 7. Twin Rectangular Exhaust Nozzles (Thrust Vectoring)
    const nozzleGeo = new THREE.BoxGeometry(0.3, 0.15, 0.6);
    const leftNozzle = new THREE.Mesh(nozzleGeo, exhaustMat);
    leftNozzle.position.set(-0.25, 0, -4.1);
    aircraft.group.add(leftNozzle);

    const rightNozzle = new THREE.Mesh(nozzleGeo, exhaustMat);
    rightNozzle.position.set(0.25, 0, -4.1);
    aircraft.group.add(rightNozzle);

    // 8. Stealth Tricycle Gear Struts
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

    // 9. Twin Afterburner Flames inside Nozzles
    const flameGeo = new THREE.ConeGeometry(0.14, 1.8, 8);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff3d00, transparent: true, opacity: 0.85 });
    
    const leftFlame = new THREE.Mesh(flameGeo, flameMat);
    leftFlame.position.set(-0.25, 0, -4.3);
    aircraft.afterburnerGroup.add(leftFlame);

    const rightFlame = new THREE.Mesh(flameGeo, flameMat);
    rightFlame.position.set(0.25, 0, -4.3);
    aircraft.afterburnerGroup.add(rightFlame);

    AircraftMeshBuilder.addNavLights(aircraft, -6.78, 6.78, 0, -0.6);
    this.configureShadows(aircraft.group);
  }

  /**
   * Loads external GLTF models and adds them to the aircraft group.
   * Falls back to procedural placeholder glider mesh on load/parse error [3].
   */
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
        // Append custom GLTF to the transformed visual sub-group
        aircraft.visualGroup.add(gltf.scene);
        console.log(`[AircraftMeshBuilder] Loaded custom aircraft model: ${modelPath}`);
      },
      undefined,
      (error) => {
        console.error(`[AircraftMeshBuilder] GLTFLoader failed to parse '${modelPath}'. Invoking safe fallback:`, error);
        this.buildPlaceholder(aircraft);
      }
    );
  }

  static buildPlaceholder(aircraft) {
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xff1111, roughness: 0.5 }); // High visibility warning red
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 });

    // 1. Sleek box fuselage representing bounds
    const fuseGeo = new THREE.BoxGeometry(0.8, 0.8, 4.0);
    const fuselage = new THREE.Mesh(fuseGeo, baseMat);
    aircraft.group.add(fuselage);

    // 2. Mock wings
    const wingGeo = new THREE.BoxGeometry(7.0, 0.04, 1.2);
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(0, 0, 0.3);
    aircraft.group.add(wing);

    // 3. Mock tail stabilizer
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

  static configureShadows(group) {
    group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  static addNavLights(aircraft, leftX, rightX, y, z) {
    const redLightGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const redLightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const redLight = new THREE.Mesh(redLightGeo, redLightMat);
    redLight.position.set(leftX, y, z);
    aircraft.group.add(redLight);

    const greenLightGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const greenLightMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const greenLight = new THREE.Mesh(greenLightGeo, greenLightMat);
    greenLight.position.set(rightX, y, z);
    aircraft.group.add(greenLight);
  }
}