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

## Adding a New Demo

1. Create demo component in `src/demos/YourDemo.tsx`
2. Create page entry in `src/pages/your-demo.tsx`
3. Create HTML entry at root: `your-demo.html`
4. Add to `vite.config.ts` build inputs
5. Add to `src/App.tsx` demos array

## Key Dependencies

- `@react-three/fiber` - React renderer for Three.js
- `@react-three/drei` - Useful helpers for R3F
- `@pixiv/three-vrm` - VRM avatar support
- `recast-navigation` - NavMesh pathfinding
- `miniplex` - ECS for game entities
- `leva` - Debug UI controls
