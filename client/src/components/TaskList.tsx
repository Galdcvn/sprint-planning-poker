import type { PokerTask, PokerValue } from '../lib/types'

interface TaskListProps {
  tasks: PokerTask[]
  activeTaskId: string | null
  myId: string | null
  onVote: (taskId: string, value: PokerValue) => void
  onReveal: (taskId: string) => void
  onReset: (taskId: string) => void
}

export function TaskList({
  tasks,
  activeTaskId,
  myId,
  onVote,
  onReveal,
  onReset,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="task-list empty">
        <p className="task-list-empty-text">Nenhuma tarefa ainda.</p>
      </div>
    )
  }

  return (
    <div className="task-list">
      <h2 className="section-title">Tarefas</h2>
      {[...tasks].reverse().map((task) => {
        const isActive = task.id === activeTaskId
        const hasVoted = myId ? (task.votes[myId] ?? null) !== null : false
        return (
          <div key={task.id} className={`task-card${isActive ? ' active' : ''}`}>
            <div className="task-card-head">
              <span className="task-card-title">{task.title}</span>
              {task.result !== null && (
                <span className="task-card-points">{task.result} pts</span>
              )}
            </div>
            {task.link && (
              <a
                href={task.link}
                target="_blank"
                rel="noreferrer"
                className="task-card-link"
              >
                Abrir tarefa
              </a>
            )}
            <div className="task-card-actions">
              {!isActive && (
                <button
                  className="btn btn-small btn-outline"
                  onClick={() => onVote(task.id, 0)}
                >
                  Votar
                </button>
              )}
              {isActive && !task.revealed && (
                <button
                  className="btn btn-small btn-primary"
                  onClick={() => onReveal(task.id)}
                >
                  Revelar votos
                </button>
              )}
              {isActive && task.revealed && (
                <button
                  className="btn btn-small btn-outline"
                  onClick={() => onReset(task.id)}
                >
                  Votar novamente
                </button>
              )}
              {isActive && task.revealed && <span className="task-card-done">✓ {task.result} pts</span>}
              {!hasVoted && isActive && !task.revealed && (
                <span className="task-card-pending">aguardando voto</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
