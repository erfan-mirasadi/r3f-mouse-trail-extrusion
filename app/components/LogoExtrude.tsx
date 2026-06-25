"use client";

import { useMemo, useRef, useLayoutEffect } from "react";
import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import {
  Fn,
  texture,
  uv,
  positionLocal,
  positionWorld,
  cameraViewMatrix,
  cameraProjectionMatrix,
  mix,
  vec3,
  vec4,
  smoothstep,
  varying,
  vec2,
} from "three/tsl";
import { MeshStandardNodeMaterial } from "three/webgpu";
import { useTrailTexture } from "../hooks/useTrailTexture";

const SHADER_CONFIG = {
  // Maximum height of the extrusion (higher = models pop out more)
  MAX_EXTRUSION: 1.2,
  // Inner edge of the gradient (lower = softness starts from the very edge of the brush)
  SMOOTH_EDGE_INNER: 0.0,
  // Outer edge of the gradient.
  // Higher value (e.g., 0.8) = Much smoother, wider, and gradient-like rise/fall transition.
  // Lower value (e.g., 0.2) = Sharp, harsh, and sudden extrusion edges.
  SMOOTH_EDGE_OUTER: 0.8,
};

export default function LogoExtrude() {
  const isProd = process.env.NODE_ENV === 'production';
  const basePath = isProd ? '/r3f-mouse-trail-extrusion' : '';
  const logoMap = useTexture(`${basePath}/logo.svg`);
  const { trailTexture, onPointerMove, onPointerOut } = useTrailTexture();

  // Get viewport dimensions to make the grid responsive
  const { viewport } = useThree();

  // Ref to directly manipulate the InstancedMesh
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

  // Calculate the 4x4 grid positions whenever the screen resizes
  useLayoutEffect(() => {
    if (!instancedMeshRef.current) return;

    const columns = 4;
    const rows = 4;

    // Calculate exact cell size based on current screen dimensions
    const cellWidth = viewport.width / columns;
    const cellHeight = viewport.height / rows;

    const dummy = new THREE.Object3D();
    let index = 0;

    for (let x = 0; x < columns; x++) {
      for (let y = 0; y < rows; y++) {
        // Center alignment calculations
        const posX = (x - columns / 2 + 0.5) * cellWidth;
        const posY = (y - rows / 2 + 0.5) * cellHeight;

        dummy.position.set(posX, posY, 0);

        // Scale the 1x1 geometry to fit the cell dynamically
        dummy.scale.set(cellWidth, cellHeight, 1);

        dummy.updateMatrix();
        instancedMeshRef.current.setMatrixAt(index++, dummy.matrix);
      }
    }

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [viewport]);

  const customMaterial = useMemo(() => {
    const material = new MeshStandardNodeMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.2,
    });

    // We create a varying variable to pass the calculated screen coordinates
    // from the Vertex Shader to the Fragment Shader safely!
    const uvscreen = varying(vec2(0.0, 0.0));

    material.positionNode = Fn(() => {
      // 1. Read Logo mask using LOCAL uv()
      const mapData = texture(logoMap, uv());
      const heightMask = mapData.r;

      const pos = positionLocal;

      // 2. Calculate true screen coordinates for this specific vertex
      // 🔥 THE FIX: using positionWorld and viewMatrix to correctly track instanced meshes
      const ndc = cameraProjectionMatrix
        .mul(cameraViewMatrix)
        .mul(vec4(positionWorld, 1.0));

      uvscreen.assign(ndc.xy.div(ndc.w).add(1.0).div(2.0));
      // 🔥 THE FIX: Removed uvscreen.y.oneMinus() because CanvasTexture already handles flipY correctly!

      // 3. Read Trail mask using the manually calculated uvscreen
      const trailData = texture(trailTexture, uvscreen);

      const softTrailMask = smoothstep(
        SHADER_CONFIG.SMOOTH_EDGE_INNER,
        SHADER_CONFIG.SMOOTH_EDGE_OUTER,
        trailData.r,
      );

      const finalMask = heightMask.mul(softTrailMask);

      const extrudedZ = mix(0.0, SHADER_CONFIG.MAX_EXTRUSION, finalMask);

      // Return the modified position
      return vec3(pos.x, pos.y, extrudedZ);
    })();

    material.colorNode = Fn(() => {
      const mapData = texture(logoMap, uv());

      // Use the exact same uvscreen varying that came from the Vertex Shader
      const trailData = texture(trailTexture, uvscreen);

      const softTrailMask = smoothstep(
        SHADER_CONFIG.SMOOTH_EDGE_INNER,
        SHADER_CONFIG.SMOOTH_EDGE_OUTER,
        trailData.r,
      );

      const finalMask = mapData.r.mul(softTrailMask);

      const flatColor = vec3(0.98, 0.98, 0.94); // Milky white
      const extrudedColor = vec3(0.15, 0.15, 0.15); // Dark Gray

      const finalColor = mix(flatColor, extrudedColor, finalMask);

      return vec4(finalColor, 1.0);
    })();

    return material;
  }, [logoMap, trailTexture]);

  return (
    <group>
      {/* INVISIBLE DUMMY PLANE */}
      <mesh
        position={[0, 0, 0.01]}
        onPointerMove={onPointerMove}
        onPointerOut={onPointerOut}
      >
        <planeGeometry args={[viewport.width, viewport.height]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* INSTANCED GRID */}
      <instancedMesh
        ref={instancedMeshRef}
        args={[undefined as any, undefined as any, 16]}
      >
        <planeGeometry args={[1, 1, 64, 64]} />
        <primitive object={customMaterial} attach="material" />
      </instancedMesh>
    </group>
  );
}
