import { apiPath } from "@/lib/api-path";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type Genre, type IntroBars } from "@/lib/studio-profiles";
export type StudioSong = {title:string;lyrics:string;style:string;cover:string};
type Message = {role:"user"|"assistant";content:string};
type Proposal = {song:StudioSong;base:string};
export function StudioChat({apiKey,genre,introBars,idea,song,locked,onApply,onConnect,onCopy}: {
  apiKey:string;genre:Genre;introBars:IntroBars;idea:string;song:StudioSong|null;locked:boolean;
  onApply:(song:StudioSong)=>void;onConnect:()=>void;onCopy:()=>void;
}) {
  const [messages,setMessages]=useState<Message[]>([]);
  const [input,setInput]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const [proposal,setProposal]=useState<Proposal|null>(null);
  const [undo,setUndo]=useState<{song:StudioSong;applied:string}|null>(null);
  const inFlight=useRef(false);const current=JSON.stringify(song);
  const stale=!!proposal && proposal.base!==current;
  async function send() {
    if(inFlight.current || locked || !input.trim())return;
    if(!apiKey.trim()){onConnect();setError("Connect your OpenAI API key to chat here.");return;}
    if(messages.length>=20){setError("This conversation is full. Clear chat to continue with your current song.");return;}
    inFlight.current=true;setBusy(true);setError("");setProposal(null);
    const next:Message[]=[...messages,{role:"user",content:input.trim()}];
    try {
      const response=await fetch(apiPath("chat"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:apiKey,genre,introBars,idea,song,messages:next}),signal:AbortSignal.timeout(95000)});
      let data: {error?:string;reply?:string;song?:StudioSong|null};try{data=await response.json() as typeof data;}catch{throw new Error("The chat response could not be read. Reload if your Studio session expired.");}
      if(!response.ok)throw new Error(data.error || "Chat could not finish. Try again.");
      if(typeof data.reply!=="string")throw new Error("Chat returned an incomplete response. Please try again.");
      setMessages([...next,{role:"assistant",content:data.reply}]);setInput("");
      if(data.song)setProposal({song:data.song,base:current});
    } catch(e){setError(e instanceof Error ? e.message : "Chat could not connect.");}
    finally{inFlight.current=false;setBusy(false);}
  }
  function apply(){if(!proposal || stale || locked)return;if(song)setUndo({song,applied:JSON.stringify(proposal.song)});onApply(proposal.song);setProposal(null);}
  return <section className="studio-chat" aria-labelledby="studio-chat-title">
    <div className="chat-heading"><div><div className="eyebrow">YOUR PRODUCTION PARTNER</div><h3 id="studio-chat-title">Talk it through.</h3></div><Button variant="ghost" disabled={busy} onClick={()=>{setMessages([]);setProposal(null);setError("");}}>Clear chat</Button></div>
    <p className="small-note">Discuss your idea or refine the current title, lyrics and style. Review edits before applying. Chat stays in this session; your API key is never saved.</p>
    <div className="chat-messages" role="log" aria-live="polite" aria-label="Studio conversation">{messages.length ? messages.map((m,i)=><div className={`chat-message ${m.role}`} key={i}><strong>{m.role === "user" ? "You" : "Studio"}</strong><p>{m.content}</p></div>) : <p className="chat-empty">“Keep the lyrics, but make the groove darker.”<br/>“Help me write a hook.”<br/>“Give the English line a natural Spanish accent.”</p>}{busy && <p role="status">Working on your song…</p>}</div>
    {error && <p className="message error" role="alert">{error}</p>}
    {proposal && <div className="chat-proposal"><h4>Suggested edit · {proposal.song.title}</h4><details><summary>Review title, style, lyrics and cover direction</summary>{(["title","style","lyrics","cover"] as const).map(field=><div key={field}><strong>{field.toUpperCase()}</strong><pre>{proposal.song[field]}</pre></div>)}</details>{stale && <p role="status">Your song changed since this suggestion. Send another message to revise the current version.</p>}<div className="actions"><Button disabled={stale || locked || busy} onClick={apply}>Apply changes</Button><Button variant="ghost" disabled={busy} onClick={()=>setProposal(null)}>Discard</Button></div></div>}
    {undo && <Button variant="ghost" disabled={locked || busy || current!==undo.applied} onClick={()=>{onApply(undo.song);setUndo(null);}}>Undo last applied edit</Button>}
    <form onSubmit={e=>{e.preventDefault();void send();}}><label htmlFor="chat-message">What would you like to change or discuss?</label><Textarea id="chat-message" value={input} onChange={e=>setInput(e.target.value)} maxLength={6000} disabled={busy || locked} placeholder="Talk about your song…"/><div className="chat-send"><span className="small-note">{input.length}/6000</span><Button type="submit" disabled={busy || locked || !input.trim()}>{busy ? "Thinking…" : "Send message"}</Button></div></form>
    <div className="chat-handoff"><h4>Ready for Suno?</h4><p className="small-note">Apply your final edits, then copy the current title, style and lyrics into a Suno-connected chat. Direct submission from this Studio is not connected yet.</p><Button variant="outline" disabled={!song || locked || busy} onClick={onCopy}>Copy final song for Suno</Button></div>
  </section>;
}
