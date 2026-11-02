import {NextResponse} from "next/server";
import pool from "@/lib/db";
import {getCurrentUser} from "@/lib/auth";
import {messageSchema} from "@/lib/message-schema";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const user=await getCurrentUser();if(!user)return NextResponse.json({success:false,message:"Sign in required"},{status:401});
 try{
  const s=await messageSchema(),peer=Number(new URL(req.url).searchParams.get("with"));
  if(!Number.isSafeInteger(peer)||peer<1)return NextResponse.json({success:false,message:"Choose a conversation."},{status:400});
  const [rows]=await pool.execute(`SELECT m.\`${s.id}\` AS id,m.sender_id AS senderId,m.receiver_id AS receiverId,m.\`${s.body}\` AS body${s.date?`,m.\`${s.date}\` AS sentAt`:""} FROM message m WHERE (m.sender_id=? AND m.receiver_id=?) OR (m.sender_id=? AND m.receiver_id=?) ORDER BY m.\`${s.id}\` ASC LIMIT 200`,[user.user_id,peer,peer,user.user_id]);
  return NextResponse.json({success:true,messages:rows});
 }catch(e){console.error(e);return NextResponse.json({success:false,message:"Message schema or database unavailable."},{status:500});}
}
export async function POST(req:Request){
 const user=await getCurrentUser();if(!user)return NextResponse.json({success:false,message:"Sign in required"},{status:401});
 try{
  const b=await req.json(),peer=Number(b.receiverId),body=String(b.body||"").trim();
  if(!Number.isSafeInteger(peer)||peer<1||peer===user.user_id||!body||body.length>5000)return NextResponse.json({success:false,message:"Invalid recipient or message (max 5000 characters). "},{status:400});
  const [target]=await pool.execute("SELECT user_id FROM users WHERE user_id=? LIMIT 1",[peer]);if(!(target as any[]).length)return NextResponse.json({success:false,message:"Recipient not found."},{status:404});
  const s=await messageSchema();
  // Avoid assuming a nullable gig_id when the user's schema may require one.
  await pool.execute(`INSERT INTO message(sender_id,receiver_id,\`${s.body}\`) VALUES(?,?,?)`,[user.user_id,peer,body]);
  return NextResponse.json({success:true},{status:201});
 }catch(e){console.error(e);return NextResponse.json({success:false,message:"Message could not be saved. Check message table constraints."},{status:500});}
}
