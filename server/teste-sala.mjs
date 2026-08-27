import { io } from 'socket.io-client'

const URL = 'http://localhost:3000'
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const connect = (socket) =>
  new Promise((resolve, reject) => {
    socket.once('connect', resolve)
    socket.once('connect_error', reject)
  })

const socketA = io(URL, { transports: ['websocket'] })
const socketB = io(URL, { transports: ['websocket'] })

socketB.on('room:players-updated', (players) => {
  console.log('[B] room:players-updated ->', JSON.stringify(players))
})

async function main() {
  await Promise.all([connect(socketA), connect(socketB)])
  console.log('A e B conectados')

  const created = await socketA.emitWithAck('createRoom', { name: 'Sala de Teste' })
  console.log('createRoom ->', JSON.stringify(created))

  const { roomId, userId } = created

  await socketA.emitWithAck('joinRoom', { roomId, name: 'João', userId })
  await socketB.emitWithAck('joinRoom', { roomId, name: 'João', userId })
  console.log('A e B entraram na sala com o MESMO userId')

  await wait(300)
  const rooms = await socketA.emitWithAck('rooms:list')
  console.log('rooms:list ->', JSON.stringify(rooms))

  const room = rooms.find((r) => r.id === roomId)
  const pass = room && room.playersCount === 1
  console.log(
    pass
      ? `PASS: 1 player na sala (mesmo uuid nao duplica) @ roomId=${roomId} userId=${userId}`
      : `FAIL: esperado 1 player, veio ${room ? room.playersCount : 'sala nao encontrada'}`,
  )
}

try {
  await main()
} catch (err) {
  console.error('ERRO:', err.message)
} finally {
  socketA.close()
  socketB.close()
  process.exit(0)
}
