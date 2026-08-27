import { io } from 'socket.io-client'

const URL = 'http://localhost:3000'

function connect() {
  return new Promise((resolve) => {
    const s = io(URL, { transports: ['websocket'] })
    s.on('connect', () => resolve(s))
    s.on('connect_error', (e) => {
      console.error('connect_error', e.message)
      process.exit(1)
    })
  })
}

function nextUpdate(socket) {
  return new Promise((resolve) => {
    socket.once('room:update', (data) => resolve(data))
  })
}

async function main() {
  const a = await connect()
  const b = await connect()

  // cria sala (creator)
  const createAck = await new Promise((res) =>
    a.emit('createRoom', { name: 'Ana' }, res),
  )
  console.log('createRoom =>', JSON.stringify(createAck))
  const { roomId, userId: anaId } = createAck

  // creator entra na sala
  const joinAckA = await new Promise((res) =>
    a.emit('joinRoom', { roomId, name: 'Ana', icon: '🦊', userId: anaId }, res),
  )
  console.log('joinRoom A =>', JSON.stringify(joinAckA))

  // amigo entra na sala
  const joinAckB = await new Promise((res) =>
    b.emit('joinRoom', { roomId, name: 'Bia', icon: '🐼' }, res),
  )
  console.log('joinRoom B =>', JSON.stringify(joinAckB))
  const { playerId: biaId } = joinAckB

  // recebe update inicial
  const upd = await nextUpdate(a)
  console.log('players:', upd.players.map((p) => p.name).join(', '))
  console.log('activeTaskId:', upd.activeTaskId)

  // cria tarefa
  a.emit('task:create', { roomId, title: 'Task A', link: 'https://app.clickup.com/t/1', userId: anaId })
  const upd2 = await nextUpdate(a)
  const task = upd2.tasks.find((t) => t.id === upd2.activeTaskId)
  console.log('task criada:', task.title, 'active:', task.id === upd2.activeTaskId)

  // votos (antes de revelar, deve aparecer 'hidden')
  a.emit('task:vote', { roomId, taskId: task.id, userId: anaId, card: 3 })
  b.emit('task:vote', { roomId, taskId: task.id, userId: biaId, card: 5 })
  await nextUpdate(a)
  const upd3 = await nextUpdate(a)
  const taskV = upd3.tasks.find((t) => t.id === task.id)
  console.log('votes antes de revelar (esperado hidden):', JSON.stringify(taskV.votes))

  // revela
  a.emit('task:reveal', { roomId, taskId: task.id })
  const upd4 = await nextUpdate(a)
  const taskR = upd4.tasks.find((t) => t.id === task.id)
  console.log('revealed:', taskR.revealed, 'result (esperado 4):', taskR.result)
  console.log('votes após revelar:', JSON.stringify(taskR.votes))

  // desmarcar voto (card: null)
  a.emit('task:vote', { roomId, taskId: task.id, userId: anaId, card: null })
  const upd5 = await nextUpdate(a)

  a.disconnect()
  b.disconnect()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
