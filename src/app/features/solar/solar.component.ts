import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-solar',
  imports: [ CommonModule, RouterLink ],
  templateUrl: './solar.component.html',
  styleUrl: './solar.component.css'
})
export class SolarComponent implements OnInit, OnDestroy {
  private finalDistanceScale!: number;
  private animationActive = true;
  public selectedPlanet: any = null;
  public showPlanetInfo: boolean = false;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;
  private hoveredPlanet: string | null = null;
  private popupElement!: HTMLDivElement;
  private planetObjects: any = {};

  private planetData = [
    { name: "sun", orbitalPeriod: 0, distance: 0, diameter: 1392684, rotationPeriod: 27, description: "El Sol es una estrella de tipo espectral G2V, que constituye el centro del sistema solar. Es una esfera casi perfecta de plasma caliente, con un diámetro de aproximadamente 1.4 millones de kilómetros y una masa que representa el 99.86% de la masa total del sistema solar." },
    { name: "mercury", orbitalPeriod: 88, distance: 57.9, diameter: 4879, rotationPeriod: 58.6, description: "Mercurio es el planeta más cercano al Sol y el más pequeño del sistema solar. Tiene un diámetro de aproximadamente 4,880 kilómetros y una masa que representa el 0.055% de la masa de la Tierra. Su superficie está cubierta de cráteres y no tiene atmósfera significativa." },
    { name: "venus", orbitalPeriod: 225, distance: 108.2, diameter: 12104, rotationPeriod: -243, description: "Venus es el segundo planeta del sistema solar y es similar en tamaño y composición a la Tierra, pero tiene una atmósfera densa compuesta principalmente de dióxido de carbono. Su diámetro es de aproximadamente 12,104 kilómetros y su masa es el 81.5% de la masa terrestre. Venus rota en sentido retrógrado, lo que significa que gira en dirección opuesta a la mayoría de los planetas." },
    { name: "earth", orbitalPeriod: 365.25, distance: 149.6, diameter: 12742, rotationPeriod: 1, description: "La Tierra es el tercer planeta del sistema solar y el único conocido que alberga vida. Tiene un diámetro de aproximadamente 12,742 kilómetros y una masa que representa el 5.97 x 10^24 kg. La Tierra tiene una atmósfera rica en oxígeno y agua, lo que la hace única entre los planetas rocosos." },
    { name: "mars", orbitalPeriod: 687, distance: 227.9, diameter: 6779, rotationPeriod: 1.03, description: "Marte es el cuarto planeta del sistema solar y es conocido como el 'planeta rojo' debido a su superficie rica en óxido de hierro. Tiene un diámetro de aproximadamente 6,779 kilómetros y una masa que representa el 10.7% de la masa terrestre. Marte tiene dos lunas pequeñas, Fobos y Deimos." },
    { name: "jupiter", orbitalPeriod: 4333, distance: 778.5, diameter: 139820, rotationPeriod: 0.41, description: "Júpiter es el quinto planeta del sistema solar y el más grande, con un diámetro de aproximadamente 139,820 kilómetros. Su masa es 318 veces la de la Tierra, lo que lo convierte en un gigante gaseoso. Júpiter tiene una atmósfera compuesta principalmente de hidrógeno y helio, y es conocido por su Gran Manch Roja, una gigantesca tormenta." },
    { name: "saturn", orbitalPeriod: 10759, distance: 1432.0, diameter: 116460, rotationPeriod: 0.45, description: "Saturno es el sexto planeta del sistema solar y es famoso por sus impresionantes anillos. Tiene un diámetro de aproximadamente 116,460 kilómetros y una masa que representa el 95.2% de la masa de Júpiter. Saturno es un gigante gaseoso con una atmósfera compuesta principalmente de hidrógeno y helio." },
    { name: "uranus", orbitalPeriod: 30687, distance: 2867.0, diameter: 50724, rotationPeriod: 0.72, description: "Urano es el séptimo planeta del sistema solar y es conocido por su color azul verdoso debido a la presencia de metano en su atmósfera. Tiene un diámetro de aproximadamente 50,724 kilómetros y una masa que representa el 14.5% de la masa de Júpiter. Urano es un gigante gaseoso y tiene un eje de rotación inclinado, lo que provoca estaciones extremas." },
    { name: "neptune", orbitalPeriod: 60190, distance: 4515.0, diameter: 49244, rotationPeriod: 0.67, description: "Neptuno es el octavo y último planeta del sistema solar, conocido por su color azul intenso. Tiene un diámetro de aproximadamente 49,244 kilómetros y una masa que representa el 17.1% de la masa de Júpiter. Neptuno es un gigante gaseoso con una atmósfera compuesta principalmente de hidrógeno, helio y metano." }
  ];

