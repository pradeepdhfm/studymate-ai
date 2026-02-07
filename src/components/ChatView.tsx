import { ChatPanel } from './ChatPanel';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatViewProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
}

export function ChatView({ messages, isLoading, onSendMessage }: ChatViewProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl h-full glass-panel-solid overflow-hidden flex flex-col">
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          onSendMessage={onSendMessage}
          isDisabled={false}
        />
      </div>
    </div>
  );
}
