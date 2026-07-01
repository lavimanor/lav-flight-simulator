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
      aircraft.afterburnerGroup = new THREE.Group(); // Sub-group for flame exhaust cones
      aircraft.afterburnerGroup.visible = false;
      aircraft.group.add(aircraft.afterburnerGroup);
      
      this.buildFighter(aircraft);
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

  static configureShadows(group) {
    group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }
}