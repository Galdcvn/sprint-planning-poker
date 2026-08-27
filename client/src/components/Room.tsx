import { useEffect, useMemo, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { POKER_VALUES } from '../lib/types'
import type { LocalUser, PokerRoom, PokerValue, PokerTask } from '../lib/types'
import { Avatar } from './Avatar'
import { CreateTask } from './CreateTask'
import { TaskList } from './TaskList'

interface RoomProps {
  socket: Socket
  user: LocalUser
  roomId: string
  onLeave: () => void
}

export function Room({ socket, user, roomId, onLeave }: RoomProps) {
  const [room, setRoom] = useState<PokerRoom | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const onUpdate = (data: PokerRoom) => {
      setRoom(data)
      setError('')
    }
    socket.on('room:update', onUpdate)
    socket.emit('room:join', { roomId, user })
    return () => {
      socket.off('room:update', onUpdate)
      socket.emit('room:leave')
    }
  }, [socket, roomId, user])

  // Deriva o id do usuário local a partir dos dados atuais da sala.
  const myId = room
    ? Object.values(room.users).find(
        (u) => u.name === user.name && u.icon === user.icon,
      )?.id ?? null
    : null
  const activeTask = useMemo(() => {
    if (!room) return null
    return room.tasks.find((t) => t.id === room.activeTaskId) ?? null
  }, [room])

  if (!room) {
    return (
      <div className="room-loading">
        <div className="spinner" />
        <p>Entrando na sala...</p>
        {error && <p className="field-error">{error}</p>}
      </div>
    )
  }

  const users = Object.values(room.users)

  return (
    <div className="room">
      <header className="room-header">
        <div className="room-header-left">
          <h1 className="room-name">{room.name}</h1>
          <p className="room-code">
            Sala <code>{room.id}</code>
          </p>
        </div>
        <button className="btn btn-ghost" onClick={onLeave}>
          Sair
        </button>
      </header>

      {error && <p className="field-error room-error">{error}</p>}

      <div className="room-body">
        <aside className="sidebar">
          <CreateTask
            roomId={room.id}
            socket={socket}
            disabled={!myId}
          />
          <TaskList
            tasks={room.tasks}
            activeTaskId={room.activeTaskId}
            myId={myId}
            onVote={(taskId, value) => socket.emit('task:vote', { roomId: room.id, taskId, value })}
            onReveal={(taskId) => socket.emit('task:reveal', { roomId: room.id, taskId })}
            onReset={(taskId) => socket.emit('task:reset', { roomId: room.id, taskId })}
          />
        </aside>

        <section className="table-area">
          <PokerTable
            room={room}
            activeTask={activeTask}
            myId={myId}
          />
          <Hand
            activeTask={activeTask}
            myId={myId}
            onVote={(value) =>
              activeTask &&
              socket.emit('task:vote', {
                roomId: room.id,
                taskId: activeTask.id,
                value,
              })
            }
          />
          <div className="users-row">
            {users.map((u) => (
              <Avatar key={u.id} user={u} isMe={u.id === myId} highlight={!!activeTask && (activeTask.votes[u.id] ?? null) !== null} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function PokerTable({
  room,
  activeTask,
  myId,
}: {
  room: PokerRoom
  activeTask: PokerTask | null
  myId: string | null
}) {
  const users = Object.values(room.users)

  if (!activeTask) {
    return (
      <div className="table empty">
        <p className="table-empty-text">Crie uma tarefa e clique em <strong>Votar</strong> para começar.</p>
      </div>
    )
  }

  if (activeTask.revealed) {
    return (
      <div className="table revealed">
        <div className="table-result">
          <span className="table-result-label">Média dos pontos</span>
          <span className="table-result-value">{activeTask.result}</span>
          <span className="table-result-points">pontos</span>
        </div>
        <div className="table-title">{activeTask.title}</div>
      </div>
    )
  }

  const votesGiven = users.filter((u) => (activeTask.votes[u.id] ?? null) !== null).length
  const total = users.length

  return (
    <div className="table">
      <div className="table-title">{activeTask.title}</div>
      <div className="table-cards">
        {users.map((u) => {
          const hasVoted = (activeTask.votes[u.id] ?? null) !== null
          const isMe = u.id === myId
          return (
            <div
              key={u.id}
              className={`table-card${hasVoted ? ' voted' : ''}${isMe ? ' me' : ''}`}
            >
              <span className="table-card-icon">{u.icon}</span>
              {hasVoted ? '🂠' : '❔'}
            </div>
          )
        })}
      </div>
      <div className="table-status">
        Votaram {votesGiven} de {total}
      </div>
    </div>
  )
}

function Hand({
  activeTask,
  myId,
  onVote,
}: {
  activeTask: PokerTask | null
  myId: string | null
  onVote: (value: PokerValue) => void
}) {
  const voted = activeTask && myId ? (activeTask.votes[myId] ?? null) : null
  const disabled = !activeTask || activeTask.revealed || voted !== null || !myId

  return (
    <div className="hand">
      {POKER_VALUES.map((value) => {
        const selected = voted === value
        return (
          <button
            key={value}
            className={`hand-card${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
            disabled={disabled}
            onClick={() => onVote(value)}
          >
            {value}
          </button>
        )
      })}
    </div>
  )
}
