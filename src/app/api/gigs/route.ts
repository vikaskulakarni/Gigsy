import {NextResponse} from "next/server";import pool from "@/lib/db";
export const dynamic="force-dynamic";
export async function GET(req:Request){try{const sp=new URL(req.url).searchParams,q=(sp.get("q")||"").trim(),status=sp.get("status")||"Open";const p:any[]=[status];let filter="WHERE g.status=?";if(q){filter+=" AND (g.title LIKE ? OR g.description LIKE ? OR EXISTS(SELECT 1 FROM gig_skill gs JOIN skill s ON s.skill_id=gs.skill_id WHERE gs.gig_id=g.gig_id AND s.skill_name LIKE ?))";p.push(`%${q}%`,`%${q}%`,`%${q}%`);}const [rows]=await pool.execute(`SELECT g.gig_id AS id,g.title,g.description,g.budget_min AS budgetMin,g.budget_max AS budgetMax,g.deadline,g.status,g.posted_date AS postedDate,u.name AS clientName,(SELECT GROUP_CONCAT(s.skill_name ORDER BY s.skill_name SEPARATOR ',') FROM gig_skill gs JOIN skill s ON s.skill_id=gs.skill_id WHERE gs.gig_id=g.gig_id) AS skills FROM gig g JOIN client c ON c.client_id=g.client_id JOIN users u ON u.user_id=c.user_id ${filter} ORDER BY g.posted_date DESC,g.gig_id DESC`,p);const gigs=(rows as any[]).map(x=>({...x,id:Number(x.id),budgetMin:Number(x.budgetMin),budgetMax:Number(x.budgetMax),tags:x.skills?String(x.skills).split(","):[]}));return NextResponse.json({success:true,count:gigs.length,gigs});}catch(e){console.error(e);return NextResponse.json({success:false,message:"Unable to fetch gigs; verify MySQL schema and connection."},{status:500});}}

// POST: Create a gig for the authenticated Client.
export async function POST(req: Request) {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Sign in before publishing a gig." },
      { status: 401 }
    );
  }

  if (user.user_type !== "Client") {
    return NextResponse.json(
      { success: false, message: "Only Client accounts can publish gigs." },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const budgetMin = Number(body.budgetMin);
  const budgetMax = Number(body.budgetMax);
  const deadline = body.deadline ? String(body.deadline) : null;

  const rawSkills: unknown[] = Array.isArray(body.skills)
    ? body.skills
    : String(body.skills || "").split(",");

  const skills: string[] = Array.from(
    new Set<string>(
      rawSkills
        .map((s: unknown): string => String(s).trim())
        .filter((s: string) => s.length > 0)
    )
  );

  if (
    title.length < 5 || title.length > 150 ||
    description.length < 30 ||
    !Number.isFinite(budgetMin) || budgetMin <= 0 ||
    !Number.isFinite(budgetMax) || budgetMax < budgetMin ||
    skills.some((s: string) => s.length > 100) ||
    skills.length > 20
  ) {
    return NextResponse.json(
      { success: false, message: "Check the title, description, budget range and skills." },
      { status: 400 }
    );
  }

  if (deadline && (
    !/^\d{4}-\d{2}-\d{2}$/.test(deadline) ||
    !Number.isFinite(Date.parse(`${deadline}T00:00:00Z`)) ||
    new Date(`${deadline}T00:00:00Z`).toISOString().slice(0, 10) !== deadline
  )) {
    return NextResponse.json(
      { success: false, message: "Enter a valid application deadline." },
      { status: 400 }
    );
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [clients] = await connection.execute(
      "SELECT client_id FROM client WHERE user_id = ? LIMIT 1 FOR UPDATE",
      [user.user_id]
    );

    const client = (clients as any[])[0];

    if (!client) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "Client profile not found." },
        { status: 404 }
      );
    }

    const [result] = await connection.execute(
      `INSERT INTO gig
       (client_id, title, description, budget_min, budget_max, deadline, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Open')`,
      [client.client_id, title, description, budgetMin, budgetMax, deadline]
    );

    const gigId = (result as any).insertId;

    for (const skillName of skills) {
      await connection.execute(
        "INSERT IGNORE INTO skill (skill_name) VALUES (?)",
        [skillName]
      );

      const [skillRows] = await connection.execute(
        "SELECT skill_id FROM skill WHERE skill_name = ? LIMIT 1",
        [skillName]
      );

      const skill = (skillRows as any[])[0];

      if (skill) {
        await connection.execute(
          "INSERT INTO gig_skill (gig_id, skill_id, importance) VALUES (?, ?, 'Required')",
          [gigId, skill.skill_id]
        );
      }
    }

    await connection.commit();

    return NextResponse.json(
      { success: true, gigId, message: "Gig published successfully." },
      { status: 201 }
    );
  } catch (error) {
    await connection.rollback();
    console.error("Gig creation error:", error);

    return NextResponse.json(
      { success: false, message: "Could not publish gig. No changes were saved." },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

