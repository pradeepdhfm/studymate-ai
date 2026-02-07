
-- Create documents table to store uploaded PDF metadata
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  total_pages INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chunks table to store PDF text chunks with page references
CREATE TABLE public.chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  paragraph_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table to cache generated questions
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  related_chunk_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Public access policies (study tool - no auth required)
CREATE POLICY "Allow public read on documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Allow public insert on documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on documents" ON public.documents FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on documents" ON public.documents FOR DELETE USING (true);

CREATE POLICY "Allow public read on chunks" ON public.chunks FOR SELECT USING (true);
CREATE POLICY "Allow public insert on chunks" ON public.chunks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on chunks" ON public.chunks FOR DELETE USING (true);

CREATE POLICY "Allow public read on questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on questions" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on questions" ON public.questions FOR DELETE USING (true);

-- Index for faster chunk lookups by document
CREATE INDEX idx_chunks_document_id ON public.chunks(document_id);
CREATE INDEX idx_chunks_page_number ON public.chunks(document_id, page_number);
CREATE INDEX idx_questions_document_id ON public.questions(document_id);
