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
    const { documentId, message, chatHistory } = await req.json();
    console.log(`Chat for document: ${documentId}, message: ${message?.substring(0, 50)}`);

    if (!documentId || !message) {
      return new Response(
        JSON.stringify({ error: "Missing documentId or message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // RAG: Retrieve relevant chunks based on the user's message
    // Simple keyword-based retrieval
    const { data: allChunks, error: chunkError } = await supabase
      .from("chunks")
      .select("*")
      .eq("document_id", documentId)
      .order("page_number", { ascending: true });

    if (chunkError || !allChunks || allChunks.length === 0) {
      return new Response(
        JSON.stringify({
          reply: "This topic is not available in the uploaded document.",
          sourcePages: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simple relevance scoring: count keyword matches
    const keywords = message
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 3);

    const scoredChunks = allChunks.map((chunk) => {
      const text = chunk.paragraph_text.toLowerCase();
      let score = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          score += (text.match(new RegExp(keyword, "g")) || []).length;
        }
      }
      return { ...chunk, score };
    });

    // Sort by relevance and take top chunks
    scoredChunks.sort((a, b) => b.score - a.score);
    const relevantChunks = scoredChunks.slice(0, 8).filter((c) => c.score > 0);

    // Fallback: if no keyword match, take first few chunks
    const chunksToUse =
      relevantChunks.length > 0 ? relevantChunks : scoredChunks.slice(0, 5);

    const context = chunksToUse
      .map((c) => `[Page ${c.page_number}]: ${c.paragraph_text}`)
      .join("\n\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a professional study assistant teacher. You help students understand their study material by answering questions based ONLY on the provided document content.

Rules:
- Answer ONLY from the provided document content
- Use simple English that's easy to understand
- Structure your answer clearly with proper formatting
- Always cite the page number(s) where you found the information
- If information is not in the document, say: "This topic is not available in the uploaded document."
- NEVER use external knowledge or hallucinate
- Be exam-focused and concise
- Follow this format for answers:

## 📖 Definition
Clear definition from the document.

## 📝 Explanation
Simple explanation for exam preparation.

## 🔑 Key Points
Important bullet points.

## 🎯 Conclusion
Brief exam-ready summary.

## 📄 Source
Page number(s) referenced.`;

    const messages = [{ role: "system" as const, content: systemPrompt }];

    // Add chat history if available
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory.slice(-6)) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }

    messages.push({
      role: "user" as const,
      content: `Document Content:\n${context}\n\nStudent Question: ${message}`,
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
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

    // Stream the response back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
