import React, { ReactNode } from 'react';

interface GradientCardProps {
  children: ReactNode;
  className?: string;
  gradient?: 'blue' | 'purple' | 'cyan' | 'orange';
}

const GradientCard: React.FC<GradientCardProps> = ({ children, className = '', gradient = 'blue' }) => {
  const getGradient = () => {
    switch (gradient) {
      case 'purple': return 'from-neon-violet/40 via-purple-500/20 to-fuchsia-500/20';
      case 'cyan': return 'from-cyan-500/40 via-teal-500/20 to-emerald-500/20';
      case 'orange': return 'from-orange-500/40 via-amber-600/20 to-yellow-600/20';
      case 'blue': 
      default: return 'from-brand/40 via-blue-500/20 to-indigo-500/20';
    }
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Gradient Border Effect */}
      <div className={`absolute -inset-[1px] bg-gradient-to-r ${getGradient()} rounded-3xl opacity-30 group-hover:opacity-100 transition duration-500`}></div>
      
      {/* Content Container */}
      <div className="relative h-full bg-panel rounded-3xl border border-white/5 p-6 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default GradientCard;