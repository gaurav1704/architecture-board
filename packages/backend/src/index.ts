import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { boardRouter } from './routes/boards.js'
import { aiRouter } from './routes/ai.js'
import { setupCollaboration } from './ws/collaboration.js'

const app = express()
const httpServer = createServer(app)
const io = new SocketServer(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

app.use(cors())
app.use(express.json())

app.use('/api/boards', boardRouter)
app.use('/api/ai', aiRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

setupCollaboration(io)

const PORT = parseInt(process.env.PORT || '3001', 10)
httpServer.listen(PORT, () => {
  console.log(`🖥️  Board backend running on http://localhost:${PORT}`)
})
