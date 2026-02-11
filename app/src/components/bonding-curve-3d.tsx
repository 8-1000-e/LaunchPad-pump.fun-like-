"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const VISIBLE_POINTS = 70;
const INITIAL_POINTS = 35;
const GRAD_PRICE = 85;
const POINT_SPACING = 0.15;

const COL_GOLD = 0xc9a84c;
const COL_BRIGHT = 0xdbb85e;
const COL_DIM = 0x8a7034;
const COL_AMBER = 0xf59e0b;
const COL_RED = 0xef4444;
const COL_GRID = 0x2e2b28;
const BOTTOM_Y = -1.5;

/* ─────────────────────────────────────────────
   Tube Shader
   ───────────────────────────────────────────── */

const tubeVS = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const tubeFS = `
  uniform vec3 uColor;
  uniform vec3 uBright;
  uniform vec3 uSellColor;
  uniform float uTime;
  uniform float uPulsePos;
  uniform float uPulseIntensity;
  uniform float uIsSell;
  uniform float uMoveIntensity;

  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vec3 base = mix(uColor * 0.8, uBright, vUv.x);
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 1.8);
    base += uBright * fresnel * 1.4;

    float pulseWidth = 0.12 + uMoveIntensity * 0.1;
    float pulseDist = abs(vUv.x - uPulsePos);
    float pulse = smoothstep(pulseWidth, 0.0, pulseDist) * uPulseIntensity;
    vec3 pulseColor = mix(uBright, uSellColor, uIsSell);
    base += pulseColor * pulse * 4.5;

    base += uBright * uMoveIntensity * 0.6;

    float shimmer = sin(vUv.x * 30.0 + uTime * 3.0) * 0.04 + 0.96;
    base *= shimmer;

    float emit = 2.0 + fresnel * 1.2 + pulse * 3.5 + uMoveIntensity * 1.0;
    gl_FragColor = vec4(base * emit, 1.0);
  }
`;

/* ─────────────────────────────────────────────
   Area fill shader (gradient under curve)
   ───────────────────────────────────────────── */

const areaVS = `
  uniform float uBottomY;
  varying float vFade;
  void main() {
    vFade = max(0.0, (position.y - uBottomY) / 5.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const areaFS = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;
  void main() {
    float alpha = pow(vFade, 1.3) * uOpacity;
    gl_FragColor = vec4(uColor * 1.2, alpha);
  }
`;

/* ─────────────────────────────────────────────
   Price types & simulation
   ───────────────────────────────────────────── */

interface PricePoint {
  price: number;
  isSell: boolean;
  amplitude: number;
  x: number;
}

function initHistory(): PricePoint[] {
  const pts: PricePoint[] = [];
  let price = 2;
  let x = 0;
  for (let i = 0; i < INITIAL_POINTS; i++) {
    const delta = 0.5 + Math.random() * 2 + (Math.random() - 0.4) * 2.5;
    price = Math.max(0.5, price + delta);
    pts.push({ price, isSell: false, amplitude: Math.abs(delta) / 15, x });
    x += POINT_SPACING;
  }
  return pts;
}

function simulateTrade(history: PricePoint[]): {
  delta: number;
  isSell: boolean;
} {
  const last = history[history.length - 1];
  const progress = Math.min(1, last ? last.price / GRAD_PRICE : 0);
  const rand = Math.random();

  let delta: number;
  let isSell = false;

  if (rand < 0.03) {
    delta = 6 + Math.random() * 8;
  } else if (rand < 0.08) {
    delta = -(3 + Math.random() * 5);
    isSell = true;
  } else if (rand < 0.25) {
    delta = -(0.5 + Math.random() * 2);
    isSell = true;
  } else if (rand < 0.42) {
    delta = (Math.random() - 0.48) * 1.5;
    isSell = delta < 0;
  } else {
    delta = 0.5 + Math.random() * 2.5;
  }

  // Gentle upward bias, capped at progress=1 (graduation)
  delta += progress * 1.2;
  return { delta, isSell };
}

