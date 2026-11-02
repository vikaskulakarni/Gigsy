import {NextResponse} from "next/server";
import pool from "@/lib/db";
import {getCurrentUser} from "@/lib/auth";
export async function GET(){
 const u=await getCurrentUser();if(!u)return NextResponse.json({success:false,message:"Sign in required"},{status:401});
 try{
 const [rows]=await pool.execute("SELECT user_id AS id,name,user_type AS role FROM users WHERE user_id<>? AND user_type<>? ORDER BY name LIMIT 100",[u.user_id,u.user_type]);
 return NextResponse.json({success:true,people:rows});
 }catch(e){console.error(e);return NextResponse.json({success:false,message:"Could not load contacts"},{status:500});}
}
