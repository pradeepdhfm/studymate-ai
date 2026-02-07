import { useState } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { motion } from 'framer-motion';
import { FileText, RotateCcw, BookOpenCheck } from 'lucide-react';
import { QuestionList } from './QuestionList';
import { AnswerPanel } from './AnswerPanel';
import { ChatPanel } from './ChatPanel';
import { useStudyAssistant } from '@/hooks/useStudyAssistant';
import { PdfUpload } from './PdfUpload';

type LeftTab = 'questions' | 'chat';

export function StudyLayout() {
  const {
    documentId,
    documentName,
    isUploading,
    uploadProgress,
    questions,
    isGeneratingQuestions,
    selectedQuestion,
    answer,
    isGeneratingAnswer,
    chatMessages,
    isChatLoading,
    uploadPdf,
    generateAnswer,
    sendChatMessage,
    resetDocument,
  } = useStudyAssistant();

  const [leftTab, setLeftTab] = useState<LeftTab>('questions');

  // Show upload screen if no document
  if (!documentId) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <PdfUpload
          onUpload={uploadPdf}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-card/30 backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <BookOpenCheck className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground gradient-text">StudyRAG</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-foreground/80 max-w-[200px] truncate">
              {documentName}
            </span>
            <span className="text-xs text-muted-foreground">
              • {questions.length} questions
            </span>
          </div>
          <button
            onClick={resetDocument}
            className="p-2 rounded-lg hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
            title="Upload new PDF"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </motion.header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Questions & Chat */}
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
            <div className="h-full flex flex-col glass-panel-solid m-2 mr-0 overflow-hidden">
              {/* Left panel tabs */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => setLeftTab('questions')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    leftTab === 'questions'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Questions ({questions.length})
                </button>
                <button
                  onClick={() => setLeftTab('chat')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    leftTab === 'chat'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Doubt Chat
                </button>
              </div>

              {/* Left panel content */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {leftTab === 'questions' ? (
                  <QuestionList
                    questions={questions}
                    isLoading={isGeneratingQuestions}
                    selectedQuestionId={selectedQuestion?.id || null}
                    onSelectQuestion={generateAnswer}
                  />
                ) : (
                  <ChatPanel
                    messages={chatMessages}
                    isLoading={isChatLoading}
                    onSendMessage={sendChatMessage}
                    isDisabled={false}
                  />
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-transparent hover:bg-primary/20 transition-colors" />

          {/* Right Panel - Answer */}
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

      {/* Footer badge */}
      <div className="h-8 flex items-center justify-center">
        <p className="text-xs text-muted-foreground/50">
          Every answer is generated from your PDF content only — not from outside sources.
        </p>
      </div>
    </div>
  );
}
