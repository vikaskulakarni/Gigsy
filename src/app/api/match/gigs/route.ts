import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import pool from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Sign in for personalized matching." }, { status: 401 });

  try {
    const { query } = await req.json();
    if (typeof query !== "string" || query.trim().length < 2 || query.length > 2000) {
      return NextResponse.json({ success: false, message: "Describe your skills in 2–2000 characters." }, { status: 400 });
    }
    const serviceToken = process.env.CHROMA_SERVICE_TOKEN;
    if (!serviceToken) return NextResponse.json({ success: false, message: "Configure CHROMA_SERVICE_TOKEN in .env.local." }, { status: 503 });
    const serviceUrl = process.env.CHROMA_SERVICE_URL || "http://127.0.0.1:8001";
    const response = await fetch(`${serviceUrl.replace(/\/$/, "")}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-service-token": serviceToken },
      body: JSON.stringify({ query: query.trim(), top_k: 10 }),
      signal: AbortSignal.timeout(60000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Chroma semantic search", response.status, result);
      return NextResponse.json({ success: false, message: `Local semantic service returned ${response.status}. Check that it is running and gigs have been indexed.` }, { status: 502 });
    }
    const points = result.matches || [];
    const ids = points.map((p: any) => Number(p.gig_id)).filter((id: number) => Number.isInteger(id));
    if (!ids.length) return NextResponse.json({ success: true, matches: [] });
    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await pool.query(`SELECT gig_id AS id, title, status, budget_min AS budgetMin, budget_max AS budgetMax FROM gig WHERE status='Open' AND gig_id IN (${placeholders})`, ids);
    const byId = new Map((rows as any[]).map((g) => [Number(g.id), g]));
    const matches = points
      .map((p: any) => ({ score: Number(p.score), gig: byId.get(Number(p.gig_id)) }))
      .filter((m: any) => m.gig);
    return NextResponse.json({ success: true, matches, vectorDatabase: "ChromaDB", embeddingModel: "all-MiniLM-L6-v2" });
  } catch (error) {
    console.error("Semantic matching failed", error);
    return NextResponse.json({ success: false, message: "Matching failed. Start the local Python semantic service and index gigs first." }, { status: 502 });
  }
}
