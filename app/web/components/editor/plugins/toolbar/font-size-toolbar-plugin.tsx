'use client'

import { $getSelectionStyleValueForProperty, $patchStyleText } from '@lexical/selection'

import { useCallback, useRef, useState } from 'react'

import { $getSelection, $isRangeSelection, BaseSelection } from 'lexical'
import { Minus, Plus } from 'lucide-react'

import { useToolbarContext } from '@/components/editor/context/toolbar-context'
import { useUpdateToolbarHandler } from '@/components/editor/editor-hooks/use-update-toolbar'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const DEFAULT_FONT_SIZE = 16
const MIN_FONT_SIZE = 8
const MAX_FONT_SIZE = 72

const FONT_SIZE_OPTIONS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72]

export function FontSizeToolbarPlugin() {
	const style = 'font-size'
	const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
	const skipNextUpdate = useRef(false)

	const { activeEditor } = useToolbarContext()

	const $updateToolbar = (selection: BaseSelection) => {
		if (skipNextUpdate.current) {
			skipNextUpdate.current = false
			return
		}
		if ($isRangeSelection(selection)) {
			const value = $getSelectionStyleValueForProperty(selection, 'font-size', `${DEFAULT_FONT_SIZE}px`)
			setFontSize(parseInt(value) || DEFAULT_FONT_SIZE)
		}
	}

	useUpdateToolbarHandler($updateToolbar)

	const applyFontSize = useCallback(
		(newSize: number) => {
			const size = Math.min(Math.max(newSize, MIN_FONT_SIZE), MAX_FONT_SIZE)
			skipNextUpdate.current = true
			setFontSize(size)
			activeEditor.update(() => {
				const selection = $getSelection()
				if (selection !== null) {
					$patchStyleText(selection, {
						[style]: `${size}px`,
					})
				}
			})
		},
		[activeEditor, style]
	)

	return (
		<ButtonGroup>
			<Button
				variant="outline"
				size="icon"
				className="h-8 w-8"
				onClick={() => applyFontSize(fontSize - 1)}
				disabled={fontSize <= MIN_FONT_SIZE}
			>
				<Minus className="size-3" />
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" className="h-8 w-12 px-2">
						{fontSize}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="center" className="max-h-60 overflow-y-auto">
					{FONT_SIZE_OPTIONS.map((size) => (
						<DropdownMenuItem
							key={size}
							onClick={() => applyFontSize(size)}
							className={fontSize === size ? 'bg-accent' : ''}
						>
							{size}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
			<Button
				variant="outline"
				size="icon"
				className="h-8 w-8"
				onClick={() => applyFontSize(fontSize + 1)}
				disabled={fontSize >= MAX_FONT_SIZE}
			>
				<Plus className="size-3" />
			</Button>
		</ButtonGroup>
	)
}
