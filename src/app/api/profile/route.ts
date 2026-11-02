import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
export const dynamic="force-dynamic";
export async function GET(){
 const user=await getCurrentUser();if(!user)return NextResponse.json({success:false,message:"Please sign in."},{status:401});
 try{
  if(user.user_type==="Freelancer"){
   const [rows]=await pool.execute(`SELECT u.user_id AS id,u.name,u.email,u.phone,f.headline,f.bio,f.experience_years AS experienceYears,f.hourly_rate AS hourlyRate,f.availability_status AS availability,f.portfolio_url AS portfolioUrl,f.average_rating AS rating,f.total_reviews AS reviews FROM users u JOIN freelancer f ON f.user_id=u.user_id WHERE u.user_id=?`,[user.user_id]);
   const profile=(rows as any[])[0];if(!profile)return NextResponse.json({success:false,message:"Profile not found."},{status:404});
   const [skills]=await pool.execute("SELECT s.skill_id AS id,s.skill_name AS name,fs.proficiency,fs.years_experience AS yearsExperience FROM freelancer_skill fs JOIN skill s ON s.skill_id=fs.skill_id JOIN freelancer f ON f.freelancer_id=fs.freelancer_id WHERE f.user_id=? ORDER BY s.skill_name",[user.user_id]);
   return NextResponse.json({success:true,profile:{...profile,skills}});
  }
  const [rows]=await pool.execute(`SELECT u.user_id AS id,u.name,u.email,u.phone,c.company_name AS companyName,c.company_description AS companyDescription,c.address,c.website FROM users u JOIN client c ON c.user_id=u.user_id WHERE u.user_id=?`,[user.user_id]);
  const profile=(rows as any[])[0];if(!profile)return NextResponse.json({success:false,message:"Profile not found."},{status:404});
  return NextResponse.json({success:true,profile});
 }catch(e){console.error("Profile GET",e);return NextResponse.json({success:false,message:"Could not load profile."},{status:500});}
}
export async function PUT(request:Request){
 const user=await getCurrentUser();if(!user)return NextResponse.json({success:false,message:"Please sign in."},{status:401});
 try{
  const b=await request.json();const name=String(b.name||"").trim();if(!name)return NextResponse.json({success:false,message:"Name is required."},{status:400});
  const c=await pool.getConnection();
  try{
   await c.beginTransaction();
   await c.execute("UPDATE users SET name=?,phone=? WHERE user_id=?",[name,String(b.phone||"").trim()||null,user.user_id]);
   if(user.user_type==="Freelancer"){
    const experience=Math.max(0,Math.floor(Number(b.experienceYears)||0));const rate=b.hourlyRate===""||b.hourlyRate==null?null:Number(b.hourlyRate);
    if(rate!==null&&(!Number.isFinite(rate)||rate<0))throw new Error("Hourly rate must be zero or greater.");
    const availability=["Available","Busy","Away"].includes(b.availability)?b.availability:"Available";
    await c.execute("UPDATE freelancer SET headline=?,bio=?,experience_years=?,hourly_rate=?,availability_status=?,portfolio_url=? WHERE user_id=?",
     [String(b.headline||"").trim()||null,String(b.bio||"").trim()||null,experience,rate,availability,String(b.portfolioUrl||"").trim()||null,user.user_id]);
   }else{
    await c.execute("UPDATE client SET company_name=?,company_description=?,address=?,website=? WHERE user_id=?",
     [String(b.companyName||"").trim()||null,String(b.companyDescription||"").trim()||null,String(b.address||"").trim()||null,String(b.website||"").trim()||null,user.user_id]);
   }
   await c.commit();
  }catch(e){await c.rollback();throw e;}finally{c.release();}
  return NextResponse.json({success:true,message:"Profile updated."});
 }catch(e){console.error("Profile PUT",e);return NextResponse.json({success:false,message:e instanceof Error?e.message:"Could not update profile."},{status:400});}
}
