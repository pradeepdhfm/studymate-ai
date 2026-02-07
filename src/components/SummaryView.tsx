import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Loader2, SkipForward } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTypingAnimation } from '@/hooks/useTypingAnimation';

interface SummaryResult {
  summary: string;
  sourcePages: number[];
  chunkCount: number;
  totalChunks: number;
}

interface SummaryViewProps {
  documentId: string;
  documentName: string;
}

export function SummaryView({ documentId, documentName }: SummaryViewProps) {
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { displayedText, isAnimating, isComplete, skip } = useTypingAnimation(
    result?.summary || null,
    true,
    { charsPerTick: 5, intervalMs: 12 }
  );

  // Auto-scroll during typing
  useEffect(() => {
    if (isAnimating && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedText, isAnimating]);

  const generateSummary = async () => {
    setIsLoading(true);
    setResult(null);
    setHasGenerated(true);

    try {
      const { data, error } = await supabase.functions.invoke('summarize-pdf', {
        body: { documentId },
      });

      if (error) throw error;
      setResult(data);
    } catch (err) {
      console.error('Summary generation error:', err);
      toast({
        title: 'Summary Failed',
        description: err instanceof Error ? err.message : 'Unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasGenerated) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 border border-primary/20">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">PDF Summarizer</h2>
          <p className="text-muted-foreground mb-2">
            Generate a complete structured summary of <strong className="text-foreground">{documentName}</strong>
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Includes main topics, key concepts, definitions, examples, and exam focus points — all sourced strictly from your PDF.
          </p>
          <button
            onClick={generateSummary}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Generate Summary
          </button>
        </motion.div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <div className="absolute inset-0 w-10 h-10 rounded-full bg-primary/20 animate-pulse-glow" />
        </div>
        <div className="text-center">
          <p className="text-foreground font-medium">Generating Summary</p>
          <p className="text-sm text-muted-foreground mt-1">
            Analyzing all pages of your PDF...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Document Summary</span>
        </div>
        <div className="flex items-center gap-2">
          {isAnimating && (
            <button
              onClick={skip}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted/60 border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <SkipForward className="w-3 h-3" />
              Skip Animation
            </button>
          )}
          <button
            onClick={generateSummary}
            className="px-3 py-1.5 text-xs rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Summary content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-3xl mx-auto"
        >
          <div className="prose prose-invert max-w-none">
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

          {/* Source info — only shown after animation completes */}
          {isComplete && result && result.sourcePages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 pt-4 border-t border-border"
            >
              <p className="text-xs text-muted-foreground">
                📄 Sources: Pages {result.sourcePages.join(', ')} •{' '}
                {result.chunkCount} of {result.totalChunks} chunks analyzed
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Every answer is generated from this PDF content only, not from outside sources.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
