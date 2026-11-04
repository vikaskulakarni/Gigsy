"use client";
import {useEffect,useState} from "react";
import Link from "next/link";

export function MessagesWorkspace(){
 const [contacts,setContacts]=useState<any[]>([]);
 const [peer,setPeer]=useState<number|null>(null);
 const [messages,setMessages]=useState<any[]>([]);
 const [body,setBody]=useState("");
 const [error,setError]=useState("");
 const [me,setMe]=useState<number|null>(null);

 async function loadContacts(){
  try{
   const [c,u]=await Promise.all([
    fetch("/api/messages/contacts"),
    fetch("/api/auth/me")
   ]);
   const cd=await c.json(),ud=await u.json();
   if(!c.ok)throw Error(cd.message);
   setContacts(cd.contacts||[]);
   setMe(ud.user?.id??null);
  }catch(e){
   setError(String(e));
  }
 }

 async function loadMessages(id:number){
  try{
   const r=await fetch(`/api/messages?with=${id}`,{cache:"no-store"});
   const d=await r.json();
   if(!r.ok){setError(d.message||"Could not load conversation.");return;}
   setMessages(d.messages||[]);
  }catch(e){
   setError("Could not load messages.");
  }
 }

 useEffect(()=>{
  loadContacts();
  const params=new URLSearchParams(window.location.search);
  const recipient=Number(params.get("with"));
  if(Number.isSafeInteger(recipient)&&recipient>0){
   setPeer(recipient);
  }
 },[]);

 useEffect(()=>{
  if(peer!==null)loadMessages(peer);
 },[peer]);

 async function send(e:React.FormEvent){
  e.preventDefault();
  if(!peer||!body.trim())return;
  setError("");
  try{
   const r=await fetch("/api/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({receiverId:peer,body})
   });
   const d=await r.json();
   if(!r.ok){setError(d.message||"Message could not be sent.");return;}
   setBody("");
   await loadMessages(peer);
   await loadContacts();
  }catch(e){
   setError("Message could not be sent.");
  }
 }

 return (
  <main className="container inner-page">
   <span className="eyebrow">COMMUNICATION</span>
   <h1>Messages</h1>
   <p className="muted">Your conversations are saved in MySQL.</p>
   {error&&<p role="alert" style={{color:"#fb7185"}}>{error} <Link href="/login">Sign in</Link></p>}
   <div className="messaging-layout">
    <aside className="messaging-contacts">
     <h3>Conversations</h3>
     {contacts.map(c=>(
      <button key={c.id} onClick={()=>setPeer(Number(c.id))} className={peer===Number(c.id)?"active":""}>
       {c.name}<small>{c.role}</small>
      </button>
     ))}
     {!contacts.length&&<p>No previous conversations yet.</p>}
     <label>
      Recipient user ID
      <input type="number" min="1" value={peer??""} onChange={e=>setPeer(Number(e.target.value)||null)} placeholder="e.g. 2"/>
     </label>
    </aside>
    <section className="messaging-thread">
     {peer!==null?(
      <>
       <div className="messaging-history">
        {messages.map(m=>(
         <div key={m.id} className={Number(m.senderId)===me?"message-own":"message-other"}>
          <p>{m.body}</p>
          <small>{m.sentAt?String(m.sentAt):""}</small>
         </div>
        ))}
        {!messages.length&&<p>No messages in this conversation. Send the first message!</p>}
       </div>
       <form onSubmit={send} className="messaging-compose">
        <input value={body} onChange={e=>setBody(e.target.value)} maxLength={5000} placeholder="Write a message..." required/>
        <button className="button">Send</button>
       </form>
      </>
     ):(
      <div className="empty-panel">
       <h2>Select a conversation</h2>
       <p>Choose a contact or enter an existing user ID.</p>
      </div>
     )}
    </section>
   </div>
  </main>
 );
}
