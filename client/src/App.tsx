import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { Login } from './components/Login'
import { Room } from './components/Room'
import { getLocalUser } from './lib/storage'
import type { LocalUser } from './lib/types'
import './App.css'

const url = import.meta.env.VITE_API_URL ?? '/'

function parseRoomId(): string | null {
  const match = window.location.pathname.match(/^\/([a-z0-9]{8})$/i)
  return match ? match[1] : null
}

function App() {
  const [socket] = useState<Socket>(() =>
    io(url, { transports: ['websocket'] }),
  )
  const [connected, setConnected] = useState(false)
  const [initialUser] = useState<LocalUser | null>(() => getLocalUser())
  const [user, setUser] = useState<LocalUser | null>(initialUser)
  const [roomId, setRoomId] = useState<string | null>(parseRoomId())
  const [creating, setCreating] = useState(false)
  const [joinCode, setJoinCode] = useState('')

  useEffect(() => {
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [socket])

  function createRoom() {
    if (!connected) return
    setCreating(true)
    socket.emit('room:create', {}, (res: { roomId: string }) => {
      setCreating(false)
      window.history.pushState({}, '', `/${res.roomId}`)
      setRoomId(res.roomId)
    })
  }

  function leaveRoom() {
    window.history.pushState({}, '', '/')
    setRoomId(null)
  }

  function joinRoom(code: string) {
    const trimmed = code.trim()
    if (!trimmed || !connected) return
    socket.emit('room:exists', { roomId: trimmed }, (res: { ok: boolean }) => {
      if (!res || !res.ok) {
        alert('Sala não encontrada. Verifique o código.')
        return
      }
      window.history.pushState({}, '', `/${trimmed}`)
      setRoomId(trimmed)
    })
  }

  // Sem usuário local: tela de login
  if (!user) {
    return <Login onLogin={setUser} />
  }

  // Com sala: tela da sala
  if (roomId) {
    return (
      <Room socket={socket} user={user} roomId={roomId} onLeave={leaveRoom} />
    )
  }

  // Sem sala: home para criar/entrar
  return (
    <div className="home-screen">
      <div className="home-card">
        <h1 className="login-title">🎴 Sprint Planning Poker</h1>
        <p className="login-subtitle">
          Olá, <strong>{user.name}</strong> {user.icon} — crie uma sala e
          compartilhe o link com seu time.
        </p>

        {!connected && (
          <p className="field-error">Conectando ao servidor...</p>
        )}

        <div className="home-actions">
          <button
            className="btn btn-primary btn-block"
            onClick={createRoom}
            disabled={!connected || creating}
          >
            {creating ? 'Criando...' : 'Criar nova sala'}
          </button>
        </div>

        <div className="home-divider">
          <span>ou</span>
        </div>

        <form
          className="home-join"
          onSubmit={(e) => {
            e.preventDefault()
            joinRoom(joinCode)
          }}
        >
          <label className="field">
            <span>Código da sala</span>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Ex: a1b2c3d4"
              maxLength={8}
            />
          </label>
          <button
            type="submit"
            className="btn btn-outline btn-block"
            disabled={!connected}
          >
            Entrar na sala
          </button>
        </form>
      </div>
    </div>
  )
}

export default App
