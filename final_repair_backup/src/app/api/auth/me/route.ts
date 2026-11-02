import {NextResponse} from "next/server";import {getCurrentUser} from "@/lib/auth";
export async function GET(){const u=await getCurrentUser();return NextResponse.json({success:true,user:u?{id:u.user_id,name:u.name,email:u.email,role:u.user_type}:null});}
