import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();
    console.log(`Summarizing document: ${documentId}`);

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Missing documentId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get document info
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .maybeSingle();

    if (docError || !doc) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retrieve all chunks ordered by page
    const { data: chunks, error: chunkError } = await supabase
      .from("chunks")
      .select("*")
      .eq("document_id", documentId)
      .order("page_number", { ascending: true })
      .order("chunk_index", { ascending: true });

    if (chunkError || !chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({ error: "No content found in document" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context from chunks (limit to prevent token overflow)
    const maxChunks = 60;
    const selectedChunks = chunks.length > maxChunks
      ? selectRepresentativeChunks(chunks, maxChunks)
      : chunks;

    const context = selectedChunks
      .map((c) => `[Page ${c.page_number}, Chunk ${c.chunk_index}]: ${c.paragraph_text}`)
      .join("\n\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a professional study assistant teacher. You must summarize document content ONLY using the provided text. You must NEVER use external knowledge or add information not present in the source material.

Generate a comprehensive, structured summary following this EXACT format:

## 📚 Document Overview
Provide a brief overview of what this document covers (2-3 sentences).

## 📋 Main Topics
List all major topics/chapters covered in the document as bullet points.

## 📖 Topic-wise Summary

For each major topic found in the document, create a subsection:

### [Topic Name]
- **Key Concepts:** List the main concepts discussed
- **Important Definitions:** Include relevant definitions from the text
- **Key Examples:** Include examples if present in the document
- **Summary:** 2-3 sentence summary of this topic

## 🔑 Key Takeaways
List the 5-10 most important points a student should remember for exams.

## 📊 Important Diagrams/Structures
If the document mentions any diagrams, flowcharts, or structures, describe them in ASCII/text format. If none, write "No diagrams found in the document."

## 🎯 Exam Focus Points
List topics most likely to appear in exams based on the depth of coverage in the document.

## 📄 Source Coverage
Mention the page ranges and total pages covered in this summary.

CRITICAL RULES:
- Use ONLY the provided content
- Keep language simple and exam-focused
- Do not add any external knowledge
- If a section has insufficient content, state: "Limited information available in the document."`;

    const userPrompt = `Document: "${doc.name}"
Total Pages: ${doc.total_pages || chunks[chunks.length - 1]?.page_number || "unknown"}
Total Chunks: ${chunks.length}

Document Content:
${context}

Generate a complete structured summary of this document.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error(`AI gateway error: ${response.status}`, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const summary = aiResponse.choices?.[0]?.message?.content || "Unable to generate summary.";

    const sourcePages = [...new Set(selectedChunks.map((c) => c.page_number))].sort((a, b) => a - b);

    return new Response(
      JSON.stringify({
        summary,
        sourcePages,
        chunkCount: selectedChunks.length,
        totalChunks: chunks.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("summarize-pdf error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Select representative chunks evenly distributed across the document
function selectRepresentativeChunks(chunks: any[], maxCount: number): any[] {
  if (chunks.length <= maxCount) return chunks;
  const step = chunks.length / maxCount;
  const selected: any[] = [];
  for (let i = 0; i < maxCount; i++) {
    selected.push(chunks[Math.floor(i * step)]);
  }
  return selected;
}
