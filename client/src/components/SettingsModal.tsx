import { useState } from 'react'
import { ICONS } from '../lib/icons'
import type { LocalUser } from '../lib/types'

interface SettingsModalProps {
  user: LocalUser
  onSave: (user: LocalUser) => void
  onClose: () => void
}

export function SettingsModal({ user, onSave, onClose }: SettingsModalProps) {
  const [name, setName] = useState(user.name)
  const [icon, setIcon] = useState(user.icon)
  const [error, setError] = useState('')

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Digite seu nome')
      return
    }
    onSave({ name: trimmed, icon, userId: user.userId })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          ✕
        </button>
        <h2 className="modal-title">Configurações</h2>

        <form onSubmit={handleSave}>
          <label className="field">
            <span>Seu nome</span>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              placeholder="Ex: Ana"
              maxLength={24}
              autoFocus
            />
          </label>

          <label className="field">
            <span>Ícone</span>
            <div className="icon-grid">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  className={`icon-option${ic === icon ? ' selected' : ''}`}
                  onClick={() => setIcon(ic)}
                  aria-label={`Ícone ${ic}`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block">
            Salvar
          </button>
        </form>
      </div>
    </div>
  )
}
