import { useEffect, useState } from 'react'
import { createSocket } from './lib/socket'
import './App.css'

function App() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const socket = createSocket()
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.connect()
    return () => {
      socket.disconnect()
    }
  }, [])

  return (
    <main className="app">
      <h1>Sprint Planning Poker</h1>
      <p>Faça login ou crie uma sala para começar.</p>
      <p>{connected ? 'Conectado ao servidor' : 'Desconectado'}</p>
    </main>
  )
}

export default App
