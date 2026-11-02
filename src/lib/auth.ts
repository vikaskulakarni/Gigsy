import {createHmac,randomBytes,scryptSync,timingSafeEqual} from "crypto";
import {cookies} from "next/headers";
export const sessionCookie="gigsy_session";
const secret=()=>process.env.SESSION_SECRET||"development-only-change-this-session-secret";
export function hashPassword(password:string){const salt=randomBytes(16).toString("hex");return `scrypt:${salt}:${scryptSync(password,salt,64).toString("hex")}`;}
export function verifyPassword(password:string,stored:string){const [kind,salt,hash]=stored.split(":");if(kind!=="scrypt"||!salt||!hash)return false;const a=scryptSync(password,salt,64),b=Buffer.from(hash,"hex");return a.length===b.length&&timingSafeEqual(a,b);}
function sign(v:string){return createHmac("sha256",secret()).update(v).digest("hex");}
export function createSession(user:{user_id:number;name:string;email:string;user_type:string}){const p=Buffer.from(JSON.stringify({...user,exp:Date.now()+604800000})).toString("base64url");return `${p}.${sign(p)}`;}
export function readSession(token:string){try{const [p,s]=token.split(".");if(!p||!s)return null;const a=Buffer.from(sign(p),"hex"),b=Buffer.from(s,"hex");if(a.length!==b.length||!timingSafeEqual(a,b))return null;const d=JSON.parse(Buffer.from(p,"base64url").toString());return d.exp>Date.now()?d:null;}catch{return null;}}
export async function getCurrentUser(){const token=(await cookies()).get(sessionCookie)?.value;return token?readSession(token):null;}
