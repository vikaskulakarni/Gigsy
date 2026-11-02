import pool from "@/lib/db";
export async function messageSchema(){
 const [rows]=await pool.execute("SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='message'");
 const columns=new Set((rows as {name:string}[]).map(r=>r.name));
 const body=["message_text","content","message_body","body","text"].find(c=>columns.has(c));
 const date=["sent_at","created_at","sent_date","timestamp"].find(c=>columns.has(c));
 const id=["message_id","id"].find(c=>columns.has(c));
 if(!body||!id||!columns.has("sender_id")||!columns.has("receiver_id"))throw new Error("Unsupported message table schema: inspect SHOW CREATE TABLE message.");
 return {body,date,id,hasGig:columns.has("gig_id")};
}
