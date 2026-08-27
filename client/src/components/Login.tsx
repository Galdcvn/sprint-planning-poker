import { useState } from "react";
import { DEFAULT_ICON, ICONS } from "../lib/icons";
import { generateUserId, saveLocalUser } from "../lib/storage";
import type { LocalUser } from "../lib/types";
import logo from "../assets/SprintPlanningPokerLogo.png";

interface LoginProps {
  onLogin: (user: LocalUser) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(DEFAULT_ICON);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Digite seu nome");
      return;
    }
    const user = { name: trimmed, icon, userId: generateUserId() };
    saveLocalUser(user);
    onLogin(user);
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <img src={logo} alt="" style={{ width: "50%", marginBottom: "20px" }} />
        <p className="login-subtitle">
          Escolha seu nome e um ícone para entrar na mesa.
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="field">
            <span>Seu nome</span>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Ex: Ana"
              maxLength={24}
              autoFocus
            />
          </label>

          <label className="field">
            <span>Escolha seu ícone</span>
            <div className="icon-grid">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  className={`icon-option${ic === icon ? " selected" : ""}`}
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
            Entrar na mesa
          </button>
        </form>
      </div>
    </div>
  );
}
