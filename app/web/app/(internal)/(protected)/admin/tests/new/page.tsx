import { Metadata } from 'next'

import TestEditorClient from '../[id]/TestEditorClient'

export const metadata: Metadata = { title: 'Новый тест - bio-exam' }

export default function NewTestPage() {
	return <TestEditorClient />
}
