'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';

const CARD_W = 5.4;
const CARD_H = 2.7;
const INIT_Z = 10;
const MAX_SCROLL = 32; // camera travels from z=10 to z=-22

const STAGES = [
  {
    id: 'stage-a',
    name: 'THE REST\nIS NOISE',
    label: 'STAGE A · LIVE NOW',
    pos: [-1.2, 0.5, 0] as [number, number, number],
    rotY: 0.08,
    phase: 0,
  },
  {
    id: 'stage-b',
    name: 'RED LIGHT\nRADIO',
    label: 'STAGE B',
    pos: [1.5, -0.4, -12] as [number, number, number],
    rotY: -0.08,
    phase: 1.5,
  },
  {
    id: 'stage-c',
    name: 'TENT',
    label: 'STAGE C',
    pos: [-0.5, 0.2, -22] as [number, number, number],
    rotY: 0.05,
    phase: 2.8,
  },
];

function makeCardTexture(name: string, label: string, active: boolean): THREE.CanvasTexture {
  const W = 1080, H = 540;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = active ? '#B90000' : '#141414';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = active ? '#ff4444' : '#ffffff';
  ctx.lineWidth = active ? 5 : 2;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 100px "Arial Black", Arial, sans-serif';
  ctx.textAlign = 'left';
  const lines = name.split('\n');
  const startY = lines.length === 1 ? 230 : 165;
  lines.forEach((line, i) => ctx.fillText(line, 52, startY + i * 114));

  ctx.fillStyle = active ? '#ffcccc' : '#555555';
  ctx.font = '38px "Courier New", Courier, monospace';
  ctx.fillText(label, 52, H - 56);

  if (active) {
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText('ENTER →', W - 52, H - 56);
  }

  return new THREE.CanvasTexture(c);
}

export default function HomeScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const mount = mountRef.current!;
    let W = mount.clientWidth;
    let H = mount.clientHeight;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x060606);
    mount.appendChild(renderer.domElement);

    // --- Scene ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x060606, 18, 38);

    // --- Camera (FPS-style rotation order) ---
    const camera = new THREE.PerspectiveCamera(62, W / H, 0.1, 100);
    camera.position.set(0, 0, INIT_Z);
    camera.rotation.order = 'YXZ';

    // --- Tunnel frame lines (long z-axis lines for depth cue) ---
    const frameMat = new THREE.LineBasicMaterial({ color: 0x1a1a1a });
    const corners = [[-7, -3.5], [-7, 3.5], [7, -3.5], [7, 3.5]] as [number, number][];
    corners.forEach(([x, y]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y, 12),
        new THREE.Vector3(x, y, -35),
      ]);
      scene.add(new THREE.Line(geo, frameMat));
    });

    // Horizontal cross-section rings along the tunnel
    const ringMat = new THREE.LineBasicMaterial({ color: 0x141414 });
    for (let z = 8; z >= -32; z -= 4) {
      const pts = [
        new THREE.Vector3(-7, -3.5, z), new THREE.Vector3(7, -3.5, z),
        new THREE.Vector3(7, 3.5, z),   new THREE.Vector3(-7, 3.5, z),
        new THREE.Vector3(-7, -3.5, z),
      ];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
    }

    // --- Particles spread along the depth ---
    const COUNT = 1600;
    const pPos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pPos[i * 3]     = (Math.random() - 0.5) * 20;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pPos[i * 3 + 2] = Math.random() * -40 + 12;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x555555, size: 0.055 })));

    // --- Stage cards ---
    const meshes: THREE.Mesh[] = [];
    const baseY: number[] = [];

    STAGES.forEach((s) => {
      const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);
      const mat = new THREE.MeshBasicMaterial({
        map: makeCardTexture(s.name, s.label, false),
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...s.pos);
      mesh.rotation.y = s.rotY;
      mesh.userData = { stageId: s.id, stage: s };
      scene.add(mesh);
      meshes.push(mesh);
      baseY.push(s.pos[1]);
    });

    // --- Raycaster ---
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hovered: THREE.Mesh | null = null;

    function setTexture(mesh: THREE.Mesh, active: boolean) {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (mat.map) mat.map.dispose();
      const s = mesh.userData.stage;
      mat.map = makeCardTexture(s.name, s.label, active);
      mat.needsUpdate = true;
    }

    // --- Scroll state ---
    let scrollTarget = 0;
    let scrollCurrent = 0;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      scrollTarget = Math.max(0, Math.min(MAX_SCROLL, scrollTarget + e.deltaY * 0.018));
    }
    mount.addEventListener('wheel', onWheel, { passive: false });

    // --- Mouse state (for perspective rotation + raycasting) ---
    let targetRotX = 0, targetRotY = 0;
    let currentRotX = 0, currentRotY = 0;

    function onMouseMove(e: MouseEvent) {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;  // -1..1
      const ny = (e.clientY / window.innerHeight - 0.5) * 2; // -1..1

      // Camera look direction (±28° horizontal, ±16° vertical)
      targetRotY = -nx * (Math.PI / 6.5);
      targetRotX = -ny * (Math.PI / 11);

      // NDC for raycasting (relative to canvas)
      const rect = mount.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / W) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / H) * 2 + 1;
    }

    function onClick() {
      if (hovered) router.push(`/stage/${hovered.userData.stageId}`);
    }

    mount.addEventListener('mousemove', onMouseMove);
    mount.addEventListener('click', onClick);

    // --- Animation ---
    let raf: number;
    const clock = new THREE.Clock();

    function tick() {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();

      // Scroll: smooth z travel
      scrollCurrent += (scrollTarget - scrollCurrent) * 0.07;
      camera.position.z = INIT_Z - scrollCurrent;

      // Mouse: smooth perspective rotation
      currentRotX += (targetRotX - currentRotX) * 0.055;
      currentRotY += (targetRotY - currentRotY) * 0.055;
      camera.rotation.x = currentRotX;
      camera.rotation.y = currentRotY;

      // Gentle card float
      meshes.forEach((m, i) => {
        m.position.y = baseY[i] + Math.sin(t * 0.38 + STAGES[i].phase) * 0.09;
      });

      // Hover detection (using current camera matrix)
      camera.updateMatrixWorld();
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        const hit = hits[0].object as THREE.Mesh;
        if (hit !== hovered) {
          if (hovered) setTexture(hovered, false);
          hovered = hit;
          setTexture(hovered, true);
        }
        mount.style.cursor = 'pointer';
      } else {
        if (hovered) { setTexture(hovered, false); hovered = null; }
        mount.style.cursor = 'default';
      }

      renderer.render(scene, camera);
    }
    tick();

    // --- Resize ---
    function onResize() {
      W = mount.clientWidth;
      H = mount.clientHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      mount.removeEventListener('wheel', onWheel);
      mount.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [router]);

  return (
    <>
      <div ref={mountRef} className="absolute inset-0" />
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, #060606 95%)' }}
      />
      {/* Scroll hint */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[2]"
        style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase' }}
      >
        scroll to explore
      </div>
    </>
  );
}
