"use client";

import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

// Import all the necessary TSL nodes
import { Fn, texture, uv, positionLocal, mix, vec3, vec4 } from "three/tsl";
import { MeshStandardNodeMaterial } from "three/webgpu";

export default function LogoExtrude() {
  // Load the logo texture from the public folder
  // Note: For heightmaps, a high-contrast image (black background, white logo) is perfect
  const logoMap = useTexture("/logo.svg");

  // Use useMemo to compile the material and shader only once
  const customMaterial = useMemo(() => {
    // We use MeshStandardNodeMaterial to have proper lighting and shadow support
    const material = new MeshStandardNodeMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1,
    });

    // Vertex Shader Logic: Modifying the geometry
    material.positionNode = Fn(() => {
      // Read the texture color at the current UV coordinates
      const mapData = texture(logoMap, uv());

      // We use the Red channel (r) as our height mask (0.0 = black, 1.0 = white)
      const heightMask = mapData.r;

      // Calculate the new Z position using mix
      // If black (0.0), Z stays at 0.0. If white (1.0), Z pushes out to 1.5
      const extrudedZ = mix(0.0, 1.5, heightMask);

      // Create a new position vector safely
      const pos = vec3(positionLocal.x, positionLocal.y, extrudedZ);

      return pos;
    })();

    // Fragment Shader Logic: Modifying the colors based on extrusion
    material.colorNode = Fn(() => {
      const mapData = texture(logoMap, uv());

      // Let's create a cool effect:
      // Flat parts are dark blue, extruded parts are bright cyan
      const flatColor = vec3(0.0, 0.1, 0.2);
      const extrudedColor = vec3(0.0, 0.8, 1.0);

      // Blend between the two colors using the same mask
      const finalColor = mix(flatColor, extrudedColor, mapData.r);

      return vec4(finalColor, 1.0);
    })();

    return material;
  }, [logoMap]);

  return (
    <mesh>
      {/* The Plane MUST have high segments (e.g., 256x256 or 512x512). 
        If it's just 1x1, there are no vertices in the middle to pull forward!
      */}
      <planeGeometry args={[4, 4, 256, 256]} />

      {/* Attach our TSL generated material */}
      <primitive object={customMaterial} attach="material" />
    </mesh>
  );
}
