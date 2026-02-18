import React from 'react'
import { cn } from '../../lib/utils'

const Input = React.forwardRef(({ className, ...props }, ref) => {
    return (
        <input
            className={cn(
                'flex h-11 w-11/12 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-gold-light ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus-visible:border-gold/50',
                className
            )}
            ref={ref}
            {...props}
        />
    )
})

export { Input }
