"use client";
import { useRef, useState } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

const TRAIL_CONFIG = {
  // Texture resolution (higher = sharper, but 512 is optimized for performance)
  TEXTURE_SIZE: 512,

  // Radius of the brush (higher = wider trail area that extrudes)
  BRUSH_SIZE: 0.15,

  // How fast the trail fades out.
  // Lower value (e.g., 0.02) = Vertices fall down slower and much smoother.
  // Higher value (e.g., 0.1) = Vertices snap back down very quickly.
  FADE_OPACITY: 0.02,

  // How fast the brush follows the mouse.
  // Lower value (e.g., 8.0) = More delay, very smooth and buttery movement.
  // Higher value (e.g., 20.0) = Instant snapping to cursor, feels rigid.
  LERP_SPEED: 8.0,
};

export function useTrailTexture() {
  const [setup] = useState(() => {
    const c = document.createElement("canvas");
    c.width = TRAIL_CONFIG.TEXTURE_SIZE;
    c.height = TRAIL_CONFIG.TEXTURE_SIZE;
    const ctx = c.getContext("2d")!;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, TRAIL_CONFIG.TEXTURE_SIZE, TRAIL_CONFIG.TEXTURE_SIZE);

    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;

    return { canvas: c, context: ctx, texture: t };
  });

  const setupRef = useRef(setup);

  const targetMouse = useRef(new THREE.Vector2(-1, -1));
  const currentMouse = useRef(new THREE.Vector2(-1, -1));
  const prevMouse = useRef(new THREE.Vector2(-1, -1));

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.uv) {
      targetMouse.current.set(e.uv.x, e.uv.y);

      if (currentMouse.current.x === -1) {
        currentMouse.current.copy(targetMouse.current);
        prevMouse.current.copy(targetMouse.current);
      }
    }
  };

  const onPointerOut = () => {
    targetMouse.current.set(-1, -1);
    currentMouse.current.set(-1, -1);
    prevMouse.current.set(-1, -1);
  };

  useFrame((_, delta) => {
    const ctx = setupRef.current?.context;
    const tex = setupRef.current?.texture;
    if (!ctx || !tex) return;

    // Fade out the previous frame slowly (controls the fall/khabidan speed)
    ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_CONFIG.FADE_OPACITY})`;
    ctx.fillRect(0, 0, TRAIL_CONFIG.TEXTURE_SIZE, TRAIL_CONFIG.TEXTURE_SIZE);

    if (targetMouse.current.x === -1) {
      tex.needsUpdate = true;
      return;
    }

    // Smoothly move the brush (controls the trailing movement smoothness)
    const lerpFactor = 1.0 - Math.exp(-TRAIL_CONFIG.LERP_SPEED * delta);
    currentMouse.current.lerp(targetMouse.current, lerpFactor);

    const size = TRAIL_CONFIG.TEXTURE_SIZE;
    const currX = currentMouse.current.x * size;
    const currY = (1 - currentMouse.current.y) * size;
    const prevX = prevMouse.current.x * size;
    const prevY = (1 - prevMouse.current.y) * size;

    //  Draw continuous soft line
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = size * TRAIL_CONFIG.BRUSH_SIZE;
    ctx.strokeStyle = "rgba(255, 255, 255, 1)";

    ctx.beginPath();
    if (prevMouse.current.x === currentMouse.current.x) {
      ctx.moveTo(currX, currY);
      ctx.lineTo(currX + 0.1, currY);
    } else {
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(currX, currY);
    }

    ctx.stroke();
    ctx.restore();

    prevMouse.current.copy(currentMouse.current);
    tex.needsUpdate = true;
  });

  return {
    trailTexture: setup.texture,
    onPointerMove,
    onPointerOut,
  };
}
