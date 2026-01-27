'use client'

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { DRAG_DROP_PASTE } from '@lexical/rich-text'
import { isMimeType, mediaFileReader } from '@lexical/utils'

import { useEffect } from 'react'

import { COMMAND_PRIORITY_LOW } from 'lexical'
import { toast } from 'sonner'

import { useDocPath } from '@/components/editor/context/doc-path-context'
import { INSERT_IMAGE_COMMAND } from '@/components/editor/plugins/images-plugin'
import type { UploadAssetResponse } from '@/types/assets'

const ACCEPTABLE_IMAGE_TYPES = ['image/', 'image/heic', 'image/heif', 'image/gif', 'image/webp']

async function uploadImageToAPI(file: File, docPath?: string): Promise<string | null> {
	try {
		const formData = new FormData()
		formData.append('file', file)
		// docPath опционально для обратной совместимости
		if (docPath) {
			formData.append('docPath', docPath)
		}

		const response = await fetch('/api/docs/assets', {
			method: 'POST',
			body: formData,
		})

		if (!response.ok) {
			throw new Error('Upload failed')
		}

		const data: UploadAssetResponse = await response.json()
		return data.path
	} catch (error) {
		console.error('Error uploading image:', error)
		toast.error('Не удалось загрузить изображение')
		return null
	}
}

export function DragDropPastePlugin(): null {
	const [editor] = useLexicalComposerContext()
	const { docPath } = useDocPath()

	useEffect(() => {
		return editor.registerCommand(
			DRAG_DROP_PASTE,
			(files) => {
				;(async () => {
					// Всегда пытаемся загрузить через API (docPath опционально)
					for (const file of files) {
						if (isMimeType(file, ACCEPTABLE_IMAGE_TYPES)) {
							const src = await uploadImageToAPI(file, docPath)
							if (src) {
								editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
									altText: file.name,
									src,
								})
							} else {
								// Fallback к base64 если загрузка не удалась
								try {
									const filesResult = await mediaFileReader(
										[file],
										[ACCEPTABLE_IMAGE_TYPES].flatMap((x) => x)
									)
									for (const { file: f, result } of filesResult) {
										if (isMimeType(f, ACCEPTABLE_IMAGE_TYPES)) {
											editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
												altText: f.name,
												src: result,
											})
										}
									}
								} catch (e) {
									console.error('Failed to load image as base64:', e)
								}
							}
						}
					}
				})()
				return true
			},
			COMMAND_PRIORITY_LOW
		)
	}, [editor, docPath])
	return null
}
