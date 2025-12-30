import { Canvas, type CanvasProps } from '@react-three/fiber'
import { WebGPURenderer } from 'three/webgpu'

type WebGPUCanvasProps = Omit<CanvasProps, 'gl'> & {
  multiview?: boolean
}

/**
 * Custom Canvas component that uses WebGPURenderer with WebGL backend
 * and optional multiview support for VR rendering optimization.
 *
 * Multiview allows rendering both eye views in a single draw call,
 * significantly improving VR performance on supported hardware.
 */
export function WebGPUCanvas({
  children,
  multiview = true,
  ...props
}: WebGPUCanvasProps) {
  return (
    <Canvas
      gl={async ({ canvas }) => {
        const renderer = new WebGPURenderer({
          canvas: canvas as HTMLCanvasElement,
          antialias: false, // No MSAA with multiview (causes flickering on Quest)
          forceWebGL: true, // Use WebGL2 backend for multiview support
          multiview: multiview, // Enable OVR_multiview2 extension
        })
        await renderer.init()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return renderer as any
      }}
      {...props}
    >
      {children}
    </Canvas>
  )
}
