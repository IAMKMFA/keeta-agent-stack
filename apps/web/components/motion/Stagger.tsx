'use client';

import { m } from 'framer-motion';
import type { ReactNode } from 'react';

interface StaggerProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly staggerChildren?: number;
  readonly delayChildren?: number;
}

const containerVariants = {
  hidden: { opacity: 1 },
  show: (custom: { staggerChildren: number; delayChildren: number }) => ({
    opacity: 1,
    transition: {
      staggerChildren: custom.staggerChildren,
      delayChildren: custom.delayChildren,
    },
  }),
};

export function Stagger({
  children,
  className,
  staggerChildren = 0.06,
  delayChildren = 0.05,
}: StaggerProps) {
  return (
    <m.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-10% 0px' }}
      custom={{ staggerChildren, delayChildren }}
    >
      {children}
    </m.div>
  );
}

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

interface StaggerItemProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <m.div variants={itemVariants} className={className}>
      {children}
    </m.div>
  );
}
