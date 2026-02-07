import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { QuestionList } from './QuestionList';
import { AnswerPanel } from './AnswerPanel';

interface Question {
  id: string;
  question_text: string;
  related_chunk_ids: string[];
}

interface AnswerResult {
  answer: string;
  sourcePages: number[];
  chunkCount: number;
}

interface QuestionsViewProps {
  questions: Question[];
  isGeneratingQuestions: boolean;
  selectedQuestion: Question | null;
  answer: AnswerResult | null;
  isGeneratingAnswer: boolean;
  onSelectQuestion: (question: Question) => void;
}

export function QuestionsView({
  questions,
  isGeneratingQuestions,
  selectedQuestion,
  answer,
  isGeneratingAnswer,
  onSelectQuestion,
}: QuestionsViewProps) {
  return (
    <div className="flex-1 overflow-hidden h-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left: Question list */}
        <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
          <div className="h-full flex flex-col glass-panel-solid m-2 mr-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                Questions ({questions.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <QuestionList
                questions={questions}
                isLoading={isGeneratingQuestions}
                selectedQuestionId={selectedQuestion?.id || null}
                onSelectQuestion={onSelectQuestion}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-transparent hover:bg-primary/20 transition-colors" />

        {/* Right: Answer */}
        <ResizablePanel defaultSize={65} minSize={40}>
          <div className="h-full glass-panel-solid m-2 ml-0 overflow-hidden">
            <AnswerPanel
              answer={answer}
              isLoading={isGeneratingAnswer}
              questionText={selectedQuestion?.question_text || null}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
