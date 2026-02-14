import { Metadata } from 'next'

import QuestionTypesPageClient from './QuestionTypesPageClient'

export const metadata: Metadata = { title: 'Типы вопросов - bio-exam' }

export default function QuestionTypesPage() {
	return <QuestionTypesPageClient />
}
