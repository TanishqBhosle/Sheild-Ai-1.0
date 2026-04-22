import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-16 h-16 rounded-2xl',
    xl: 'w-24 h-24 rounded-[2rem]',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center justify-center bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] shadow-lg shadow-purple-500/20 ${sizeClasses[size]} ${className}`}
    >
      <Shield className={`${iconSizes[size]} text-white`} strokeWidth={1.5} />
    </motion.div>
  );
}
