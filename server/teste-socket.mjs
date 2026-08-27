import { io } from 'socket.io-client'
const socket = io('http://localhost:3000', { transports: ['websocket'] })
socket.on('connect', async () => {
  console.log('conectado:', socket.id)
  const rooms = await socket.timeout(2000).emitWithAck('rooms:list')
  console.log('rooms:', rooms)
  socket.close()
  process.exit(0)
})
socket.on('connect_error', (e) => { console.error('erro:', e.message); process.exit(1) })