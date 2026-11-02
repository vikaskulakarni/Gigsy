import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!process.env.INDEXING_SECRET || req.headers.get("x-indexing-secret") !== process.env.INDEXING_SECRET) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const serviceUrl = process.env.CHROMA_SERVICE_URL || "http://127.0.0.1:8001";
  const serviceToken = process.env.CHROMA_SERVICE_TOKEN;
  if (!serviceToken) {
    return NextResponse.json({ success: false, message: "Configure CHROMA_SERVICE_TOKEN in .env.local." }, { status: 503 });
  }

  try {
    const [rows] = await pool.query(`
      SELECT g.gig_id, g.title, g.description,
        (SELECT GROUP_CONCAT(s.skill_name SEPARATOR ', ')
         FROM gig_skill gs JOIN skill s ON s.skill_id = gs.skill_id
         WHERE gs.gig_id = g.gig_id) AS skills
      FROM gig g WHERE g.status = 'Open'
    `);
    const gigs = rows as any[];
    const response = await fetch(`${serviceUrl.replace(/\/$/, "")}/index`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-service-token": serviceToken },
      body: JSON.stringify({ documents: gigs.map((g) => ({
        id: String(g.gig_id),
        title: g.title || "",
        text: `${g.title || ""}. ${g.description || ""}. Skills: ${g.skills || ""}`,
        skills: g.skills || "",
      })) }),
      signal: AbortSignal.timeout(180000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Chroma indexing service", response.status, result);
      return NextResponse.json({ success: false, message: `Local semantic service returned ${response.status}. Check the Python service terminal.` }, { status: 502 });
    }
    return NextResponse.json({ success: true, indexed: result.indexed ?? gigs.length, collection: result.collection || "gigsy_gigs", vectorDatabase: "ChromaDB", embeddingModel: "all-MiniLM-L6-v2" });
  } catch (error) {
    console.error("Gig indexing failed", error);
    return NextResponse.json({ success: false, message: "Could not reach the local ChromaDB embedding service. Start the Python service on port 8001 and verify CHROMA_SERVICE_URL/TOKEN." }, { status: 502 });
  }
}
