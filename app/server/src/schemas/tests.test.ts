import assert from 'node:assert/strict'

import { SaveTestSchema } from './tests.js'

const basePayload = {
	topicId: '11111111-1111-1111-1111-111111111111',
	title: 'Черновик теста',
	slug: 'chernovik-testa',
	description: null,
	isPublished: false,
	showCorrectAnswer: true,
	timeLimitMinutes: null,
	passingScore: null,
	order: 0,
}

const radioQuestion = {
	type: 'radio' as const,
	order: 0,
	points: 1,
	options: [
		{ id: 'a', text: 'Вариант A' },
		{ id: 'b', text: 'Вариант B' },
	],
	matchingPairs: null,
	promptText: 'Какой вариант правильный?',
	explanationText: null,
	correct: 'a',
}

const draftWithoutQuestions = SaveTestSchema.safeParse({
	...basePayload,
	isPublished: false,
	questions: [],
})

assert.equal(draftWithoutQuestions.success, true)

const publishedWithoutQuestions = SaveTestSchema.safeParse({
	...basePayload,
	isPublished: true,
	questions: [],
})

assert.equal(publishedWithoutQuestions.success, false)
if (publishedWithoutQuestions.success) {
	throw new Error('Published test without questions should be rejected')
}

const hasQuestionsIssue = publishedWithoutQuestions.error.issues.some((issue) => issue.path.join('.') === 'questions')
assert.equal(hasQuestionsIssue, true)

const publishedWithQuestion = SaveTestSchema.safeParse({
	...basePayload,
	isPublished: true,
	questions: [radioQuestion],
})

assert.equal(publishedWithQuestion.success, true)
