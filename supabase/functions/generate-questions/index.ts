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
    console.log(`Generating questions for document: ${documentId}`);

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

    // Check if questions already exist
    const { data: existingQuestions } = await supabase
      .from("questions")
      .select("*")
      .eq("document_id", documentId);

    if (existingQuestions && existingQuestions.length > 0) {
      console.log(`Returning ${existingQuestions.length} cached questions`);
      return new Response(
        JSON.stringify({ questions: existingQuestions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch chunks for this document
    const { data: chunks, error: chunkError } = await supabase
      .from("chunks")
      .select("*")
      .eq("document_id", documentId)
      .order("page_number", { ascending: true })
      .order("chunk_index", { ascending: true });

    if (chunkError || !chunks || chunks.length === 0) {
      console.error("Error fetching chunks:", chunkError);
      return new Response(
        JSON.stringify({ error: "No chunks found for this document" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${chunks.length} chunks, generating questions...`);

    // Prepare a summary of all chunks for question generation
    // Send chunks in batches to avoid token limits
    const CHUNKS_PER_BATCH = 15;
    const allQuestions: Array<{ question_text: string; related_chunk_ids: string[] }> = [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    for (let i = 0; i < chunks.length; i += CHUNKS_PER_BATCH) {
      const batchChunks = chunks.slice(i, i + CHUNKS_PER_BATCH);
      const chunkTexts = batchChunks
        .map((c, idx) => `[Chunk ${idx + 1}, Page ${c.page_number}]: ${c.paragraph_text}`)
        .join("\n\n");

      const systemPrompt = `You are an exam question generator for students. Your task is to generate exam-oriented questions from the provided text content.

Rules:
- Generate 3-8 questions per batch depending on content depth
- Questions must be directly answerable from the provided text
- Focus on definitions, explanations, comparisons, advantages/disadvantages
- Use clear, exam-style phrasing like "Explain...", "What is...", "Describe...", "Compare...", "List the advantages of..."
- Do NOT create questions about topics not covered in the text
- Group related concepts together
- Avoid duplicate or overlapping questions`;

      const userPrompt = `Generate exam-oriented questions from the following content. Return ONLY a JSON array of question strings, nothing else.

Content:
${chunkTexts}

Return format: ["Question 1?", "Question 2?", ...]`;

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
          console.error("Rate limited, waiting...");
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        const errorText = await response.text();
        console.error(`AI gateway error: ${response.status}`, errorText);
        continue;
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content || "";

      try {
        // Extract JSON array from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const questions: string[] = JSON.parse(jsonMatch[0]);
          const chunkIds = batchChunks.map((c) => c.id);
          for (const q of questions) {
            if (q && q.trim().length > 10) {
              allQuestions.push({
                question_text: q.trim(),
                related_chunk_ids: chunkIds,
              });
            }
          }
        }
      } catch (parseErr) {
        console.error("Failed to parse questions:", parseErr, content);
      }
    }

    console.log(`Generated ${allQuestions.length} questions total`);

    // Store questions in database
    const questionsToInsert = allQuestions.map((q) => ({
      document_id: documentId,
      question_text: q.question_text,
      related_chunk_ids: q.related_chunk_ids,
    }));

    if (questionsToInsert.length > 0) {
      const { data: insertedQuestions, error: insertError } = await supabase
        .from("questions")
        .insert(questionsToInsert)
        .select();

      if (insertError) {
        console.error("Error inserting questions:", insertError);
        throw new Error(`Failed to store questions: ${insertError.message}`);
      }

      return new Response(
        JSON.stringify({ questions: insertedQuestions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ questions: [], message: "No questions could be generated" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-questions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
