import type { ButtonHTMLAttributes, HTMLAttributes } from 'react'
import './WorkspaceControls.css'

// Shared visual rules live here. Feature classes may only add layout constraints.
export function ActionButton({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'icon' }) {
  return <button {...props} type={type} className={`app-action app-action--${variant} ${className}`} />
}

export function SearchBar({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`app-search-bar ${className}`} />
}
