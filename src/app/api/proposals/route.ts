import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Please sign in." }, { status: 401 });
  const gigId = Number(new URL(req.url).searchParams.get("gigId") || 0);
  try {
    if (user.user_type === "Freelancer") {
      const [rows] = await pool.execute(
        `SELECT p.proposal_id AS id,p.status,p.bid_amount AS bidAmount,
          p.cover_letter AS coverLetter,p.proposed_date AS proposedDate,
          p.estimated_days AS estimatedDays,g.gig_id AS gigId,g.title,
          g.status AS gigStatus,u.name AS clientName,
          gc.contract_id AS contractId
         FROM proposal p
         JOIN freelancer f ON f.freelancer_id=p.freelancer_id
         JOIN gig g ON g.gig_id=p.gig_id
         JOIN client c ON c.client_id=g.client_id
         JOIN users u ON u.user_id=c.user_id
         LEFT JOIN gigsy_contracts gc ON gc.proposal_id=p.proposal_id
         WHERE f.user_id=? ${gigId ? "AND g.gig_id=?" : ""}
         ORDER BY p.proposed_date DESC,p.proposal_id DESC`,
        gigId ? [user.user_id, gigId] : [user.user_id]
      );
      return NextResponse.json({ success: true, role: "Freelancer", proposals: rows });
    }
    if (user.user_type === "Client") {
      const [rows] = await pool.execute(
        `SELECT p.proposal_id AS id,p.status,p.bid_amount AS bidAmount,
          p.cover_letter AS coverLetter,p.proposed_date AS proposedDate,
          p.estimated_days AS estimatedDays,g.gig_id AS gigId,g.title,
          f.freelancer_id AS freelancerId,u.user_id AS freelancerUserId,
          u.name AS freelancerName,f.headline,f.average_rating AS rating,
          gc.contract_id AS contractId
         FROM proposal p
         JOIN gig g ON g.gig_id=p.gig_id
         JOIN client c ON c.client_id=g.client_id
         JOIN users owner ON owner.user_id=c.user_id
         JOIN freelancer f ON f.freelancer_id=p.freelancer_id
         JOIN users u ON u.user_id=f.user_id
         LEFT JOIN gigsy_contracts gc ON gc.proposal_id=p.proposal_id
         WHERE owner.user_id=? ${gigId ? "AND g.gig_id=?" : ""}
         ORDER BY p.proposed_date DESC,p.proposal_id DESC`,
        gigId ? [user.user_id, gigId] : [user.user_id]
      );
      return NextResponse.json({ success: true, role: "Client", proposals: rows });
    }
    return NextResponse.json({ success: false, message: "Unsupported account role." }, { status: 403 });
  } catch (error) {
    console.error("Proposals GET", error);
    return NextResponse.json({ success: false, message: "Could not load proposals. Run database/gigsy_hiring_workflow.sql first." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Sign in before submitting a proposal." }, { status: 401 });
  if (user.user_type !== "Freelancer") return NextResponse.json({ success: false, message: "Only Freelancer accounts can submit proposals." }, { status: 403 });
  try {
    const body = await req.json();
    const gigId = Number(body.gigId);
    const bid = Number(body.bidAmount);
    const cover = String(body.coverLetter || "").trim();
    const days = Number(body.estimatedDays || 7);
    if (!Number.isInteger(gigId) || gigId < 1 || !Number.isFinite(bid) || bid <= 0 || !cover || !Number.isInteger(days) || days < 1 || days > 365) {
      return NextResponse.json({ success: false, message: "Provide a valid budget, proposal and delivery estimate (1â€“365 days)." }, { status: 400 });
    }
    const [freelancers] = await pool.execute("SELECT freelancer_id FROM freelancer WHERE user_id=? LIMIT 1", [user.user_id]);
    const freelancer = (freelancers as any[])[0];
    if (!freelancer) return NextResponse.json({ success: false, message: "Freelancer profile not found." }, { status: 404 });
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [gigs] = await connection.execute(
        `SELECT g.gig_id FROM gig g
         WHERE g.gig_id=? AND g.status='Open'
         AND NOT EXISTS (SELECT 1 FROM gigsy_contracts gc WHERE gc.gig_id=g.gig_id)
         AND NOT EXISTS (SELECT 1 FROM client c WHERE c.client_id=g.client_id AND c.user_id=?)
         FOR UPDATE`,
        [gigId, user.user_id]
      );
      if (!(gigs as any[]).length) {
        await connection.rollback();
        return NextResponse.json({ success: false, message: "This gig is unavailable or belongs to your own account." }, { status: 404 });
      }
      await connection.execute(
        `INSERT INTO proposal (gig_id,freelancer_id,bid_amount,cover_letter,proposed_date,estimated_days,status)
         VALUES (?,?,?,?,CURDATE(),?,'Pending')`,
        [gigId, freelancer.freelancer_id, bid, cover, days]
      );
      await connection.commit();
      return NextResponse.json({ success: true, message: "Proposal submitted successfully." }, { status: 201 });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    if (error.code === "ER_DUP_ENTRY") return NextResponse.json({ success: false, message: "You have already applied to this gig." }, { status: 409 });
    console.error("Proposal POST", error);
    return NextResponse.json({ success: false, message: "Could not submit proposal." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Please sign in." }, { status: 401 });
  if (user.user_type !== "Client") return NextResponse.json({ success: false, message: "Only the Client who owns this gig can review proposals." }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 }); }
  const proposalId = Number(body.proposalId);
  const gigId = Number(body.gigId);
  const decision = body.status;
  if (!Number.isSafeInteger(proposalId) || proposalId < 1 || !Number.isSafeInteger(gigId) || gigId < 1 || !["Accepted", "Rejected"].includes(decision)) {
    return NextResponse.json({ success: false, message: "Invalid proposal action." }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [owned] = await connection.execute(
      `SELECT g.gig_id,c.client_id FROM gig g JOIN client c ON c.client_id=g.client_id
       WHERE g.gig_id=? AND c.user_id=? FOR UPDATE`,
      [gigId, user.user_id]
    );
    const owner = (owned as any[])[0];
    if (!owner) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: "You do not own this gig." }, { status: 403 });
    }

    const [proposalRows] = await connection.execute(
      `SELECT p.proposal_id,p.status,p.bid_amount,p.estimated_days,p.freelancer_id,
              f.user_id AS freelancer_user_id,g.title
       FROM proposal p JOIN freelancer f ON f.freelancer_id=p.freelancer_id
       JOIN gig g ON g.gig_id=p.gig_id
       WHERE p.proposal_id=? AND p.gig_id=? FOR UPDATE`,
      [proposalId, gigId]
    );
    const proposal = (proposalRows as any[])[0];
    if (!proposal) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: "Proposal not found for this gig." }, { status: 404 });
    }
    if (decision === "Rejected" && proposal.status !== "Pending") {
      await connection.rollback();
      return NextResponse.json({ success: false, message: "This proposal has already been reviewed." }, { status: 409 });
    }

    if (decision === "Accepted" && !["Pending", "Accepted"].includes(proposal.status)) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: "Only pending or already-accepted proposals can be hired." }, { status: 409 });
    }

    if (decision === "Rejected") {
      await connection.execute("UPDATE proposal SET status='Rejected' WHERE proposal_id=? AND status='Pending'", [proposalId]);
      await connection.execute(
        `INSERT INTO gigsy_notifications(user_id,type,title,body,gig_id)
         VALUES(?,'proposal_rejected','Proposal update',?,?)`,
        [proposal.freelancer_user_id, `Your proposal for â€œ${proposal.title}â€ was not selected. Keep exploring other opportunities.`, gigId]
      );
      await connection.commit();
      return NextResponse.json({ success: true, message: "Proposal rejected. The Freelancer has been notified." });
    }

    const [already] = await connection.execute(
      "SELECT contract_id,proposal_id FROM gigsy_contracts WHERE gig_id=? OR proposal_id=? FOR UPDATE",
      [gigId, proposalId]
    );

    if ((already as any[]).length) {
      const existing = (already as any[])[0];

      if (Number(existing.proposal_id) === proposalId) {
        await connection.commit();
        return NextResponse.json({
          success: true,
          contractId: existing.contract_id,
          message: "This proposal already has a contract. Opening the existing contract."
        });
      }

      await connection.rollback();
      return NextResponse.json({
        success: false,
        message: "Another proposal already has a contract for this gig."
      }, { status: 409 });
    }

    const [otherRows] = await connection.execute(
      `SELECT f.user_id FROM proposal p JOIN freelancer f ON f.freelancer_id=p.freelancer_id
       WHERE p.gig_id=? AND p.status='Pending' AND p.proposal_id<>?`,
      [gigId, proposalId]
    );

    if (proposal.status === "Pending") {
      await connection.execute(
        "UPDATE proposal SET status='Accepted' WHERE proposal_id=? AND status='Pending'",
        [proposalId]
      );

      await connection.execute(
        "UPDATE proposal SET status='Rejected' WHERE gig_id=? AND proposal_id<>? AND status='Pending'",
        [gigId, proposalId]
      );
    }

    const [contractResult] = await connection.execute(
      `INSERT INTO gigsy_contracts(proposal_id,gig_id,freelancer_id,client_id,agreed_amount,delivery_days,status)
       VALUES(?,?,?,?,?,?,'Active')`,
      [proposalId, gigId, proposal.freelancer_id, owner.client_id, proposal.bid_amount, proposal.estimated_days]
    );
    const contractId = (contractResult as any).insertId;
    const amount = Number(proposal.bid_amount || 0);
    const days = Math.max(1, Number(proposal.estimated_days || 7));
    const milestones = [
      ["Project kickoff", "Confirm scope, communication and access requirements.", Math.round(amount * 0.2 * 100) / 100, 1, "In Progress"],
      ["Work review", "Share the working deliverable for client feedback.", Math.round(amount * 0.3 * 100) / 100, Math.max(1, Math.ceil(days * 0.65)), "Pending"],
      ["Final delivery", "Submit the final agreed deliverables and handover.", amount - Math.round(amount * 0.5 * 100) / 100, days, "Pending"]
    ];
    for (let i = 0; i < milestones.length; i++) {
      const [title, description, milestoneAmount, dueDays, status] = milestones[i];
      await connection.execute(
        `INSERT INTO gigsy_milestones(contract_id,title,description,due_date,amount,status,sort_order)
         VALUES(?,?,?,DATE_ADD(CURDATE(),INTERVAL ? DAY),?,?,?)`,
        [contractId, title, description, dueDays, milestoneAmount, status, i + 1]
      );
    }
    await connection.execute("UPDATE gig SET status='In Progress' WHERE gig_id=?", [gigId]);
    await connection.execute(
      `INSERT INTO gigsy_notifications(user_id,type,title,body,gig_id,contract_id)
       VALUES(?,'proposal_accepted','Congratulations â€” you have been hired!',?,?,?)`,
      [proposal.freelancer_user_id, `Your proposal for â€œ${proposal.title}â€ was accepted. Your contract is readyâ€”open it to review milestones and contact the client.`, gigId, contractId]
    );
    await connection.execute(
      `INSERT INTO gigsy_notifications(user_id,type,title,body,gig_id,contract_id)
       VALUES(?,'contract_created','Your project is now active',?,?,?)`,
      [user.user_id, `You hired a Freelancer for â€œ${proposal.title}â€. Your contract and milestone plan are ready.`, gigId, contractId]
    );
    for (const row of otherRows as any[]) {
      await connection.execute(
        `INSERT INTO gigsy_notifications(user_id,type,title,body,gig_id)
         VALUES(?,'proposal_not_selected','Proposal update',?,?)`,
        [row.user_id, `The client selected another Freelancer for â€œ${proposal.title}â€.`, gigId]
      );
    }

    await connection.commit();
    return NextResponse.json({
      success: true,
      contractId,
      message: "Congratulations! The proposal was accepted, the contract was created, and the gig is now in progress and closed to new proposals."
    });
  } catch (error: any) {
    await connection.rollback();
    console.error("Proposal PATCH / contract creation", error);
    if (error.code === "ER_DUP_ENTRY") return NextResponse.json({ success: false, message: "A contract already exists for this gig. Refresh your workspace." }, { status: 409 });
    return NextResponse.json({ success: false, message: "Could not complete hiring. No changes were saved; check that the Gigsy hiring workflow migration has been applied." }, { status: 500 });
  } finally {
    connection.release();
  }
}

