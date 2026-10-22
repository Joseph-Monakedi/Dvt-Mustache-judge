import React from 'react';

/**
 * Reusable Button Component with Tailwind CSS & App Theme
 * Variants: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger'
 * Sizes: 'sm' | 'md' | 'lg'
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98] overflow-hidden';

  const sizeStyles = {
    sm: 'text-xs px-4 py-4 gap-2 min-h-[38px] rounded-xl',
    md: 'text-sm px-5 py-4.5 gap-2.5 min-h-[44px] rounded-xl',
    lg: 'text-base px-7 py-5.5 gap-3 min-h-[50px] rounded-2xl font-semibold'
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-[#007FBA] to-[#00b4d8] text-white shadow-lg shadow-[#007FBA]/25 hover:shadow-cyan-500/40 hover:brightness-110 border border-cyan-400/30',
    secondary: 'bg-[#131f33] text-[#f0f4f8] border border-white/10 hover:bg-[#1a2b47] hover:border-white/20 shadow-md',
    accent: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold shadow-lg shadow-amber-500/25 hover:brightness-110 border border-yellow-300/40',
    outline: 'bg-transparent text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/10 hover:border-cyan-400 shadow-sm',
    ghost: 'bg-transparent text-slate-300 hover:text-white hover:bg-white/5',
    danger: 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-lg shadow-red-500/25 hover:brightness-110 border border-red-400/30'
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="text-base shrink-0 leading-none" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="text-base shrink-0 leading-none" />}
        </>
      )}
    </button>
  );
}
