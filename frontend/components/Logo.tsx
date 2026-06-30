'use client';

import React from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  linkTo?: string;
  className?: string;
}

const sizeClasses = {
  sm: { icon: 'w-6 h-6', text: 'text-lg', spacing: 'gap-1.5' },
  md: { icon: 'w-8 h-8', text: 'text-xl', spacing: 'gap-2' },
  lg: { icon: 'w-10 h-10', text: 'text-2xl', spacing: 'gap-2.5' },
};

export default function Logo({
  size = 'md',
  showText = true,
  linkTo,
  className = '',
}: LogoProps) {
  const styles = sizeClasses[size];

  const content = (
    <div
      className={`flex items-center ${styles.spacing} ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 bg-primary-700/10 rounded-lg blur-sm" />
        <Building2
          className={`${styles.icon} text-primary-700 relative`}
          strokeWidth={1.75}
        />
      </div>
      {showText && (
        <span
          className={`${styles.text} font-extrabold tracking-tight text-primary-700`}
        >
          ALUMINERO
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return <Link href={linkTo}>{content}</Link>;
  }

  return content;
}
