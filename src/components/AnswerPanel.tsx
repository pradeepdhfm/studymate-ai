import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Loader2, SkipForward } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTypingAnimation } from '@/hooks/useTypingAnimation';

interface AnswerResult {
  answer: string;
  sourcePages: number[];
  chunkCount: number;
}

interface AnswerPanelProps {
  answer: AnswerResult | null;
  isLoading: boolean;
  questionText: string | null;
}

export function AnswerPanel({ answer, isLoading, questionText }: AnswerPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { displayedText, isAnimating, isComplete, skip } = useTypingAnimation(
    answer?.answer || null,
    true,
    { charsPerTick: 5, intervalMs: 12 }
  );

  // Auto-scroll during typing animation
  useEffect(() => {
    if (isAnimating && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedText, isAnimating]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="relative">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <div className="absolute inset-0 w-10 h-10 rounded-full bg-primary/20 animate-pulse-glow" />
        </div>
        <div className="text-center">
          <p className="text-foreground font-medium">Generating Answer</p>
          <p className="text-sm text-muted-foreground mt-1">
            Retrieving relevant content from your PDF...
          </p>
        </div>
      </div>
    );
  }

  if (!answer) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-foreground/70 font-medium">Select a Question</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Click on any question from the left panel to see a structured, exam-ready answer generated from your PDF.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Skip button header */}
      {isAnimating && (
        <div className="px-4 py-2 border-b border-border shrink-0 flex justify-end">
          <button
            onClick={skip}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted/60 border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <SkipForward className="w-3 h-3" />
            Skip Animation
          </button>
        </div>
      )}

      <motion.div
        ref={scrollRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-6 overflow-y-auto flex-1 scrollbar-thin"
      >
        {questionText && (
          <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-sm text-primary/70 font-medium mb-1">Question</p>
            <p className="text-foreground font-medium">{questionText}</p>
          </div>
        )}

        <div className="answer-section prose prose-invert max-w-none">
          <ReactMarkdown
            components={{
              h2: ({ children }) => (
                <h2 className="text-primary font-semibold text-base mt-6 mb-3 flex items-center gap-2">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-accent font-medium text-sm mt-4 mb-2">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="text-foreground/90 leading-relaxed mb-3 text-sm">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-1.5 mb-4 text-sm">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-1.5 mb-4 text-sm">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-foreground/85">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="text-accent font-semibold">{children}</strong>
              ),
              code: ({ children }) => (
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-muted/80 p-4 rounded-lg overflow-x-auto mb-4 text-xs font-mono border border-border">
                  {children}
                </pre>
              ),
            }}
          >
            {displayedText}
          </ReactMarkdown>
        </div>

        {/* Source info — shown only after animation completes */}
        {isComplete && answer.sourcePages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 pt-4 border-t border-border"
          >
            <p className="text-xs text-muted-foreground">
              📄 Sources: Pages {answer.sourcePages.join(', ')} •{' '}
              {answer.chunkCount} chunks referenced
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
