/**
 * Storage Service для работы с Supabase Storage
 * Если переменные окружения не установлены, операции записи пропускаются с предупреждением
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

import archiver from 'archiver'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'main'

let supabase: SupabaseClient | null = null
let configWarningShown = false

function isConfigured(): boolean {
	return Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY)
}

function showConfigWarning(): void {
	if (!configWarningShown) {
		console.warn('[StorageService] SUPABASE_URL and SUPABASE_SERVICE_KEY not set. Storage operations will be skipped.')
		configWarningShown = true
	}
}

function getClient(): SupabaseClient | null {
	if (!isConfigured()) {
		showConfigWarning()
		return null
	}
	if (!supabase) {
		supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
	}
	return supabase
}

export class StorageService {
	/**
	 * Проверяет, настроен ли Storage
	 */
	isConfigured(): boolean {
		return isConfigured()
	}

	/**
	 * Читает файл из Storage
	 * @param path Путь к файлу (относительно bucket)
	 * @returns Содержимое файла или пустую строку при ошибке
	 */
	async readFile(path: string): Promise<string> {
		const client = getClient()
		if (!client) return ''

		try {
			const { data, error } = await client.storage.from(BUCKET).download(path)
			if (error) {
				console.error(`[StorageService] Error reading file ${path} from bucket "${BUCKET}":`, error)
				return ''
			}
			return await data.text()
		} catch (e) {
			console.error(`[StorageService] Exception reading file ${path}:`, e)
			return ''
		}
	}

	/**
	 * Записывает файл в Storage (создаёт или перезаписывает)
	 * @param path Путь к файлу (относительно bucket)
	 * @param content Содержимое файла
	 */
	async writeFile(path: string, content: string): Promise<void> {
		const client = getClient()
		if (!client) {
			throw new Error('[StorageService] Cannot write: Supabase not configured')
		}

		const { error } = await client.storage.from(BUCKET).upload(path, content, {
			contentType: 'text/markdown',
			upsert: true,
		})

		if (error) {
			console.error(`[StorageService] FAILED to write file ${path}:`, error)
			throw new Error(`Storage error: ${error.message}`)
		}
	}

	/**
	 * Записывает JSON файл в Storage
	 * @param path Путь к файлу (относительно bucket)
	 * @param data Данные для записи
	 */
	async writeJson(path: string, data: unknown): Promise<void> {
		const client = getClient()
		if (!client) {
			throw new Error('[StorageService] Cannot write JSON: Supabase not configured')
		}

		const { error } = await client.storage.from(BUCKET).upload(path, JSON.stringify(data, null, 2), {
			contentType: 'application/json',
			upsert: true,
		})

		if (error) {
			console.error(`[StorageService] FAILED to write JSON ${path}:`, error)
			throw new Error(`Storage error: ${error.message}`)
		}
	}

	/**
	 * Читает JSON файл из Storage
	 * @param path Путь к файлу (относительно bucket)
	 * @returns Распарсенные данные или null при ошибке
	 */
	async readJson<T = unknown>(path: string): Promise<T | null> {
		try {
			const content = await this.readFile(path)
			if (!content) return null
			return JSON.parse(content) as T
		} catch (e) {
			console.error(`Error parsing JSON from ${path}:`, e)
			return null
		}
	}

	/**
	 * Удаляет файлы из Storage
	 * @param paths Массив путей к файлам
	 */
	async deleteFiles(paths: string[]): Promise<void> {
		if (paths.length === 0) return
		const client = getClient()
		if (!client) return

		const { error } = await client.storage.from(BUCKET).remove(paths)
		if (error) {
			console.error(`[StorageService] Error deleting files from bucket "${BUCKET}":`, error)
			throw new Error(`Storage error: ${error.message}`)
		}
	}

	/**
	 * Получает список файлов по prefix
	 * @param prefix Путь к директории
	 * @returns Массив путей к файлам
	 */
	async listFiles(prefix: string): Promise<string[]> {
		const client = getClient()
		if (!client) return []

		const { data, error } = await client.storage.from(BUCKET).list(prefix, { sortBy: { column: 'name', order: 'asc' } })
		if (error) {
			console.error(`Error listing files in ${prefix}:`, error.message)
			return []
		}
		return (data || []).map((f) => `${prefix}/${f.name}`)
	}

	/**
	 * Рекурсивно получает все файлы в директории
	 * @param prefix Путь к директории
	 * @returns Массив путей к файлам
	 */
	async listFilesRecursive(prefix: string): Promise<string[]> {
		const client = getClient()
		if (!client) return []

		const result: string[] = []
		const { data, error } = await client.storage.from(BUCKET).list(prefix, { sortBy: { column: 'name', order: 'asc' } })

		if (error || !data) return result

		for (const item of data) {
			const itemPath = prefix ? `${prefix}/${item.name}` : item.name
			if (item.id === null) {
				// Это директория
				const subFiles = await this.listFilesRecursive(itemPath)
				result.push(...subFiles)
			} else {
				result.push(itemPath)
			}
		}

		return result
	}

	/**
	 * Удаляет директорию рекурсивно
	 * @param prefix Путь к директории
	 */
	async deleteDirectory(prefix: string): Promise<void> {
		const files = await this.listFilesRecursive(prefix)
		if (files.length > 0) {
			await this.deleteFiles(files)
		}
	}

	/**
	 * Создаёт ZIP архив из файлов в Storage
	 * @param basePath Базовый путь в Storage
	 * @param includeAnswers Включать ли файл с ответами
	 * @returns Buffer с ZIP архивом
	 */
	async createZip(basePath: string, includeAnswers: boolean = false): Promise<Buffer> {
		const client = getClient()
		if (!client) {
			throw new Error('Storage not configured. Cannot create ZIP export.')
		}

		const files = await this.listFilesRecursive(basePath)

		return new Promise((resolve, reject) => {
			const archive = archiver('zip', { zlib: { level: 9 } })
			const chunks: Buffer[] = []

			archive.on('data', (chunk: Buffer) => chunks.push(chunk))
			archive.on('end', () => resolve(Buffer.concat(chunks)))
			archive.on('error', reject)

			const downloadAndAdd = async () => {
				for (const filePath of files) {
					// Пропускаем answer_keys.json если не нужны ответы
					if (!includeAnswers && filePath.endsWith('answer_keys.json')) {
						continue
					}

					const { data } = await client.storage.from(BUCKET).download(filePath)
					if (data) {
						const relativePath = filePath.replace(basePath + '/', '')
						const buffer = Buffer.from(await data.arrayBuffer())
						archive.append(buffer, { name: relativePath })
					}
				}
				archive.finalize()
			}

			downloadAndAdd().catch(reject)
		})
	}

	/**
	 * Проверяет существование файла
	 * @param path Путь к файлу
	 * @returns true если файл существует
	 */
	async exists(path: string): Promise<boolean> {
		const client = getClient()
		if (!client) return false

		const { data, error } = await client.storage.from(BUCKET).download(path)
		return !error && data !== null
	}

	/**
	 * Генерирует путь для вопроса
	 * @param topicSlug Slug темы
	 * @param testSlug Slug теста
	 * @param questionId ID вопроса
	 * @returns Базовый путь для файлов вопроса
	 */
	getQuestionPath(topicSlug: string, testSlug: string, questionId: string): string {
		return `topics/${topicSlug}/${testSlug}/questions/${questionId}`
	}

	/**
	 * Генерирует путь для теста
	 * @param topicSlug Slug темы
	 * @param testSlug Slug теста
	 * @returns Базовый путь для файлов теста
	 */
	getTestPath(topicSlug: string, testSlug: string): string {
		return `topics/${topicSlug}/${testSlug}`
	}
}

// Singleton instance
export const storageService = new StorageService()
