import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, FileText, RotateCcw } from 'lucide-react';
import { useStudyAssistant } from '@/hooks/useStudyAssistant';
import { useChatHistory } from '@/hooks/useChatHistory';
import { PdfUpload } from './PdfUpload';
import { AppSidebar, type AppView } from './AppSidebar';
import { Dashboard } from './Dashboard';
import { QuestionsView } from './QuestionsView';
import { ChatView } from './ChatView';
import { SummaryView } from './SummaryView';
import { SavedChats, type SavedChat } from './SavedChats';

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

  const { savedChats, saveChat, deleteChat } = useChatHistory();
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-save chat when leaving chat view with messages
  const handleNavigate = useCallback(
    (view: AppView) => {
      // Save current chat if navigating away from chat with messages
      if (currentView === 'chat' && chatMessages.length > 0 && view !== 'chat') {
        saveChat(chatMessages, documentName);
      }
      setCurrentView(view);
    },
    [currentView, chatMessages, documentName, saveChat]
  );

  const handleOpenSavedChat = useCallback(
    (chat: SavedChat) => {
      // Navigate to chat view — the saved chat messages are displayed read-only
      // For now we just switch to chat view
      setCurrentView('chat');
    },
    []
  );

  // Show upload screen if no document
  if (!documentId) {
    return (
      <div className="min-h-screen gradient-bg-animated flex items-center justify-center">
        <PdfUpload
          onUpload={uploadPdf}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg-animated flex flex-col min-w-[1024px]">
      {/* Sidebar */}
      <AppSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((p) => !p)}
        currentView={currentView}
        onNavigate={handleNavigate}
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-card/30 backdrop-blur-md"
      >
        <div className="flex items-center gap-3 ml-12">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground gradient-text">AI Analyzer</span>
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

      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {currentView === 'dashboard' && (
          <Dashboard
            documentName={documentName}
            questionsCount={questions.length}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'summarizer' && (
          <SummaryView documentId={documentId} documentName={documentName} />
        )}

        {currentView === 'questions' && (
          <QuestionsView
            questions={questions}
            isGeneratingQuestions={isGeneratingQuestions}
            selectedQuestion={selectedQuestion}
            answer={answer}
            isGeneratingAnswer={isGeneratingAnswer}
            onSelectQuestion={generateAnswer}
          />
        )}

        {currentView === 'chat' && (
          <ChatView
            messages={chatMessages}
            isLoading={isChatLoading}
            onSendMessage={sendChatMessage}
          />
        )}

        {currentView === 'saved-chats' && (
          <SavedChats
            chats={savedChats}
            onOpenChat={handleOpenSavedChat}
            onDeleteChat={deleteChat}
          />
        )}
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
