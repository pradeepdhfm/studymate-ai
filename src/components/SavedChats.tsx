import { motion } from 'framer-motion';
import { History, MessageCircle, Trash2, Clock } from 'lucide-react';

export interface SavedChat {
  id: string;
  title: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  timestamp: number;
  documentName: string;
}

interface SavedChatsProps {
  chats: SavedChat[];
  onOpenChat: (chat: SavedChat) => void;
  onDeleteChat: (id: string) => void;
}

export function SavedChats({ chats, onOpenChat, onDeleteChat }: SavedChatsProps) {
  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
          <History className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-foreground/70 font-medium">No Saved Chats</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Your chat conversations will be saved here automatically. Start asking doubts to see them appear.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full scrollbar-thin">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Saved Chats</h2>
      </div>

      {chats.map((chat, index) => (
        <motion.div
          key={chat.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="group glass-panel p-4 rounded-xl hover:border-primary/30 transition-all duration-200 cursor-pointer"
          onClick={() => onOpenChat(chat)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{chat.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(chat.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • {chat.messages.length} messages
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(chat.id);
              }}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
