
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Please sign in." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const [rows] = await pool.execute(
      `SELECT
          gc.contract_id AS id,
          gc.status,
          gc.agreed_amount AS agreedAmount,
          gc.delivery_days AS deliveryDays,
          gc.created_at AS createdAt,
          g.gig_id AS gigId,
          g.title,
          g.description,
          c.user_id AS clientUserId,
          client_user.name AS clientName,
          f.user_id AS freelancerUserId,
          freelancer_user.name AS freelancerName
       FROM gigsy_contracts gc
       JOIN gig g ON g.gig_id = gc.gig_id
       JOIN client c ON c.client_id = gc.client_id
       JOIN users client_user ON client_user.user_id = c.user_id
       JOIN freelancer f ON f.freelancer_id = gc.freelancer_id
       JOIN users freelancer_user ON freelancer_user.user_id = f.user_id
       WHERE gc.contract_id = ?
         AND (c.user_id = ? OR f.user_id = ?)
       LIMIT 1`,
      [id, user.user_id, user.user_id]
    );

    const contract = (rows as any[])[0];

    if (!contract) {
      return NextResponse.json(
        {
          success: false,
          message: "Contract not found or you do not have access."
        },
        { status: 404 }
      );
    }

    // Fetch the review associated with this contract.
    const [reviewRows] = await pool.execute(
      `SELECT
          review_id AS id,
          rating,
          comment,
          created_at AS createdAt
       FROM review
       WHERE contract_id = ?
       LIMIT 1`,
      [id]
    );

    // Fetch project milestones.
    const [milestones] = await pool.execute(
      `SELECT
          milestone_id AS id,
          title,
          description,
          due_date AS dueDate,
          amount,
          status,
          sort_order AS sortOrder
       FROM gigsy_milestones
       WHERE contract_id = ?
       ORDER BY sort_order`,
      [id]
    );

    return NextResponse.json({
      success: true,
      role: user.user_type,
      contract,
      milestones,
      review: (reviewRows as any[])[0] || null
    });

  } catch (error) {
    console.error("Contract detail GET", error);

    return NextResponse.json(
      { success: false, message: "Could not load contract." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Please sign in." },
      { status: 401 }
    );
  }

  const { id } = await params;

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request." },
      { status: 400 }
    );
  }

  const milestoneId = Number(body.milestoneId);
  const nextStatus = String(body.status || "");

  if (!Number.isSafeInteger(milestoneId) || milestoneId < 1) {
    return NextResponse.json(
      { success: false, message: "Invalid milestone." },
      { status: 400 }
    );
  }

  const allowed =
    user.user_type === "Client"
      ? ["Completed"]
      : user.user_type === "Freelancer"
      ? ["In Progress", "Submitted"]
      : [];

  if (!allowed.includes(nextStatus)) {
    return NextResponse.json(
      {
        success: false,
        message: "This action is not available for your account role."
      },
      { status: 403 }
    );
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [contractRows] = await connection.execute(
      `SELECT
          gc.contract_id,
          gc.gig_id,
          c.user_id AS clientUserId,
          f.user_id AS freelancerUserId
       FROM gigsy_contracts gc
       JOIN client c ON c.client_id = gc.client_id
       JOIN freelancer f ON f.freelancer_id = gc.freelancer_id
       WHERE gc.contract_id = ?
       FOR UPDATE`,
      [id]
    );

    const contract = (contractRows as any[])[0];

    if (
      !contract ||
      (
        Number(contract.clientUserId) !== Number(user.user_id) &&
        Number(contract.freelancerUserId) !== Number(user.user_id)
      )
    ) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "Contract not found or access denied." },
        { status: 404 }
      );
    }

    const [milestoneRows] = await connection.execute(
      `SELECT milestone_id, status
       FROM gigsy_milestones
       WHERE milestone_id = ? AND contract_id = ?
       FOR UPDATE`,
      [milestoneId, id]
    );

    const milestone = (milestoneRows as any[])[0];

    if (!milestone) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "Milestone not found." },
        { status: 404 }
      );
    }

    if (
      user.user_type === "Client" &&
      milestone.status !== "Submitted"
    ) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "The Freelancer must submit this milestone before you approve it."
        },
        { status: 409 }
      );
    }

    await connection.execute(
      "UPDATE gigsy_milestones SET status = ? WHERE milestone_id = ?",
      [nextStatus, milestoneId]
    );

    const [remaining] = await connection.execute(
      `SELECT COUNT(*) AS remaining
       FROM gigsy_milestones
       WHERE contract_id = ? AND status <> 'Completed'`,
      [id]
    );

    const isFinished =
      Number((remaining as any[])[0]?.remaining || 0) === 0;

    if (isFinished) {
      await connection.execute(
        "UPDATE gigsy_contracts SET status = 'Completed' WHERE contract_id = ?",
        [id]
      );

      await connection.execute(
        "UPDATE gig SET status = 'Completed' WHERE gig_id = ?",
        [contract.gig_id]
      );
    }

    const recipientId =
      user.user_type === "Client"
        ? contract.freelancerUserId
        : contract.clientUserId;

    const notificationTitle =
      nextStatus === "Submitted"
        ? "Milestone submitted for review"
        : nextStatus === "Completed"
        ? "Milestone approved"
        : "Project milestone started";

    const notificationBody = isFinished
      ? "All milestones are complete. Your Gigsy project has been marked completed."
      : `A project milestone was updated to ${nextStatus}. Open the contract workspace to review progress.`;

    await connection.execute(
      `INSERT INTO gigsy_notifications
       (user_id, type, title, body, gig_id, contract_id)
       VALUES (?, 'milestone_update', ?, ?, ?, ?)`,
      [
        recipientId,
        notificationTitle,
        notificationBody,
        contract.gig_id,
        id
      ]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message:
        nextStatus === "Completed"
          ? "Milestone approved."
          : "Milestone updated."
    });

  } catch (error) {
    await connection.rollback();

    console.error("Contract milestone PATCH", error);

    return NextResponse.json(
      { success: false, message: "Could not update milestone." },
      { status: 500 }
    );

  } finally {
    connection.release();
  }
}
