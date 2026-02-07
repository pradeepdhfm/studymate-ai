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
    const { documentName, pages } = await req.json();
    console.log(`Processing PDF: ${documentName}, pages: ${pages?.length}`);

    if (!documentName || !pages || !Array.isArray(pages)) {
      return new Response(
        JSON.stringify({ error: "Missing documentName or pages array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create document record
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        name: documentName,
        total_pages: pages.length,
      })
      .select()
      .single();

    if (docError) {
      console.error("Error creating document:", docError);
      throw new Error(`Failed to create document: ${docError.message}`);
    }

    console.log(`Document created: ${doc.id}`);

    // Process pages into chunks
    const chunks: Array<{
      document_id: string;
      page_number: number;
      chunk_index: number;
      paragraph_text: string;
    }> = [];

    for (const page of pages) {
      const { pageNumber, text } = page;
      if (!text || text.trim().length === 0) continue;

      // Split text into paragraphs and clean
      const paragraphs = text
        .split(/\n\s*\n/)
        .map((p: string) => p.replace(/\s+/g, " ").trim())
        .filter((p: string) => p.length > 30); // Filter very short fragments

      // Create overlapping chunks from paragraphs
      let chunkIndex = 0;
      for (let i = 0; i < paragraphs.length; i++) {
        let chunkText = paragraphs[i];

        // Combine short adjacent paragraphs
        while (
          i + 1 < paragraphs.length &&
          chunkText.length < 500 &&
          paragraphs[i + 1].length < 300
        ) {
          i++;
          chunkText += "\n\n" + paragraphs[i];
        }

        // Limit chunk size
        if (chunkText.length > 2000) {
          // Split long chunks at sentence boundaries
          const sentences = chunkText.match(/[^.!?]+[.!?]+/g) || [chunkText];
          let currentChunk = "";
          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > 1500 && currentChunk.length > 200) {
              chunks.push({
                document_id: doc.id,
                page_number: pageNumber,
                chunk_index: chunkIndex++,
                paragraph_text: currentChunk.trim(),
              });
              currentChunk = sentence;
            } else {
              currentChunk += sentence;
            }
          }
          if (currentChunk.trim().length > 30) {
            chunks.push({
              document_id: doc.id,
              page_number: pageNumber,
              chunk_index: chunkIndex++,
              paragraph_text: currentChunk.trim(),
            });
          }
        } else {
          chunks.push({
            document_id: doc.id,
            page_number: pageNumber,
            chunk_index: chunkIndex++,
            paragraph_text: chunkText.trim(),
          });
        }
      }
    }

    console.log(`Created ${chunks.length} chunks`);

    // Insert chunks in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const { error: chunkError } = await supabase.from("chunks").insert(batch);
      if (chunkError) {
        console.error(`Error inserting chunk batch ${i}:`, chunkError);
        throw new Error(`Failed to insert chunks: ${chunkError.message}`);
      }
    }

    // Update document with total chunks
    await supabase
      .from("documents")
      .update({ total_chunks: chunks.length })
      .eq("id", doc.id);

    return new Response(
      JSON.stringify({
        documentId: doc.id,
        totalPages: pages.length,
        totalChunks: chunks.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-pdf error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
