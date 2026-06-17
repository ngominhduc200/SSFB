'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import type { Artist } from '@/types';
import { playClickSound } from '@/utils/playClickSound';

const CARD_SIZE = 2.6;
const INIT_Z    = 9;
const Z_STEP    = 8;
const COLS      = 5;
const BG        = 0xe8e8e8;

type Props = {
  artists: Artist[];
  stageId: string;
  onFirstScroll?: () => void;
};

interface CardData {
  group: THREE.Group;
  mesh: THREE.Mesh;
  baseY: number;
  phase: number;
  posZ: number;
  artistIdx: number;
  flipTarget: number;
  flipCurrent: number;
  scaleTarget: number;
  scaleCurrent: number;
  opacity: number;
  fadeInDelay: number; // seconds before fade-in starts
}

const COL_OFFSETS = [-0.5, -2, -1, -1.5, -0.8];
function getScatterPos(globalIdx: number): [number, number, number] {
  const col      = globalIdx % COLS;
  const rowGroup = Math.floor(globalIdx / COLS);
  const xBase    = (col / (COLS - 1) - 0.5) * 14;
  const x        = xBase + Math.sin(globalIdx * 2.3 + col * 1.1) * 0.6;
  const y        = Math.cos(globalIdx * 1.9 + col * 2.4) * 4.0;
  const z        = -(rowGroup * Z_STEP + 2) + COL_OFFSETS[col];
  return [x, y, z];
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function makeFrontTex(name: string, time: string, photo: HTMLImageElement | null): THREE.CanvasTexture {
  const S = 560;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d')!;

  // Background: photo in grayscale via luminosity blend, or plain gray
  if (photo) {
    // Gray base — luminosity blend strips color from the image above
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, S, S);
    ctx.globalCompositeOperation = 'luminosity';
    const scale = Math.max(S / photo.width, S / photo.height);
    const dw = photo.width * scale;
    const dh = photo.height * scale;
    ctx.drawImage(photo, (S - dw) / 2, (S - dh) / 2, dw, dh);
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(0, 0, S, S);
  }

  // Border
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, S - 2, S - 2);

  // Name — top-left
  ctx.fillStyle = '#FF0000';
  ctx.font = '600 88px "Flama Condensed Trial", "Arial Narrow", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const words = name.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > S - 44) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  lines.forEach((l, i) => ctx.fillText(l, 20, 20 + i * 96));

  // Time — bottom-right
  ctx.font = 'bold 42px "Courier New", Courier, monospace';
  ctx.fillStyle = '#FF0000';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(time, S - 20, S - 20);

  return new THREE.CanvasTexture(c);
}

function makeBackTex(artist: Artist): THREE.CanvasTexture {
  const S = 560;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d')!;

  ctx.save();
  ctx.translate(S, 0);
  ctx.scale(-1, 1);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, S - 2, S - 2);

  ctx.fillStyle = '#000000';
  ctx.font = '600 32px "Courier New", Courier, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(artist.name.toUpperCase(), 24, 24);

  ctx.font = '24px "Courier New", Courier, monospace';
  ctx.fillStyle = '#333333';
  const words = artist.bio.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > S - 56) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  lines.slice(0, 7).forEach((l, i) => ctx.fillText(l, 24, 76 + i * 32));

  const btnY = S - 72;
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(24, btnY, S - 48, 52);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 26px "Courier New", Courier, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OPEN SETLIST →', S / 2, btnY + 26);

  ctx.restore();
  return new THREE.CanvasTexture(c);
}

