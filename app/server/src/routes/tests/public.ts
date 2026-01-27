/**
 * Публичные API роуты для прохождения тестов (для студентов)
 */
import { and, asc, eq, inArray } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'

import { db } from '../../db/index.js'
import { answerKeys, questions, tests, topics } from '../../db/schema.js'
import { sessionRequired } from '../../middleware/auth/session.js'
import { storageService } from '../../services/storage/storage.js'

const router = Router()

// =============================================================================
// Zod Schemas
// =============================================================================

const SubmitAnswersSchema = z.object({
	answers: z.record(z.string().uuid(), z.any()), // questionId -> answer
})

// =============================================================================
// Endpoints
// =============================================================================

// GET /api/tests/public/topics - список активных тем
router.get('/topics', sessionRequired(), async (_req, res, next) => {
	try {
		const rows = await db
			.select({
				id: topics.id,
				slug: topics.slug,
				title: topics.title,
				description: topics.description,
			})
			.from(topics)
			.where(eq(topics.isActive, true))
			.orderBy(asc(topics.order), asc(topics.title))

		res.json({ topics: rows })
	} catch (e) {
		next(e)
	}
})

// GET /api/tests/public/topics/:slug/tests - список опубликованных тестов в теме
router.get('/topics/:slug/tests', sessionRequired(), async (req, res, next) => {
	try {
		const { slug } = req.params

		const topic = await db.query.topics.findFirst({
			where: eq(topics.slug, slug),
		})

		if (!topic || !topic.isActive) {
			return res.status(404).json({ error: 'Topic not found' })
		}

		const rows = await db
			.select({
				id: tests.id,
				slug: tests.slug,
				title: tests.title,
				description: tests.description,
				timeLimitMinutes: tests.timeLimitMinutes,
				passingScore: tests.passingScore,
			})
			.from(tests)
			.where(and(eq(tests.topicId, topic.id), eq(tests.isPublished, true)))
			.orderBy(asc(tests.order), asc(tests.title))

		res.json({ tests: rows, topicTitle: topic.title })
	} catch (e) {
		next(e)
	}
})

// GET /api/tests/public/tests/:slug - получить тест и вопросы (БЕЗ ОТВЕТОВ)
router.get('/tests/:slug', sessionRequired(), async (req, res, next) => {
	try {
		const { slug } = req.params

		const test = await db.query.tests.findFirst({
			where: and(eq(tests.slug, slug), eq(tests.isPublished, true)),
		})

		if (!test) {
			return res.status(404).json({ error: 'Test not found' })
		}

		const questionRows = await db
			.select({
				id: questions.id,
				type: questions.type,
				order: questions.order,
				points: questions.points,
				options: questions.options,
				matchingPairs: questions.matchingPairs,
				promptPath: questions.promptPath,
			})
			.from(questions)
			.where(eq(questions.testId, test.id))
			.orderBy(asc(questions.order))

		// Загружаем тексты вопросов из Storage
		const questionsWithTexts = await Promise.all(
			questionRows.map(async (q) => {
				const promptText = q.promptPath ? await storageService.readFile(q.promptPath) : ''
				return {
					...q,
					promptText,
				}
			})
		)

		res.json({
			test: {
				id: test.id,
				title: test.title,
				description: test.description,
				timeLimitMinutes: test.timeLimitMinutes,
			},
			questions: questionsWithTexts,
		})
	} catch (e) {
		next(e)
	}
})

// POST /api/tests/public/tests/:id/submit - проверить ответы и вернуть результат
router.post('/tests/:id/submit', sessionRequired(), async (req, res, next) => {
	try {
		const testId = req.params.id
		const parsed = SubmitAnswersSchema.safeParse(req.body)
		if (!parsed.success) {
			return res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() })
		}

		const userAnswers = parsed.data.answers

		// Загружаем вопросы и правильные ответы
		const questionRows = await db.select().from(questions).where(eq(questions.testId, testId))
		const questionIds = questionRows.map((q) => q.id)

		if (questionIds.length === 0) {
			return res.status(404).json({ error: 'Questions not found' })
		}

		const correctAnswers = await db
			.select()
			.from(answerKeys)
			.where(and(inArray(answerKeys.questionId, questionIds), eq(answerKeys.isActive, true)))

		const correctAnswersMap = new Map(correctAnswers.map((ak) => [ak.questionId, ak.correctAnswer]))

		let totalPoints = 0
		let earnedPoints = 0
		const results = []

		for (const q of questionRows) {
			const correctAnswer = correctAnswersMap.get(q.id)
			const userAnswer = userAnswers[q.id]
			let isCorrect = false

			totalPoints += q.points

			// Логика проверки в зависимости от типа вопроса
			if (q.type === 'radio') {
				isCorrect = userAnswer === correctAnswer
			} else if (q.type === 'checkbox') {
				if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
					isCorrect =
						userAnswer.length === correctAnswer.length &&
						userAnswer.every((val) => (correctAnswer as string[]).includes(val))
				}
			} else if (q.type === 'matching') {
				if (typeof userAnswer === 'object' && typeof correctAnswer === 'object') {
					const userEntries = Object.entries(userAnswer || {})
					const correctEntries = Object.entries(correctAnswer || {})
					isCorrect =
						userEntries.length === correctEntries.length &&
						userEntries.every(([key, val]) => (correctAnswer as any)[key] === val)
				}
			}

			if (isCorrect) {
				earnedPoints += q.points
			}

			// Загружаем объяснение если оно есть
			const explanationText = q.explanationPath ? await storageService.readFile(q.explanationPath) : null

			results.push({
				questionId: q.id,
				isCorrect,
				correctAnswer: isCorrect ? null : correctAnswer, // Отдаем правильный ответ только если пользователь ошибся (опционально)
				explanationText,
			})
		}

		const scorePercentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0

		res.json({
			earnedPoints,
			totalPoints,
			scorePercentage,
			results,
		})
	} catch (e) {
		next(e)
	}
})

export default router