  ngOnInit(): void {
    this.initThree();
    this.createStarBackground();
    this.createPlanets();
    this.createPopup();
    this.animate();
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('resize', this.onWindowResize);
  }

  ngOnDestroy(): void {
    this.animationActive = false;
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.onWindowResize);
    if (this.renderer && this.renderer.domElement) {
      document.body.removeChild(this.renderer.domElement);
    }
    if (this.popupElement) {
      document.body.removeChild(this.popupElement);
    }
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.domElement.style.position = 'fixed';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100vw';
    this.renderer.domElement.style.height = '100vh';
    document.body.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.camera.position.z = 500;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  private createStarBackground() {

    // --- Partículas de estrellas ---
    const starCount = 1000;
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];

    for (let i = 0; i < starCount; i++) {
        const radius = 2800 + Math.random() * 1800; // Distribución esférica
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 8,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.7
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
  }

  private createPlanets() {
    const lunarOrbitScale = 600; // Ajusta este valor para que todas las órbitas sean visibles pero proporcionales
    const lunarSizeScale = 24; 
    const textureLoader = new THREE.TextureLoader();
    const sizeScale = 1.5 / this.planetData[3].diameter;
    const sunRadius = this.planetData[0].diameter * sizeScale;
    const mercuryDesiredDistance = sunRadius + 1500;
    const distanceScale = mercuryDesiredDistance / this.planetData[1].distance;
    const neptuneDistance = this.planetData[8].distance * distanceScale;
    const maxVisibleDistance = 1200;
    const visibilityFactor = neptuneDistance > maxVisibleDistance ? maxVisibleDistance / neptuneDistance : 1;
    const finalDistanceScale = distanceScale * visibilityFactor;
    this.finalDistanceScale = finalDistanceScale;

    this.planetData.forEach((planet, index) => {
      const textureName = planet.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const texture = textureLoader.load(`/imgs/${textureName}.jpg`);
      let diameter = planet.diameter * sizeScale;
      if (index === 0) diameter *= 0.05; // Sol más pequeño
      const geometry = new THREE.SphereGeometry(diameter, 32, 32);
      const material = new THREE.MeshStandardMaterial({ map: texture });
      const mesh = new THREE.Mesh(geometry, material);
      const distance = planet.distance * finalDistanceScale;
      // mesh.position.x = distance;
      const planetGroup = new THREE.Group();

      planetGroup.position.x = distance;

      planetGroup.add(mesh);
      this.scene.add(planetGroup);
      this.planetObjects[planet.name] = {
        mesh: mesh,
        group: planetGroup,
        data: planet
      };
      if (planet.name === "earth") {
        planetGroup.rotation.z = -0.41;
        // Datos de la Luna
        const moonDiameter = 3474; // km
        const moonDistance = 0.384; // millones de km (384,000 km)
        // const moonDistance = 19.2; // millones de km (384,000 km)
        const moonOrbitalPeriod = 27.3; // días
        const moonTexture = textureLoader.load('/imgs/moon.jpg');
        const moonGeometry = new THREE.SphereGeometry(moonDiameter * sizeScale, 32, 32);
        const moonMaterial = new THREE.MeshStandardMaterial({ map: moonTexture });
        const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
  
        // Grupo para la órbita de la Luna alrededor de la Tierra
        const moonGroup = new THREE.Group();
        moonGroup.position.set(0, 0, 0); // Centrado respecto a la Tierra
  
        const moonDistanceScaled = moonDistance * this.finalDistanceScale * 50;
        moonMesh.position.set(moonDistanceScaled, 0, 0);
        moonGroup.add(moonMesh);
  
        // Añadir el grupo de la Luna al grupo de la Tierra
        planetGroup.add(moonGroup);
  
        // Guardar referencia para animación
        this.planetObjects["moon"] = {
          mesh: moonMesh,
          group: moonGroup,
          data: {
            name: "moon",
            orbitalPeriod: moonOrbitalPeriod,
            distance: moonDistance,
            diameter: moonDiameter,
            rotationPeriod: 27.3,
            parent: "earth"
          }
        };
      }

      // ...dentro de createPlanets()...
      if (planet.name === "mars") {
        // --- Fobos ---
        const phobosDiameter = 22.2; // km
        const phobosDistance = 0.0094; // millones de km
        const phobosOrbitalPeriod = 0.319; // días
        const phobosTexture = textureLoader.load('/imgs/phobos.jpg');
        const phobosGeometry = new THREE.SphereGeometry(phobosDiameter * sizeScale * lunarSizeScale, 32, 32);
        const phobosMaterial = new THREE.MeshStandardMaterial({ map: phobosTexture });
        const phobosMesh = new THREE.Mesh(phobosGeometry, phobosMaterial);

        const phobosGroup = new THREE.Group();
        phobosGroup.position.set(0, 0, 0);

        const phobosDistanceScaled = phobosDistance * this.finalDistanceScale * lunarOrbitScale;
        phobosMesh.position.set(phobosDistanceScaled, 0, 0);
        phobosGroup.add(phobosMesh);
        planetGroup.add(phobosGroup);

        this.planetObjects["phobos"] = {
            mesh: phobosMesh,
            group: phobosGroup,
            data: {
            name: "phobos",
            orbitalPeriod: phobosOrbitalPeriod,
            distance: phobosDistance,
            diameter: phobosDiameter,
            rotationPeriod: phobosOrbitalPeriod,
            parent: "mars"
            }
        };

        // --- Deimos ---
        const deimosDiameter = 12.6; // km
        const deimosDistance = 0.0235; // millones de km
        const deimosOrbitalPeriod = 1.263; // días
        const deimosTexture = textureLoader.load('/imgs/deimos.jpg');
        const deimosGeometry = new THREE.SphereGeometry(deimosDiameter * sizeScale * lunarSizeScale, 32, 32);
        const deimosMaterial = new THREE.MeshStandardMaterial({ map: deimosTexture });
        const deimosMesh = new THREE.Mesh(deimosGeometry, deimosMaterial);

        const deimosGroup = new THREE.Group();
        deimosGroup.position.set(0, 0, 0);

        const deimosDistanceScaled = deimosDistance * this.finalDistanceScale * lunarOrbitScale;
        deimosMesh.position.set(deimosDistanceScaled, 0, 0);
        deimosGroup.add(deimosMesh);
        planetGroup.add(deimosGroup);

        this.planetObjects["deimos"] = {
            mesh: deimosMesh,
            group: deimosGroup,
            data: {
            name: "deimos",
            orbitalPeriod: deimosOrbitalPeriod,
            distance: deimosDistance,
            diameter: deimosDiameter,
            rotationPeriod: deimosOrbitalPeriod,
            parent: "mars"
            }
        };
      }

        const mars = this.planetData.find(p => p.name === "mars");
        const haloRadius = mars ? mars.distance * this.finalDistanceScale * 1.1 : 400; // 10% más allá de Marte

        const haloGeometry = new THREE.SphereGeometry(haloRadius, 64, 64);
        const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff99,
        transparent: true,
        opacity: 0.025, // Ajusta la opacidad para que sea sutil
        side: THREE.DoubleSide
        });
        const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
        haloMesh.position.set(0, 0, 0);
        this.scene.add(haloMesh);
    });

    // Luz ambiental muy intensa
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
    this.scene.add(ambientLight);

    // Luz puntual fuerte en el centro (Sol)
    const sunLight = new THREE.PointLight(0xffffff, 4, 0, 2);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);

    // Varias luces direccionales desde diferentes ángulos
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(0, 200, 500);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight2.position.set(500, -200, -500);
    this.scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight3.position.set(-500, 200, 500);
    this.scene.add(dirLight3);

    this.setInitialPlanetPositions();
  }

  private setInitialPlanetPositions() {
    const epoch = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysSinceEpoch = (now.getTime() - epoch.getTime()) / msPerDay;

    this.planetData.forEach((planet) => {
      if (planet.name === "sun") return;
      const obj = this.planetObjects[planet.name];
      if (!obj) return;
      const orbitFraction = (daysSinceEpoch % planet.orbitalPeriod) / planet.orbitalPeriod;
      const angle = orbitFraction * 2 * Math.PI;
      const distance = planet.distance * this.finalDistanceScale;
      obj.group.position.x = Math.cos(angle) * distance;
      obj.group.position.z = Math.sin(angle) * distance;
    });
  }

  private createPopup() {
    this.popupElement = document.createElement('div');
    this.popupElement.style.position = 'fixed';
    this.popupElement.style.backgroundColor = 'rgba(30, 30, 30, 0.8)';
    this.popupElement.style.color = 'white';
    this.popupElement.style.padding = '10px 20px';
    this.popupElement.style.borderRadius = '8px';
    this.popupElement.style.fontFamily = 'Arial, sans-serif';
    this.popupElement.style.fontSize = '24px';
    this.popupElement.style.display = 'none';
    this.popupElement.style.zIndex = '1000';
    this.popupElement.style.pointerEvents = 'none';
    document.body.appendChild(this.popupElement);
  }

  private onWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onMouseMove = (event: MouseEvent) => {
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.mouse.x = (x / window.innerWidth) * 2 - 1;
    this.mouse.y = -(y / window.innerHeight) * 2 + 1;
  };

  private checkPlanetHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const planetMeshes = Object.values(this.planetObjects).map((obj: any) => obj.mesh);
    const intersects = this.raycaster.intersectObjects(planetMeshes);
    if (intersects.length > 0) {
      const intersectedMesh = intersects[0].object;
      for (const [name, obj] of Object.entries(this.planetObjects) as [string, any][]) {
        if (obj.mesh === intersectedMesh) {
          this.hoveredPlanet = name;
          this.showPopup(name);
          window.onclick = () => this.openPlanetInfo(name);
          return;
        }
      }
    } else {
      this.hidePopup();
      this.hoveredPlanet = null;
      window.onclick = null;
    }
  }

  private showPopup(planetName: string) {
    this.popupElement.textContent = planetName === "moon" ? "Soy la Luna" : planetName;
    const planetObj = this.planetObjects[planetName];
    if (planetObj) {
      const worldPosition = new THREE.Vector3();
      planetObj.mesh.getWorldPosition(worldPosition);
      const vector = worldPosition.clone().project(this.camera);
      const canvas = this.renderer.domElement;
      const rect = canvas.getBoundingClientRect();
      const x = rect.left + (vector.x + 1) / 2 * rect.width;
      const y = rect.top + (-vector.y + 1) / 2 * rect.height;
      this.popupElement.style.left = `${x}px`;
      this.popupElement.style.top = `${y - 30}px`;
      this.popupElement.style.transform = 'translate(-50%, -100%)';
      this.popupElement.style.display = 'block';
    }
  }

  private hidePopup() {
    this.popupElement.style.display = 'none';
  }

  private animate = () => {
    if (!this.animationActive) return;
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.checkPlanetHover();
    this.animatePlanets();
    this.renderer.render(this.scene, this.camera);
  };

  private startTime = Date.now();

  private animatePlanets() {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    Object.values(this.planetObjects).forEach((obj: any) => {
      if (obj.data.rotationPeriod !== 0) {
        const direction = obj.data.rotationPeriod > 0 ? 1 : -1;
        const period = Math.abs(obj.data.rotationPeriod);
        obj.mesh.rotation.y = direction * (elapsedSeconds / period) * 2 * Math.PI;
      }
      if (obj.data.orbitalPeriod !== 0 && obj.data.name !== "moon" && obj.data.name !== "sun") {
        const epoch = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
        const now = new Date(this.startTime);
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysSinceEpoch = (now.getTime() - epoch.getTime()) / msPerDay;
        const initialOrbitFraction = (daysSinceEpoch % obj.data.orbitalPeriod) / obj.data.orbitalPeriod;
        const initialAngle = initialOrbitFraction * 2 * Math.PI;
        const orbitFraction = elapsedSeconds / obj.data.orbitalPeriod;
        const angle = initialAngle + orbitFraction * 2 * Math.PI;
        const distance = obj.data.distance * this.finalDistanceScale;
        obj.group.position.x = Math.cos(angle) * distance;
        obj.group.position.z = Math.sin(angle) * distance;
      }
    });
    // Lunas
    const moonObj = this.planetObjects["moon"];
    if (moonObj) {
      const moonPeriod = moonObj.data.orbitalPeriod;
      const moonOrbitFraction = elapsedSeconds / moonPeriod;
      moonObj.group.rotation.y = moonOrbitFraction * 2 * Math.PI;
    }
    const phobosObj = this.planetObjects["phobos"];
    if (phobosObj) {
      const period = phobosObj.data.orbitalPeriod;
      const orbitFraction = elapsedSeconds / period;
      phobosObj.group.rotation.y = orbitFraction * 2 * Math.PI;
    }
    const deimosObj = this.planetObjects["deimos"];
    if (deimosObj) {
      const period = deimosObj.data.orbitalPeriod;
      const orbitFraction = elapsedSeconds / period;
      deimosObj.group.rotation.y = orbitFraction * 2 * Math.PI;
    }
  }

  public openPlanetInfo(planetName: string) {
    this.selectedPlanet = this.planetObjects[planetName]?.data;
    this.showPlanetInfo = true;
  }

  public closePlanetInfo() {
    this.showPlanetInfo = false;
    this.selectedPlanet = null;
  }

  public addToFavorites(planet: any) {
    alert(`${planet.name} agregado a favoritos!`);
  }
}