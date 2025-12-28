import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface DebugLogContextValue {
  logs: string[]
  log: (message: string) => void
  clear: () => void
}

const DebugLogContext = createContext<DebugLogContextValue>({
  logs: [],
  log: () => {},
  clear: () => {},
})

export function useDebugLog() {
  return useContext(DebugLogContext)
}

interface DebugLogProviderProps {
  children: ReactNode
  maxLogs?: number
}

export function DebugLogProvider({ children, maxLogs = 100 }: DebugLogProviderProps) {
  const [logs, setLogs] = useState<string[]>([])

  const log = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => {
      const newLogs = [...prev, `[${timestamp}] ${message}`]
      // Keep only the last maxLogs entries
      return newLogs.slice(-maxLogs)
    })
  }, [maxLogs])

  const clear = useCallback(() => {
    setLogs([])
  }, [])

  return (
    <DebugLogContext.Provider value={{ logs, log, clear }}>
      {children}
    </DebugLogContext.Provider>
  )
}

interface DebugLogPanelProps {
  style?: React.CSSProperties
}

export function DebugLogPanel({ style }: DebugLogPanelProps) {
  const { logs, clear } = useDebugLog()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = logs.join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '400px',
        maxHeight: '300px',
        background: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '8px',
        padding: '12px',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#0f0',
        zIndex: 1000,
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>Debug Log</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={clear}
            style={{
              background: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            Clear
          </button>
          <button
            onClick={handleCopy}
            style={{
              background: copied ? '#0a0' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <textarea
        readOnly
        value={logs.join('\n')}
        style={{
          width: '100%',
          height: '220px',
          background: '#111',
          color: '#0f0',
          border: '1px solid #333',
          borderRadius: '4px',
          padding: '8px',
          fontFamily: 'monospace',
          fontSize: '10px',
          resize: 'none',
          outline: 'none',
        }}
      />
    </div>
  )
}
