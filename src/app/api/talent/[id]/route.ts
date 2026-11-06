import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid freelancer ID." },
        { status: 400 }
      );
    }

    const [rows] = await pool.execute(
      `SELECT
        u.user_id AS id,
        u.name,
        f.headline,
        f.bio,
        f.experience_years AS experience,
        f.hourly_rate AS hourlyRate,
        f.availability_status AS availability,
        f.portfolio_url AS portfolioUrl,
        f.profile_picture AS profilePicture,
        f.average_rating AS rating,
        f.total_reviews AS reviewCount
      FROM freelancer f
      JOIN users u ON u.user_id = f.user_id
      WHERE u.user_id = ?
      LIMIT 1`,
      [userId]
    );

    const profiles = rows as any[];

    if (!profiles.length) {
      return NextResponse.json(
        { success: false, message: "Freelancer not found." },
        { status: 404 }
      );
    }

    const [skills] = await pool.execute(
      `SELECT s.skill_name AS name, fs.proficiency_level AS proficiency,
              fs.years_experience AS yearsExperience
       FROM freelancer_skill fs
       JOIN skill s ON s.skill_id = fs.skill_id
       JOIN freelancer f ON f.freelancer_id = fs.freelancer_id
       WHERE f.user_id = ?
       ORDER BY s.skill_name`,
      [userId]
    );

    const [reviews] = await pool.execute(
      `SELECT
        r.review_id AS id,
        r.rating,
        r.review_text AS reviewText,
        r.review_date AS reviewDate,
        reviewer.name AS reviewerName
       FROM review r
       JOIN client c ON c.client_id = r.client_id
       JOIN users reviewer ON reviewer.user_id = c.user_id
       JOIN freelancer f ON f.freelancer_id = r.freelancer_id
       WHERE f.user_id = ?
       ORDER BY r.review_date DESC, r.review_id DESC`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      talent: {
        ...profiles[0],
        skills,
        reviews
      }
    });
  } catch (error) {
    console.error("Freelancer profile API error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load freelancer profile." },
      { status: 500 }
    );
  }
}

