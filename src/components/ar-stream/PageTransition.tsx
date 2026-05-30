'use client';

interface PageTransitionProps {
  children: React.ReactNode;
  sectionKey: string;
}

export default function PageTransition({ children, sectionKey }: PageTransitionProps) {
  return (
    <div key={sectionKey} className="animate-page-in">
      {children}
    </div>
  );
}
