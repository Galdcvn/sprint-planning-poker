import type { ClickUpTaskDetails, ClickUpUser } from "../lib/types";

interface ClickUpTaskModalProps {
  data: ClickUpTaskDetails | null;
  loading?: boolean;
  error?: string;
  onClose: () => void;
}

function formatDate(value?: string | null): string {
  if (!value) return "";
  const ms = Number(value);
  if (!Number.isFinite(ms)) return "";
  const date = new Date(ms);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function UserBadge({ user }: { user: ClickUpUser }) {
  return (
    <span className="clickup-user" title={user.username}>
      <span className="clickup-user-avatar">{initials(user.username)}</span>
      <span className="clickup-user-name">{user.username}</span>
    </span>
  );
}

export function ClickUpTaskModal({
  data,
  loading,
  error,
  onClose,
}: ClickUpTaskModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal clickup-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          ✕
        </button>

        {error && <p className="field-error">{error}</p>}

        {loading && !data && (
          <div className="clickup-loading">
            <div className="spinner" />
            <p>Buscando dados no ClickUp...</p>
          </div>
        )}

        {!loading && !data && !error && (
          <p className="clickup-empty">Nenhum dado disponível.</p>
        )}

        {data && (
          <div className="clickup-content">
            <div className="clickup-header">
              <div className="clickup-meta">
                {data.status?.status && (
                  <span
                    className="clickup-status"
                    style={
                      data.status.color
                        ? { backgroundColor: data.status.color }
                        : undefined
                    }
                  >
                    {data.status.status}
                  </span>
                )}
                {data.priority?.priority && (
                  <span className="clickup-chip clickup-chip-plain">
                    Prio: {data.priority.priority}
                  </span>
                )}
              </div>
              <h2 className="clickup-title">{data.name ?? "Sem título"}</h2>

              {data.list?.name && (
                <p className="clickup-list">{data.list.name}</p>
              )}
            </div>

            {data.description && (
              <section className="clickup-section">
                <h3 className="clickup-section-title">Descrição</h3>
                <p className="clickup-desc">{data.description}</p>
              </section>
            )}

            <section className="clickup-section">
              <h3 className="clickup-section-title">Detalhes</h3>
              <div className="clickup-grid">
                {data.points !== undefined && data.points !== null && (
                  <div className="clickup-cell">
                    <span className="clickup-cell-label">Pontos</span>
                    <span className="clickup-cell-value">{data.points}</span>
                  </div>
                )}

                {data.start_date && (
                  <div className="clickup-cell">
                    <span className="clickup-cell-label">Início</span>
                    <span className="clickup-cell-value">
                      {formatDate(data.start_date)}
                    </span>
                  </div>
                )}

                {data.due_date && (
                  <div className="clickup-cell">
                    <span className="clickup-cell-label">Prazo</span>
                    <span className="clickup-cell-value clickup-due">
                      {formatDate(data.due_date)}
                    </span>
                  </div>
                )}
              </div>

              {data.creator?.username && (
                <div className="clickup-creator">
                  <span className="clickup-cell-label">Criado por</span>
                  <UserBadge user={data.creator} />
                </div>
              )}

              {(data.assignees?.length ?? 0) > 0 && (
                <>
                  <h4 className="clickup-sub-title">Responsáveis</h4>
                  <div className="clickup-users">
                    {data.assignees!.map((a) => (
                      <UserBadge key={a.id} user={a} />
                    ))}
                  </div>
                </>
              )}

              {(data.tags?.length ?? 0) > 0 && (
                <>
                  <h4 className="clickup-sub-title">Tags</h4>
                  <div className="clickup-tags">
                    {data.tags!.map((t, i) => (
                      <span
                        key={i}
                        className="clickup-tag"
                        style={{
                          backgroundColor:
                            t.tag_bg ??
                            "var(--accent-border)",
                        }}
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </section>

            {data.url && (
              <div className="clickup-open-wrap">
                <a
                  href={data.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-small clickup-open"
                >
                  Abrir no ClickUp
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
