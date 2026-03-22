const log = (severity: string, message: string, data?: object): void => {
  const entry = {
    severity,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  }
  console.log(JSON.stringify(entry))
}

export const logger = {
  info: (msg: string, data?: object) => log('INFO', msg, data),
  warn: (msg: string, data?: object) => log('WARNING', msg, data),
  error: (msg: string, data?: object) => log('ERROR', msg, data),
  debug: (msg: string, data?: object) => {
    if (process.env.NODE_ENV !== 'production') {
      log('DEBUG', msg, data)
    }
  },
}
