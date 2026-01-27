'use client'

import { $getSelectionStyleValueForProperty, $patchStyleText } from '@lexical/selection'

import { useCallback, useRef, useState } from 'react'

import { $getSelection, $isRangeSelection, BaseSelection } from 'lexical'
import { TextQuote } from 'lucide-react'

import { useToolbarContext } from '@/components/editor/context/toolbar-context'
import { useUpdateToolbarHandler } from '@/components/editor/editor-hooks/use-update-toolbar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const LINE_HEIGHT_OPTIONS = [
	{ label: '1', value: '1' },
	{ label: '1.15', value: '1.15' },
	{ label: '1.5', value: '1.5' },
	{ label: '2', value: '2' },
	{ label: '2.5', value: '2.5' },
	{ label: '3', value: '3' },
]

const DEFAULT_LINE_HEIGHT = '1.5'

export function LineHeightToolbarPlugin() {
	const [lineHeight, setLineHeight] = useState(DEFAULT_LINE_HEIGHT)
	const skipNextUpdate = useRef(false)
	const { activeEditor } = useToolbarContext()

	const $updateToolbar = (selection: BaseSelection) => {
		if (skipNextUpdate.current) {
			skipNextUpdate.current = false
			return
		}
		if ($isRangeSelection(selection)) {
			const value = $getSelectionStyleValueForProperty(selection, 'line-height', DEFAULT_LINE_HEIGHT)
			setLineHeight(value || DEFAULT_LINE_HEIGHT)
		}
	}

	useUpdateToolbarHandler($updateToolbar)

	const updateLineHeight = useCallback(
		(newValue: string) => {
			skipNextUpdate.current = true
			setLineHeight(newValue)
			activeEditor.update(() => {
				const selection = $getSelection()
				if (selection !== null) {
					$patchStyleText(selection, {
						'line-height': newValue,
					})
				}
			})
		},
		[activeEditor]
	)

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 gap-1 px-2" title="Межстрочный интервал">
					<TextQuote className="size-4" />
					<span className="text-xs">{lineHeight}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				{LINE_HEIGHT_OPTIONS.map((option) => (
					<DropdownMenuItem
						key={option.value}
						onClick={() => updateLineHeight(option.value)}
						className={lineHeight === option.value ? 'bg-accent' : ''}
					>
						{option.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
