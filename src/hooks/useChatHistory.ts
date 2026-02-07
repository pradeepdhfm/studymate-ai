import { useState, useCallback, useEffect } from 'react';
import type { SavedChat } from '@/components/SavedChats';

const STORAGE_KEY = 'ai-analyzer-saved-chats';

export function useChatHistory() {
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedChats(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist to localStorage whenever savedChats changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedChats));
  }, [savedChats]);

  const saveChat = useCallback(
    (messages: { role: 'user' | 'assistant'; content: string }[], documentName: string) => {
      if (messages.length === 0) return;

      // Use first user message as title
      const firstUserMsg = messages.find((m) => m.role === 'user');
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 80) + (firstUserMsg.content.length > 80 ? '...' : '')
        : 'Chat';

      const chat: SavedChat = {
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        messages: [...messages],
        timestamp: Date.now(),
        documentName,
      };

      setSavedChats((prev) => [chat, ...prev]);
      return chat.id;
    },
    []
  );

  const deleteChat = useCallback((id: string) => {
    setSavedChats((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    savedChats,
    saveChat,
    deleteChat,
  };
}
