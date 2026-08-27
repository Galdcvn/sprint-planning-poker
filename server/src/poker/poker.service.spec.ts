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

  it('cria sala e gera um userId quando nao informado', () => {
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

  it('joinRoom cria um player na sala', () => {
    const { roomId, userId } = service.createRoom({ name: 'Sala A' });
    const result = service.joinRoom({ roomId, name: 'João', userId });
    expect(result.playerId).toBe(userId);
    expect(service.getRoom(roomId)?.players.get(userId)?.name).toBe('João');
  });

  it('não duplica player ao reentrar com o mesmo userId', () => {
    const { roomId, userId } = service.createRoom({ name: 'Sala A' });
    service.joinRoom({ roomId, name: 'João', userId });
    service.joinRoom({ roomId, name: 'João', userId });
    expect(service.getRoom(roomId)?.players.size).toBe(1);
  });

  it('lança erro ao entrar em uma sala inexistente', () => {
    expect(() =>
      service.joinRoom({ roomId: 'nao-existe', name: 'João' }),
    ).toThrow(BadRequestException);
  });

  it('lança erro quando o nome é vazio', () => {
    expect(() => service.createRoom({ name: '  ' })).toThrow(BadRequestException);
  });

  it('remove o player após o timeout de desconexão', async () => {
    vi.useFakeTimers();
    service = new PokerService();
    const removals: Array<{ roomId: string; players: unknown[] }> = [];
    service.setOnPlayerRemoved((roomId, players) =>
      removals.push({ roomId, players }),
    );

    const { roomId, userId } = service.createRoom({ name: 'Sala A' });
    service.joinRoom({ roomId, name: 'João', userId });
    service.registerSocket(roomId, userId, 'socket-1');
    service.unregisterSocket('socket-1');

    expect(service.getRoom(roomId)?.players.size).toBe(1);

    await vi.advanceTimersByTimeAsync(150);

    expect(service.getRoom(roomId)?.players.size).toBe(0);
    expect(removals.length).toBe(1);
  });

  it('reconexão dentro do timeout não remove e não duplica', async () => {
    vi.useFakeTimers();
    service = new PokerService();
    const removals: Array<{ roomId: string; players: unknown[] }> = [];
    service.setOnPlayerRemoved((roomId, players) =>
      removals.push({ roomId, players }),
    );

    const { roomId, userId } = service.createRoom({ name: 'Sala A' });
    service.joinRoom({ roomId, name: 'João', userId });
    service.registerSocket(roomId, userId, 'socket-1');
    service.unregisterSocket('socket-1');

    // novo socket do mesmo usuário reconecta antes do timeout
    service.registerSocket(roomId, userId, 'socket-2');

    await vi.advanceTimersByTimeAsync(150);

    expect(service.getRoom(roomId)?.players.size).toBe(1);
    expect(removals.length).toBe(0);
  });
});
