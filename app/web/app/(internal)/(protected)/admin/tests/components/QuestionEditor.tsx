'use client'

import { type ReactNode, useCallback, useState } from 'react'

import { Editor } from '@/components/editor/editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import type { Question, QuestionType, QuestionTypeDefinition, QuestionUiTemplate } from '../types'
import { createDefaultMatchingPairs, generateId } from '../types'
import MatchingEditor from './MatchingEditor'
import OptionsEditor from './OptionsEditor'

interface Props {
	question: Question
	questionTypes: QuestionTypeDefinition[]
	onSave: (question: Question) => void
	onCancel: () => void
	docPath?: string
	headerActions?: ReactNode
}

function legacyTypeToTemplate(type: string): QuestionUiTemplate {
	if (type === 'radio') return 'single_choice'
	if (type === 'checkbox') return 'multi_choice'
	if (type === 'matching') return 'matching'
	if (type === 'sequence') return 'sequence_digits'
	return 'short_text'
}

function resolveTemplate(type: string, questionTypes: QuestionTypeDefinition[]): QuestionUiTemplate {
	return questionTypes.find((item) => item.key === type)?.uiTemplate ?? legacyTypeToTemplate(type)
}

function fallbackQuestionTypes(): QuestionTypeDefinition[] {
	return [
		{
			key: 'short_answer',
			title: 'Краткий ответ',
			description: 'Один ответ строкой',
			uiTemplate: 'short_text',
			validationSchema: null,
			scoringRule: { formula: 'exact_match', mistakeMetric: 'compact_text_equal', correctPoints: 1 },
			isSystem: true,
			isActive: true,
		},
		{
			key: 'sequence',
			title: 'Правильная последовательность',
			description: 'Строка из цифр в правильном порядке',
			uiTemplate: 'sequence_digits',
			validationSchema: null,
			scoringRule: {
				formula: 'one_mistake_partial',
				mistakeMetric: 'hamming_digits',
				correctPoints: 2,
				oneMistakePoints: 1,
			},
			isSystem: true,
			isActive: true,
		},
		{
			key: 'checkbox',
			title: 'Множественный выбор',
			description: 'Выбор нескольких вариантов',
			uiTemplate: 'multi_choice',
			validationSchema: null,
			scoringRule: {
				formula: 'one_mistake_partial',
				mistakeMetric: 'set_distance',
				correctPoints: 2,
				oneMistakePoints: 1,
			},
			isSystem: true,
			isActive: true,
		},
		{
			key: 'matching',
			title: 'Сопоставление',
			description: 'Сопоставление пар',
			uiTemplate: 'matching',
			validationSchema: null,
			scoringRule: {
				formula: 'one_mistake_partial',
				mistakeMetric: 'pair_mismatch_count',
				correctPoints: 2,
				oneMistakePoints: 1,
			},
			isSystem: true,
			isActive: true,
		},
		{
			key: 'radio',
			title: 'Один правильный вариант',
			description: 'Один вариант ответа',
			uiTemplate: 'single_choice',
			validationSchema: null,
			scoringRule: { formula: 'exact_match', mistakeMetric: 'boolean_correct', correctPoints: 1 },
			isSystem: true,
			isActive: true,
		},
	]
}

