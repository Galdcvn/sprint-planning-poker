import { BadRequestException } from '@nestjs/common';
import { PokerService } from './poker.service.js';

describe('PokerService', () => {
  let service: PokerService;

  beforeEach(() => {
    process.env.POKER_DISCONNECT_TIMEOUT_MS = '100';
    service = new PokerService();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.POKER_DISCONNECT_TIMEOUT_MS;
  });

  function setup() {
    const created = service.createRoom({ name: 'Sala A' });
    const { roomId, userId } = created;
    service.joinRoom({ roomId, name: 'João', icon: '🦊', userId });
    return { roomId, userId };
  }

  describe('salas', () => {
    it('cria sala e gera um userId quando não informado', () => {
      const result = service.createRoom({ name: 'Sala A' });
      expect(result.roomId).toBeTruthy();
      expect(result.userId).toBeTruthy();
      expect(result.roomId).not.toBe(result.userId);
      expect(service.getRoom(result.roomId)).toBeDefined();
    });

    it('mantém o userId informado no createRoom', () => {
      const userId = 'uuid-do-cliente';
      const result = service.createRoom({ name: 'Sala A', userId });
      expect(result.userId).toBe(userId);
    });

    it('joinRoom cria um player com nome e ícone', () => {
      const { roomId, userId } = service.createRoom({ name: 'Sala A' });
      service.joinRoom({ roomId, name: 'João', icon: '🦊', userId });
      const player = service.getRoom(roomId)!.players.get(userId);
      expect(player?.name).toBe('João');
      expect(player?.icon).toBe('🦊');
      expect(player?.connected).toBe(true);
    });

    it('não duplica player ao reentrar com o mesmo userId', () => {
      const { roomId, userId } = service.createRoom({ name: 'Sala A' });
      service.joinRoom({ roomId, name: 'João', userId });
      service.joinRoom({ roomId, name: 'João', userId });
      expect(service.getRoom(roomId)!.players.size).toBe(1);
    });

    it('lança erro ao entrar em uma sala inexistente', () => {
      expect(() =>
        service.joinRoom({ roomId: 'nao-existe', name: 'João' }),
      ).toThrow(BadRequestException);
    });

    it('lança erro quando o nome é vazio', () => {
      expect(() => service.createRoom({ name: '  ' })).toThrow(BadRequestException);
    });

    it('remove o player na saída explícita (leaveRoom)', () => {
      const { roomId, userId } = service.createRoom({ name: 'Sala A' });
      service.joinRoom({ roomId, name: 'João', userId });
      service.leaveRoom(roomId, userId);
      expect(service.getRoom(roomId)!.players.has(userId)).toBe(false);
    });

    it('remove votos do player ao sair da sala', () => {
      const { roomId, userId } = setup();
      service.createTask(roomId, 'Tarefa 1', undefined, userId);
      const taskId = service.getRoom(roomId)!.activeTaskId!;
      service.vote(roomId, taskId, userId, 5);
      service.leaveRoom(roomId, userId);
      const room = service.getRoom(roomId)!;
      expect(room.tasks[0].votes.has(userId)).toBe(false);
    });
  });

  describe('tarefas e votação', () => {
    it('cria tarefa e define como ativa', () => {
      const { roomId, userId } = setup();
      service.createTask(roomId, 'Tarefa 1', 'https://link', userId);
      const room = service.getRoom(roomId)!;
      expect(room.tasks.length).toBe(1);
      expect(room.activeTaskId).toBe(room.tasks[0].id);
      expect(room.tasks[0].title).toBe('Tarefa 1');
      expect(room.tasks[0].link).toBe('https://link');
      expect(room.tasks[0].createdBy).toBe(userId);
    });

    it('ativa uma tarefa existente', () => {
      const { roomId, userId } = setup();
      service.createTask(roomId, 'Tarefa 1', undefined, userId);
      service.createTask(roomId, 'Tarefa 2', undefined, userId);
      const room = service.getRoom(roomId)!;
      const firstTaskId = room.tasks[0].id;
      service.activateTask(roomId, firstTaskId);
      expect(service.getRoom(roomId)!.activeTaskId).toBe(firstTaskId);
    });

    it('lança erro ao ativar tarefa inexistente', () => {
      const { roomId, userId } = setup();
      service.createTask(roomId, 'Tarefa 1', undefined, userId);
      expect(() =>
        service.activateTask(roomId, 'id-inexistente'),
      ).toThrow(BadRequestException);
    });

    it('grava voto e permite mudar até o reveal', () => {
      const { roomId, userId } = setup();
      service.createTask(roomId, 'Tarefa 1', undefined, userId);
      const taskId = service.getRoom(roomId)!.activeTaskId!;
      service.vote(roomId, taskId, userId, 5);
      service.vote(roomId, taskId, userId, 8);
      expect(service.getRoom(roomId)!.tasks[0].votes.get(userId)).toBe(8);
    });

    it('lança erro ao votar em tarefa revelada', () => {
      const { roomId, userId } = setup();
      service.createTask(roomId, 'Tarefa 1', undefined, userId);
      const taskId = service.getRoom(roomId)!.activeTaskId!;
      service.vote(roomId, taskId, userId, 5);
      service.reveal(roomId, taskId);
      expect(() => service.vote(roomId, taskId, userId, 8)).toThrow(
        BadRequestException,
      );
    });

    it('lança erro ao votar com carta inválida', () => {
      const { roomId, userId } = setup();
      service.createTask(roomId, 'Tarefa 1', undefined, userId);
      const taskId = service.getRoom(roomId)!.activeTaskId!;
      expect(() => service.vote(roomId, taskId, userId, 99 as never)).toThrow(
        BadRequestException,
      );
    });

    it('revela e calcula a média arredondada', () => {
      const { roomId, userId } = setup();
      const anaId = 'ana-user';
      service.joinRoom({ roomId, name: 'Ana', userId: anaId });

      service.createTask(roomId, 'Tarefa 1', undefined, userId);
      const taskId = service.getRoom(roomId)!.activeTaskId!;

      service.vote(roomId, taskId, userId, 5);
      service.vote(roomId, taskId, anaId, 8);
      service.reveal(roomId, taskId);

      const task = service.getRoom(roomId)!.tasks[0];
      expect(task.revealed).toBe(true);
      expect(task.result).toBe(7);
    });

    it('média de tarefa sem votos numéricos é null', () => {
      const { roomId, userId } = setup();
      service.createTask(roomId, 'Tarefa 1', undefined, userId);
      const taskId = service.getRoom(roomId)!.activeTaskId!;
      service.vote(roomId, taskId, userId, '🍌');
      service.reveal(roomId, taskId);
      expect(service.getRoom(roomId)!.tasks[0].result).toBeNull();
    });

    it('reset limpa votos e estado de revelação', () => {
      const { roomId, userId } = setup();
      service.createTask(roomId, 'Tarefa 1', undefined, userId);
      const taskId = service.getRoom(roomId)!.activeTaskId!;
      service.vote(roomId, taskId, userId, 5);
      service.reveal(roomId, taskId);
      service.resetTask(roomId, taskId);

      const task = service.getRoom(roomId)!.tasks[0];
      expect(task.revealed).toBe(false);
      expect(task.result).toBeNull();
      expect(task.votes.get(userId)).toBeNull();
    });
  });

  describe('visibilidade dos votos no snapshot', () => {
    it('esconde valores antes do reveal e expõe depois', () => {
      const { roomId, userId } = setup();
      service.createTask(roomId, 'Tarefa 1', undefined, userId);
      const taskId = service.getRoom(roomId)!.activeTaskId!;
      service.vote(roomId, taskId, userId, 5);

      const room = service.getRoom(roomId)!;
      const before = service.getRoomView(room).tasks[0];
      expect(before.revealed).toBe(false);
      expect(before.votes[userId]).toBe('hidden');

      service.reveal(roomId, taskId);
      const after = service.getRoomView(room).tasks[0];
      expect(after.revealed).toBe(true);
      expect(after.votes[userId]).toBe(5);
    });
  });

  describe('remoção de jogadores pelo criador', () => {
    it('remove outro jogador e devolve os sockets dele', () => {
      const { roomId, userId } = service.createRoom({ name: 'Sala A' });
      const biaId = 'bia-user';
      service.joinRoom({ roomId, name: 'Bia', icon: '🐼', userId: biaId });
      service.registerSocket(roomId, biaId, 'socket-b');
      service.registerSocket(roomId, biaId, 'socket-b2');

      const socketIds = service.removePlayerByCreator(roomId, userId, biaId);
      expect(socketIds.sort()).toEqual(['socket-b', 'socket-b2']);
      expect(service.getRoom(roomId)!.players.has(biaId)).toBe(false);
    });

    it('lança erro se quem remove não é o criador', () => {
      const { roomId } = service.createRoom({ name: 'Sala A' });
      const biaId = 'bia-user';
      service.joinRoom({ roomId, name: 'Bia', userId: biaId });
      expect(() =>
        service.removePlayerByCreator(roomId, biaId, 'outro'),
      ).toThrow(BadRequestException);
    });

    it('lança erro se o criador tenta remover a si mesmo', () => {
      const { roomId, userId } = service.createRoom({ name: 'Sala A' });
      expect(() =>
        service.removePlayerByCreator(roomId, userId, userId),
      ).toThrow(BadRequestException);
    });

    it('lança erro se o alvo não está na sala', () => {
      const { roomId, userId } = service.createRoom({ name: 'Sala A' });
      expect(() =>
        service.removePlayerByCreator(roomId, userId, 'ghost'),
      ).toThrow(BadRequestException);
    });
  });

  describe('identificador curto da sala', () => {
    it('gera id de 8 caracteres hexagecimais', () => {
      const { roomId } = service.createRoom({ name: 'Sala A' });
      expect(roomId).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  describe('timeout de desconexão', () => {
    it('remove o player após o timeout de desconexão', async () => {
      vi.useFakeTimers();
      service = new PokerService();
      const removals: string[] = [];
      service.setOnPlayerRemoved((roomId) => removals.push(roomId));

      const { roomId, userId } = service.createRoom({ name: 'Sala A' });
      service.joinRoom({ roomId, name: 'João', userId });
      service.registerSocket(roomId, userId, 'socket-1');
      service.unregisterSocket('socket-1');

      expect(service.getRoom(roomId)!.players.size).toBe(1);

      await vi.advanceTimersByTimeAsync(150);

      expect(service.getRoom(roomId)!.players.size).toBe(0);
      expect(removals.length).toBe(1);
    });

    it('reconexão dentro do timeout não remove e não duplica', async () => {
      vi.useFakeTimers();
      service = new PokerService();
      const removals: string[] = [];
      service.setOnPlayerRemoved((roomId) => removals.push(roomId));

      const { roomId, userId } = service.createRoom({ name: 'Sala A' });
      service.joinRoom({ roomId, name: 'João', userId });
      service.registerSocket(roomId, userId, 'socket-1');
      service.unregisterSocket('socket-1');

      service.registerSocket(roomId, userId, 'socket-2');

      await vi.advanceTimersByTimeAsync(150);

      expect(service.getRoom(roomId)!.players.size).toBe(1);
      expect(removals.length).toBe(0);
    });
  });
});
