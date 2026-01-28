'use client'

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { JSX, useEffect } from 'react'

import { useReport } from '@/components/editor/editor-hooks/use-report'

const validInputTypes = new Set([
	'insertText',
	'insertCompositionText',
	'insertFromComposition',
	'insertLineBreak',
	'insertParagraph',
	'deleteCompositionText',
	'deleteContentBackward',
	'deleteByComposition',
	'deleteContent',
	'deleteContentForward',
	'deleteWordBackward',
	'deleteWordForward',
	'deleteHardLineBackward',
	'deleteSoftLineBackward',
	'deleteHardLineForward',
	'deleteSoftLineForward',
])

export function TypingPerfPlugin(): JSX.Element | null {
	const report = useReport()
	useEffect(() => {
		let start = 0
		let timerId: ReturnType<typeof setTimeout> | null
		let keyPressTimerId: ReturnType<typeof setTimeout> | null
		const log: Array<DOMHighResTimeStamp> = []
		let invalidatingEvent = false

		const measureEventEnd = function logKeyPress() {
			if (keyPressTimerId != null) {
				if (invalidatingEvent) {
					invalidatingEvent = false
				} else {
					log.push(performance.now() - start)
				}

				clearTimeout(keyPressTimerId)
				keyPressTimerId = null
			}
		}

		const measureEventStart = function measureEvent() {
			if (timerId != null) {
				clearTimeout(timerId)
				timerId = null
			}

			// Мы используем setTimeout(0) вместо requestAnimationFrame из-за
			// несоответствий между последовательностью rAF в разных браузерах.
			keyPressTimerId = setTimeout(measureEventEnd, 0)
			// Запланировать таймер для отчета о результатах.
			// timerId = setTimeout(() => {
			// 	const total = log.reduce((a, b) => a + b, 0)
			// 	const reportedText = 'Typing Perf: ' + Math.round((total / log.length) * 100) / 100 + 'ms'
			// 	// report(reportedText) // Отключено
			// 	log = []
			// }, 2000)
			// Засекаем время после выполнения предыдущей логики, чтобы не измерять накладные расходы
			// на все это.
			start = performance.now()
		}

		const beforeInputHandler = function beforeInputHandler(event: InputEvent) {
			if (!validInputTypes.has(event.inputType) || invalidatingEvent) {
				invalidatingEvent = false
				return
			}

			measureEventStart()
		}

		const keyDownHandler = function keyDownHandler(event: KeyboardEvent) {
			const key = event.key

			if (key === 'Backspace' || key === 'Enter') {
				measureEventStart()
			}
		}

		const pasteHandler = function pasteHandler() {
			invalidatingEvent = true
		}

		const cutHandler = function cutHandler() {
			invalidatingEvent = true
		}

		window.addEventListener('keydown', keyDownHandler, true)
		window.addEventListener('selectionchange', measureEventEnd, true)
		window.addEventListener('beforeinput', beforeInputHandler, true)
		window.addEventListener('paste', pasteHandler, true)
		window.addEventListener('cut', cutHandler, true)

		return () => {
			window.removeEventListener('keydown', keyDownHandler, true)
			window.removeEventListener('selectionchange', measureEventEnd, true)
			window.removeEventListener('beforeinput', beforeInputHandler, true)
			window.removeEventListener('paste', pasteHandler, true)
			window.removeEventListener('cut', cutHandler, true)
		}
	}, [report])

	return null
}
