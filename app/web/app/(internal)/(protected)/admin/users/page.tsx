import { Metadata } from 'next'

import UsersClient from './UsersClient'

export const metadata: Metadata = { title: 'Users - bio-exam' }

export default function UsersPage() {
	return <UsersClient />
}
