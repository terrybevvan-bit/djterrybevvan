import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SavedCreatorTrack } from './lib/browser-store';
import { Music2, RefreshCw, Sparkles, ArrowUpRight, Copy, RotateCcw, ImagePlus, Download, KeyRound, Waves, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { profiles, writingBrief, coverBrief, djStyle, type IntroBars, type Genre } from "@/lib/studio-profiles";
import { StudioChat } from "@/components/studio-chat";
import { apiPath } from "@/lib/api-path";
import { drawIdeas } from "@/lib/studio-ideas";
type Song = { title: string; lyrics: string; style: string; cover: string };
export default function Home() {
  const [chatSession, setChatSession] = useState(0);
  const [genre, setGenre] = useState<Genre>("melodic");
  const profile = profiles[genre];
  const [introBars, setIntroBars] = useState<IntroBars>(16);
  const [suggestions, setSuggestions] = useState<Partial<Record<Genre, {ideas:string[]; used:string[]}>>>({});
  const visibleIdeas = suggestions[genre]?.ideas || profile.seeds;
  function refreshIdeas() {
    setSuggestions(previous => {
      const current = previous[genre];
      return { ...previous, [genre]: drawIdeas(genre, current?.used || profile.seeds, current?.ideas || profile.seeds) };
    });
  }
  const drafts = useRef<Partial<Record<Genre, {idea:string; song:Song|null; art:string; tab:string; savedId:string|null}>>>({});
  const [savedId,setSavedId]=useState<string|null>(null);
  const [idea, setIdea] = useState(""); const key=useSyncExternalStore(window.StudioSession.subscribe,window.StudioSession.getKey); const setKey=window.StudioSession.setKey; const [connect, setConnect] = useState(false);
  const [tab, setTab] = useState("lyrics"); const [song, setSong] = useState<Song | null>(null); const [art, setArt] = useState("");
  const [busy, setBusy] = useState(""); const [notice, setNotice] = useState(""); const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null); const sequence = useRef(0);
  const style = song?.style || djStyle(profile.style, introBars);
  const brief = writingBrief(genre, idea, introBars);
  const cover = song?.cover || coverBrief(genre, idea);
  useEffect(()=>{
    window.loadSongCreatorTrack=track=>{
      sequence.current++;controller.current?.abort();
      const mode=Object.hasOwn(profiles,track.genreKey)?track.genreKey as Genre:'melodic';
      setGenre(mode);setIntroBars(track.introBars===32?32:16);setIdea(track.concept||'');
      setSong(track.hasSong===false?null:{title:track.title,lyrics:track.lyrics,style:track.style,cover:track.cover||''});
      setSavedId(track.id||null);setArt('');setTab('lyrics');setBusy('');setError('');setChatSession(n=>n+1);
      setNotice('Loaded from Saved Tracks. Your API key is still session-only.');
    };
    const pending=window.parent.pendingSongCreatorTrack;
    if(pending){delete window.parent.pendingSongCreatorTrack;window.loadSongCreatorTrack(pending);}
    return ()=>{delete window.loadSongCreatorTrack;};
  },[]);
  function saveTrack(){
    setError('');setNotice('');
    try{
      const track:SavedCreatorTrack={id:savedId||undefined,source:'song-creator',hasSong:!!song,
        title:song?.title||idea.slice(0,60)||'Untitled',lyrics:song?.lyrics||'',style,cover,
        concept:idea,genre:profile.name,genreKey:genre,introBars};
      const id=window.TrackStore.save(track);setSavedId(id);
      setNotice('Saved to Saved Tracks on this browser. It will survive a refresh. Download cover images separately.');
    }catch{setError('Could not save on this browser. Storage may be full or unavailable. Your song is still here; download a copy before refreshing.');}
  }
  function switchGenre(next: Genre) {
    if(next === genre || busy) return;
    drafts.current[genre] = {idea, song, art, tab, savedId};
    const draft = drafts.current[next];
    sequence.current++; controller.current?.abort();
    setChatSession(n=>n+1); setGenre(next); setIdea(draft?.idea || ""); setSong(draft?.song || null); setArt(draft?.art || ""); setTab(draft?.tab || "lyrics"); setSavedId(draft?.savedId||null); setError(""); setNotice("");
  }
  function selectIdea(next: string) {
    sequence.current++; controller.current?.abort();
    setChatSession(n=>n+1); setIdea(next); setSong(null); setSavedId(null); setArt(""); setBusy(""); setError(""); setNotice(""); setTab("lyrics");
  }
  async function copy(text: string, message = "Copied to clipboard.") { setNotice(""); setError(""); try { await navigator.clipboard.writeText(text); setNotice(message); } catch { setError("Copy is unavailable here. Select the text and copy it manually."); } }
  function reset() { setChatSession(n=>n+1); sequence.current++; controller.current?.abort(); setIdea(""); setSong(null); setSavedId(null); setArt(""); setBusy(""); setNotice(""); setError(""); setTab("lyrics"); }
  async function generate(kind: "song" | "art") {
    if (busy) return;
    setError(""); setNotice("");
    if (!idea.trim()) { setError("Add a song idea first."); return; }
    if (!key.trim()) { setConnect(true); setError("Add your OpenAI API key to generate here, or copy the writing brief to use in ChatGPT."); return; }
    const id = ++sequence.current; const abort = new AbortController(); controller.current = abort; setBusy(kind);
    try {
      const res = await fetch(apiPath("generate"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, key, idea, ...(kind === "art" ? {cover} : {}), genre, introBars }), signal: abort.signal });
      const responseText = await res.text();
      let data;
      try { data = JSON.parse(responseText); } catch {
        throw new Error(res.status === 401 || res.status === 403 ? "Your studio session expired. Save your work and reload the page." : `The server returned an unreadable response (HTTP ${res.status}). Please try again.`);
      }
      if (!res.ok) throw new Error(data.error || "Generation failed. Please try again.");
      if (id !== sequence.current) return;
      if (kind === "song") { setChatSession(n=>n+1); setSong(data); setSavedId(null); setArt(""); setTab("lyrics"); } else setArt(data.image);
      setNotice(kind === "song" ? "Your song is ready. Edit any of the text below." : "Your cover is ready to download.");
    } catch (e) { if (id === sequence.current && !(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Could not generate. Please try again."); }
    finally { if (id === sequence.current) setBusy(""); }
  }
  function edit(field: keyof Song, value: string) { setNotice(""); if (song) setSong({ ...song, [field]: value }); }
  function copyForSuno() {
    if (!song) return;
    const bundle = `Create a song in Suno using the title, style, and lyrics below. Preserve the lyrics and bracketed arrangement directions.\n\nTITLE\n${song.title}\n\nSTYLE\n${song.style}\n\nLYRICS\n${song.lyrics}`;
    void copy(bundle, "Copied for Suno.");
  }
  function downloadText() { if (!song) return; const blob = new Blob([`${song.title}\nTerry Bevvan\n\nSTYLE\n${song.style}\n\nLYRICS\n${song.lyrics}\n\nCOVER BRIEF\n${song.cover}`], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${song.title.replace(/[^a-z0-9 -]/gi, "").slice(0,80) || "song"}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  return <main className={`studio ${genre === "latin" ? "latin-mode" : genre === "tech" ? "tech-mode" : genre === "summit" ? "summit-mode" : genre === "hugel" ? "hugel-mode" : genre === "cali" ? "cali-mode" : genre === "underground" ? "underground-mode" : genre === "camelphat" ? "camelphat-mode" : ""}`}>
    <header className="topbar"><div className="brand"><span className="brand-icon"><Waves size={23}/></span><span>BEVVAN’S <b>STUDIO</b></span></div><div className="header-right"><Button variant="outline" onClick={() => setConnect(!connect)}><KeyRound/> {key ? "AI connection" : "Connect AI"}</Button></div></header>
    <div className="genre-bar"><div role="group" aria-label="Music style" className="genre-switch">{(["melodic", "latin", "tech", "summit", "hugel", "cali", "underground", "camelphat"] as Genre[]).map(mode => <Button key={mode} variant="ghost" aria-pressed={genre === mode} disabled={!!busy} onClick={() => switchGenre(mode)}>{profiles[mode].name}</Button>)}</div><span>{genre === "latin" ? "SPANISH VOCALS · LATIN PERCUSSION" : genre === "tech" ? "RAP · SPOKEN WORD · CLUB GROOVES" : genre === "summit" ? "VOCAL HOOKS · EUPHORIC CLUB ENERGY" : genre === "hugel" ? "LATIN / AFRO PERCUSSION · HYPNOTIC HOOKS" : genre === "cali" ? "CALI HEAT · SPANISH HOOKS · DANCEFLOOR ENERGY" : genre === "underground" ? "AFTER HOURS · SPARSE HOOKS · DIRTY GROOVES" : genre === "camelphat" ? "HAUNTING HOOKS · DEEP PROGRESSIVE GROOVES" : "EMOTIONAL VOCALS · ATMOSPHERIC TEXTURES"}</span></div>
    {connect && <section className="connection"><div><h2>Connect your OpenAI API</h2><p>Used only for this open session. Your key passes through this app to OpenAI and is never saved. API usage is billed separately.</p></div><div className="key-row"><Input aria-label="OpenAI API key" type="password" autoComplete="off" placeholder="Paste your API key" value={key} onChange={e => setKey(e.target.value)} /><Button variant="outline" onClick={() => {setKey(""); setNotice("API key cleared.");}}>Clear key</Button><Button onClick={() => setConnect(false)}>Done</Button></div><a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">Get an API key <ArrowUpRight size={14}/></a></section>}
    <div className="workspace">
      <aside className="composer"><div className="eyebrow">YOUR PERSONAL SONGWRITING ROOM</div><h1>Start with<br/><em>{profile.headline}</em></h1><p className="intro">{profile.intro}</p>
      <div className="profile"><Music2 size={19}/><div><strong>{profile.label}</strong><span>{profile.detail}</span></div></div>
      <label htmlFor="idea">What’s the song about?</label><Textarea id="idea" className="idea" placeholder={profile.placeholder} maxLength={3000} value={idea} disabled={!!busy} onChange={e => {setIdea(e.target.value); setError("");}}/>
      <div className="input-foot"><span>A few honest sentences is enough.</span><span>{idea.length}/3000</span></div>
      <div className="seeds"><div className="seeds-heading"><span>NEED A STARTING POINT?</span><button type="button" className="refresh-ideas" disabled={!!busy} onClick={refreshIdeas}><RefreshCw size={14}/>Refresh ideas</button></div><div aria-live="polite" aria-label="Song idea suggestions">{visibleIdeas.map((seed, i) => <button key={seed} disabled={!!busy} onClick={() => selectIdea(seed)}><span>0{i+1}</span>{seed}<ArrowUpRight size={15}/></button>)}</div></div>
      <label htmlFor="dj-intro">DJ intro length</label>
      <select id="dj-intro" value={introBars} disabled={!!busy} onChange={e => setIntroBars(Number(e.target.value) as IntroBars)}><option value={16}>16 bars</option><option value={32}>32 bars</option></select>
      <p className="small-note">Kick first, then percussion. Melody enters after the intro. 32-bar DJ outro. Applies to your next generation and writing brief.</p>
      <Button className="generate" disabled={!!busy || !idea.trim()} onClick={() => generate("song")}>{busy === "song" ? <LoaderCircle className="spin"/> : <Sparkles/>}{busy === "song" ? "Writing your song…" : "Generate song"}</Button>
      <button className="brief-link" disabled={!idea.trim() || !!busy} onClick={() => copy(brief)}>Copy writing brief for ChatGPT <ArrowUpRight size={14}/></button>
      <p className="small-note">Lyrics + Suno style prompt. Cover art is optional.<br/>No API key? Use the writing brief in ChatGPT.</p>
      </aside>
      <section className="output"><div className="output-heading"><div><div className="eyebrow">THE SESSION</div><h2>{song ? song.title : "Your next track"}</h2></div><Button variant="ghost" onClick={reset}><RotateCcw/>New song</Button></div>
      {song && <div className="suno-copy"><Button onClick={copyForSuno} disabled={!!busy || !song.title.trim() || !song.style.trim() || !song.lyrics.trim()}><Copy/>{notice === "Copied for Suno." ? "Copied for Suno" : "Copy for Suno"}</Button><p>Title + style + lyrics, including your edits. Paste into a chat with Suno connected. In Suno Custom mode, use the matching fields.</p></div>}
      <div className="song-save"><Button variant="outline" disabled={!!busy||(!song&&!idea.trim())} onClick={saveTrack}>{savedId?'Update saved track':'Save to Saved Tracks'}</Button><p>Keep your song or idea on this browser after refreshing. Reopen it from Saved Tracks. Your API key is never saved.</p></div>
      <div aria-live="polite">{error && <p className="message error" role="alert">{error}</p>}{notice && <p className="message">{notice}</p>}</div>
      <Tabs value={tab} onValueChange={setTab}><TabsList className="studio-tabs"><TabsTrigger value="lyrics">01 &nbsp; Lyrics</TabsTrigger><TabsTrigger value="style">02 &nbsp; Style prompt</TabsTrigger><TabsTrigger value="cover">03 &nbsp; Cover art</TabsTrigger></TabsList>
      <TabsContent value="lyrics">{song ? <div className="written"><div className="actions"><Button variant="outline" onClick={() => copy(song.lyrics)}><Copy/>Copy lyrics</Button><Button variant="ghost" onClick={downloadText}><Download/>Download song</Button></div><label htmlFor="title">Track title</label><Input id="title" value={song.title} onChange={e => edit("title",e.target.value)}/><label htmlFor="lyrics" className="sr-only">Lyrics</label><Textarea id="lyrics" className="lyrics" value={song.lyrics} onChange={e => edit("lyrics",e.target.value)}/></div> : <div className="empty"><span className="empty-icon"><Music2 size={33} strokeWidth={1}/></span><div className="eyebrow">WORDS INTO WAVES</div><h3>{busy === "song" ? "Finding the words…" : "Every track begins somewhere."}</h3><p>{busy === "song" ? `Writing original ${profile.name} lyrics, a style prompt and a cover concept from your idea.` : "Leave your idea in the idea field. Your lyrics, hook and arrangement will take shape here."}</p><div className="structure"><span>DJ INTRO</span><i/><span>STORY</span><i/><span>RELEASE</span><i/><span>DJ OUTRO</span></div></div>}</TabsContent>
      <TabsContent value="style"><div className="written"><div className="actions"><span className="eyebrow">SUNO-READY SOUND</span><Button variant="outline" onClick={() => copy(style, "Prompt copied.")}><Copy/>{notice === "Prompt copied." ? "Prompt copied" : "Copy prompt"}</Button></div><label htmlFor="style">{song ? "Your track’s style" : "Your signature starting sound"}</label><Textarea id="style" className="style-text" value={style} readOnly={!song} onChange={e => edit("style",e.target.value)}/><div className="arrangement"><Waves/><div><h3>{genre === "latin" ? "Room for rhythm. Room to move." : genre === "tech" ? "Hip-hop attitude. Tech-house pulse." : genre === "summit" ? "Build the tension. Feel the release." : genre === "hugel" ? "Let the percussion lead." : genre === "cali" ? "Turn up the heat. Keep it moving." : genre === "underground" ? "Build the tension. Let the bass answer." : genre === "camelphat" ? "Let the tension unfold." : "Space to mix. Space to feel."}</h3><p>{introBars}-bar drums-only DJ intro, 32-bar instrumental outro, sparse vocals and {profile.breakdown}.</p><p className="small-note">Suno may interpret arrangement directions loosely. Exact bar counts aren’t guaranteed.</p></div></div></div></TabsContent>
      <TabsContent value="cover"><div className="written"><div className="actions"><span className="eyebrow">THE VISUAL FEELING</span><Button variant="outline" onClick={() => copy(cover)}><Copy/>Copy art prompt</Button></div>{art ? <img className="cover-image" src={art} alt={`Generated cover for ${song?.title || "your song"}`}/> : <div className="art-empty"><ImagePlus size={35} strokeWidth={1}/><h3>A sleeve for your sound.</h3><p>Square artwork with Terry Bevvan branding.<br/>Generate your song first to include its title.</p></div>}<label htmlFor="cover">Cover direction</label><Textarea id="cover" value={cover} readOnly={!song} onChange={e => edit("cover",e.target.value)} className="cover-text"/><div className="actions bottom"><Button disabled={!!busy || !song} onClick={() => generate("art")}>{busy === "art" ? <LoaderCircle className="spin"/> : <ImagePlus/>}{busy === "art" ? "Creating cover…" : art ? "Create another cover" : "Create cover art"}</Button>{art && <a className="download-link" download="terry-bevvan-cover.png" href={art}><Download size={16}/>Download PNG</a>}</div><p className="small-note">1024 × 1024 PNG. Artwork generation uses your API connection.</p></div></TabsContent>
      </Tabs>
      <StudioChat key={chatSession} apiKey={key} genre={genre} introBars={introBars} idea={idea} song={song} locked={!!busy} onConnect={()=>setConnect(true)} onApply={next=>{sequence.current++;controller.current?.abort();setSong(next);setArt("");setTab("lyrics");setNotice("Chat edits applied to your song.");}} onCopy={copyForSuno}/>
      <footer className="session-footer"><span>TERRY BEVVAN / {profile.name.toUpperCase()}</span><span>Original words. Your story.</span></footer></section>
    </div><footer className="page-footer">{profile.footer}<span>SESSION 001</span></footer>
  </main>;
}
