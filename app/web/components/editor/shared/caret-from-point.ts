interface CaretPosition {
	offsetNode: Node
	offset: number
}

type DocumentWithCaretPosition = Document & {
	caretPositionFromPoint?: (x: number, y: number) => CaretPosition | null
}

export function caretFromPoint(
	x: number,
	y: number
): null | {
	offset: number
	node: Node
} {
	if (typeof document.caretRangeFromPoint !== 'undefined') {
		const range = document.caretRangeFromPoint(x, y)
		if (range === null) {
			return null
		}
		return {
			node: range.startContainer,
			offset: range.startOffset,
		}
	} else if (typeof (document as DocumentWithCaretPosition).caretPositionFromPoint !== 'undefined') {
		const position = (document as DocumentWithCaretPosition).caretPositionFromPoint!(x, y)
		if (position === null) {
			return null
		}
		return {
			node: position.offsetNode,
			offset: position.offset,
		}
	} else {
		// Gracefully handle IE
		return null
	}
}
