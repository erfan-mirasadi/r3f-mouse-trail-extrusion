"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import LogoExtrude from "./LogoExtrude";
import { Suspense } from "react";
import { WebGPURenderer } from "three/webgpu";

// We use a basic setup here.
// R3F v9 will handle the internal WebGL/WebGPU context dynamically.
export default function Scene() {
  return (
    <div className="w-full h-screen bg-black">
      {/* Fix: Use an async function for the gl prop to await renderer.init() 
        This is required for WebGPURenderer in R3F v9
      */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={async (props) => {
          const { powerPreference, ...rest } = props;
          const renderer = new WebGPURenderer({
            ...(rest as any),
            antialias: true,
            powerPreference:
              powerPreference === "default" ? undefined : powerPreference,
          });
          await renderer.init();
          return renderer as any;
        }}
      >
        {/* Basic lighting to see the 3D depth */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />

        {/* Controls to rotate around and see the extruded logo */}
        <OrbitControls enableDamping={true} />

        {/* Suspense is REQUIRED here because useTexture suspends the component */}
        <Suspense fallback={null}>
          {/* Our custom TSL extruded component */}
          <LogoExtrude />
        </Suspense>
      </Canvas>
    </div>
  );
}