export default function QuestionEditor({ question, questionTypes, onSave, onCancel, docPath, headerActions }: Props) {
	const [form, setForm] = useState<Question>({ ...question })
	const availableQuestionTypes =
		questionTypes.length > 0 ? questionTypes.filter((item) => item.isActive) : fallbackQuestionTypes()
	const activeTemplate = resolveTemplate(form.type, availableQuestionTypes)

	const handlePromptMdxChange = useCallback((mdx: string) => {
		setForm((prev) => ({ ...prev, promptText: mdx }))
	}, [])

	// const handleExplanationMdxChange = useCallback((mdx: string) => {
	// 	setForm((prev) => ({ ...prev, explanationText: mdx || null }))
	// }, [])

	const handleTypeChange = (type: QuestionType) => {
		const template = resolveTemplate(type, availableQuestionTypes)
		const selectedType = availableQuestionTypes.find((item) => item.key === type)
		let newForm: Question = {
			...form,
			type,
			questionUiTemplate: template,
			questionTypeTitle: selectedType?.title ?? form.questionTypeTitle,
		}

		if (template === 'matching') {
			// Switch to matching
			newForm.options = null
			newForm.matchingPairs = form.matchingPairs || createDefaultMatchingPairs()
			newForm.correct = {}
		} else if (template === 'single_choice' || template === 'multi_choice') {
			// Switch to radio/checkbox
			newForm.matchingPairs = null
			newForm.options = form.options || [
				{ id: generateId(), text: '' },
				{ id: generateId(), text: '' },
			]
			newForm.correct = template === 'multi_choice' ? [] : ''
		} else {
			// Switch to short answer / sequence
			newForm.matchingPairs = null
			newForm.options = null
			newForm.correct = typeof form.correct === 'string' ? form.correct : ''
		}

		setForm(newForm)
	}

	const handleSave = () => {
		onSave(form)
	}

	return (
		<div className="flex flex-col gap-3">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div>
						<h1 className="text-2xl font-semibold">{question.id ? 'Редактирование вопроса' : 'Новый вопрос'}</h1>
						<p className="text-muted-foreground">Настройте текст вопроса, варианты ответов и правильный ответ</p>
					</div>
				</div>
				<div className="flex gap-2">
					{headerActions}
					<Button variant="secondary" onClick={onCancel}>
						Отмена
					</Button>
					<Button onClick={handleSave}>Сохранить вопрос</Button>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Вопрос</CardTitle>
				</CardHeader>
				<CardContent>
					<Editor
						initialMdxContent={question.promptText}
						onMdxChange={handlePromptMdxChange}
						placeholder="Введите текст вопроса..."
						preset="full"
						docPath={docPath}
					/>

					{/* <div className="space-y-2">
								<Label>Пояснение к ответу (необязательно)</Label>
								<Editor
									initialMdxContent={question.explanationText || ''}
									onMdxChange={handleExplanationMdxChange}
									placeholder="Пояснение, которое будет показано после ответа..."
									preset="full"
									docPath={docPath}
								/>
							</div> */}
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Ответ</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label>Тип вопроса</Label>
						<Select value={form.type} onValueChange={(v) => handleTypeChange(v as QuestionType)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{availableQuestionTypes.map((item) => (
									<SelectItem key={item.key} value={item.key}>
										{item.title}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{activeTemplate === 'matching' ? (
						<MatchingEditor
							pairs={form.matchingPairs || createDefaultMatchingPairs()}
							correct={(form.correct as Record<string, string>) || {}}
							onChange={(pairs, correct) => setForm({ ...form, matchingPairs: pairs, correct })}
						/>
					) : activeTemplate === 'single_choice' || activeTemplate === 'multi_choice' ? (
						<OptionsEditor
							mode={activeTemplate === 'single_choice' ? 'single' : 'multi'}
							options={form.options || []}
							correct={form.correct}
							onChange={(options, correct) => setForm({ ...form, options, correct })}
						/>
					) : (
						<div className="flex flex-col gap-2">
							<Label>Правильный ответ</Label>
							<Input
								type="text"
								inputMode={activeTemplate === 'sequence_digits' ? 'numeric' : 'text'}
								value={typeof form.correct === 'string' ? form.correct : ''}
								onChange={(e) => setForm((prev) => ({ ...prev, correct: e.target.value }))}
								placeholder={activeTemplate === 'sequence_digits' ? 'Например: 2314' : 'Введите правильный ответ'}
							/>
							<p className="text-muted-foreground text-xs">
								{activeTemplate === 'sequence_digits'
									? 'Используйте только цифры без пробелов.'
									: 'Ответ сравнивается как строка (без учета регистра и пробелов).'}
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
