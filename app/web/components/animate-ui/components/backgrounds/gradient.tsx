'use client'

import * as React from 'react'

import { motion, type HTMLMotionProps } from 'motion/react'

import { cn } from '@/lib/utils/cn'

type GradientBackgroundProps = HTMLMotionProps<'div'>

function GradientBackground({
	className,
	transition = { duration: 15, ease: 'easeInOut', repeat: Infinity },
	...props
}: GradientBackgroundProps) {
	return (
		<motion.div
			data-slot="gradient-background"
			className={cn('bg-linear-to-br bg-size-[400%_400%] size-full from-yellow-100 to-green-100', className)}
			animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
			transition={transition}
			{...props}
		/>
	)
}

export { GradientBackground, type GradientBackgroundProps }
