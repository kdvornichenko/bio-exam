'use client'

import { type LucideIcon } from 'lucide-react'
import Link from 'next/link'

import { SidebarGroup, SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar'

export function NavLinks({
	links,
}: {
	links: {
		name: string
		url: string
		icon: LucideIcon
		target?: HTMLAnchorElement['target']
	}[]
}) {
	return (
		<SidebarGroup>
			<SidebarMenu>
				{links.map((item) => (
					<SidebarMenuItem key={item.name}>
						<Link
							className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-ring/15 flex flex-col items-center justify-center gap-2 rounded-xl py-3 transition-colors"
							href={item.url}
							target={item.target}
						>
							<item.icon />
							<span className="text-center text-xs font-medium leading-tight">{item.name}</span>
						</Link>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	)
}
