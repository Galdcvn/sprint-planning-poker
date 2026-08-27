import { io, type Socket } from 'socket.io-client'

const url = import.meta.env.VITE_API_URL ?? '/'

export function createSocket(): Socket {
  return io(url, {
    autoConnect: false,
    transports: ['websocket'],
  })
}
