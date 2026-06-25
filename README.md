# React Three Fiber Mouse Trail Extrusion (WebGPU)

This project is a React Three Fiber (R3F) application that implements an interactive **3D Mouse Trail Extrusion** effect using **Three.js WebGPURenderer** and **TSL (Three Shading Language)**.

It displays a grid of instanced meshes rendering an SVG logo, which extrudes dynamically in 3D space along the Z-axis when hovered over by the mouse.

---

## 🚀 Technology Stack
*   **Framework:** Next.js (App Router)
*   **3D Rendering:** React Three Fiber (R3F) & `@react-three/drei`
*   **Engine & Renderer:** Three.js with `WebGPURenderer` (WebGPU)
*   **Shader Language:** TSL (Three Shading Language) via `"three/tsl"`
*   **Styling:** Tailwind CSS

---

## 🛠️ How It Works (Implementation Details)

The core mechanism is divided into three main parts: **offscreen trail drawing**, **dynamic grid instancing**, and **custom WebGPU shader extrusion**.

### 1. Offscreen Canvas Mouse Trail (`useTrailTexture`)
*   **State Management:** To comply with React's lifecycle and avoid "Cannot access refs during render" warnings, the 2D canvas, context, and `THREE.CanvasTexture` are initialized lazily inside a React `useState` initializer.
*   **Smoothing (LERP):** The mouse cursor's UV coordinates on the mesh are tracked. Instead of drawing the brush directly at the cursor position, it linearly interpolates (`lerp`) toward the cursor using the frame `delta` (`LERP_SPEED = 8.0`). This prevents rigid movement and adds a buttery-smooth feel.
*   **Fade Out & Trails:** On every frame, a black semi-transparent rectangle (`rgba(0, 0, 0, 0.02)`) is drawn over the canvas to fade out the previous coordinates slowly. This governs how fast the extruded mesh drops back down.
*   **Continuous Path:** If the mouse moves quickly, the canvas draws a continuous line between the previous and current points with a `30px` blur filter applied.

### 2. Mesh Instancing and Viewport Responsiveness
*   **InstancedMesh:** To achieve high performance, a single `instancedMesh` with 16 instances (4x4 grid) is rendered.
*   **Responsive Scaling:** In `LogoExtrude.tsx`, a `useLayoutEffect` hooks into R3F's `viewport` size. It computes individual grid cell widths and heights, then updates each instance's transformation matrix to dynamically fit the screen on resize.
*   **Interaction Plane:** An invisible full-screen `<mesh>` sits slightly in front of the grid to capture all `onPointerMove` and `onPointerOut` events cleanly.

### 3. Custom WebGPU Shaders with TSL (`LogoExtrude.tsx`)
Because this project utilizes WebGPU, standard GLSL is replaced by **Three Shading Language (TSL)** using `MeshStandardNodeMaterial`.

*   **Vertex Shader (Position Node):**
    1.  Loads the SVG logo texture (`logo.svg`) using the mesh's local `uv()`.
    2.  Calculates the screen-space Normalized Device Coordinates (NDC) for each vertex using:
        $$\text{NDC} = \text{ProjectionMatrix} \times \text{ViewMatrix} \times \text{WorldPosition}$$
    3.  Passes these coordinates to a `varying` variable (`uvscreen`) representing the exact position of the vertex on the viewport.
    4.  Samples the dynamic `trailTexture` at `uvscreen` and maps it via `smoothstep` (inner: `0.0`, outer: `0.8`) to smooth out the edges of the brush.
    5.  Combines the logo red channel (acting as a mask) and the trail intensity, then mixes the Z position of the vertices from `0.0` to `MAX_EXTRUSION` (`1.2`).
*   **Fragment Shader (Color Node):**
    1.  Uses the exact same `uvscreen` varying passed from the vertex shader to sample the trail texture.
    2.  Smoothly interpolates the mesh surface color from a sleek **Milky White/Cream** (`vec3(0.98, 0.98, 0.94)`) to a **Dark Gray** (`vec3(0.15, 0.15, 0.15)`) where the extrusion is active.

---

## 🛠️ Key Challenges & Solutions

### ❌ Issue 1: TSL Compilation Error - `viewMatrix` Not Found
*   **Problem:** Early versions of the code tried to import `viewMatrix` from `three/tsl` to convert positions to view space, resulting in a build-time crash as it did not exist in the specified package exports.
*   **Solution:** We replaced `viewMatrix` with `cameraViewMatrix` and `projectionMatrix` with `cameraProjectionMatrix` from `three/tsl`, which correctly resolve the camera transformations for instanced rendering in WebGPU.

### ❌ Issue 2: React Lifecycle Warnings ("Cannot access refs during render")
*   **Problem:** The canvas and WebGL textures were being set up directly in the body of the `useTrailTexture` hook during render, causing React warning logs and state instabilities.
*   **Solution:** Refactored the setup logic to run once inside a lazy state initializer `useState(() => { ... })`. This returns the context and canvas objects cleanly, which are then stored in a `useRef` for side-effect-free reading during `useFrame`.

### ❌ Issue 3: Jittery Extrusion & Harsh Edges
*   **Problem:** The extrusion was too fast and snapped instantly when the cursor moved, leading to pixelated edges.
*   **Solution:**
    *   Added exponential lerping in `useFrame` to transition the trail coordinates smoothly.
    *   Applied a `blur(30px)` filter to the 2D canvas context.
    *   Used a high outer edge parameter in TSL `smoothstep` (`SMOOTH_EDGE_OUTER = 0.8`) to create a soft hill-like extrusion instead of sharp, boxy rises.

---

## ⚙️ Getting Started

### 1. Run the Development Server:
```bash
npm run dev
```

### 2. Build for Production:
```bash
npm run build
npm run start
```
