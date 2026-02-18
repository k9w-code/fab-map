import React from 'react'
import { cn } from '../../lib/utils'

const Button = React.forwardRef(({ className, variant = 'primary', size = 'default', ...props }, ref) => {
    const variants = {
        primary: 'bg-gold hover:bg-gold-dark text-black font-semibold shadow-[0_0_15px_rgba(212,175,55,0.3)]',
        secondary: 'bg-card hover:bg-neutral-800 text-gold-light border border-gold/30',
        outline: 'bg-transparent border-2 border-gold text-gold hover:bg-gold/10',
        ghost: 'bg-transparent text-gold-light hover:bg-gold/10',
    }

    const sizes = {
        default: 'h-11 px-6 rounded-lg',
        sm: 'h-9 px-4 rounded-md text-sm',
        lg: 'h-13 px-8 rounded-xl text-lg',
        icon: 'h-11 w-11 rounded-full flex items-center justify-center',
    }

    return (
        <button
            ref={ref}
            className={cn(
                'inline-flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    )
})

export { Button }
