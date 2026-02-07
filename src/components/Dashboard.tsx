import { motion } from 'framer-motion';
import { FileSearch, HelpCircle, MessageCircle, Sparkles } from 'lucide-react';
import type { AppView } from './AppSidebar';

interface DashboardProps {
  documentName: string;
  questionsCount: number;
  onNavigate: (view: AppView) => void;
}

const features = [
  {
    id: 'chat' as AppView,
    title: 'Summarizer',
    description: 'Get concise summaries of any topic from your PDF. Ask for chapter summaries or key concept overviews.',
    icon: FileSearch,
    gradient: 'from-primary/20 to-primary/5',
    borderColor: 'border-primary/20',
    iconColor: 'text-primary',
  },
  {
    id: 'questions' as AppView,
    title: 'Important Questions',
    description: 'AI-generated exam-oriented questions based on your PDF content with structured, traceable answers.',
    icon: HelpCircle,
    gradient: 'from-accent/20 to-accent/5',
    borderColor: 'border-accent/20',
    iconColor: 'text-accent',
  },
  {
    id: 'chat' as AppView,
    title: 'Ask Doubt',
    description: 'Chat with AI about your PDF. Get instant answers sourced only from your document — no external knowledge.',
    icon: MessageCircle,
    gradient: 'from-success/20 to-success/5',
    borderColor: 'border-success/20',
    iconColor: 'text-success',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', damping: 20, stiffness: 200 },
  },
};

export function Dashboard({ documentName, questionsCount, onNavigate }: DashboardProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
      {/* Welcome section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold gradient-text mb-3">
          Welcome to AI Analyzer
        </h1>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto">
          Your AI-powered study companion. Choose a feature below to get started.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/40 border border-border/50">
          <span className="text-xs text-muted-foreground">
            📄 {documentName} • {questionsCount} questions ready
          </span>
        </div>
      </motion.div>

      {/* Feature cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-3 gap-6 max-w-4xl w-full"
      >
        {features.map((feature, index) => (
          <motion.button
            key={index}
            variants={cardVariants}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate(feature.id)}
            className={`
              relative group p-6 rounded-2xl text-left transition-all duration-300
              glass-panel hover:glow-primary cursor-pointer
              bg-gradient-to-br ${feature.gradient}
              border ${feature.borderColor}
            `}
          >
            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl bg-card/80 flex items-center justify-center mb-4 border border-border/30`}>
              <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
            </div>

            {/* Content */}
            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
              {feature.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.description}
            </p>

            {/* Hover indicator */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-lg">→</span>
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
