import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, signal, computed } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'lil-gui';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import * as Star from '../starmap/data/visibleStarsFormatted.json';
import * as Constellation from '../starmap/data/ConstellationLines.json';
import { Raycaster, Vector2 } from 'three';

// Icons
import {MatIconModule} from '@angular/material/icon';

// Service
import { ConstellationsService } from '../../services/constellations/constellations.service';
import { ConstellationLines } from '../../models/constellationlines';
import { Star as StarModel } from '../../models/star';
import { StarsService } from '../../services/stars/stars.service';

// Auth
import { AuthService } from '../../services/auth/auth.service';

// Favorites
import { UsersService } from '../../services/users/users.service';

// DEFINICIÓN DE INTERFACES
// Define las estructuras de datos para estrellas y constelaciones que se usarán en la aplicación

interface Star {
  x: number;
  y: number;
  z: number;
  mag: number;
  ci: number;
  hr: number;
  proper: string;
}

interface Constellation {
  count: number;
  stars: number[];
}

interface Constellations {
  [key: string]: Constellation;
}

// INICIALIZACIÓN DE DATOS
// Carga los datos de estrellas y constelaciones desde los archivos JSON importados

const visibleStars: Star[] = Star.estrellas;
const constelaciones: Constellations = Constellation.constellation;

// CONVERSIÓN DE COLOR
// Convierte el índice de color de una estrella a valores RGB para representar su color real

function bvToRgb(bv: number | null | undefined): [number, number, number] {
  // Valores por defecto en caso de que bv sea inválido
  if (bv === null || bv === undefined || isNaN(bv)) {
    return [1, 1, 1]; // Blanco por defecto
  }

  var t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));

  // t to xyY
  let x = 0, y = 0;

  if ((t >= 1667) && (t <= 4000)) {
    x =
      (-0.2661239 * Math.pow(10, 9)) / Math.pow(t, 3) +
      (-0.234358 * Math.pow(10, 6)) / Math.pow(t, 2) +
      (0.8776956 * Math.pow(10, 3)) / t +
      0.17991;
  } else if (t > 4000) {
    x =
      (-3.0258469 * Math.pow(10, 9)) / Math.pow(t, 3) +
      (2.1070379 * Math.pow(10, 6)) / Math.pow(t, 2) +
      (0.2226347 * Math.pow(10, 3)) / t +
      0.24039;
  }

  if ((t >= 1667) && (t <= 2222)) {
    y =
      -1.1063814 * Math.pow(x, 3) -
      1.3481102 * Math.pow(x, 2) +
      2.18555832 * x -
      0.20219683;
  } else if ((t > 2222) && (t <= 4000)) {
    y =
      -0.9549476 * Math.pow(x, 3) -
      1.37418593 * Math.pow(x, 2) +
      2.09137015 * x -
      0.16748867;
  } else if (t > 4000) {
    y =
      3.081758 * Math.pow(x, 3) -
      5.8733867 * Math.pow(x, 2) +
      3.75112997 * x -
      0.37001483;
  }

  // xyY to XYZ, Y = 1
  var Y = 1.0;
  var X = y == 0 ? 0 : (x * Y) / y;
  var Z = y == 0 ? 0 : ((1 - x - y) * Y) / y;

  //XYZ to rgb
  var r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  var g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  var b = 0.0557 * X - 0.204 * Y + 1.057 * Z;

  //linear RGB to sRGB
  var R = r <= 0.0031308 ? 12.92 * r : 1.055 * Math.pow(r, 1 / 0.5) - 0.055;
  var G = g <= 0.0031308 ? 12.92 * g : 1.055 * Math.pow(g, 1 / 0.5) - 0.055;
  var B = b <= 0.0031308 ? 12.92 * b : 1.055 * Math.pow(b, 1 / 0.5) - 0.055;

  return [
    Math.round(R * 255) / 255,
    Math.round(G * 255) / 255,
    Math.round(B * 255) / 255,
  ];
}

// SHADER DE VÉRTICES
// Define cómo se posicionan y dimensionan las estrellas en el espacio 3D

