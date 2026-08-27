import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Socket } from 'socket.io-client'
import { CARDS } from '../lib/types'
import type { Card, LocalUser, Player, Room, Task } from '../lib/types'
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
  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState('')
  const [myVote, setMyVote] = useState<Card | null>(null)

  const userId = user.userId

  useEffect(() => {
    const onUpdate = (data: Room) => {
      setRoom(data)
      setError('')
    }
    socket.on('room:update', onUpdate)
    socket.emit(
      'joinRoom',
      {
        roomId,
        name: user.name,
        icon: user.icon,
        userId,
      },
      () => {},
    )
    return () => {
      socket.off('room:update', onUpdate)
      socket.emit('leaveRoom', { roomId, userId })
    }
  }, [socket, roomId, user.name, user.icon, userId])

  const activeTask = useMemo(() => {
    if (!room) return null
    return room.tasks.find((t) => t.id === room.activeTaskId) ?? null
  }, [room])

  useEffect(() => {
    setMyVote(null)
  }, [activeTask?.id, activeTask?.revealed])

  if (!room) {
    return (
      <div className="room-loading">
        <div className="spinner" />
        <p>Entrando na sala...</p>
        {error && <p className="field-error">{error}</p>}
      </div>
    )
  }

  const players = room.players

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
            userId={userId}
            disabled={!connectedPlayer(players, userId)}
          />
          <TaskList
            socket={socket}
            roomId={room.id}
            tasks={room.tasks}
            activeTaskId={room.activeTaskId}
          />
        </aside>

        <section className="table-area">
          <PokerTable room={room} activeTask={activeTask} userId={userId} />
          <Hand
            activeTask={activeTask}
            myVote={myVote}
            onVote={(card) => onVote(card)}
          />
        </section>
      </div>
    </div>
  )

  function onVote(card: Card | null) {
    if (!activeTask || !connectedPlayer(players, userId)) return
    setMyVote(card)
    socket.emit('task:vote', {
      roomId,
      taskId: activeTask.id,
      userId,
      card,
    })
  }
}

function connectedPlayer(players: Player[], userId: string): boolean {
  return players.some((p) => p.id === userId)
}

// O voto é 'hidden' antes da revelação; após revelar, mostra o valor real.
function hasVoted(status: Task['votes'][string] | undefined): boolean {
  return status !== undefined && status !== null
}

function avatarPosition(
  player: Player,
  room: Room,
  userId: string,
): CSSProperties {
  const isMe = player.id === userId

  // O próprio usuário fica no centro inferior da mesa.
  if (isMe) {
    return { top: '91%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  // Demais usuários distribuídos no arco superior (topo e laterais).
  const others = room.players.filter((p) => p.id !== userId)
  const index = others.findIndex((p) => p.id === player.id)
  const total = others.length
  let theta = Math.PI / 2 // topo da mesa
  if (total > 1) {
    theta = Math.PI - (index / (total - 1)) * Math.PI
  }
  const left = 50 + Math.cos(theta) * 42
  const top = 50 - Math.sin(theta) * 36
  return { top: `${top}%`, left: `${left}%`, transform: 'translate(-50%, -50%)' }
}

function PokerTable({
  room,
  activeTask,
  userId,
}: {
  room: Room
  activeTask: Task | null
  userId: string
}) {
  const players = room.players
  const votesGiven = activeTask
    ? players.filter((p) => hasVoted(activeTask.votes[p.id])).length
    : 0
  const total = players.length

  return (
    <div className="poker-table-wrap">
      {players.map((p) => (
        <Avatar
          key={p.id}
          player={p}
          isMe={p.id === userId}
          highlight={
            !!activeTask && hasVoted(activeTask.votes[p.id])
          }
          style={avatarPosition(p, room, userId)}
        />
      ))}

      <div className={`poker-table${activeTask?.revealed ? ' revealed' : ''}`}>
        {!activeTask && (
          <div className="table-empty-text">
            Crie uma tarefa e clique em <strong>Votar</strong> para começar.
          </div>
        )}

        {activeTask && activeTask.revealed && (
          <div className="table-result-wrap">
            <span className="table-result-label">Média dos pontos</span>
            <span className="table-result-value">{activeTask.result}</span>
            <span className="table-result-points">pontos</span>
            <div className="table-title">{activeTask.title}</div>
          </div>
        )}

        {activeTask && !activeTask.revealed && (
          <>
            <div className="table-title">{activeTask.title}</div>
            <div className="table-cards">
              {players.map((p) => {
                const voted = hasVoted(activeTask.votes[p.id])
                const isMe = p.id === userId
                return (
                  <div
                    key={p.id}
                    className={`table-card${voted ? ' voted' : ''}${isMe ? ' me' : ''}`}
                  >
                    {voted ? '🂠' : '❔'}
                  </div>
                )
              })}
            </div>
            <div className="table-status">
              Votaram {votesGiven} de {total}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Hand({
  activeTask,
  myVote,
  onVote,
}: {
  activeTask: Task | null
  myVote: Card | null
  onVote: (card: Card | null) => void
}) {
  const revealed = !!activeTask?.revealed
  const disabled = !activeTask || revealed

  const handCards: (Card | null)[] = [...CARDS, '?']

  return (
    <div className="hand">
      {handCards.map((value) => {
        const selected = myVote === value
        return (
          <button
            key={String(value)}
            className={`hand-card${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
            disabled={disabled}
            onClick={() => (selected ? onVote(null) : onVote(value!))}
          >
            {value}
          </button>
        )
      })}
    </div>
  )
}
