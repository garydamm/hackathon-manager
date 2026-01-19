import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      onCheckedChange?.(e.target.checked)
    }

    return (
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          ref={ref}
          onChange={handleChange}
          {...props}
        />
        <div
          className={cn(
            "h-6 w-11 rounded-full bg-input transition-colors duration-200",
            "peer-checked:bg-primary",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            "after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5",
            "after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200",
            "peer-checked:after:translate-x-5",
            className
          )}
        />
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
