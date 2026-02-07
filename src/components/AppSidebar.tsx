import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  HelpCircle,
  MessageCircle,
  History,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export type AppView = 'dashboard' | 'summarizer' | 'questions' | 'chat' | 'saved-chats';

interface AppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const navItems: { id: AppView; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'summarizer', label: 'Summarizer', icon: FileSearch },
  { id: 'questions', label: 'Questions', icon: HelpCircle },
  { id: 'chat', label: 'Ask Doubt', icon: MessageCircle },
  { id: 'saved-chats', label: 'Saved Chats', icon: History },
];

export function AppSidebar({ isOpen, onToggle, currentView, onNavigate }: AppSidebarProps) {
  return (
    <>
      {/* Toggle button - always visible */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-card/80 backdrop-blur-md border border-border/50 hover:bg-muted/80 transition-all duration-200 text-foreground/80 hover:text-foreground"
      >
        {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onToggle}
            className="fixed inset-0 bg-background/40 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed top-0 left-0 h-full w-[260px] z-50 glass-panel-solid border-r border-border/50 flex flex-col"
          >
            {/* Sidebar header */}
            <div className="h-16 flex items-center gap-3 px-5 border-b border-border/50">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground gradient-text text-lg">AI Analyzer</span>
            </div>

            {/* Nav items */}
            <nav className="flex-1 py-4 px-3 space-y-1">
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      onToggle();
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                      ${
                        isActive
                          ? 'bg-primary/15 text-primary border border-primary/20'
                          : 'text-foreground/70 hover:bg-muted/60 hover:text-foreground border border-transparent'
                      }
                    `}
                  >
                    <item.icon className={`w-4.5 h-4.5 ${isActive ? 'text-primary' : ''}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground/60">
                All answers are generated from your PDF content only.
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
