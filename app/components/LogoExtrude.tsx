"use client";

import { useMemo } from "react";
import { useTexture } from "@react-three/drei";

import {
  Fn,
  texture,
  uv,
  positionLocal,
  mix,
  vec3,
  vec4,
  smoothstep,
} from "three/tsl";
import { MeshStandardNodeMaterial } from "three/webgpu";
import { useTrailTexture } from "../hooks/useTrailTexture";

const SHADER_CONFIG = {
  // Maximum height of the extrusion (higher = models pop out more)
  MAX_EXTRUSION: 1.5,
  // Inner edge of the gradient (lower = softness starts from the very edge of the brush)
  SMOOTH_EDGE_INNER: 0.0,
  // Outer edge of the gradient.
  // Higher value (e.g., 0.8) = Much smoother, wider, and gradient-like rise/fall transition.
  // Lower value (e.g., 0.2) = Sharp, harsh, and sudden extrusion edges.
  SMOOTH_EDGE_OUTER: 0.8,
};

export default function LogoExtrude() {
  const logoMap = useTexture("/logo.svg");
  const { trailTexture, onPointerMove, onPointerOut } = useTrailTexture();

  const customMaterial = useMemo(() => {
    const material = new MeshStandardNodeMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1,
    });

    material.positionNode = Fn(() => {
      const mapData = texture(logoMap, uv());
      const heightMask = mapData.r;

      const trailData = texture(trailTexture, uv());

      // Using shader config for ultra smooth GPU gradients
      const softTrailMask = smoothstep(
        SHADER_CONFIG.SMOOTH_EDGE_INNER,
        SHADER_CONFIG.SMOOTH_EDGE_OUTER,
        trailData.r,
      );

      const finalMask = heightMask.mul(softTrailMask);

      // Using shader config for max extrusion height
      const extrudedZ = mix(0.0, SHADER_CONFIG.MAX_EXTRUSION, finalMask);
      const pos = vec3(positionLocal.x, positionLocal.y, extrudedZ);

      return pos;
    })();

    material.colorNode = Fn(() => {
      const mapData = texture(logoMap, uv());
      const trailData = texture(trailTexture, uv());

      const softTrailMask = smoothstep(
        SHADER_CONFIG.SMOOTH_EDGE_INNER,
        SHADER_CONFIG.SMOOTH_EDGE_OUTER,
        trailData.r,
      );

      const finalMask = mapData.r.mul(softTrailMask);

      const flatColor = vec3(0.0, 0.1, 0.2);
      const extrudedColor = vec3(0.0, 0.8, 1.0);

      const finalColor = mix(flatColor, extrudedColor, finalMask);

      return vec4(finalColor, 1.0);
    })();

    return material;
  }, [logoMap, trailTexture]);

  return (
    <mesh onPointerMove={onPointerMove} onPointerOut={onPointerOut}>
      <planeGeometry args={[4, 4, 128, 128]} />
      <primitive object={customMaterial} attach="material" />
    </mesh>
  );
}
