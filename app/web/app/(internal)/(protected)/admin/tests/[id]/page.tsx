import { Metadata } from 'next'

import TestEditorClient from './TestEditorClient'

export const metadata: Metadata = { title: 'Редактор теста - bio-exam' }

interface Props {
	params: Promise<{ id: string }>
}

export default async function EditTestPage({ params }: Props) {
	const { id } = await params
	return <TestEditorClient testId={id} />
}
