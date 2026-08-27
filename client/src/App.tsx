import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Login } from "./components/Login";
import { Room } from "./components/Room";
import { SettingsModal } from "./components/SettingsModal";
import { getLocalUser, saveLocalUser } from "./lib/storage";
import type { LocalUser } from "./lib/types";
import "./App.css";
import logo from "./assets/SprintPlanningPokerLogo.png";

const url = import.meta.env.VITE_API_URL ?? "/";

function parseRoomId(): string | null {
  const match = window.location.pathname.match(/^\/([a-z0-9-]{8,36})$/i);
  return match ? match[1] : null;
}

function App() {
  const [socket] = useState<Socket>(() =>
    io(url, { transports: ["websocket"] }),
  );
  const [connected, setConnected] = useState(false);
  const [initialUser] = useState<LocalUser | null>(() => getLocalUser());
  const [user, setUser] = useState<LocalUser | null>(initialUser);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [enterError, setEnterError] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  // Se a URL já aponta para uma sala, entra nela assim que tiver usuário.
  useEffect(() => {
    const id = parseRoomId();
    if (id && user) {
      setRoomId(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function createRoom() {
    if (!connected || !user) return;
    setCreating(true);
    setEnterError("");
    socket.emit(
      "createRoom",
      { name: user.name, userId: user.userId },
      (res: { roomId: string; userId: string }) => {
        setCreating(false);
        if (!res?.roomId) {
          setEnterError("Não foi possível criar a sala.");
          return;
        }
        joinRoomById(res.roomId);
      },
    );
  }

  function joinRoomById(id: string) {
    if (!user || !connected) return;
    socket.emit(
      "joinRoom",
      { roomId: id, name: user.name, icon: user.icon, userId: user.userId },
      (res: { roomId: string; playerId: string }) => {
        if (!res?.roomId) {
          setEnterError("Sala não encontrada. Verifique o código.");
          return;
        }
        window.history.pushState({}, "", `/${id}`);
        setRoomId(id);
      },
    );
  }

  function joinRoom(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    joinRoomById(trimmed);
  }

  function leaveRoom() {
    if (roomId && user) {
      socket.emit("leaveRoom", { roomId, userId: user.userId });
    }
    window.history.pushState({}, "", "/");
    setRoomId(null);
  }

  function updateUser(newUser: LocalUser) {
    setUser(newUser);
    saveLocalUser(newUser);
  }

  // Sem usuário local: tela de login
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // Com sala: tela da sala
  if (roomId) {
    return (
      <Room socket={socket} user={user} roomId={roomId} onLeave={leaveRoom} />
    );
  }

  // Sem sala: home para criar/entrar
  return (
    <div className="home-screen">
      <button
        className="settings-btn"
        onClick={() => setShowSettings(true)}
        aria-label="Configurações"
        title="Configurações"
      >
        ⚙️
      </button>

      <div className="home-card">
        <img src={logo} alt="" style={{ width: "50%", marginBottom: "20px" }} />

        {!connected && <p className="field-error">Conectando ao servidor...</p>}
        {enterError && <p className="field-error">{enterError}</p>}

        <div className="home-actions">
          <button
            className="btn btn-primary btn-block"
            onClick={createRoom}
            disabled={!connected || creating}
          >
            {creating ? "Criando..." : "Criar nova sala"}
          </button>
        </div>

        <div className="home-divider">
          <span>ou</span>
        </div>

        <form
          className="home-join"
          onSubmit={(e) => {
            e.preventDefault();
            joinRoom(joinCode);
          }}
        >
          <label className="field">
            <span>Código da sala</span>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value);
                setEnterError("");
              }}
              placeholder="Digite o código da sala"
              maxLength={36}
            />
          </label>
          <button
            type="submit"
            className="btn btn-outline btn-block"
            disabled={!connected}
          >
            Entrar na sala
          </button>
        </form>
      </div>

      {showSettings && (
        <SettingsModal
          user={user}
          onSave={updateUser}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default App;