/* ─────────────────────────────────────────────
   Build 3D points
   ───────────────────────────────────────────── */

function buildCurvePoints(
  visible: PricePoint[],
  minP: number,
  range: number,
): THREE.Vector3[] {
  if (visible.length < 2) return [];
  return visible.map((h) =>
    new THREE.Vector3(
      h.x,
      ((h.price - minP) / range) * 4.5 + BOTTOM_Y,
      0,
    ),
  );
}

/* ─────────────────────────────────────────────
   Area fill geometry (triangle strip under curve)
   ───────────────────────────────────────────── */

function createAreaFillGeo(
  points: THREE.Vector3[],
  bottomY: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    positions.push(p.x, p.y, p.z - 0.1); // top vertex (on curve)
    positions.push(p.x, bottomY, p.z - 0.1); // bottom vertex

    if (i < points.length - 1) {
      const tl = i * 2;
      const bl = i * 2 + 1;
      const tr = (i + 1) * 2;
      const br = (i + 1) * 2 + 1;
      indices.push(tl, bl, tr, bl, br, tr);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geo.setIndex(indices);
  return geo;
}

/* ─────────────────────────────────────────────
   Grid
   ───────────────────────────────────────────── */

function createGrid(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({
    color: COL_GRID,
    transparent: true,
    opacity: 0.2,
  });

  for (let i = 0; i <= 6; i++) {
    const y = (i / 6) * 4.5 + BOTTOM_Y;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([-25, y, -0.5, 25, y, -0.5], 3),
    );
    group.add(new THREE.LineSegments(geo, mat));
  }

  for (let i = -28; i <= 28; i++) {
    const x = i * 0.9;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([x, BOTTOM_Y, -0.5, x, 3, -0.5], 3),
    );
    group.add(new THREE.LineSegments(geo, mat));
  }

  return group;
}

/* ─────────────────────────────────────────────
   Threshold dashed line
   ───────────────────────────────────────────── */

function createThresholdLine(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({
    color: COL_AMBER,
    transparent: true,
    opacity: 0.4,
  });

  const segs = 60;
  for (let i = 0; i < segs; i += 2) {
    const x1 = -25 + (i / segs) * 50;
    const x2 = -25 + ((i + 1) / segs) * 50;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([x1, 0, -0.4, x2, 0, -0.4], 3),
    );
    group.add(new THREE.LineSegments(geo, mat));
  }

  return group;
}

/* ─────────────────────────────────────────────
   Explosion particles
   ───────────────────────────────────────────── */

const EXPLOSION_COUNT = 80;

interface Explosion {
  mesh: THREE.InstancedMesh;
  velocities: THREE.Vector3[];
  life: number;
}

function createExplosion(origin: THREE.Vector3): Explosion {
  const geo = new THREE.IcosahedronGeometry(0.04, 1);
  const mat = new THREE.MeshBasicMaterial({ color: COL_AMBER });
  const mesh = new THREE.InstancedMesh(geo, mat, EXPLOSION_COUNT);
  const vels: THREE.Vector3[] = [];
  const dummy = new THREE.Object3D();

  for (let i = 0; i < EXPLOSION_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const spd = 3 + Math.random() * 5;
    vels.push(
      new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * spd,
        Math.abs(Math.sin(phi) * Math.sin(theta)) * spd + 2,
        Math.cos(phi) * spd * 0.3,
      ),
    );
    dummy.position.copy(origin);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return { mesh, velocities: vels, life: 0 };
}

