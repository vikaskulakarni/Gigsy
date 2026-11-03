
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const q = (sp.get("q") || "").trim();
    const status = sp.get("status") || "Open";

    const params: any[] = [status];
    let filter = "WHERE g.status = ?";

    if (q) {
      filter += ` AND (
        g.title LIKE ?
        OR g.description LIKE ?
        OR EXISTS (
          SELECT 1
          FROM gig_skill gs
          JOIN skill s ON s.skill_id = gs.skill_id
          WHERE gs.gig_id = g.gig_id
          AND s.skill_name LIKE ?
        )
      )`;

      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const [rows] = await pool.execute(
      `SELECT
        g.gig_id AS id,
        g.title,
        g.description,
        g.budget_min AS budgetMin,
        g.budget_max AS budgetMax,
        g.deadline,
        g.status,
        g.posted_date AS postedDate,
        u.name AS clientName,
        (
          SELECT GROUP_CONCAT(
            s.skill_name ORDER BY s.skill_name SEPARATOR ','
          )
          FROM gig_skill gs
          JOIN skill s ON s.skill_id = gs.skill_id
          WHERE gs.gig_id = g.gig_id
        ) AS skills
      FROM gig g
      JOIN client c ON c.client_id = g.client_id
      JOIN users u ON u.user_id = c.user_id
      ${filter}
      ORDER BY g.posted_date DESC, g.gig_id DESC`,
      params
    );

    const gigs = (rows as any[]).map((x) => ({
      ...x,
      id: Number(x.id),
      budgetMin: Number(x.budgetMin),
      budgetMax: Number(x.budgetMax),
      tags: x.skills ? String(x.skills).split(",") : [],
    }));

    return NextResponse.json({
      success: true,
      count: gigs.length,
      gigs,
    });
  } catch (e) {
    console.error("Fetch gigs API:", e);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch gigs; verify MySQL schema and connection.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Please sign in." },
      { status: 401 }
    );
  }

  if (user.user_type !== "Client") {
    return NextResponse.json(
      { success: false, message: "Only clients can publish gigs." },
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

  if (title.length < 5 || title.length > 150) {
    return NextResponse.json(
      { success: false, message: "Title must be between 5 and 150 characters." },
      { status: 400 }
    );
  }

  if (description.length < 30) {
    return NextResponse.json(
      { success: false, message: "Description must contain at least 30 characters." },
      { status: 400 }
    );
  }

  if (
    !Number.isFinite(budgetMin) ||
    !Number.isFinite(budgetMax) ||
    budgetMin < 1 ||
    budgetMax < budgetMin
  ) {
    return NextResponse.json(
      { success: false, message: "Enter a valid budget range." },
      { status: 400 }
    );
  }

if (deadline) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadline);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const parsed = new Date(Date.UTC(year, month - 1, day));

    const validDate =
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day;

    if (!validDate) {
      return NextResponse.json(
        { success: false, message: "Enter a valid application deadline." },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json(
      { success: false, message: "Enter a valid application deadline." },
      { status: 400 }
    );
  }
}

  const skillNames = [
    ...new Map(
      String(body.skills || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
        .map((s: string) => [s.toLowerCase(), s.slice(0, 100)])
    ).values(),
  ];

  if (skillNames.length > 20) {
    return NextResponse.json(
      { success: false, message: "You can add up to 20 skills." },
      { status: 400 }
    );
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [clientRows] = await connection.execute(
      "SELECT client_id FROM client WHERE user_id = ? LIMIT 1",
      [user.user_id]
    );

    const client = (clientRows as any[])[0];

    if (!client) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "Client profile not found." },
        { status: 404 }
      );
    }

    const [gigResult] = await connection.execute(
      `INSERT INTO gig
        (client_id, title, description, budget_min, budget_max, deadline, status, posted_date)
       VALUES (?, ?, ?, ?, ?, ?, 'Open', CURDATE())`,
      [
        client.client_id,
        title,
        description,
        budgetMin,
        budgetMax,
        deadline,
      ]
    );

    const gigId = (gigResult as any).insertId;

    for (const skillName of skillNames) {
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
          `INSERT INTO gig_skill (gig_id, skill_id, importance)
           VALUES (?, ?, 'Required')`,
          [gigId, skill.skill_id]
        );
      }
    }

    await connection.commit();

    return NextResponse.json(
      {
        success: true,
        message: "Gig published successfully.",
        gigId,
      },
      { status: 201 }
    );
  } catch (e) {
    await connection.rollback();
    console.error("Publish gig API:", e);

    return NextResponse.json(
      {
        success: false,
        message: "Could not publish gig. Please verify the database schema and try again.",
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
