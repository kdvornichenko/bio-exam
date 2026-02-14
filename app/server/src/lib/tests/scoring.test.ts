import assert from 'node:assert/strict'

import { createDefaultTestScoringRules, scoreQuestion, scoreQuestionByType } from './scoring.js'

const rules = createDefaultTestScoringRules()

const shortAnswerExact = scoreQuestion({
	questionType: 'short_answer',
	userAnswer: ' МИТОЗ ',
	correctAnswer: 'митоз',
	fallbackMaxPoints: 0,
	rules,
})
assert.equal(shortAnswerExact.earnedPoints, 1)
assert.equal(shortAnswerExact.isCorrect, true)

const shortAnswerWrong = scoreQuestion({
	questionType: 'short_answer',
	userAnswer: 'мейоз',
	correctAnswer: 'митоз',
	fallbackMaxPoints: 0,
	rules,
})
assert.equal(shortAnswerWrong.earnedPoints, 0)

const sequenceExact = scoreQuestion({
	questionType: 'sequence',
	userAnswer: '2314',
	correctAnswer: '2314',
	fallbackMaxPoints: 0,
	rules,
})
assert.equal(sequenceExact.earnedPoints, 2)

const sequenceOneMistake = scoreQuestion({
	questionType: 'sequence',
	userAnswer: '2315',
	correctAnswer: '2314',
	fallbackMaxPoints: 0,
	rules,
})
assert.equal(sequenceOneMistake.earnedPoints, 1)

const sequenceManyMistakes = scoreQuestion({
	questionType: 'sequence',
	userAnswer: '2415',
	correctAnswer: '2314',
	fallbackMaxPoints: 0,
	rules,
})
assert.equal(sequenceManyMistakes.earnedPoints, 0)

const matchingExact = scoreQuestion({
	questionType: 'matching',
	userAnswer: { a: '1', b: '2', c: '3' },
	correctAnswer: { a: '1', b: '2', c: '3' },
	fallbackMaxPoints: 0,
	rules,
})
assert.equal(matchingExact.earnedPoints, 2)

const matchingOneMistake = scoreQuestion({
	questionType: 'matching',
	userAnswer: { a: '1', b: '3', c: '3' },
	correctAnswer: { a: '1', b: '2', c: '3' },
	fallbackMaxPoints: 0,
	rules,
})
assert.equal(matchingOneMistake.earnedPoints, 1)

const matchingManyMistakes = scoreQuestion({
	questionType: 'matching',
	userAnswer: { a: '2', b: '3', c: '1' },
	correctAnswer: { a: '1', b: '2', c: '3' },
	fallbackMaxPoints: 0,
	rules,
})
assert.equal(matchingManyMistakes.earnedPoints, 0)

const checkboxExact = scoreQuestion({
	questionType: 'checkbox',
	userAnswer: ['1', '2', '3'],
	correctAnswer: ['1', '2', '3'],
	fallbackMaxPoints: 0,
	rules,
})
assert.equal(checkboxExact.earnedPoints, 2)

const checkboxOneMistake = scoreQuestion({
	questionType: 'checkbox',
	userAnswer: ['1', '2', '4'],
	correctAnswer: ['1', '2', '3'],
	fallbackMaxPoints: 0,
	rules,
})
assert.equal(checkboxOneMistake.earnedPoints, 1)

const checkboxManyMistakes = scoreQuestion({
	questionType: 'checkbox',
	userAnswer: ['1', '4', '5'],
	correctAnswer: ['1', '2', '3'],
	fallbackMaxPoints: 0,
	rules,
})
assert.equal(checkboxManyMistakes.earnedPoints, 0)

const customTypeRules = {
	custom_sequence: {
		key: 'custom_sequence',
		uiTemplate: 'sequence_digits' as const,
		scoringRule: {
			formula: 'tiers' as const,
			mistakeMetric: 'hamming_digits' as const,
			correctPoints: 3,
			tiers: [
				{ maxMistakes: 1, points: 2 },
				{ maxMistakes: 2, points: 1 },
			],
		},
	},
}

const customExact = scoreQuestionByType({
	questionType: 'custom_sequence',
	userAnswer: '1234',
	correctAnswer: '1234',
	fallbackMaxPoints: 0,
	questionTypesMap: customTypeRules,
})
assert.equal(customExact.earnedPoints, 3)

const customOneMistake = scoreQuestionByType({
	questionType: 'custom_sequence',
	userAnswer: '1235',
	correctAnswer: '1234',
	fallbackMaxPoints: 0,
	questionTypesMap: customTypeRules,
})
assert.equal(customOneMistake.earnedPoints, 2)