function updateExplosion(exp: Explosion, dt: number): boolean {
  exp.life += dt;
  if (exp.life > 2) return true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < EXPLOSION_COUNT; i++) {
    const v = exp.velocities[i];
    v.y -= 7 * dt;
    exp.mesh.getMatrixAt(i, dummy.matrix);
    dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
    dummy.position.add(v.clone().multiplyScalar(dt));
    dummy.scale.setScalar(Math.max(0, 1 - exp.life / 2));
    dummy.updateMatrix();
    exp.mesh.setMatrixAt(i, dummy.matrix);
  }
  exp.mesh.instanceMatrix.needsUpdate = true;
  return false;
}

/* ─────────────────────────────────────────────
   Whale sparks
   ───────────────────────────────────────────── */

const SPARK_COUNT = 15;

interface SparkBurst {
  mesh: THREE.InstancedMesh;
  velocities: THREE.Vector3[];
  life: number;
}

function createSparkBurst(origin: THREE.Vector3): SparkBurst {
  const geo = new THREE.SphereGeometry(0.02, 4, 4);
  const mat = new THREE.MeshBasicMaterial({
    color: COL_BRIGHT,
    transparent: true,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, SPARK_COUNT);
  const vels: THREE.Vector3[] = [];
  const dummy = new THREE.Object3D();

  for (let i = 0; i < SPARK_COUNT; i++) {
    vels.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        2 + Math.random() * 4,
        (Math.random() - 0.5) * 0.5,
      ),
    );
    dummy.position.copy(origin);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return { mesh, velocities: vels, life: 0 };
}

function updateSparkBurst(spark: SparkBurst, dt: number): boolean {
  spark.life += dt;
  if (spark.life > 1.2) return true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < SPARK_COUNT; i++) {
    const v = spark.velocities[i];
    v.y -= 5 * dt;
    spark.mesh.getMatrixAt(i, dummy.matrix);
    dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
    dummy.position.add(v.clone().multiplyScalar(dt));
    dummy.scale.setScalar(Math.max(0, 1 - spark.life / 1.2));
    dummy.updateMatrix();
    spark.mesh.setMatrixAt(i, dummy.matrix);
  }
  spark.mesh.instanceMatrix.needsUpdate = true;
  return false;
}

/* ─────────────────────────────────────────────
   Speed lines (manga-style on whale buys)
   ───────────────────────────────────────────── */

interface SpeedLineSet {
  lines: THREE.Line[];
  life: number;
}

function createSpeedLines(origin: THREE.Vector3): SpeedLineSet {
  const lines: THREE.Line[] = [];
  const count = 3 + Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i++) {
    const angle = 0.2 + Math.random() * 0.8; // upper-right direction
    const length = 0.4 + Math.random() * 0.6;
    const end = new THREE.Vector3(
      origin.x + Math.cos(angle) * length,
      origin.y + Math.sin(angle) * length,
      origin.z + 0.05,
    );

    const geo = new THREE.BufferGeometry().setFromPoints([
      origin.clone().setZ(origin.z + 0.05),
      end,
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: COL_BRIGHT,
      transparent: true,
      opacity: 0.9,
    });
    lines.push(new THREE.Line(geo, mat));
  }

  return { lines, life: 0 };
}

function updateSpeedLines(sl: SpeedLineSet, dt: number): boolean {
  sl.life += dt;
  if (sl.life > 0.5) return true;
  const opacity = 0.9 * (1 - sl.life / 0.5);
  sl.lines.forEach((line) => {
    (line.material as THREE.LineBasicMaterial).opacity = opacity;
  });
  return false;
}

/* ─────────────────────────────────────────────
   Gold dust
   ───────────────────────────────────────────── */

const DUST_COUNT = 100;

