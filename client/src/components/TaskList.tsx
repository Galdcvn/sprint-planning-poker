import type { Socket } from "socket.io-client";
import { SquarePen, Trash2 } from "lucide-react";
import type { Task } from "../lib/types";

interface TaskListProps {
  socket: Socket;
  roomId: string;
  tasks: Task[];
  activeTaskId: string | null;
}

export function TaskList({
  socket,
  roomId,
  tasks,
  activeTaskId,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="task-list empty">
        <p className="task-list-empty-text">Nenhuma tarefa ainda.</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      <h2 className="section-title">Tarefas</h2>
      {[...tasks].reverse().map((task) => {
        const isActive = task.id === activeTaskId;
        return (
          <div
            key={task.id}
            className={`task-card${isActive ? " active" : ""}`}
          >
            <div className="task-card-head">
              <span className="task-card-title">{task.title}</span>
              <span className="task-card-icons">
                {task.result !== null && (
                  <span className="task-card-points">{task.result} pts</span>
                )}
                {task.link && (
                  <a
                    href={task.link}
                    target="_blank"
                    rel="noreferrer"
                    className="task-card-pen"
                    aria-label="Abrir tarefa"
                    title="Abrir tarefa"
                  >
                    <SquarePen size={16} />
                  </a>
                )}
              </span>
            </div>
            <div></div>
            <div className="task-card-actions">
              {isActive && !task.revealed && (
                <button
                  className="btn btn-small btn-primary"
                  onClick={() =>
                    socket.emit("task:reveal", { roomId, taskId: task.id })
                  }
                >
                  Revelar votos
                </button>
              )}
              {isActive && task.revealed && (
                <button
                  className="btn btn-small btn-outline"
                  onClick={() =>
                    socket.emit("task:reset", { roomId, taskId: task.id })
                  }
                >
                  Votar novamente
                </button>
              )}
              <button
                className="btn btn-icon btn-danger"
                aria-label="Excluir tarefa"
                title="Excluir tarefa"
                onClick={() =>
                  socket.emit("task:delete", {
                    roomId,
                    taskId: task.id,
                  })
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
