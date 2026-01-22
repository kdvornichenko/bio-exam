/**
 * Подсвечивает совпадения поискового запроса в тексте, оборачивая их в <mark>.
 * @param text Исходный текст
 * @param query Поисковый запрос
 * @returns HTML-строка с подсветкой или исходный текст
 */
export function highlightText(text: string, query: string): string {
	if (!text || !query) return escapeHtml(text)

	const tokens = tokenize(query.toLowerCase())
	if (!tokens.length) return escapeHtml(text)

	const needles = Array.from(new Set(tokens.map((t) => t.toLowerCase()).filter(Boolean)))
	const rx = new RegExp(needles.map(escapeRegExp).join('|'), 'gi')

	let out = ''
	let last = 0

	for (const m of text.matchAll(rx)) {
		const index = m.index ?? 0
		out += escapeHtml(text.slice(last, index))
		out += '<mark class="bg-yellow-200 dark:bg-yellow-800">' + escapeHtml(m[0]) + '</mark>'
		last = index + m[0].length
	}
	out += escapeHtml(text.slice(last))

	return out
}

/**
 * Простая токенизация запроса по пробелам
 */
function tokenize(query: string): string[] {
	return query
		.trim()
		.split(/\s+/)
		.filter((t) => t.length > 0)
}

/**
 * Экранирует HTML-символы
 */
function escapeHtml(v: string): string {
	return v.replace(/[&<>"']/g, (ch) =>
		ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;'
	)
}

/**
 * Экранирует спецсимволы регулярных выражений
 */
function escapeRegExp(v: string): string {
	return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
