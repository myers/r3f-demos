import { useState } from 'react'
import { LittlestTokyoVR } from './demos/LittlestTokyoVR'
import { TokyoPedestrians } from './demos/TokyoPedestrians'

interface Demo {
  id: string
  title: string
  description: string
  component: React.ComponentType<{ onBack: () => void }>
}

const demos: Demo[] = [
  {
    id: 'littlest-tokyo-vr',
    title: 'Littlest Tokyo VR',
    description: 'Walk through an animated city scene using VR teleportation.',
    component: LittlestTokyoVR,
  },
  {
    id: 'tokyo-pedestrians',
    title: 'Tokyo Pedestrians',
    description: 'Watch animated soldiers walk through the Littlest Tokyo scene.',
    component: TokyoPedestrians,
  },
]

function DemoSelection({ onSelectDemo }: { onSelectDemo: (id: string) => void }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: '40px 20px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1
          style={{
            color: 'white',
            fontSize: '2.5rem',
            marginBottom: '8px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          R3F Demos
        </h1>
        <p
          style={{
            color: '#888',
            fontSize: '1.1rem',
            marginBottom: '40px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          React Three Fiber demonstrations and experiments
        </p>

        <div
          style={{
            display: 'grid',
            gap: '20px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}
        >
          {demos.map((demo) => (
            <button
              key={demo.id}
              onClick={() => onSelectDemo(demo.id)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <h2
                style={{
                  color: 'white',
                  fontSize: '1.25rem',
                  margin: '0 0 8px 0',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {demo.title}
              </h2>
              <p
                style={{
                  color: '#aaa',
                  fontSize: '0.95rem',
                  margin: 0,
                  lineHeight: 1.5,
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {demo.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(null)

  const selectedDemo = demos.find((d) => d.id === selectedDemoId)

  if (selectedDemo) {
    const DemoComponent = selectedDemo.component
    return <DemoComponent onBack={() => setSelectedDemoId(null)} />
  }

  return <DemoSelection onSelectDemo={setSelectedDemoId} />
}

export default App
