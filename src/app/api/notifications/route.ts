import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
export const dynamic="force-dynamic";
export async function GET(){
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({success:false,message:"Please sign in."},{status:401});
 try{
  const [rows]=await pool.execute(
   `SELECT notification_id AS id,type,title,body,gig_id AS gigId,contract_id AS contractId,is_read AS isRead,created_at AS createdAt
    FROM gigsy_notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 12`,[user.user_id]);
  return NextResponse.json({success:true,notifications:rows});
 }catch(error){console.error("Notifications GET",error);return NextResponse.json({success:false,message:"Could not load notifications."},{status:500});}
}
export async function PATCH(req:Request){
 const user=await getCurrentUser();if(!user)return NextResponse.json({success:false,message:"Please sign in."},{status:401});
 try{const body=await req.json();const id=Number(body.id);if(!Number.isSafeInteger(id)||id<1)return NextResponse.json({success:false,message:"Invalid notification."},{status:400});
  await pool.execute("UPDATE gigsy_notifications SET is_read=1 WHERE notification_id=? AND user_id=?",[id,user.user_id]);
  return NextResponse.json({success:true});
 }catch(error){console.error("Notifications PATCH",error);return NextResponse.json({success:false,message:"Could not update notification."},{status:500});}
}
