import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extractTextFromPdf } from '@/lib/pdfUtils';
import { toast } from '@/hooks/use-toast';

interface Question {
  id: string;
  question_text: string;
  related_chunk_ids: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnswerResult {
  answer: string;
  sourcePages: number[];
  chunkCount: number;
}

export function useStudyAssistant() {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState<AnswerResult | null>(null);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const uploadPdf = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Extract text client-side
      setUploadProgress(30);
      const pages = await extractTextFromPdf(file);
      setUploadProgress(60);

      if (pages.length === 0) {
        toast({
          title: 'Error',
          description: 'No text could be extracted from this PDF.',
          variant: 'destructive',
        });
        return;
      }

      // Send to backend for chunking and storage
      const { data, error } = await supabase.functions.invoke('process-pdf', {
        body: {
          documentName: file.name,
          pages: pages.map(p => ({ pageNumber: p.pageNumber, text: p.text })),
        },
      });

      setUploadProgress(90);

      if (error) throw error;

      setDocumentId(data.documentId);
      setDocumentName(file.name);
      setUploadProgress(100);
      setQuestions([]);
      setAnswer(null);
      setSelectedQuestion(null);
      setChatMessages([]);

      toast({
        title: 'PDF Processed',
        description: `${data.totalPages} pages, ${data.totalChunks} chunks extracted.`,
      });

      // Auto-generate questions
      await generateQuestions(data.documentId);
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: 'Upload Failed',
        description: err instanceof Error ? err.message : 'Unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const generateQuestions = useCallback(async (docId: string) => {
    setIsGeneratingQuestions(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: { documentId: docId },
      });

      if (error) throw error;

      setQuestions(data.questions || []);

      if (data.questions?.length === 0) {
        toast({
          title: 'No Questions',
          description: 'Could not generate questions from this document.',
        });
      }
    } catch (err) {
      console.error('Generate questions error:', err);
      toast({
        title: 'Question Generation Failed',
        description: err instanceof Error ? err.message : 'Unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  }, []);

  const generateAnswer = useCallback(async (question: Question) => {
    if (!documentId) return;

    setSelectedQuestion(question);
    setIsGeneratingAnswer(true);
    setAnswer(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-answer', {
        body: {
          questionId: question.id,
          documentId,
        },
      });

      if (error) throw error;

      setAnswer(data);
    } catch (err) {
      console.error('Generate answer error:', err);
      toast({
        title: 'Answer Generation Failed',
        description: err instanceof Error ? err.message : 'Unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAnswer(false);
    }
  }, [documentId]);

  const sendChatMessage = useCallback(async (message: string) => {
    if (!documentId || !message.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: message };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    let assistantContent = '';

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            documentId,
            message,
            chatHistory: chatMessages.slice(-6),
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Request failed: ${response.status}`);
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const upsertAssistant = (content: string) => {
        assistantContent = content;
        setChatMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content } : m
            );
          }
          return [...prev, { role: 'assistant', content }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              upsertAssistant(assistantContent);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              upsertAssistant(assistantContent);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      toast({
        title: 'Chat Error',
        description: err instanceof Error ? err.message : 'Failed to get response.',
        variant: 'destructive',
      });
      // Remove the user message if failed
      setChatMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setIsChatLoading(false);
    }
  }, [documentId, chatMessages]);

  const resetDocument = useCallback(() => {
    setDocumentId(null);
    setDocumentName('');
    setQuestions([]);
    setSelectedQuestion(null);
    setAnswer(null);
    setChatMessages([]);
  }, []);

  return {
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
  };
}
