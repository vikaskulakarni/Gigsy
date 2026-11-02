import {NextResponse} from "next/server";
import {sessionCookie} from "@/lib/auth";
export async function POST(){
 const response=NextResponse.json({success:true});
 response.cookies.set(sessionCookie,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0,expires:new Date(0)});
 return response;
}
