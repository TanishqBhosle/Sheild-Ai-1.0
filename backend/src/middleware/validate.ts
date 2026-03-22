import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'

export const validateBody =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: result.error.flatten().fieldErrors,
        statusCode: 400,
      })
      return
    }
    req.body = result.data
    next()
  }

export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: result.error.flatten().fieldErrors,
        statusCode: 400,
      })
      return
    }
    req.query = result.data as Request['query']
    next()
  }
