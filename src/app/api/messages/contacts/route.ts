import {NextResponse} from "next/server";
import pool from "@/lib/db";
import {getCurrentUser} from "@/lib/auth";
export const dynamic="force-dynamic";
export async function GET(){
 const user=await getCurrentUser();if(!user)return NextResponse.json({success:false,message:"Sign in required"},{status:401});
 try{
  const [rows]=await pool.execute(`SELECT DISTINCT u.user_id AS id,u.name,u.user_type AS role FROM users u JOIN message m ON ((m.sender_id=u.user_id AND m.receiver_id=?) OR (m.receiver_id=u.user_id AND m.sender_id=?)) WHERE u.user_id<>? ORDER BY u.name`,[user.user_id,user.user_id,user.user_id]);
  return NextResponse.json({success:true,contacts:rows});
 }catch(e){console.error(e);return NextResponse.json({success:false,message:"Could not load contacts."},{status:500});}
}
