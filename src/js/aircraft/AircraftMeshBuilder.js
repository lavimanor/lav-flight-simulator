import * as THREE from 'three';

export class AircraftMeshBuilder {
  /**
   * Procedurally generates the 3D model geometry/materials and mounts them to the aircraft group.
   * @param {AircraftBase} aircraft 
   */
  static build(aircraft) {
    aircraft.gearGroup = new THREE.Group();
    aircraft.group.add(aircraft.gearGroup);
    if (aircraft.config.id === 'fighter') {
      aircraft.afterburnerGroup = new THREE.Group();
      aircraft.afterburnerGroup.visible = false;
      aircraft.group.add(aircraft.afterburnerGroup);
      this.buildFighter(aircraft);
    } else if (aircraft.config.id === 'stunt') {
      this.buildStunt(aircraft);
    } else if (aircraft.config.id === 'cargo') {
      this.buildCargo(aircraft);
    } else {
      this.buildTrainer(aircraft);
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