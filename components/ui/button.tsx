import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Button Component
 * 
 * Design System compliant button with multiple variants.
 * Supports loading state, icons, and accessibility features.
 * 
 * @see design-system/v0-clone/COMPONENTS.md
 */

const buttonVariants = cva(
  // Base styles - applied to all buttons
  `
    inline-flex items-center justify-center gap-2
    whitespace-nowrap rounded-lg
    text-sm font-semibold
    transition-all duration-200
    cursor-pointer
    select-none
    disabled:pointer-events-none disabled:opacity-50
    [&_svg]:pointer-events-none [&_svg]:shrink-0
    focus-visible:outline-none 
    focus-visible:ring-2 
    focus-visible:ring-cta 
    focus-visible:ring-offset-2 
    focus-visible:ring-offset-background
  `,
  {
    variants: {
      variant: {
        // Default/Primary - CTA green with glow on hover
        default: `
          bg-cta text-white
          hover:bg-cta/90
          hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]
          active:scale-[0.98]
        `,
        // Primary - retained alias for compatibility
        primary: `
          bg-cta text-white
          hover:bg-cta/90
          hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]
          active:scale-[0.98]
        `,
        // Secondary - outlined button
        secondary: `
          bg-transparent text-text
          border border-border
          hover:bg-surface hover:border-cta/50
          active:scale-[0.98]
        `,
        // Ghost - minimal button
        ghost: `
          bg-transparent text-muted
          hover:bg-surface hover:text-text
        `,
        // Destructive - for dangerous actions
        destructive: `
          bg-destructive text-white
          hover:bg-destructive/90
          active:scale-[0.98]
        `,
        // Outline - similar to secondary but different hover
        outline: `
          bg-transparent text-text
          border border-border
          hover:bg-surface
        `,
        // Link - text only
        link: `
          bg-transparent text-cta
          underline-offset-4
          hover:underline
        `,
      },
      size: {
        default: 'h-9 px-4 py-2 text-sm [&_svg]:size-4',
        sm: 'h-8 px-3 py-1.5 text-xs rounded-md [&_svg]:size-4',
        md: 'h-9 px-4 py-2 text-sm [&_svg]:size-4',
        lg: 'h-11 px-6 py-3 text-base [&_svg]:size-5',
        icon: 'h-9 w-9 p-0 rounded-lg [&_svg]:size-5',
        'icon-sm': 'h-8 w-8 p-0 rounded-md [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Render as a different element using Radix Slot
   */
  asChild?: boolean
  /**
   * Show loading spinner and disable button
   */
  loading?: boolean
  /**
   * Icon to display before the text
   */
  leftIcon?: React.ReactNode
  /**
   * Icon to display after the text
   */
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        )}
        {!loading && leftIcon && (
          <span className="shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
