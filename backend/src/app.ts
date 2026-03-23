import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import router from './routes'
import { errorHandler } from './utils/errors'
import { logger } from './utils/logger'

const app = express()

const ALLOWED_ORIGINS = [
  'https://shieldai.web.app',
  'https://shieldai.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
]

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
        connectSrc: ["'self'", "https://*.firebaseio.com", "https://*.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://*.googleusercontent.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
)

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true)
      }
      // Allow localhost ONLY in non-production environments
      else if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        callback(null, true)
      }
      // Allow configured production origins
      else if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true)
      }
      // Reject all other origins - prevents CSRF attacks
      else {
        callback(new Error('Origin not allowed by CORS policy'))
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Origin', 'Accept'],
    credentials: true,
    maxAge: 86_400,
    optionsSuccessStatus: 200,
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use((req, _res, next) => {
  logger.debug('Request', { method: req.method, path: req.path })
  next()
})

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

app.use('/v1', router)

app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `${req.method} ${req.path} not found`,
    statusCode: 404,
  })
})

app.use(errorHandler)

export default app
