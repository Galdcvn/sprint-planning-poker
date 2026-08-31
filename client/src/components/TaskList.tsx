import { useState } from "react";
import type { Socket } from "socket.io-client";
import { Eye, SquarePen, Trash2 } from "lucide-react";
import type { ClickUpTaskDetails, Task } from "../lib/types";
import { ClickUpTaskModal } from "./ClickUpTaskModal";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/";

interface TaskListProps {
  socket: Socket;
  roomId: string;
  tasks: Task[];
  activeTaskId: string | null;
  revealingId?: string | null;
}

export function TaskList({
  socket,
  roomId,
  tasks,
  activeTaskId,
  revealingId,
}: TaskListProps) {
  const [detail, setDetail] = useState<{
    link: string;
    data: ClickUpTaskDetails | null;
    loading: boolean;
    error: string;
  } | null>(null);

  const activate = (taskId: string) =>
    socket.emit("task:activate", { roomId, taskId });

  async function openDetails(link: string) {
    setDetail({ link, data: null, loading: true, error: "" });
    try {
      const res = await fetch(`${BASE_URL}/clickup/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link }),
      });
      if (res.ok) {
        const data = (await res.json()) as ClickUpTaskDetails;
        setDetail({ link, data, loading: false, error: "" });
      } else {
        setDetail({
          link,
          data: null,
          loading: false,
          error: "Não foi possível buscar os dados no ClickUp.",
        });
      }
    } catch {
      setDetail({
        link,
        data: null,
        loading: false,
        error: "Não foi possível buscar os dados no ClickUp.",
      });
    }
  }

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
            onClick={() => !isActive && activate(task.id)}
            title={isActive ? undefined : "Clicar para votar nesta tarefa"}
            role={isActive ? undefined : "button"}
            tabIndex={isActive ? undefined : 0}
            onKeyDown={
              isActive
                ? undefined
                : (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      activate(task.id);
                    }
                  }
            }
          >
            <div className="task-card-head">
              <span className="task-card-title">{task.title}</span>
              <span className="task-card-icons">
                {task.result !== null && task.id !== revealingId && (
                  <span className="task-card-points">{task.result} pts</span>
                )}
                {task.link && (
                  <button
                    className="task-card-icon-btn"
                    aria-label="Ver detalhes"
                    title="Ver detalhes no ClickUp"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetails(task.link!);
                    }}
                  >
                    <Eye size={16} />
                  </button>
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

      {detail && (
        <ClickUpTaskModal
          data={detail.data}
          loading={detail.loading}
          error={detail.error}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
