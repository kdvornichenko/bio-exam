import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { Router } from 'express'
import jwt from 'jsonwebtoken'

import { AUTH_CONFIG } from '../../config/auth.js'
import { db } from '../../db/index.js'
import { users, userRoles } from '../../db/schema.js'
import { ERROR_MESSAGES } from '../../lib/constants.js'
import { setSessionCookie } from '../../middleware/auth/session.js'
import { loginRateLimiter } from '../../middleware/rateLimiter.js'

const router = Router()

// Фиктивный хэш для защиты от timing-атак
// Заранее вычисленный bcrypt хэш случайной строки для использования когда пользователь не существует
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

/**
 * POST /api/auth/login
 * body: { username, password }
 *
 * Защищён rate limiting (5 попыток в минуту на IP)
 * Защищён от timing-атак через constant-time сравнение
 */
router.post('/', loginRateLimiter, async (req, res, next) => {
	try {
		const { username, password } = (req.body ?? {}) as { username?: string; password?: string }
		const login = (username ?? '').toLowerCase().trim()
		if (!login || !password) {
			return res.status(400).json({ error: ERROR_MESSAGES.MISSING_CREDENTIALS })
		}

		const u = await db.query.users.findFirst({ where: eq(users.login, login) })

		// Всегда выполняем bcrypt compare для защиты от timing-атак
		// Используем фиктивный хэш если пользователь не существует для обеспечения постоянного времени
		const hashToCompare = u?.passwordHash || DUMMY_HASH
		const passwordMatches = await bcrypt.compare(password, hashToCompare)

		// Проверяем существование пользователя и валидность пароля
		if (!u || !passwordMatches) {
			return res.status(401).json({ error: ERROR_MESSAGES.INVALID_CREDENTIALS })
		}

		if (!u.isActive) {
			return res.status(403).json({ error: ERROR_MESSAGES.ACCOUNT_NOT_ACTIVATED })
		}

		// Получаем роли из БД
		const rs = await db.select({ role: userRoles.roleKey }).from(userRoles).where(eq(userRoles.userId, u.id))
		const roles = rs.map((r) => r.role)

		const token = jwt.sign(
			{ sub: u.id, login: u.login ?? null, roles },
			AUTH_CONFIG.jwtSecret,
			{ expiresIn: `${AUTH_CONFIG.sessionMaxAgeDays}d` }
		)

		setSessionCookie(res, token, AUTH_CONFIG.sessionMaxAgeSec)
		res.json({ ok: true })
	} catch (e) {
		next(e)
	}
})

export default router


