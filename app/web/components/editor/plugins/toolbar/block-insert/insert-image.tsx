'use client'

import { ImageIcon } from 'lucide-react'

import { useDocPath } from '@/components/editor/context/doc-path-context'
import { useToolbarContext } from '@/components/editor/context/toolbar-context'
import { InsertImageDialog } from '@/components/editor/plugins/images-plugin'
import { SelectItem } from '@/components/ui/select'

export function InsertImage() {
	const { activeEditor, showModal } = useToolbarContext()
	const { docPath } = useDocPath()

	return (
		<SelectItem
			value="image"
			onPointerUp={() => {
				showModal('Insert Image', (onClose) => (
					<InsertImageDialog activeEditor={activeEditor} onClose={onClose} docPath={docPath} />
				))
			}}
			className=""
		>
			<div className="flex items-center gap-1">
				<ImageIcon className="size-4" />
				<span>Image</span>
			</div>
		</SelectItem>
	)
}
