import React from 'react'
import { cn } from '../../lib/utils'

const Card = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'rounded-xl border border-white/10 bg-card text-gold-light shadow-2xl backdrop-blur-md',
            className
        )}
        {...props}
    />
))

export { Card }