const vertexShader = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  uniform float starMin;
  uniform float starMax;
  uniform float starFadeDactor;
  uniform float starMinBrightnes;
  uniform bool attenuation;

  void main() {
    // PASO DE COLOR AL FRAGMENT SHADER
    // Transfiere el color del vértice al fragment shader
    vColor = color;
    
    // CÁLCULO DE POSICIÓN EN ESPACIO DE CÁMARA
    // Transforma la posición del vértice al espacio de la cámara
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float cameraDist = length(mvPosition.xyz);
    
    // CÁLCULO DE TAMAÑO DE ESTRELLA
    // Determina el tamaño base de la estrella
    float starSize = size;
    
    // ATENUACIÓN POR DISTANCIA
    // Ajusta el tamaño de la estrella según la distancia a la cámara si está habilitado
    if (attenuation) {
      starSize = size * (1.0 / cameraDist);
    }
    
    // NORMALIZACIÓN DE TAMAÑO
    // Remapea el tamaño de la estrella según los parámetros configurados
    float normalizedSize = (starSize - starMin) / (starMax - starMin);
    normalizedSize = pow(normalizedSize, starFadeDactor);
    
    // TAMAÑO MÍNIMO
    // Asegura un tamaño mínimo para las estrellas más débiles
    normalizedSize = max(normalizedSize, starMinBrightnes);
    
    // ASIGNACIÓN DE TAMAÑO Y POSICIÓN FINAL
    // Establece el tamaño del punto y su posición final en el espacio de proyección
    gl_PointSize = normalizedSize * 8.0;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// SHADER DE FRAGMENTOS
// Define cómo se colorea cada píxel de las estrellas

const fragmentShader = `
  varying vec3 vColor;

void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);

    if (dist > 0.5) discard;

    // Halo suave con núcleo intenso
    float core = smoothstep(0.2, 0.0, dist);      // núcleo brillante
    float glow = smoothstep(0.5,0.9, dist);      // halo suave

    float sparkle = pow(core, 40.0) + 0.3 * glow;   // combinación armónica

    // Color final con brillo proporcional
    gl_FragColor = vec4(vColor * sparkle, sparkle);
}

`;

// DEFINICIÓN DEL COMPONENTE
// Configura el componente Angular con sus propiedades y métodos

@Component({
  selector: 'app-starmap',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './starmap.component.html',
  styleUrl: './starmap.component.css',
  providers: [ConstellationsService, StarsService]
})
export class StarmapComponent implements OnInit, AfterViewInit {
    
    // Método para navegar a la ruta 'solar'
goToSolar() {
    // Navega a la ruta 'solar' cuando se llama a este método
    this.router.navigate(['/solar']);
}
  // REFERENCIA AL CANVAS
  // Obtiene una referencia al elemento canvas del DOM para renderizar Three.js
  @ViewChild('starCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  // PROPIEDADES DE UI
  // Controlan la visibilidad de elementos de la interfaz de usuario
  showControls = true;
  showConstellations = false;

  // Propiedades para tooltip y panel
  hoverConstellation: string | null = null;
  tooltipX: number = 0;
  tooltipY: number = 0;

  // PROPIEDADES PARA SELECCIÓN DE CONSTELACIONES
  selectedConstellation: string | null = null;
  constellationShort: string = '';
  constellationName: string = '';
  constellationDescription: string = '';
  constellationID: string = '';
  showConstellationInfo = false;

  // Is Favorite
  isFavorite = signal<boolean>(false);

  // Mapeo de constelaciones a sus descripciones
  private constellationDescriptions: {[key: string]: string} = {
    'And': 'Andromeda: The Princess Andromeda; in Greek mythology, the daughter of Cepheus and Cassiopeia and wife of Perseus.:1',
    'Ant': 'Antlia: The air pump; a southern constellation introduced by Lacaille in 1756, originally the \'pneumatic machine\'.:2',
    'Aps': 'Apus: The bird of paradise; a southern constellation introduced by Keyser & de Houtman in 1598.:3',
    'Aqr': 'Aquarius: The water bearer; in Greek mythology, Ganymede, wine-waiter to the Gods and lover of Zeus.:4',
    'Aql': 'Aquila: The eagle; in Greek mythology, the bird of Zeus and the retriever of his thunderbolts.:5',
    'Ara': 'Ara: The altar; in Greek mythology, used by the Gods to vow allegiance before their battle with the Titans.:6',
    'Ari': 'Aries: The ram; in Greek mythology, the animal whose golden fleece was recovered by Jason and the Argonauts.:7',
    'Aur': 'Auriga: The charioteer; in Greek mythology, Erichthonius, son of Vulcan, the first person to attach four horses to a chariot.:8',
    'Boo': 'Bootes: The herdsman; in Greek mythology, Arcas, son of Zeus by Callisto.:9',
    'Cae': 'Caelum: The chisel; a southern constellation introduced by Lacaille in 1756.:10',
    'Cam': 'Camelopardalis: The giraffe; a large but faint northern constellation introduced by Plancius in 1612.:11',
    'Cnc': 'Cancer: The crab; in Greek mythology, a crab which bit Hercules\'s foot.:12',
    'CVn': 'Canes Venatici: The hunting dogs; introduced by Johannes Hevelius in 1687, and said to be held by the herdsman Bootes.:13',
    'CMa': 'Canis Major: The greater dog; in Greek mythology, a hunting dog belonging to Orion, depicted pursuing the hare Lepus.:14',
    'CMi': 'Canis Minor: The lesser dog; in Greek mythology, a hunting dog belonging to Orion, depicted pursuing the hare Lepus.:15',
    'Cap': 'Capricornus: The sea goat; associated with Pan in Greek mythology, god of the countryside.:16',
    'Car': 'Carina: The keel; a sub-division of the ancient constellation Argo – in Greek mythology, the ship of the Argonauts.:17',
    'Cas': 'Cassiopeia: Queen Cassiopeia; in Greek mythology, wife of Cepheus and mother of Andromeda.:18',
    'Cen': 'Centaurus: The Centaur, half man and half horse; in Greek mythology, the wise centaur Chiron.:19',
    'Cep': 'Cepheus: King Cepheus of Aethiopia; in Greek mythology, the king of Aethiopia, descended from Zeus and Io.:20',
    'Cet': 'Cetus: The sea monster, which in Greek mythology attacked Cepheus\'s territory and Andromeda, but which was slain by Perseus.:21',
    'Cha': 'Chamaeleon: The chameleon; introduced by Keyser & de Houtman in 1598.:22',
    'Cir': 'Circinus: The pair of dividing compasses; a modern constellation introduced by Lacaille in 1756.:23',
    'Col': 'Columba: The dove; introduced by Plancius in 1592. In Biblical history, said to be the dove of Noah.:24',
    'Com': 'Coma Berenices: The hair of Queen Berenice of Egypt; introduced as a constellation by Vopel in 1536.:25',
    'CrA': 'Corona Australis: The southern crown, lying at the feet of Sagittarius, and known to the Greeks as a wreath.:26',
    'CrB': 'Corona Borealis: The northern crown; in Greek mythology, worn by the Princess Ariadne on her wedding day.:27',
    'Crv': 'Corvus: The crow; in Greek mythology, sent by Apollo in search of water.:28',
    'Crt': 'Crater: The cup; in Greek mythology, clutched by the crow Crater in its search for water.:29',
    'Cru': 'Crux: The southern cross; introduced as a constellation by Plancius in 1598.:30',
    'Cyg': 'Cygnus: The swan; in Greek mythology, Zeus in disguise.:31',
    'Del': 'Delphinus: The dolphin; in Greek mythology, the messenger of Poseidon.:32',
    'Dor': 'Dorado: The goldfish; a constellation introduced by Keyser & de Houtman in 1598.:33',
    'Dra': 'Draco: The dragon; in Greek mythology, Ladon, guard of the tree on which golden apples grew, slain by Hercules.:34',
    'Equ': 'Equuleus: The little horse; a tiny yet ancient constellation with no mythological association.:35',
    'Eri': 'Eridanus: Mythological river where Phaethon fell after losing control of the solar chariot.:36',
    'For': 'Fornax: The furnace; originally a chemist\'s distillation furnace, introduced by Lacaille in 1756.:37',
    'Gem': 'Gemini: The mythical twins Castor and Pollux.:38',
    'Gru': 'Grus: The crane; a constellation introduced by Keyser & de Houtman in 1598.:39',
    'Her': 'Hercules: Hercules, a large yet dark constellation representing the greatest hero of Greek mythology.:40',
    'Hol': 'Horologium: The pendulum clock; a modern constellation introduced by Lacaille in 1756.:41',
    'Hya': 'Hydra: The multi-headed water snake, slain by Hercules in Greek mythology.:42',
    'Hyi': 'Hydrus: The lesser water snake; introduced as a constellation by Keyser & de Houtman in 1598.:43',
    'Ind': 'Indus: The Indian; introduced as a constellation by Keyser & de Houtman in 1598.:44',
    'Lac': 'Lacerta: The lizard; introduced as a constellation by Johannes Hevelius in 1690.:45',
    'Leo': 'Leo: The lion of Nemea; in Greek mythology, a monster slain by Hercules.:46',
    'LMi': 'Leo Minor: The lion cub; introduced as a constellation by Johannes Hevelius in 1687.:47',
    'Lep': 'Lepus: The hare; often depicted being chased by Orion and his two dogs.:48',
    'Lib': 'Libra: The balance; a zodiacal constellation introduced by the Romans.:49',
    'Lup': 'Lupus: The wolf; an ancient constellation, but without mythological association.:50',
    'Lyn': 'Lynx: The lynx; a faint constellation introduced by Johannes Hevelius in 1687.:51',
    'Lyr': 'Lyre: The lyre; often said to be played by Orpheus, the greatest musician of his age.:52',
    'Men': 'Mensa: Mensa is a faint southern constellation named after Table Mountain, created by the astronomer Lacaille.:53',
    'Mic': 'Microscopium: The microscope; a modern constellation introduced by Lacaille in 1756.:54',
    'Mon': 'Monoceros: The unicorn; a constellation introduced by Plancius in 1612.:55',
    'Mus': 'Musca: The fly; a constellation introduced by Keyser & de Houtman in 1598.:56',
    'Nor': 'Norma: The set square; a modern constellation introduced by Lacaille in 1756.:57',
    'Oct': 'Octans: The octant, a navigational instrument invented in the 1730s. A modern constellation introduced by Lacaille in 1756.:58',
    'Oph': 'Ophiuchus: The serpent bearer; in Greek mythology, Asclepius, the god of medicine, depicted in the sky holding the snake Serpens.:59',
    'Ori': 'Orion: The hunter; associated in Greek mythology with a son of Poseidon, but associated by the Sumerians with their great hero Gilgamesh.:60',
    'Pav': 'Pavo: The peacock; a constellation introduced by Keyser & de Houtman in 1598.:61',
    'Peg': 'Pegasus: The winged horse; in Greek mythology, used by Zeus to carry thunder and lightning.:62',
    'Per': 'Perseus: Perseus; in Greek mythology, the husband of Andromeda, also known for slaying Medusa the Gorgon.:63',
    'Phe': 'Phoenix: The phoenix; a constellation introduced by Keyser & de Houtman in 1598.:64',
    'Pic': 'Pictor: The painter\'s easel; a modern constellation introduced by Lacaille in 1756.:65',
    'Psc': 'Pisces: Two fishes, swimming in opposite directions with their tails connected by a cord.:66',
    'PsA': 'Piscis Austrinus: The southern fish; the parent of the two fish depicted by Pisces.:67',
    'Pup': 'Puppis: The poop deck of the Argo Navis; a sub-division of the ancient constellation Argo – in Greek mythology, the ship of the Argonauts.:68',
    'Pyx': 'Pyxis: The compass; a southern constellation introduced by Lacaille in 1756.:69',
    'Ret': 'Reticulum: The net; a southern constellation introduced by Lacaille in 1756, commemorating the cross-hair in his telescope.:70',
    'Sge': 'Sagitta: The arrow; in Greek mythology, perhaps the arrow that Apollo used to kill the Cyclopes.:71',
    'Sgr': 'Sagittarius: The archer; usually drawn as a centaur – half man, half horse.:72',
    'Sco': 'Scorpius: The scorpion; said to have stung the hunter Orion to death in Greek mythology.:73',
    'Scl': 'Sculptor: The sculptor – originally, the sculptor\'s studio; a modern constellation introduced by Lacaille in 1756.:74',
    'Sct': 'Scutum: The shield; a constellation honouring King John III Sobieski of Poland – the only politically inspired constellation still in use.:75',
    'Ser1': 'Serpens Caput: The serpent\'s head; held by Ophiuchus and part of the same constellation as Serpens Cauda.:76',
    'Ser2': 'Serpens Cauda: The serpent\'s tail; held by Ophiuchus and part of the same constellation as Serpens Caput.:77',
    'Sex': 'Sextans: The sextant, a navigational instrument invented in the 1730s. A modern constellation introduced by Lacaille in 1756.:78',
    'Tau': 'Taurus: The bull; said by the Sumerians to be charging at Orion the hunter, but in Greek mythology said to be Zeus in disguise.:79',
    'Tel': 'Telescopium: The telescope; a modern constellation introduced by Lacaille in 1756.:80',
    'Tri': 'Triangulum: The triangle; appearing similar to a capital delta in the Greek alphabet.:81',
    'TrA': 'Triangulum Australe: The southern triangle; a constellation introduced by Keyser & de Houtman in 1598.:82',
    'Tuc': 'Tucana: The toucan; a constellation introduced by Keyser & de Houtman in 1598.:83',
    'UMa': 'Ursa Major: The great bear, also known as the Big Dipper or the Plough. In Greek mythology, Callisto, lover of Zeus.:84',
    'UMi': 'Ursa Minor: The lesser bear; in Greek mythology, one of the nymphs that nursed Zeus as an infant.:85',
    'Vel': 'Vela: The sail; a sub-division of the ancient constellation Argo – in Greek mythology, the ship of the Argonauts.:86',
    'Vir': 'Virgo: The virgin; in Greek mythology, the goddess of justice.:87',
    'Vol': 'Volans: The flying fish; a constellation introduced by Keyser & de Houtman in 1598, celebrating the family Exocoetidae.:88',
    'Vul': 'Vulpecula: The fox; a constellation introduced by Johannes Hevelius in 1687.:89',
  };

  // PROPIEDADES DE THREE.JS
  // Almacenan las referencias a los objetos principales de Three.js
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private stars!: THREE.Points;
  private constellationsGroup!: THREE.Group;
  private gui!: dat.GUI;
  private clock = new THREE.Clock();

  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;
  private constellationMap: Map<string, Line2[]> = new Map();
  private originalLineColors: Map<Line2, THREE.Color> = new Map();
  private highlightColor: THREE.Color = new THREE.Color(0xDAA520); // Color amarillo para resaltar

  // CONFIGURACIÓN DE VISUALIZACIÓN
  // Parámetros que controlan la apariencia de estrellas y constelaciones
  private settings = {
    earthTilt: true,
    showConstellations: false,
    constellationColor: new THREE.Color(0xd1d9e6),
    constellationLineWidth: 3,
    attenuation: false,
    starMin: 2.3,
    starMax: 13.9,
    starFadeDactor: -1.4,
    starMinBrightnes: 6.5,
  };

  visibleStars = signal<StarModel[]>([]); // Almacena las estrellas visibles
  constellationsLines = signal<ConstellationLines>({} as ConstellationLines);
  // onMouseClick: any;
  // onMouseMove: any;
  // CONSTRUCTOR
  // Inicializa el componente y sus dependencias
  constructor(public authService: AuthService, public userService: UsersService, private router: Router) { }

  // Autenticación
  isLogged = computed(() => this.authService.isAuthenticated());

  async isMyFavorite(id: number): Promise<void> {
    try{
      const data = await this.userService.isMyFavorite(id);
      this.isFavorite.set(data);
    } catch (error) {
      console.error('Error fetching user comments:', error);
    }
  }

  // INICIALIZACIÓN DEL COMPONENTE
  // Se ejecuta cuando el componente se inicializa
  async ngOnInit(): Promise<void> {

    

    // try {
    //   const constLinesData: ConstellationLines = await this.constellationsService.getConstellationLines();
    //   this.constellationsLines.set(constLinesData);
    //   const starsData: StarModel[] = await this.starService.getAll();
    //   this.visibleStars.set(starsData);
    // } catch (error) {
    //   console.error('Error inicializando catálogo:', error);
    // }
  }

  // INICIALIZACIÓN DESPUÉS DE LA VISTA
  // Se ejecuta cuando la vista del componente está lista
  ngAfterViewInit(): void {
    // Inicializar Three.js después de que la vista esté lista
    this.initThree();
  }

  // INICIALIZACIÓN DE THREE.JS
  // Configura todos los componentes necesarios para la visualización 3D
  initThree(): void {
    if (!this.canvasRef) return;

    const canvas = this.canvasRef.nativeElement;

    // CONFIGURACIÓN DEL RENDERER
    // Inicializa el renderizador WebGL con antialiasing para mejorar la calidad visual
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // CONFIGURACIÓN DE LA ESCENA
    // Crea la escena 3D y establece un fondo negro
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    //this.scene.background = new THREE.TextureLoader().load("starmap_16k.jpg");

    // CONFIGURACIÓN DE LA CÁMARA
    // Crea una cámara perspectiva con un campo de visión de 75 grados
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 50);
    this.camera.lookAt(new THREE.Vector3(0, 0, 1));

    // CONFIGURACIÓN DE CONTROLES
    // Añade controles orbitales para permitir al usuario navegar por la escena
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    // Desactivar el movimiento lateral (panneo)
    this.controls.enablePan = false;

    // INICIALIZACIÓN DEL RAYCASTER Y MOUSE
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line = { threshold: 0.5 }; // Ajustar sensibilidad para líneas
    this.mouse = new THREE.Vector2();

    // Configurar límites de zoom
    this.controls.minDistance = 1; // Distancia mínima de zoom (más cerca)
    this.controls.maxDistance = 180; // Distancia máxima de zoom (más lejos)

    // CREACIÓN DE ESTRELLAS
    // Genera las estrellas en la escena basadas en los datos cargados
    this.createStars();

    // CONFIGURACIÓN DE GUI
    // Configura la interfaz gráfica para ajustar parámetros
    this.setupGUI();

    // MANEJO DE REDIMENSIONAMIENTO
    // Añade un listener para ajustar la visualización cuando cambia el tamaño de la ventana
    window.addEventListener('resize', () => this.onWindowResize());

    // MANEJO DE EVENTOS DEL RATÓN
    canvas.addEventListener('click', (event) => this.onMouseClick(event));
    canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));

    // INICIO DE ANIMACIÓN
    // Comienza el bucle de renderizado
    this.animate();
  }

  // CREACIÓN DE ESTRELLAS
  // Genera la geometría, material y objetos para representar las estrellas
  createStars(): void {
    // CREACIÓN DE GEOMETRÍA
    // Inicializa la geometría para las estrellas como puntos en el espacio 3D
    const geometry = new THREE.BufferGeometry();
    const count = visibleStars.length;

    // CREACIÓN DE BUFFERS
    // Crea arrays para almacenar posiciones, tamaños y colores de las estrellas
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    // ASIGNACIÓN DE DATOS
    // Recorre todas las estrellas y asigna sus propiedades a los buffers
    for (let i = 0, j = 0; i < count * 3; i += 3, j++) {
      positions[i] = visibleStars[j].x;
      positions[i + 1] = visibleStars[j].y;
      positions[i + 2] = visibleStars[j].z;

      sizes[j] = visibleStars[j].mag;

      const starColorRGB = bvToRgb(visibleStars[j].ci);
      colors[i] = starColorRGB[0];
      colors[i + 1] = starColorRGB[1];
      colors[i + 2] = starColorRGB[2];
    }

    // ASIGNACIÓN DE ATRIBUTOS
    // Vincula los buffers a atributos de la geometría para su uso en los shaders
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // CREACIÓN DE MATERIAL
    // Crea un material con shaders personalizados para renderizar las estrellas
    const material = new THREE.ShaderMaterial({
      uniforms: {
        attenuation: { value: this.settings.attenuation },
        starMin: { value: this.settings.starMin },
        starMax: { value: this.settings.starMax },
        starMinBrightnes: { value: this.settings.starMinBrightnes },
        starFadeDactor: { value: this.settings.starFadeDactor },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: false,
    });

    // CREACIÓN DE PUNTOS
    // Crea un objeto Points que combina la geometría y el material
    this.stars = new THREE.Points(geometry, material);

    // APLICACIÓN DE INCLINACIÓN
    // Aplica la inclinación del eje terrestre si está habilitada
    if (this.settings.earthTilt) {
      this.stars.quaternion.setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        (Math.PI / 180) * 23.5
      );
    }

    // CREACIÓN DE CONSTELACIONES
    // Genera las líneas que representan las constelaciones
    this.createConstellations();

    // ADICIÓN A LA ESCENA
    // Añade las estrellas a la escena para su visualización
    this.scene.add(this.stars);
  }

  // CREACIÓN DE CONSTELACIONES
  // Genera las líneas que conectan estrellas para formar constelaciones
  createConstellations(): void {
    // INICIALIZACIÓN DEL GRUPO
    // Crea un grupo para contener todas las líneas de constelaciones
    this.constellationsGroup = new THREE.Group();
    this.constellationsGroup.visible = this.settings.showConstellations;

    // OBTENCIÓN DE CONSTELACIONES
    // Obtiene las claves de todas las constelaciones disponibles
    const constellationKeys = Object.keys(constelaciones);

    // PROCESAMIENTO DE CONSTELACIONES
    // Recorre cada constelación para crear sus líneas
    for (const id of constellationKeys) {
      const constellation = constelaciones[id];
      const starIds = constellation.stars;
      const constellationLines: Line2[] = [];

      // CREACIÓN DE LÍNEAS
      // Crea líneas entre pares consecutivos de estrellas en cada constelación
      for (let i = 0; i < starIds.length - 1; i++) {
        const currentStarId = starIds[i];
        const nextStarId = starIds[i + 1];

        // BÚSQUEDA DE ESTRELLAS
        // Busca las estrellas por su identificador HR
        const currentStar = visibleStars.find(star => star.hr === currentStarId);
        const nextStar = visibleStars.find(star => star.hr === nextStarId);

        // CREACIÓN DE LÍNEA
        // Si ambas estrellas existen, crea una línea entre ellas
        if (currentStar && nextStar) {
          // GEOMETRÍA DE LÍNEA
          // Crea la geometría para la línea con las posiciones de las estrellas
          const geometry = new LineGeometry();
          geometry.setPositions([
            currentStar.x, currentStar.y, currentStar.z,
            nextStar.x, nextStar.y, nextStar.z
          ]);

          // MATERIAL DE LÍNEA
          // Crea un material para la línea con el color y grosor configurados
          const material = new LineMaterial({
            color: this.settings.constellationColor,
            linewidth: this.settings.constellationLineWidth,
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
          });

          // CREACIÓN DE OBJETO LÍNEA
          // Crea un objeto Line2 que combina la geometría y el material
          const line = new Line2(geometry, material);
          line.userData = { constellationId: id }; // Guardar el ID de la constelación en userData
          this.constellationsGroup.add(line);
          constellationLines.push(line);
          this.originalLineColors.set(line, material.color.clone());
        }
      }
      // Guardar todas las líneas asociadas a esta constelación
      if (constellationLines.length > 0) {
        this.constellationMap.set(id, constellationLines);
      }
    }

    // APLICACIÓN DE ROTACIÓN
    // Aplica la misma rotación que tienen las estrellas para mantener la coherencia
    if (this.settings.earthTilt) {
      this.constellationsGroup.quaternion.setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        (Math.PI / 180) * 23.5
      );
    }

    // ADICIÓN A LA ESCENA
    // Añade el grupo de constelaciones a la escena
    this.scene.add(this.constellationsGroup);
  }

  // CONFIGURACIÓN DE GUI
  // Configura la interfaz gráfica para ajustar parámetros de visualización
  setupGUI(): void {
    // INICIALIZACIÓN DE GUI
    // Crea una nueva instancia de la interfaz gráfica
    this.gui = new dat.GUI();
    const starsFolder = this.gui.addFolder('Estrellas');

    // CONTROL DE VISIBILIDAD DE CONSTELACIONES
    // Añade un control para mostrar/ocultar las constelaciones
    starsFolder.add(this.settings, 'showConstellations').onChange((value: boolean) => {
      if (this.constellationsGroup) {
        this.constellationsGroup.visible = value;
        this.showConstellations = value;
      }
    });

    // CONTROL DE GROSOR DE LÍNEAS
    // Añade un control para ajustar el grosor de las líneas de constelaciones
    starsFolder.add(this.settings, 'constellationLineWidth', 0.0, 20.0, 1).onChange((value: number) => {
      if (this.constellationsGroup) {
        for (const line of this.constellationsGroup.children) {
          (line as Line2).material.linewidth = value;
        }
      }
    });

    // CONTROL DE COLOR DE CONSTELACIONES
    // Añade un control para cambiar el color de las líneas de constelaciones
    starsFolder.addColor(this.settings, 'constellationColor').onChange((value: THREE.Color) => {
      if (this.constellationsGroup) {
        for (const line of this.constellationsGroup.children) {
          (line as Line2).material.color = value;
        }
      }
    });

    // CONTROLES DE APARIENCIA DE ESTRELLAS
    // Añade controles para ajustar varios parámetros de visualización de estrellas
    starsFolder.add(this.settings, 'attenuation').onChange(() => this.updateUniforms());
    starsFolder.add(this.settings, 'starMin', 0.0, 20.0, 0.1).onChange(() => this.updateUniforms());
    starsFolder.add(this.settings, 'starMax', 0.0, 40.0, 0.1).onChange(() => this.updateUniforms());
    starsFolder.add(this.settings, 'starFadeDactor', -1.4, 6.5, 0.1).onChange(() => this.updateUniforms());
    starsFolder.add(this.settings, 'starMinBrightnes', -1.4, 6.5, 0.01).onChange(() => this.updateUniforms());

    // OCULTACIÓN INICIAL
    // Oculta la GUI por defecto
    this.gui.hide();
  }

  // ACTUALIZACIÓN DE UNIFORMES
  // Actualiza los valores uniformes en el shader cuando cambian los ajustes
  updateUniforms(): void {
    // VERIFICACIÓN DE MATERIAL
    // Comprueba que las estrellas y su material existen
    if (this.stars && this.stars.material) {
      // ACTUALIZACIÓN DE VALORES
      // Actualiza los valores uniformes en el shader con los valores actuales de configuración
      const material = this.stars.material as THREE.ShaderMaterial;
      material.uniforms['attenuation'].value = this.settings.attenuation;
      material.uniforms['starMin'].value = this.settings.starMin;
      material.uniforms['starMax'].value = this.settings.starMax;
      material.uniforms['starFadeDactor'].value = this.settings.starFadeDactor;
      material.uniforms['starMinBrightnes'].value = this.settings.starMinBrightnes;
      material.uniformsNeedUpdate = true;
    }
  }

  // MANEJO DE REDIMENSIONAMIENTO
  // Ajusta la visualización cuando cambia el tamaño de la ventana
  onWindowResize(): void {
    // VERIFICACIÓN DE COMPONENTES
    // Comprueba que la cámara y el renderer existen
    if (this.camera && this.renderer) {
      // ACTUALIZACIÓN DE CÁMARA
      // Actualiza la relación de aspecto y la matriz de proyección de la cámara
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      // ACTUALIZACIÓN DE RESOLUCIÓN DE LÍNEAS
      // Actualiza la resolución de las líneas de constelaciones
      if (this.constellationsGroup) {
        for (const line of this.constellationsGroup.children) {
          (line as Line2).material.resolution.set(window.innerWidth, window.innerHeight);
        }
      }
    }
  }

  // MANEJO DE EVENTOS DEL RATÓN
  onMouseMove(event: MouseEvent): void {
    // Solo procesar si las constelaciones están visibles
    if (!this.constellationsGroup || !this.constellationsGroup.visible) {
      this.hoverConstellation = null;
      return;
    }
    
    // Calcular posición normalizada del ratón
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Detectar intersecciones con el raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.constellationsGroup.children, true);
    
    // Actualizar el cursor y tooltip si está sobre una constelación
    if (intersects.length > 0) {
      document.body.style.cursor = 'pointer';
      const selectedObject = intersects[0].object as THREE.Object3D;
      if (selectedObject.userData && selectedObject.userData['constellationId']) {
        console.log(selectedObject.userData['constellationId']);
        this.constellationShort = selectedObject.userData['constellationId'].substring(0, 3) == 'Ser'? selectedObject.userData['constellationId'] : selectedObject.userData['constellationId'].substring(0, 3);
        this.hoverConstellation = this.constellationDescriptions[this.constellationShort].split(':')[0];
        // Posicionar el tooltip cerca del cursor
        this.tooltipX = event.clientX;
        this.tooltipY = event.clientY + 20; // Desplazamiento para que no tape el cursor
      }
    } else {
      document.body.style.cursor = 'default';
      this.hoverConstellation = null;
    }
    // Actualizar el cursor si está sobre una constelación
    //this.updateCursor();
  }
  
  onMouseClick(event: MouseEvent): void {
    // Solo procesar si las constelaciones están visibles
    if (!this.constellationsGroup || !this.constellationsGroup.visible) return;
    
    // Calcular posición normalizada del ratón
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Detectar intersecciones con el raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.constellationsGroup.children, true);
    
    // Si hay intersecciones, seleccionar la constelación
    if (intersects.length > 0) {
      const selectedObject = intersects[0].object as THREE.Object3D;
      if (selectedObject.userData && selectedObject.userData['constellationId']) {
        this.selectConstellation(selectedObject.userData['constellationId']);
      }
    }
    // else {
    //   // Si se hace clic en el espacio vacío, deseleccionar la constelación actual
    //   this.deselectConstellation();
    // }
  }
  
  updateCursor(): void {
    // Detectar intersecciones con el raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.constellationsGroup.children, true);
    
    // Cambiar el cursor según si está sobre una constelación o no
    if (intersects.length > 0) {
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = 'default';
    }
  }
  
  selectConstellation(constellationId: string): void {
    // Si ya está seleccionada esta constelación, no hacer nada
    if (this.selectedConstellation === constellationId) return;
    
    // Deseleccionar la constelación anterior si existe
    if (this.selectedConstellation) {
      this.resetConstellationHighlight();
    }
    
    // Marcar la nueva constelación como seleccionada
    this.constellationShort = constellationId.substring(0, 3) == 'Ser'? constellationId : constellationId.substring(0, 3);

    const constName = this.constellationDescriptions[this.constellationShort]
    .split(':')[0];
    this.constellationName = constName;
    this.selectedConstellation = constellationId;
    
    
    // Resaltar las líneas de la constelación seleccionada
    const lines = this.constellationMap.get(constellationId);
    if (lines) {
      lines.forEach(line => {
        (line.material as LineMaterial).color = this.highlightColor;
        (line.material as LineMaterial).linewidth = this.settings.constellationLineWidth * 2;
      });
    }

    // Mostrar la descripción de la constelación
    if (this.constellationDescriptions[this.constellationShort]) {
      this.constellationDescription = this.constellationDescriptions[this.constellationShort].split(':')[1];
      this.constellationID = this.constellationDescriptions[this.constellationShort].split(':')[2];

      console.log(this.isFavorite);
      this.isMyFavorite(parseInt(this.constellationID));
    } else {
      // Si no existe, mostrar un mensaje genérico
      this.constellationDescription = `Constelación ${constellationId}: No hay descripción disponible.`;
      this.constellationID = `Constelación ${constellationId}: No hay descripción disponible.`;
      console.log(`No se encontró descripción para la constelación: ${constellationId}`);
      console.log(`No se encontró id de la constelación: ${constellationId}`);
      // Imprimir las claves disponibles para depuración
      console.log('Claves disponibles:', Object.keys(this.constellationDescriptions));
    }

    this.showConstellationInfo = true;

    // LOG
    console.log(`Constelación ${constellationId} seleccionada.`);
    const descripcionAndromeda = this.constellationDescriptions['AND'];
    console.log(descripcionAndromeda);
    console.log("CD[]:" +this.constellationDescriptions[constellationId]);
  }
  
  deselectConstellation(): void {
    // Si no hay constelación seleccionada, no hacer nada
    if (!this.selectedConstellation) return;
    
    // Restaurar el color original de las líneas
    this.resetConstellationHighlight();
    
    // Limpiar la selección
    this.selectedConstellation = null;
    this.showConstellationInfo = false;
  }
  
  resetConstellationHighlight(): void {
    if (!this.selectedConstellation) return;
    
    const lines = this.constellationMap.get(this.selectedConstellation);
    if (lines) {
      lines.forEach(line => {
        const originalColor = this.originalLineColors.get(line);
        if (originalColor) {
          (line.material as LineMaterial).color = originalColor;
        }
        (line.material as LineMaterial).linewidth = this.settings.constellationLineWidth;
      });
    }
  }
  
  async addToFavorites(): Promise<void>  {
    console.log(this.isFavorite());
    if (this.selectedConstellation) {
      if (this.isFavorite()) {
        await this.userService.deleteFavorite(parseInt(this.constellationID));
      } else {
        await this.userService.addFavorite(parseInt(this.constellationID));
      }
      await this.isMyFavorite(parseInt(this.constellationID));
    }
  }

  // BUCLE DE ANIMACIÓN
  // Ejecuta el bucle de renderizado continuo
  animate(): void {
    // PROGRAMACIÓN DEL SIGUIENTE FRAME
    // Solicita el siguiente frame de animación
    requestAnimationFrame(() => this.animate());

    // ACTUALIZACIÓN DE CONTROLES
    // Actualiza los controles orbitales si existen
    if (this.controls) {
      this.controls.update();
    }

    // RENDERIZADO DE ESCENA
    // Renderiza la escena con la cámara actual
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // MÉTODOS DE INTERFAZ DE USUARIO
  // Controlan la interacción del usuario con la interfaz

  // ALTERNAR CONSTELACIONES
  // Muestra u oculta las constelaciones
  toggleConstellations(): void {
    this.showConstellations = !this.showConstellations;
    if (this.constellationsGroup) {
      this.constellationsGroup.visible = this.showConstellations;
    }
  }

  // OCULTAR CONTROLES
  // Oculta los controles de la interfaz
  toggleControls(): void {
    this.showControls = false;
  }

  // MOSTRAR CONTROLES
  // Muestra los controles de la interfaz
  showControlsAgain(): void {
    this.showControls = true;
  }

  // LIMPIEZA DE RECURSOS
  // Libera recursos cuando el componente se destruye
  ngOnDestroy(): void {
    // DESTRUCCIÓN DE GUI
    // Elimina la interfaz gráfica
    if (this.gui) {
      this.gui.destroy();
    }

    // ELIMINACIÓN DE LISTENERS
    // Elimina el listener de redimensionamiento
    window.removeEventListener('resize', () => this.onWindowResize());

    // LIBERACIÓN DE RENDERER
    // Libera los recursos del renderer
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}