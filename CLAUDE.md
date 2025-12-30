# R3F Demos - Project Guidelines

## Package Manager

This project uses **pnpm**. Do not use npm or yarn.

```bash
pnpm install        # Install dependencies
pnpm dev            # Start dev server
pnpm build          # Build for production
pnpm test           # Run tests
```

## Project Structure

- `src/demos/` - Main demo components
- `src/components/` - Reusable React components
- `src/pages/` - Page entry points for each demo
- `src/ecs/` - Entity Component System (miniplex) code
- `public/models/` - 3D models and assets
- `*.html` - HTML entry points for each demo (root level)

## Demos

### Littlest Tokyo VR
**Files:** `src/demos/LittlestTokyoVR.tsx`, `littlest-tokyo-vr.html`

Immersive VR experience walking through an animated city scene using VR controller teleportation.

**Technologies:** @react-three/xr, controller teleportation, hand tracking, environment presets

### Tokyo Pedestrians
**Files:** `src/demos/TokyoPedestrians.tsx`, `tokyo-pedestrians.html`

Animated soldier characters walk through the Littlest Tokyo scene with autonomous navigation.

**Technologies:**
- Recast-Navigation (WASM navmesh pathfinding)
- ECS collision detection with separation forces
- Soldier GLTF with walk animations
- Leva controls (pedestrian count, visibility toggles, FPS monitor)

### VRM Tokyo Pedestrians
**Files:** `src/demos/TokyoVRMPedestrians.tsx`, `vrm-tokyo.html`

VRM avatar characters navigate the scene with physics-based hair and facial expressions.

**Technologies:**
- @pixiv/three-vrm for VRM model loading
- MToon shader materials
- Automatic blinking and expression system
- Spring bone physics (hair, cloth)
- Same navmesh/ECS infrastructure as Tokyo Pedestrians

## Key Components

- **LittlestTokyo** - The 3D city model shared across demos
- **Pedestrian** - Soldier-based pedestrian with animations
- **VRMPedestrian** - VRM avatar pedestrian with expressions
- **NavMeshProvider** - Context provider for navmesh navigation
- **NavMeshDebug** - Wireframe visualization of navigation mesh
- **DebugLog** - Debug logging panel

## Adding a New Demo

1. Create demo component in `src/demos/YourDemo.tsx`
2. Create page entry in `src/pages/your-demo.tsx`
3. Create HTML entry at root: `your-demo.html`
4. Add to `vite.config.ts` build inputs
5. Add to `src/App.tsx` demos array

## Key Dependencies

- `@react-three/fiber` - React renderer for Three.js
- `@react-three/drei` - Useful helpers for R3F
- `@react-three/xr` - WebXR/VR support
- `@pixiv/three-vrm` - VRM avatar support
- `recast-navigation` - NavMesh pathfinding (WASM)
- `miniplex` - ECS for game entities
- `leva` - Debug UI controls
- `r3f-xr-widgets` - XR UI components
