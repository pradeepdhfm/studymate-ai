import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  isDisabled: boolean;
}

export function ChatPanel({ messages, isLoading, onSendMessage, isDisabled }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading || isDisabled) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Doubt Chat</span>
        {isDisabled && (
          <span className="text-xs text-muted-foreground ml-auto">Upload PDF first</span>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageCircle className="w-6 h-6 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              Ask any doubt about your PDF content. Answers will be sourced only from the document.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[90%] rounded-xl px-3 py-2 text-sm
                ${
                  msg.role === 'user'
                    ? 'bg-primary/15 text-foreground border border-primary/20'
                    : 'bg-muted/60 text-foreground border border-border/50'
                }
              `}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => (
                        <h2 className="text-primary font-semibold text-xs mt-3 mb-1.5">{children}</h2>
                      ),
                      p: ({ children }) => (
                        <p className="text-foreground/90 leading-relaxed mb-1.5 text-xs">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-0.5 mb-2 text-xs">{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-foreground/85 text-xs">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-accent font-semibold">{children}</strong>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </motion.div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-muted/60 rounded-xl px-3 py-2 border border-border/50">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isDisabled ? 'Upload a PDF first...' : 'Ask a doubt...'}
            disabled={isDisabled || isLoading}
            className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isDisabled}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
