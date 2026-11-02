import {NextResponse} from "next/server";import pool from "@/lib/db";
export async function GET(){try{await pool.query("SELECT 1");return NextResponse.json({ok:true,database:"connected"});}catch(e){console.error(e);return NextResponse.json({ok:false,database:"disconnected",message:"Check MySQL service and .env.local settings."},{status:503});}}
