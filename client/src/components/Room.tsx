import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { CARDS } from "../lib/types";
import type { Card, LocalUser, Player, Room, Task } from "../lib/types";
import { Avatar } from "./Avatar";
import { CreateTask } from "./CreateTask";
import { TaskList } from "./TaskList";
import pokerLogo from "../assets/SprintPlanningPokerLogo.png";

interface RoomProps {
  socket: Socket;
  user: LocalUser;
  roomId: string;
  onLeave: () => void;
}

export function Room({ socket, user, roomId, onLeave }: RoomProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");
  const [myVote, setMyVote] = useState<Card | null>(null);
  const [revealCountdown, setRevealCountdown] = useState<number | null>(null);
  const revealRef = useRef<{ id: string; revealed: boolean } | null>(null);

  const userId = user.userId;

  useEffect(() => {
    const onUpdate = (data: Room) => {
      setRoom(data);
      setError("");
    };
    socket.on("room:update", onUpdate);
    socket.emit(
      "joinRoom",
      {
        roomId,
        name: user.name,
        icon: user.icon,
        userId,
      },
      () => {},
    );
    return () => {
      socket.off("room:update", onUpdate);
      socket.emit("leaveRoom", { roomId, userId });
    };
  }, [socket, roomId, user.name, user.icon, userId]);

  const activeTask = useMemo(() => {
    if (!room) return null;
    return room.tasks.find((t) => t.id === room.activeTaskId) ?? null;
  }, [room]);

  useEffect(() => {
    setMyVote(null);
  }, [activeTask?.id, activeTask?.revealed]);

  useEffect(() => {
    if (!activeTask) {
      revealRef.current = null;
      setRevealCountdown(null);
      return;
    }
    const prev = revealRef.current;
    revealRef.current = {
      id: activeTask.id,
      revealed: activeTask.revealed,
    };
    if (activeTask.revealed) {
      if (prev && prev.id === activeTask.id && !prev.revealed) {
        setRevealCountdown(3);
      }
    } else {
      setRevealCountdown(null);
    }
  }, [activeTask?.id, activeTask?.revealed]);

  useEffect(() => {
    if (revealCountdown === null || revealCountdown <= 0) return;
    const timer = setTimeout(
      () => setRevealCountdown(revealCountdown - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [revealCountdown]);

  if (!room) {
    return (
      <div className="room-loading">
        <div className="spinner" />
        <p>Entrando na sala...</p>
        {error && <p className="field-error">{error}</p>}
      </div>
    );
  }

  const players = room.players;

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
          <PokerTable
            room={room}
            activeTask={activeTask}
            userId={userId}
            revealCountdown={revealCountdown}
          />
          <Hand
            activeTask={activeTask}
            myVote={myVote}
            onVote={(card) => onVote(card)}
          />
        </section>
      </div>
    </div>
  );

  function onVote(card: Card | null) {
    if (!activeTask || !connectedPlayer(players, userId)) return;
    setMyVote(card);
    socket.emit("task:vote", {
      roomId,
      taskId: activeTask.id,
      userId,
      card,
    });
  }
}

function connectedPlayer(players: Player[], userId: string): boolean {
  return players.some((p) => p.id === userId);
}

// O voto é 'hidden' antes da revelação; após revelar, mostra o valor real.
function hasVoted(status: Task["votes"][string] | undefined): boolean {
  return status !== undefined && status !== null;
}

function avatarPosition(
  player: Player,
  room: Room,
  userId: string,
): { left: number; top: number } {
  const isMe = player.id === userId;

  // O próprio usuário fica no centro inferior da mesa.
  if (isMe) {
    return { left: 50, top: 91 };
  }

  // Demais usuários distribuídos no arco superior (topo e laterais).
  const others = room.players.filter((p) => p.id !== userId);
  const index = others.findIndex((p) => p.id === player.id);
  const total = others.length;
  let theta = Math.PI / 2; // topo da mesa
  if (total > 1) {
    theta = Math.PI - (index / (total - 1)) * Math.PI;
  }
  const left = 50 + Math.cos(theta) * 42;
  const top = 50 - Math.sin(theta) * 36;
  return { left, top };
}

function PlayerSeat({
  player,
  isMe,
  userId,
  room,
  activeTask,
  showVotes,
}: {
  player: Player;
  isMe: boolean;
  userId: string;
  room: Room;
  activeTask: Task | null;
  showVotes: boolean;
}) {
  const pos = avatarPosition(player, room, userId);

  const voted = !!activeTask && hasVoted(activeTask.votes[player.id]);
  const vote = activeTask ? activeTask.votes[player.id] : undefined;
  // Carta virada para baixo: logo do app dentro da carta.
  let cardContent: ReactNode = (
    <img className="seat-card-logo" src={pokerLogo} alt="" />
  );
  if (showVotes && vote !== undefined && vote !== null) {
    cardContent = String(vote);
  }
  const cardClass = `table-card seat-card${voted ? " voted" : ""}${showVotes ? " revealed" : ""}`;

  // Direção do lugar para o centro da mesa (onde a carta fica "na frente").
  const dx = 50 - pos.left;
  const dy = 50 - pos.top;
  const len = Math.hypot(dx, dy) || 1;
  const dist = 80;
  const cardStyle: CSSProperties = {
    transform: `translate(calc(-50% + ${(dx / len) * dist}px), calc(-50% + ${(dy / len) * dist}px))`,
  };

  return (
    <div className="seat" style={{ left: `${pos.left}%`, top: `${pos.top}%` }}>
      <div className={cardClass} style={cardStyle}>
        {cardContent}
      </div>
      <div className="seat-avatar">
        <Avatar player={player} isMe={isMe} highlight={voted} />
      </div>
    </div>
  );
}

function PokerTable({
  room,
  activeTask,
  userId,
  revealCountdown,
}: {
  room: Room;
  activeTask: Task | null;
  userId: string;
  revealCountdown: number | null;
}) {
  const players = room.players;
  const votesGiven = activeTask
    ? players.filter((p) => hasVoted(activeTask.votes[p.id])).length
    : 0;
  const total = players.length;
  const revealed = !!activeTask?.revealed;
  const countdown = revealCountdown;

  // Mostra os valores reais dos votos só depois que a contagem termina.
  const showVotes = revealed && (countdown === null || countdown === 0);

  return (
    <div className="poker-table-wrap">
      {players.map((p) => (
        <PlayerSeat
          key={p.id}
          player={p}
          isMe={p.id === userId}
          userId={userId}
          room={room}
          activeTask={activeTask}
          showVotes={showVotes}
        />
      ))}

      <div className={`poker-table${revealed ? " revealed" : ""}`}>
        {!activeTask && (
          <div className="table-empty-text">
            Crie uma tarefa e clique em <strong>Votar</strong> para começar.
          </div>
        )}

        {activeTask && countdown && countdown > 0 && (
          <div className="table-countdown">{countdown}</div>
        )}

        {activeTask && showVotes && (
          <div className="table-result-wrap">
            <span className="table-result-label">Média dos pontos</span>
            <span className="table-result-value">{activeTask.result}</span>
            <span className="table-result-points">pontos</span>
          </div>
        )}

        {activeTask && !revealed && (
          <>
            <div className="table-title">{activeTask.title}</div>
            <div className="table-status">
              Votaram {votesGiven} de {total}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Hand({
  activeTask,
  myVote,
  onVote,
}: {
  activeTask: Task | null;
  myVote: Card | null;
  onVote: (card: Card | null) => void;
}) {
  const revealed = !!activeTask?.revealed;
  const disabled = !activeTask || revealed;

  const handCards: (Card | null)[] = [...CARDS, "?"];

  return (
    <div className="hand">
      {handCards.map((value) => {
        const selected = myVote === value;
        return (
          <button
            key={String(value)}
            className={`hand-card${selected ? " selected" : ""}${disabled ? " disabled" : ""}`}
            disabled={disabled}
            onClick={() => (selected ? onVote(null) : onVote(value!))}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
