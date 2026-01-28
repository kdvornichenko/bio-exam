/**
 * In-memory rate limiter для auth эндпоинтов
 * Защита от брутфорс-атак на логин
 */

import type { Request, Response, NextFunction } from 'express'
import { ApiError } from '../lib/errors.js'
import { ERROR_MESSAGES } from '../lib/constants.js'

interface RateLimitEntry {
	count: number
	resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Интервал очистки - удаляем истёкшие записи каждые 5 минут
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

setInterval(() => {
	const now = Date.now()
	for (const [key, entry] of store.entries()) {
		if (entry.resetAt <= now) {
			store.delete(key)
		}
	}
}, CLEANUP_INTERVAL_MS)

/**
 * Извлекает IP клиента из запроса
 * Обрабатывает заголовок X-Forwarded-For для проксированных запросов
 */
function getClientIp(req: Request): string {
	const forwarded = req.headers['x-forwarded-for']
	if (typeof forwarded === 'string') {
		return forwarded.split(',')[0].trim()
	}
	return req.socket.remoteAddress || 'unknown'
}

export interface RateLimiterOptions {
	/**
	 * Максимальное количество запросов в окне
	 * @default 5
	 */
	maxAttempts?: number

	/**
	 * Временное окно в миллисекундах
	 * @default 60000 (1 минута)
	 */
	windowMs?: number

	/**
	 * Опциональный префикс ключа для namespace
	 */
	keyPrefix?: string
}

/**
 * Создаёт middleware для ограничения частоты запросов
 *
 * @example
 * router.post('/login', rateLimiter({ maxAttempts: 5, windowMs: 60000 }), handler)
 */
export function rateLimiter(options: RateLimiterOptions = {}) {
	const { maxAttempts = 5, windowMs = 60 * 1000, keyPrefix = '' } = options

	return (req: Request, res: Response, next: NextFunction) => {
		const ip = getClientIp(req)
		const key = keyPrefix ? `${keyPrefix}:${ip}` : ip
		const now = Date.now()

		const entry = store.get(key)

		if (!entry || entry.resetAt <= now) {
			// Первый запрос или окно истекло - создаём новую запись
			store.set(key, { count: 1, resetAt: now + windowMs })
			return next()
		}

		if (entry.count >= maxAttempts) {
			// Лимит превышен
			const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000)
			res.setHeader('Retry-After', String(retryAfterSec))
			res.setHeader('X-RateLimit-Limit', String(maxAttempts))
			res.setHeader('X-RateLimit-Remaining', '0')
			res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)))

			throw ApiError.tooManyRequests(ERROR_MESSAGES.TOO_MANY_REQUESTS)
		}

		// Увеличиваем счётчик
		entry.count++
		res.setHeader('X-RateLimit-Limit', String(maxAttempts))
		res.setHeader('X-RateLimit-Remaining', String(maxAttempts - entry.count))
		res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)))

		next()
	}
}

/**
 * Преднастроенный rate limiter для эндпоинта логина
 * 5 попыток в минуту на IP
 */
export const loginRateLimiter = rateLimiter({
	maxAttempts: 5,
	windowMs: 60 * 1000,
	keyPrefix: 'login',
})
