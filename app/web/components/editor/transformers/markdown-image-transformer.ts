import { ElementTransformer, TextMatchTransformer } from '@lexical/markdown'

import { $createImageNode, $isImageNode, ImageNode } from '@/components/editor/nodes/image-node'

// Трансформер для HTML тегов <img> с размерами
export const IMAGE_HTML: ElementTransformer = {
	dependencies: [ImageNode],
	export: () => null,
	regExp: /<img\s+([^>]*)>/,
	replace: (parentNode, _children, match) => {
		const [, attrs] = match
		const srcMatch = attrs.match(/src="([^"]*)"/)
		const altMatch = attrs.match(/alt="([^"]*)"/)
		const widthMatch = attrs.match(/width="(\d+)"/)
		const heightMatch = attrs.match(/height="(\d+)"/)

		if (!srcMatch) return

		const imageNode = $createImageNode({
			src: srcMatch[1],
			altText: altMatch ? altMatch[1] : '',
			width: widthMatch ? parseInt(widthMatch[1]) : undefined,
			height: heightMatch ? parseInt(heightMatch[1]) : undefined,
			maxWidth: 800,
		})

		parentNode.append(imageNode)
	},
	type: 'element',
}

export const IMAGE: TextMatchTransformer = {
	dependencies: [ImageNode],
	export: (node) => {
		if (!$isImageNode(node)) {
			return null
		}

		const altText = node.getAltText()
		const src = node.getSrc()
		const width = node.__width
		const height = node.__height

		// Если есть кастомные размеры, используем HTML синтаксис
		if (width !== 'inherit' || height !== 'inherit') {
			const widthAttr = width !== 'inherit' ? ` width="${width}"` : ''
			const heightAttr = height !== 'inherit' ? ` height="${height}"` : ''
			return `<img src="${src}" alt="${altText}"${widthAttr}${heightAttr} />`
		}

		// Иначе используем стандартный Markdown
		return `![${altText}](${src})`
	},
	importRegExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))/,
	regExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))$/,
	replace: (textNode, match) => {
		const [, altText, src] = match
		const imageNode = $createImageNode({
			altText,
			maxWidth: 800,
			src,
		})
		textNode.replace(imageNode)
	},
	trigger: ')',
	type: 'text-match',
}
