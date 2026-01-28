/**
 * Конфигурация аутентификации
 * Централизованные настройки авторизации для избежания дублирования
 */

import { DEFAULTS } from '../lib/constants.js'

export const AUTH_CONFIG = {
	/**
	 * Секрет для подписи JWT токенов
	 */
	jwtSecret: process.env.AUTH_JWT_SECRET || DEFAULTS.JWT_SECRET,

	/**
	 * Имя cookie для сессии
	 */
	sessionCookieName: process.env.SESSION_COOKIE_NAME || 'bio_exam_session',

	/**
	 * Время жизни сессии в днях
	 */
	sessionMaxAgeDays: Number(process.env.SESSION_MAX_AGE_DAYS ?? DEFAULTS.SESSION_MAX_AGE_DAYS),

	/**
	 * Время жизни сессии в секундах (вычисляемое)
	 */
	get sessionMaxAgeSec(): number {
		return this.sessionMaxAgeDays * 24 * 60 * 60
	},
} as const
