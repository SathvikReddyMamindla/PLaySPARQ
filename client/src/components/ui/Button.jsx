import { motion } from 'framer-motion';

const variants = {
  primary: 'bg-ink text-paper hover:bg-pitch shadow-card',
  volt: 'bg-volt text-volt-ink hover:bg-volt-soft shadow-volt',
  ember: 'bg-ember text-white hover:bg-ember-dark shadow-ember',
  outline: 'border border-ink/20 bg-transparent text-ink hover:border-ink/50 hover:bg-white/60',
  ghost: 'text-ink-soft hover:bg-ink/5 hover:text-ink',
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({ children, variant = 'primary', size = 'md', onClick, className = '', type = 'button', ...props }) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-volt/60 focus:ring-offset-2 focus:ring-offset-paper ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
