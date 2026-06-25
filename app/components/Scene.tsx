"use client";

import { Canvas } from "@react-three/fiber";
import LogoExtrude from "./LogoExtrude";
import { Suspense } from "react";
import { WebGPURenderer } from "three/webgpu";

export default function Scene() {
  return (
    <div className="w-full h-screen bg-black">
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
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />

        {/* Removed OrbitControls to keep the camera completely fixed */}

        <Suspense fallback={null}>
          <LogoExtrude />
        </Suspense>
      </Canvas>
    </div>
  );
}
