import Tiles from '@/components/Tiles'

export default function DashboardPage() {
	const panelItems = [{ href: '/dashboard', name: 'DSHB.' }]

	return <Tiles items={panelItems} />
}
