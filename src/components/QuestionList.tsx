import { motion } from 'framer-motion';
import { HelpCircle, Loader2 } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  related_chunk_ids: string[];
}

interface QuestionListProps {
  questions: Question[];
  isLoading: boolean;
  selectedQuestionId: string | null;
  onSelectQuestion: (question: Question) => void;
}

export function QuestionList({
  questions,
  isLoading,
  selectedQuestionId,
  onSelectQuestion,
}: QuestionListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Generating exam questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
        <HelpCircle className="w-8 h-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Questions will appear here after PDF processing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 p-2">
      {questions.map((question, index) => (
        <motion.button
          key={question.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.03, duration: 0.2 }}
          onClick={() => onSelectQuestion(question)}
          className={`
            w-full text-left p-3 rounded-lg text-sm transition-all duration-200
            ${
              selectedQuestionId === question.id
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'hover:bg-muted/80 text-foreground/85 border border-transparent'
            }
          `}
        >
          <span className="text-primary/60 font-mono text-xs mr-2">
            {String(index + 1).padStart(2, '0')}
          </span>
          {question.question_text}
        </motion.button>
      ))}
    </div>
  );
}
