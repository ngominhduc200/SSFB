'use client';

import { useEffect, useRef } from 'react';
import { drawStipple, StippleParams } from '@/utils/stipple';

declare global {
  interface Window { Cesium: any }
}

const CESIUM_VERSION = '1.122';
const CESIUM_CDN = `https://cesium.com/downloads/cesiumjs/releases/${CESIUM_VERSION}/Build/Cesium`;

// Noorderlicht building, NDSM Wharf
const FOCUS = { lon: 4.8965555058510875, lat: 52.39957905557068 };

const STIPPLE: StippleParams = {
  ySquares: 150,
  xSquares: 200,
  minDotSize: 0.5,
  maxDotSize: 12,
  angle: 0,
  gridType: 'Regular',
  threshold: 255,
  bgColor: '#e6e6df',
  dotColor: '#1a1a18',
};

interface Props {
  flyIn?: boolean;
  onCenterChange?: (lat: number, lng: number) => void;
}

export default function NoordelichtScene({ flyIn = false, onCenterChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const centerCbRef = useRef(onCenterChange);
  centerCbRef.current = onCenterChange;

  useEffect(() => {
    const mapEl = mapRef.current;
    const canvas = canvasRef.current;
    if (!mapEl || !canvas) return;

    let viewer: any = null;
    let unmounted = false;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${CESIUM_CDN}/Widgets/widgets.css`;
    document.head.appendChild(link);

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const init = () => {
      if (unmounted) return;
      const Cesium = window.Cesium;
      if (!Cesium) return;

      const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
      const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (ionToken) Cesium.Ion.defaultAccessToken = ionToken;
      if (googleKey) Cesium.GoogleMaps.defaultApiKey = googleKey;

      viewer = new Cesium.Viewer(mapEl, {
        timeline: false,
        animation: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        imageryProvider: false,
        contextOptions: { webgl: { preserveDrawingBuffer: true } },
        requestRenderMode: true,
      });

      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#e6e6df');

      const ctrl = viewer.scene.screenSpaceCameraController;
      ctrl.enableRotate = true;
      ctrl.enableTilt = true;
      ctrl.enableLook = true;
      ctrl.minimumZoomDistance = 30;
      ctrl.maximumZoomDistance = 3000;

      const OBLIQUE = {
        destination: Cesium.Cartesian3.fromDegrees(FOCUS.lon, FOCUS.lat, 90),
        orientation: {
          heading: Cesium.Math.toRadians(110),
          pitch:   Cesium.Math.toRadians(-30),
          roll:    0,
        },
      };

      // Position camera immediately so Cesium fetches the right tiles from the start
      if (flyIn) {
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(FOCUS.lon, FOCUS.lat, 1500),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-89.9), roll: 0 },
        });
      } else {
        viewer.camera.setView(OBLIQUE);
      }

      Cesium.createGooglePhotorealistic3DTileset()
        .then((tileset: any) => {
          if (unmounted) return;
          viewer.scene.primitives.add(tileset);

          if (flyIn) {
            // After a beat, fly down from top-down to the oblique Noorderlicht view
            setTimeout(() => {
              if (unmounted) return;
              viewer.camera.flyTo({ ...OBLIQUE, duration: 3.5 });
            }, 400);
          }
          // flyIn=false: camera already at OBLIQUE via setView above — no animation needed
        })
        .catch(console.error);

      // Stipple pass + coordinate callback — runs after every Cesium frame
      const ctx = canvas.getContext('2d')!;
      viewer.scene.postRender.addEventListener(() => {
        const src = viewer.scene.canvas as HTMLCanvasElement;
        if (src.width > 0 && src.height > 0) {
          try { drawStipple(ctx, src, STIPPLE); } catch { /* ignore */ }
        }
        // Emit camera ground position for the coordinate display
        if (centerCbRef.current) {
          const Cesium = window.Cesium;
          const pos = viewer.camera.positionCartographic;
          centerCbRef.current(
            Cesium.Math.toDegrees(pos.latitude),
            Cesium.Math.toDegrees(pos.longitude),
          );
        }
      });
    };

    const script = document.createElement('script');
    script.src = `${CESIUM_CDN}/Cesium.js`;
    script.async = true;
    script.onload = init;
    script.onerror = () => console.error('[NoordelichtScene] Cesium failed to load');
    document.head.appendChild(script);

    return () => {
      unmounted = true;
      window.removeEventListener('resize', resizeCanvas);
      viewer?.destroy();
      if (document.head.contains(script)) document.head.removeChild(script);
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, [flyIn]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Cesium renders here */}
      <div ref={mapRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      {/* Stipple overlay — pointer-events:none so Cesium gets mouse input */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, display: 'block', pointerEvents: 'none', zIndex: 1 }}
      />
    </div>
  );
}
