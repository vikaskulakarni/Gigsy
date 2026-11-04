import {createHmac,randomBytes,scryptSync,timingSafeEqual} from "crypto";
import {cookies} from "next/headers";
export const sessionCookie="gigsy_session";
const developmentSecret="development-only-change-this-session-secret";
const secret=()=>{
 if(process.env.NODE_ENV==="production"&&!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is required in production");
 return process.env.SESSION_SECRET||developmentSecret;
};
export function hashPassword(password:string){const salt=randomBytes(16).toString("hex");return `scrypt:${salt}:${scryptSync(password,salt,64).toString("hex")}`;}
export function verifyPassword(password:string,stored:string){const [kind,salt,hash]=stored.split(":");if(kind!=="scrypt"||!salt||!hash)return false;const a=scryptSync(password,salt,64),b=Buffer.from(hash,"hex");return a.length===b.length&&timingSafeEqual(a,b);}
function sign(v:string){return createHmac("sha256",secret()).update(v).digest("hex");}
export function createSession(user:{user_id:number;name:string;email:string;user_type:string}){const p=Buffer.from(JSON.stringify({user_id:user.user_id,name:user.name,email:user.email,user_type:user.user_type,exp:Date.now()+604800000})).toString("base64url");return `${p}.${sign(p)}`;}
export function readSession(token:string){try{const [p,s]=token.split(".");if(!p||!s)return null;const a=Buffer.from(sign(p),"hex"),b=Buffer.from(s,"hex");if(a.length!==b.length||!timingSafeEqual(a,b))return null;const d=JSON.parse(Buffer.from(p,"base64url").toString());if(!Number.isSafeInteger(d.user_id)||d.user_id<=0||typeof d.name!=="string"||!d.name.trim()||typeof d.email!=="string"||!/^\S+@\S+\.\S+$/.test(d.email)||d.user_type!=="Client"&&d.user_type!=="Freelancer"||typeof d.exp!=="number"||!Number.isFinite(d.exp)||d.exp<=Date.now())return null;return d;}catch{return null;}}
export async function getCurrentUser(){const token=(await cookies()).get(sessionCookie)?.value;return token?readSession(token):null;}
