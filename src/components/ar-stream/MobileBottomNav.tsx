'use client';

import { Home, Search, ListChecks, BarChart3, Settings } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { ActiveSection } from '@/lib/store';

interface NavTab {
  id: ActiveSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: NavTab[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'my-lists', label: 'My Lists', icon: ListChecks },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function MobileBottomNav() {
  const { activeSection, setActiveSection } = useAppStore();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="bg-card/80 backdrop-blur-xl border-t border-border/40 pb-safe">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const isActive = activeSection === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`
                  relative flex flex-col items-center justify-center
                  w-full h-full min-h-[44px] min-w-[44px]
                  transition-colors duration-200 ease-out
                  ${isActive ? 'text-ars' : 'text-muted-foreground hover:text-foreground/70'}
                `}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active dot indicator */}
                <span
                  className={`
                    absolute top-1 h-1 rounded-full
                    transition-all duration-300 ease-out
                    ${isActive ? 'w-4 bg-ars opacity-100' : 'w-0 bg-transparent opacity-0'}
                  `}
                />

                <Icon className={`size-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`} />

                <span className="text-[10px] mt-1 font-medium leading-none">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
