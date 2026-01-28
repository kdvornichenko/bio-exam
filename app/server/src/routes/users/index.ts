import type { RoleKey } from '@bio-exam/rbac'
import { ROLE_KEYS } from '@bio-exam/rbac'

import { desc, eq, sql } from 'drizzle-orm'
import { Router } from 'express'

import { db } from '../../db/index.js'
import { users, userRoles } from '../../db/schema.js'
import { ERROR_MESSAGES } from '../../lib/constants.js'
import { requirePerm } from '../../middleware/auth/requirePerm.js'
import { sessionRequired } from '../../middleware/auth/session.js'
import { validateUUID } from '../../middleware/validateParams.js'
import { PatchUserSchema } from '../../schemas/users.js'
import { invalidateRBACCache } from '../../services/rbac/rbac.js'
import type { UserRow } from '../../types/db/users.js'
import avatarRouter from './avatar.js'
import profileRouter from './profile.js'

const router = Router()

// Подключаем роуты профиля
router.use('/profile', profileRouter)
router.use('/avatar', avatarRouter)

// GET /api/users — JWT + RBAC ('users.read')
router.get('/', sessionRequired(), requirePerm('users', 'read'), async (_req, res, next) => {
	try {
		const rows = await db
			.select({
				id: users.id,
				login: users.login,
				firstName: users.firstName,
				lastName: users.lastName,
				name: users.name,
				avatar: users.avatar,
				avatarCropped: users.avatarCropped,
				avatarColor: users.avatarColor,
				initials: users.initials,
				isActive: users.isActive,
				invitedAt: users.invitedAt,
				activatedAt: users.activatedAt,
				createdAt: users.createdAt,
				createdByName: sql<string | null>`
          coalesce(
            (select coalesce(cb.name, cb.login) from users cb where cb.id = ${users.createdBy}),
            (select coalesce(ub.name, ub.login)
               from invites i
               left join users ub on ub.id = i.created_by
              where i.user_id = ${users.id}
              order by i.created_at desc
              limit 1)
          )
        `.as('createdByName'),
				roles: sql<string[]>`
          coalesce(array_agg(${userRoles.roleKey}) filter (where ${userRoles.roleKey} is not null), '{}')
        `.as('roles'),
				position: users.position,
				birthdate: users.birthdate,
				telegram: users.telegram,
				phone: users.phone,
				email: users.email,
				showInTeam: users.showInTeam,
			})
			.from(users)
			.leftJoin(userRoles, eq(userRoles.userId, users.id))
			.groupBy(
				users.id,
				users.login,
				users.firstName,
				users.lastName,
				users.name,
				users.avatar,
				users.avatarCropped,
				users.avatarColor,
				users.initials,
				users.isActive,
				users.invitedAt,
				users.activatedAt,
				users.createdAt,
				users.createdBy,
				users.position,
				users.birthdate,
				users.telegram,
				users.phone,
				users.email,
				users.showInTeam
			)
			.orderBy(desc(users.createdAt))

		const result: UserRow[] = rows.map((r) => ({
			id: r.id,
			login: r.login,
			firstName: r.firstName,
			lastName: r.lastName,
			name: r.name,
			avatar: r.avatar,
			avatarCropped: r.avatarCropped,
			avatarColor: r.avatarColor,
			initials: r.initials,
			isActive: Boolean(r.isActive),
			invitedAt: r.invitedAt ? new Date(r.invitedAt).toISOString() : null,
			activatedAt: r.activatedAt ? new Date(r.activatedAt).toISOString() : null,
			createdAt: new Date(r.createdAt).toISOString(),
			createdByName: r.createdByName,
			roles: r.roles ?? [],
			position: r.position,
			birthdate: r.birthdate,
			telegram: r.telegram,
			phone: r.phone,
			email: r.email,
			showInTeam: Boolean(r.showInTeam),
		}))

		res.json({ users: result })
	} catch (e) {
		next(e)
	}
})

router.patch('/:id', validateUUID('id'), sessionRequired(), requirePerm('users', 'edit'), async (req, res, next) => {
	try {
		const id = req.params.id as string
		const parsed = PatchUserSchema.safeParse(req.body)
		if (!parsed.success) {
			return res.status(400).json({ error: ERROR_MESSAGES.BAD_REQUEST, details: parsed.error.flatten() })
		}
		const body = parsed.data

		const existing = await db.query.users.findFirst({ where: eq(users.id, id) })
		if (!existing) return res.status(404).json({ error: ERROR_MESSAGES.USER_NOT_FOUND })

		let rolesChanged = false

		const updates: Partial<typeof users.$inferInsert> = {}
		if (body.firstName !== undefined) updates.firstName = body.firstName
		if (body.lastName !== undefined) updates.lastName = body.lastName
		if (body.login !== undefined) updates.login = body.login
		if (body.isActive !== undefined) updates.isActive = body.isActive
		if (body.position !== undefined) updates.position = body.position
		if (body.birthdate !== undefined) updates.birthdate = body.birthdate
		if (body.telegram !== undefined) updates.telegram = body.telegram
		if (body.phone !== undefined) updates.phone = body.phone
		if (body.email !== undefined) updates.email = body.email === '' ? null : body.email
		if (body.showInTeam !== undefined) updates.showInTeam = body.showInTeam

		await db.transaction(async (tx) => {
			if (Object.keys(updates).length > 0) {
				await tx.update(users).set(updates).where(eq(users.id, id))
			}

			if (body.roles) {
				const allow = new Set<string>(ROLE_KEYS as ReadonlyArray<string>)
				const roleKeys = body.roles.filter((r: string): r is RoleKey => allow.has(r))

				await tx.delete(userRoles).where(eq(userRoles.userId, id))
				if (roleKeys.length > 0) {
					await tx.insert(userRoles).values(roleKeys.map((rk: RoleKey) => ({ userId: id, roleKey: rk })))
				}
				rolesChanged = true
			}
		})

		// ВАЖНО: если роли менялись — инвалидируем кэш прав
		if (rolesChanged) invalidateRBACCache()

		return res.json({ ok: true })
	} catch (e) {
		next(e)
	}
})

// DELETE /api/users/:id — удаление пользователя
router.delete('/:id', validateUUID('id'), sessionRequired(), requirePerm('users', 'edit'), async (req, res, next) => {
	try {
		const id = req.params.id as string

		const existing = await db.query.users.findFirst({ where: eq(users.id, id) })
		if (!existing) return res.status(404).json({ error: ERROR_MESSAGES.USER_NOT_FOUND })

		// Удаляем пользователя (каскадное удаление обработает связанные записи)
		await db.delete(users).where(eq(users.id, id))

		// Инвалидируем кэш RBAC, так как пользователь удален
		invalidateRBACCache()

		return res.json({ ok: true })
	} catch (e) {
		next(e)
	}
})

export default router
