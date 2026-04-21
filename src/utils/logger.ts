import { createLogger, format, transports } from 'winston'
import path from 'path'
import fs   from 'fs'

const logsDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })

const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
    return `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}${metaStr}`
  })
)

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), logFormat)
    }),
    new transports.File({
      filename: path.join(logsDir, 'sync-error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3
    }),
    new transports.File({
      filename: path.join(logsDir, 'sync-combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    })
  ]
})

export function jobLogger(jobId: number) {
  return {
    info:  (msg: string, meta?: object) => logger.info(msg,  { jobId, ...meta }),
    warn:  (msg: string, meta?: object) => logger.warn(msg,  { jobId, ...meta }),
    error: (msg: string, meta?: object) => logger.error(msg, { jobId, ...meta }),
    debug: (msg: string, meta?: object) => logger.debug(msg, { jobId, ...meta })
  }
}