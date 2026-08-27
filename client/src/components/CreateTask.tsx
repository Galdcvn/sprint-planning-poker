import { useState } from 'react'
import type { Socket } from 'socket.io-client'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/'

export function CreateTask({
  roomId,
  socket,
  userId,
  disabled,
}: {
  roomId: string
  socket: Socket
  userId: string
  disabled: boolean
}) {
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const [fetching, setFetching] = useState(false)

  async function fetchTitle(linkValue: string) {
    const trimmed = linkValue.trim()
    if (!trimmed || title.trim()) return
    setFetching(true)
    try {
      const res = await fetch(`${BASE_URL}/clickup/title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      if (res.ok) {
        const data = (await res.json()) as { title?: string | null }
        if (data.title) {
          setTitle(data.title)
          setError('')
        }
      } else {
        setError('Título: clique no link abaixo para buscar')
      }
    } catch {
      setError('Título: clique no link abaixo para buscar')
    } finally {
      setFetching(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Digite o título da tarefa')
      return
    }
    socket.emit('task:create', {
      roomId,
      title: trimmed,
      link: link.trim() || undefined,
      userId,
    })
    setTitle('')
    setLink('')
    setError('')
  }

  return (
    <form onSubmit={handleSubmit} className="create-task">
      <h2 className="section-title">Nova tarefa</h2>
      <label className="field">
        <span>Título</span>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setError('')
          }}
          placeholder="Ex: Implementar login"
          maxLength={120}
        />
      </label>
      <label className="field">
        <span>Link (ClickUp)</span>
        <input
          type="url"
          value={link}
          onChange={(e) => {
            setLink(e.target.value)
            setError('')
          }}
          onBlur={(e) => fetchTitle(e.target.value)}
          placeholder="https://app.clickup.com/..."
        />
        {fetching && <span className="field-hint">Buscando título...</span>}
      </label>
      {error && <p className="field-error">{error}</p>}
      <button type="submit" className="btn btn-primary btn-block" disabled={disabled}>
        Criar tarefa
      </button>
    </form>
  )
}