function createDust(): {
  mesh: THREE.InstancedMesh;
  data: { pos: THREE.Vector3; vel: THREE.Vector3 }[];
} {
  const geo = new THREE.SphereGeometry(0.035, 5, 5);
  const mat = new THREE.MeshBasicMaterial({
    color: COL_GOLD,
    transparent: true,
    opacity: 0.7,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, DUST_COUNT);
  const data: { pos: THREE.Vector3; vel: THREE.Vector3 }[] = [];
  const dummy = new THREE.Object3D();

  for (let i = 0; i < DUST_COUNT; i++) {
    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * 24,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 3 - 0.5,
    );
    data.push({
      pos,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
        0,
      ),
    });
    dummy.position.copy(pos);
    dummy.scale.setScalar(0.5 + Math.random() * 1.0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return { mesh, data };
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function disposeMesh(scene: THREE.Scene, mesh: THREE.Mesh | null) {
  if (!mesh) return;
  scene.remove(mesh);
  mesh.geometry.dispose();
}

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */

export function BondingCurve3D({
  onPriceUpdate,
}: {
  onPriceUpdate: (price: number, isSell: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // ── Renderer (transparent) ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ── Scene & Camera (wider FOV, closer) ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 80);
    const baseCamZ = 5;
    camera.position.set(0, 0.5, baseCamZ);

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    const light1 = new THREE.PointLight(COL_GOLD, 4, 30);
    light1.position.set(0, 3, 4);
    scene.add(light1);
    const light2 = new THREE.PointLight(COL_DIM, 2, 20);
    light2.position.set(-5, 0, 3);
    scene.add(light2);
    const light3 = new THREE.PointLight(COL_BRIGHT, 1.5, 20);
    light3.position.set(5, 1, 3);
    scene.add(light3);

    // Flash light (whale buy pulse)
    const flashLight = new THREE.PointLight(COL_BRIGHT, 0, 12);
    scene.add(flashLight);
    let flashIntensity = 0;

    // ── Static elements ──
    const gridGroup = createGrid();
    scene.add(gridGroup);
    const thresholdGroup = createThresholdLine();
    scene.add(thresholdGroup);
    const dust = createDust();
    scene.add(dust.mesh);

    const tipSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshBasicMaterial({ color: COL_BRIGHT }),
    );
    scene.add(tipSphere);
    tipSphere.visible = false;

    // ── Materials ──
    const tubeMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(COL_GOLD) },
        uBright: { value: new THREE.Color(COL_BRIGHT) },
        uSellColor: { value: new THREE.Color(COL_RED) },
        uTime: { value: 0 },
        uPulsePos: { value: -1 },
        uPulseIntensity: { value: 0 },
        uIsSell: { value: 0 },
        uMoveIntensity: { value: 0 },
      },
      vertexShader: tubeVS,
      fragmentShader: tubeFS,
      side: THREE.DoubleSide,
    });

    const glowMat = new THREE.MeshBasicMaterial({
      color: COL_GOLD,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const areaMat = new THREE.ShaderMaterial({
      uniforms: {
        uBottomY: { value: BOTTOM_Y },
        uColor: { value: new THREE.Color(COL_GOLD) },
        uOpacity: { value: 0.25 },
      },
      vertexShader: areaVS,
      fragmentShader: areaFS,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const reflectTubeMat = new THREE.MeshBasicMaterial({
      color: COL_GOLD,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const reflectAreaMat = new THREE.ShaderMaterial({
      uniforms: {
        uBottomY: { value: -3.0 },
        uColor: { value: new THREE.Color(COL_GOLD) },
        uOpacity: { value: 0.06 },
      },
      vertexShader: areaVS,
      fragmentShader: areaFS,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // ── Dynamic mesh state ──
    let history = initHistory();
    let tubeMesh: THREE.Mesh | null = null;
    let glowTubeMesh: THREE.Mesh | null = null;
    let areaFillMesh: THREE.Mesh | null = null;
    let reflectTubeMesh: THREE.Mesh | null = null;
    let reflectAreaMesh: THREE.Mesh | null = null;
    let graduated = false;
    let explosions: Explosion[] = [];
    let sparkBursts: SparkBurst[] = [];
    let speedLineSets: SpeedLineSet[] = [];
    let pulsePos = -1;
    let pulseIntensity = 0;
    let pulseIsSell = false;
    let moveIntensity = 0;
    let scrollFactor = 0;
    let targetCamX = 0;
    let targetCamY = 0.5;

    // Mouse parallax state
    let mouseX = 0.5;
    let mouseY = 0.5;
    let camRotX = 0;
    let camRotY = 0;

    function rebuildCurve() {
      // Dispose old meshes
      disposeMesh(scene, tubeMesh);
      disposeMesh(scene, glowTubeMesh);
      disposeMesh(scene, areaFillMesh);
      disposeMesh(scene, reflectTubeMesh);
      disposeMesh(scene, reflectAreaMesh);
      tubeMesh = null;
      glowTubeMesh = null;
      areaFillMesh = null;
      reflectTubeMesh = null;
      reflectAreaMesh = null;

      const visible = history.slice(-VISIBLE_POINTS);
      const prices = visible.map((h) => h.price);
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const range = Math.max(maxP - minP, 5); // minimum range to avoid flat line
      const pts = buildCurvePoints(visible, minP, range);
      if (pts.length < 2) return;

      const curve = new THREE.CatmullRomCurve3(
        pts,
        false,
        "catmullrom",
        0.35,
      );
      const segs = Math.max(40, pts.length * 5);

      // ── Main tube ──
      const tubeGeo = new THREE.TubeGeometry(curve, segs, 0.04, 6, false);
      tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      scene.add(tubeMesh);

      // ── Glow tube (larger, transparent halo) ──
      const glowGeo = new THREE.TubeGeometry(
        curve,
        Math.max(20, pts.length * 2),
        0.2,
        8,
        false,
      );
      glowTubeMesh = new THREE.Mesh(glowGeo, glowMat);
      scene.add(glowTubeMesh);

      // ── Area fill ──
      const areaGeo = createAreaFillGeo(pts, BOTTOM_Y);
      areaFillMesh = new THREE.Mesh(areaGeo, areaMat);
      scene.add(areaFillMesh);

      // ── Mirror reflection ──
      const reflectPts = pts.map(
        (p) =>
          new THREE.Vector3(
            p.x,
            BOTTOM_Y - (p.y - BOTTOM_Y) * 0.2, // mirror + compress
            p.z,
          ),
      );

      if (reflectPts.length >= 2) {
        const rCurve = new THREE.CatmullRomCurve3(
          reflectPts,
          false,
          "catmullrom",
          0.35,
        );
        const rGeo = new THREE.TubeGeometry(
          rCurve,
          Math.max(20, reflectPts.length * 2),
          0.03,
          4,
          false,
        );
        reflectTubeMesh = new THREE.Mesh(rGeo, reflectTubeMat);
        scene.add(reflectTubeMesh);

        const rAreaGeo = createAreaFillGeo(reflectPts, BOTTOM_Y - 1.2);
        reflectAreaMesh = new THREE.Mesh(rAreaGeo, reflectAreaMat);
        scene.add(reflectAreaMesh);
      }

      // ── Threshold y ──
      const thresholdInRange =
        GRAD_PRICE >= minP && GRAD_PRICE <= maxP;
      thresholdGroup.visible = thresholdInRange;
      if (thresholdInRange) {
        thresholdGroup.position.y =
          ((GRAD_PRICE - minP) / range) * 4.5 + BOTTOM_Y;
      }

      // ── Tip sphere ──
      const tip = pts[pts.length - 1];
      tipSphere.position.copy(tip);
      tipSphere.visible = true;

      // ── Camera target (follows tip in X and Y) ──
      targetCamX = tip.x - 2.5;
      targetCamY = tip.y - 0.5; // tip appears slightly above center

      // ── Lights follow camera ──
      light1.position.x = camera.position.x;
      light2.position.x = camera.position.x - 5;
      light3.position.x = camera.position.x + 5;
      flashLight.position.copy(tip);
    }

    // Initial build
    rebuildCurve();
    // Snap camera to initial tip position (no lerp)
    const initPts = buildCurvePoints(
      history.slice(-VISIBLE_POINTS),
      Math.min(...history.map((h) => h.price)),
      Math.max(
        Math.max(...history.map((h) => h.price)) -
          Math.min(...history.map((h) => h.price)),
        5,
      ),
    );
    const initTipPt = initPts[initPts.length - 1];
    if (initTipPt) {
      targetCamX = initTipPt.x - 2.5;
      targetCamY = initTipPt.y - 0.5;
      camera.position.x = targetCamX;
      camera.position.y = targetCamY;
      light1.position.x = targetCamX;
      light2.position.x = targetCamX - 5;
      light3.position.x = targetCamX + 5;
    }
    const lastP = history[history.length - 1]?.price ?? 0;
    onPriceUpdate(lastP, false);

    // ── Trade simulation ──
    let tradeTimer: ReturnType<typeof setTimeout>;

    function scheduleNext() {
      const delay = 200 + Math.random() * 600;
      tradeTimer = setTimeout(() => {
        const last = history[history.length - 1];
        const { delta, isSell } = simulateTrade(history);
        const newPrice = Math.max(0.5, (last?.price ?? 5) + delta);
        const lastX = last?.x ?? 0;
        const amplitude = Math.min(1, Math.abs(delta) / 15);

        history.push({
          price: newPrice,
          isSell,
          amplitude,
          x: lastX + POINT_SPACING,
        });

        pulsePos = 0;
        pulseIntensity = 1;
        pulseIsSell = isSell;
        moveIntensity = Math.max(moveIntensity, amplitude);

        // Compute relative range for effect positioning
        const fxVisible = history.slice(-VISIBLE_POINTS);
        const fxPrices = fxVisible.map((h) => h.price);
        const fxMin = Math.min(...fxPrices);
        const fxRange = Math.max(Math.max(...fxPrices) - fxMin, 5);

        // Whale buy effects
        if (delta > 5) {
          const tipPos = new THREE.Vector3(
            lastX + POINT_SPACING,
            ((newPrice - fxMin) / fxRange) * 4.5 + BOTTOM_Y,
            0,
          );

          // Sparks
          const spark = createSparkBurst(tipPos);
          scene.add(spark.mesh);
          sparkBursts.push(spark);

          // Speed lines
          const sl = createSpeedLines(tipPos);
          sl.lines.forEach((l) => scene.add(l));
          speedLineSets.push(sl);

          // Flash light
          flashIntensity = 15;
        }

        // Graduation celebration (one-time explosion, curve keeps going)
        if (newPrice >= GRAD_PRICE && !graduated) {
          graduated = true;
          const tipPos = new THREE.Vector3(
            lastX + POINT_SPACING,
            ((newPrice - fxMin) / fxRange) * 4.5 + BOTTOM_Y,
            0,
          );
          const exp = createExplosion(tipPos);
          scene.add(exp.mesh);
          explosions.push(exp);
          flashIntensity = 20;
        }

        rebuildCurve();
        onPriceUpdate(newPrice, isSell);
        scheduleNext();
      }, delay);
    }
    scheduleNext();

    // ── Mouse parallax ──
    function onMouseMove(e: MouseEvent) {
      mouseX = e.clientX / window.innerWidth;
      mouseY = e.clientY / window.innerHeight;
    }
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    // ── Scroll listener ──
    function onScroll() {
      const rect = container.getBoundingClientRect();
      scrollFactor = Math.max(0, Math.min(1, -rect.top / rect.height));
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    // ── Render loop ──
    const clock = new THREE.Clock();
    let animId: number;
    let dustCamOffset = 0;

    function animate() {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const time = clock.getElapsedTime();

      // Scroll zoom
      const targetZ = baseCamZ + scrollFactor * 8;
      camera.position.z += (targetZ - camera.position.z) * 0.08;

      // Camera follows tip smoothly (frame-rate independent lerp)
      camera.position.x += (targetCamX - camera.position.x) * 3.0 * dt;
      camera.position.y += (targetCamY - camera.position.y) * 3.0 * dt;

      // Keep lights following camera
      light1.position.x = camera.position.x;
      light2.position.x = camera.position.x - 5;
      light3.position.x = camera.position.x + 5;

      // Mouse parallax — tilt 2-3 degrees
      const targetRotX = (mouseY - 0.5) * -0.05;
      const targetRotY = (mouseX - 0.5) * 0.05;
      camRotX += (targetRotX - camRotX) * 0.04;
      camRotY += (targetRotY - camRotY) * 0.04;
      camera.rotation.x = camRotX;
      camera.rotation.y = camRotY;

      // Shader uniforms
      tubeMat.uniforms.uTime.value = time;
      if (pulsePos >= 0) {
        pulsePos += dt * 2.0;
        pulseIntensity = Math.max(0, pulseIntensity - dt * 2.5);
        if (pulsePos > 1.3) {
          pulsePos = -1;
          pulseIntensity = 0;
        }
      }
      tubeMat.uniforms.uPulsePos.value = pulsePos;
      tubeMat.uniforms.uPulseIntensity.value = pulseIntensity;
      tubeMat.uniforms.uIsSell.value = pulseIsSell ? 1.0 : 0.0;

      moveIntensity = Math.max(0, moveIntensity - dt * 1.5);
      tubeMat.uniforms.uMoveIntensity.value = moveIntensity;

      // Flash light decay
      flashIntensity = Math.max(0, flashIntensity - dt * 50);
      flashLight.intensity = flashIntensity;

      // Tip pulse
      if (tipSphere.visible) {
        tipSphere.scale.setScalar(1 + Math.sin(time * 3) * 0.3);
      }

      // Dust
      const camX = camera.position.x;
      const camDelta = camX - dustCamOffset;
      dustCamOffset = camX;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < DUST_COUNT; i++) {
        const d = dust.data[i];
        if (!d) continue;
        d.pos.x +=
          d.vel.x * dt + Math.sin(time * 0.4 + i * 0.9) * 0.001 + camDelta;
        d.pos.y += d.vel.y * dt + Math.cos(time * 0.3 + i * 1.3) * 0.001;

        const relX = d.pos.x - camX;
        if (relX > 14) d.pos.x = camX - 14;
        if (relX < -14) d.pos.x = camX + 14;
        if (d.pos.y > 6.5) d.pos.y = -5.5;
        if (d.pos.y < -5.5) d.pos.y = 6.5;

        dummy.position.copy(d.pos);
        dummy.scale.setScalar(0.5 + Math.sin(time * 2.5 + i * 4.1) * 0.5);
        dummy.updateMatrix();
        dust.mesh.setMatrixAt(i, dummy.matrix);
      }
      dust.mesh.instanceMatrix.needsUpdate = true;

      // Explosions
      explosions = explosions.filter((exp) => {
        const done = updateExplosion(exp, dt);
        if (done) {
          scene.remove(exp.mesh);
          exp.mesh.geometry.dispose();
        }
        return !done;
      });

      // Whale sparks
      sparkBursts = sparkBursts.filter((spark) => {
        const done = updateSparkBurst(spark, dt);
        if (done) {
          scene.remove(spark.mesh);
          spark.mesh.geometry.dispose();
        }
        return !done;
      });

      // Speed lines
      speedLineSets = speedLineSets.filter((sl) => {
        const done = updateSpeedLines(sl, dt);
        if (done) {
          sl.lines.forEach((line) => {
            scene.remove(line);
            line.geometry.dispose();
          });
        }
        return !done;
      });

      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ──
    const resizeObs = new ResizeObserver(() => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    resizeObs.observe(container);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(tradeTimer);
      resizeObs.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onPriceUpdate]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