export default function StageScene({ artists, stageId, onFirstScroll }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const router   = useRouter();

  useEffect(() => {
    const mount = mountRef.current!;
    let W = mount.clientWidth;
    let H = mount.clientHeight;
    let cleanup: (() => void) | undefined;

    Promise.all(artists.map((a) => loadImage(a.coverImage))).then((photos) => {
      if (!mountRef.current) return; // unmounted before images loaded

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(BG);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(BG, 28, 50);

    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
    camera.position.set(0, 0, INIT_Z);

    const texFrontN = artists.map((a, i) => makeFrontTex(a.name, a.time, photos[i]));
    const texBack   = artists.map((a) => makeBackTex(a));

    const cards: CardData[] = [];
    const meshList: THREE.Mesh[] = [];

    // Shuffle order so stagger doesn't just go left-to-right
    const shuffledIndices = artists.map((_, i) => i).sort(() => Math.random() - 0.5);

    artists.forEach((_, i) => {
      const pos = getScatterPos(i);
      const geo = new THREE.PlaneGeometry(CARD_SIZE, CARD_SIZE);
      const mat = new THREE.MeshBasicMaterial({
        map: texFrontN[i],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const group = new THREE.Group();
      group.position.set(...pos);
      group.add(mesh);
      scene.add(group);

      const staggerOrder = shuffledIndices.indexOf(i);
      const card: CardData = {
        group, mesh,
        baseY: pos[1], phase: i * 0.71, posZ: pos[2],
        artistIdx: i,
        flipTarget: 0, flipCurrent: 0,
        scaleTarget: 1, scaleCurrent: 1,
        opacity: 0,
        fadeInDelay: 0.3 + staggerOrder * 0.1,
      };
      mesh.userData.card = card;
      meshList.push(mesh);
      cards.push(card);
    });

    let hoveredCard: CardData | null = null;
    let fadingOut   = false;
    let navigated   = false;
    let pendingRoute: string | null = null;

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2(-10, -10);

    const deepestZ  = Math.min(...cards.map((c) => c.posZ));
    const maxScroll = INIT_Z - deepestZ - 9;
    let scrollTarget  = 0;
    let scrollCurrent = 0;
    let firstScroll   = false;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (!firstScroll) { firstScroll = true; onFirstScroll?.(); }
      scrollTarget = Math.max(0, Math.min(maxScroll, scrollTarget + e.deltaY * 0.016));
    }
    mount.addEventListener('wheel', onWheel, { passive: false });

    let targetOffX = 0, targetOffY = 0;
    let currentOffX = 0, currentOffY = 0;

    function onMouseMove(e: MouseEvent) {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetOffX =  nx * 1.2;
      targetOffY = -ny * 0.7;
      const rect = mount.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / W) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / H) * 2 + 1;
    }
    function onMouseLeave() { ndc.set(-10, -10); }

    function onClick() {
      if (!hoveredCard || pendingRoute || fadingOut) return;
      playClickSound();
      pendingRoute = `/stage/${stageId}/${artists[hoveredCard.artistIdx].id}`;
      fadingOut = true;
    }

    mount.addEventListener('mousemove', onMouseMove);
    mount.addEventListener('mouseleave', onMouseLeave);
    mount.addEventListener('click', onClick);

    const _flipAxis = new THREE.Vector3(0, 1, 0);
    const _flipQ    = new THREE.Quaternion();

    let raf: number;
    const clock = new THREE.Clock();

    function tick() {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();

      scrollCurrent += (scrollTarget - scrollCurrent) * 0.07;
      camera.position.z = INIT_Z - scrollCurrent;

      currentOffX += (targetOffX - currentOffX) * 0.04;
      currentOffY += (targetOffY - currentOffY) * 0.04;
      camera.position.x = currentOffX;
      camera.position.y = currentOffY;

      let allFadedOut = true;

      cards.forEach((card) => {
        card.group.position.y = card.baseY + Math.sin(t * 0.35 + card.phase) * 0.08;

        card.flipCurrent += (card.flipTarget - card.flipCurrent) * 0.1;
        _flipQ.setFromAxisAngle(_flipAxis, card.flipCurrent);
        card.group.quaternion.copy(camera.quaternion).multiply(_flipQ);

        const showBack = card.flipCurrent > Math.PI / 2;
        const mat = card.mesh.material as THREE.MeshBasicMaterial;
        const want = showBack ? texBack[card.artistIdx] : texFrontN[card.artistIdx];
        if (mat.map !== want) { mat.map = want; mat.needsUpdate = true; }

        card.scaleCurrent += (card.scaleTarget - card.scaleCurrent) * 0.08;
        card.group.scale.setScalar(card.scaleCurrent);

        // Fade-in staggered, fade-out all at once
        if (fadingOut) {
          card.opacity = Math.max(0, card.opacity - 0.05);
        } else if (t > card.fadeInDelay) {
          card.opacity = Math.min(1, card.opacity + 0.04);
        }
        mat.opacity = card.opacity;

        if (card.opacity > 0.01) allFadedOut = false;
      });

      // Navigate once all cards have faded out
      if (fadingOut && allFadedOut && pendingRoute && !navigated) {
        navigated = true;
        router.push(pendingRoute);
      }

      camera.updateMatrixWorld();
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(meshList);
      const hitCard: CardData | null = hits.length > 0
        ? (hits[0].object as THREE.Mesh).userData.card as CardData ?? null
        : null;

      if (hitCard !== hoveredCard) {
        if (hoveredCard) hoveredCard.scaleTarget = 1.0;
        hoveredCard = hitCard;
        if (hoveredCard) hoveredCard.scaleTarget = 1.1;
      }
      mount.style.cursor = hoveredCard ? 'pointer' : 'default';

      renderer.render(scene, camera);
    }
    tick();

    function onResize() {
      W = mount.clientWidth; H = mount.clientHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    }
    window.addEventListener('resize', onResize);

    cleanup = () => {
      cancelAnimationFrame(raf);
      mount.removeEventListener('wheel', onWheel);
      mount.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('mouseleave', onMouseLeave);
      mount.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      texFrontN.forEach((t) => t.dispose());
      texBack.forEach((t) => t.dispose());
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    }); // end Promise.all.then

    return () => cleanup?.();
  }, [artists, stageId, onFirstScroll, router]);

  return <div ref={mountRef} className="absolute inset-0" />;
}
