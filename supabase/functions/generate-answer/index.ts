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
    const { questionId, documentId } = await req.json();
    console.log(`Generating answer for question: ${questionId}, doc: ${documentId}`);

    if (!questionId || !documentId) {
      return new Response(
        JSON.stringify({ error: "Missing questionId or documentId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the question
    const { data: question, error: qError } = await supabase
      .from("questions")
      .select("*")
      .eq("id", questionId)
      .maybeSingle();

    if (qError || !question) {
      return new Response(
        JSON.stringify({ error: "Question not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retrieve related chunks (RAG retrieval step)
    let chunks;
    if (question.related_chunk_ids && question.related_chunk_ids.length > 0) {
      const { data, error } = await supabase
        .from("chunks")
        .select("*")
        .in("id", question.related_chunk_ids)
        .order("page_number", { ascending: true });
      chunks = data;
      if (error) console.error("Error fetching related chunks:", error);
    }

    // Fallback: search all chunks for the document
    if (!chunks || chunks.length === 0) {
      const { data, error } = await supabase
        .from("chunks")
        .select("*")
        .eq("document_id", documentId)
        .order("page_number", { ascending: true });
      chunks = data;
      if (error) console.error("Error fetching all chunks:", error);
    }

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({ answer: "This topic is not available in the uploaded document." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare context from chunks
    const context = chunks
      .map((c) => `[Page ${c.page_number}, Chunk ${c.chunk_index}]: ${c.paragraph_text}`)
      .join("\n\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a professional study assistant teacher. You answer questions ONLY using the provided document content. You must NEVER use external knowledge or add information not present in the source material.

Your answer MUST follow this exact structure:

## 📖 Definition
Provide a clear, concise definition from the document.

## 📝 Explanation
Explain the concept in simple English that's easy to understand for exam preparation.

## 📊 Diagram
If applicable, provide a simple ASCII/text diagram. If not applicable, write "Not applicable for this topic."

## 🔑 Key Points
List the most important points as bullet points.

## ✅ Advantages
List advantages if mentioned in the document. If not discussed, write "Not discussed in the document."

## ❌ Disadvantages
List disadvantages if mentioned in the document. If not discussed, write "Not discussed in the document."

## 🎯 Conclusion
Provide a brief exam-ready conclusion summarizing the topic.

## 📄 Source
Cite the exact page number(s) and paragraph references from which the answer was derived.

IMPORTANT RULES:
- Use ONLY the provided content below
- Keep language simple and exam-focused
- If the answer is not available in the content, say: "This topic is not available in the uploaded document."
- Never hallucinate or add external knowledge`;

    const userPrompt = `Question: ${question.question_text}

Document Content:
${context}

Generate a structured answer following the mandatory format.`;

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
    const answer = aiResponse.choices?.[0]?.message?.content || "Unable to generate answer.";

    const sourcePages = [...new Set(chunks.map((c) => c.page_number))].sort((a, b) => a - b);

    return new Response(
      JSON.stringify({
        answer,
        sourcePages,
        chunkCount: chunks.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-answer error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
