(function(){
  'use strict';
  const $=id=>document.getElementById(id), slots={A:null,B:null}, versions={A:0,B:0};
  let ctx,source,gain,which='A',offset=0,started=0,playing=false,raf=0;
  const duration=()=>slots.A&&slots.B?Math.min(slots.A.buffer.duration,slots.B.buffer.duration):0;
  const time=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
  const position=()=>Math.min(duration(),playing?offset+ctx.currentTime-started:offset);
  function update(){const pos=position();$('abSeek').value=pos;$('abTime').textContent=time(pos)+' / '+time(duration());}
  function stop(){offset=position();playing=false;if(source){source.onended=null;source.stop();source.disconnect();source=null;}if(gain){gain.disconnect();gain=null;}cancelAnimationFrame(raf);$('abPlay').textContent='Play comparison';update();}
  function frame(){update();if(playing)raf=requestAnimationFrame(frame);}
  function start(){
    if(!duration())return;
    window.dispatchEvent(new CustomEvent('fix-room-playback',{detail:'comparison'}));
    if(offset>=duration())offset=0;
    ctx.resume().catch(()=>{$('abStatus').textContent='Playback could not start. Press Play to try again.';stop();});
    source=ctx.createBufferSource();gain=ctx.createGain();source.buffer=slots[which].buffer;
    const a=slots.A.lufs,b=slots.B.lufs;
    gain.gain.value=$('abMatch').checked&&Number.isFinite(a)&&Number.isFinite(b)?Math.pow(10,(Math.min(a,b)-slots[which].lufs)/20):1;
    source.connect(gain);gain.connect(ctx.destination);started=ctx.currentTime;playing=true;
    source.onended=()=>{stop();offset=0;update();};source.start(0,offset,duration()-offset);$('abPlay').textContent='Pause comparison';frame();
  }
  function switchTo(next){const resume=playing;stop();which=next;$('abA').setAttribute('aria-pressed',next==='A');$('abB').setAttribute('aria-pressed',next==='B');if(resume)start();}
  function measure(buffer){return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('fix-room-engine.js',location.href));
    const timer=setTimeout(()=>finish(new Error('Loudness measurement timed out. Try a shorter WAV.')),120000);
    function finish(error,value){clearTimeout(timer);worker.terminate();error?reject(error):resolve(value);}
    worker.onerror=()=>finish(new Error('Could not measure this audio file.'));
    worker.onmessage=e=>{if(e.data.type==='loaded')finish(null,e.data.scan.lufs);else if(e.data.type==='error')finish(new Error(e.data.message));};
    const L=buffer.getChannelData(0).slice(),R=buffer.getChannelData(Math.min(1,buffer.numberOfChannels-1)).slice();
    worker.postMessage({type:'load',id:1,L,R,sr:buffer.sampleRate},[L.buffer,R.buffer]);
  });}
  function controls(){const ready=!!duration();['abPlay','abA','abB','abSeek'].forEach(id=>$(id).disabled=!ready);$('abSeek').max=duration()||1;update();}
  for(const key of ['A','B'])$('abFile'+key).addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    const version=++versions[key];stop();offset=0;slots[key]=null;controls();$('abStatus').textContent='Decoding and measuring '+key+' · '+file.name;
    try{
      if(!ctx)ctx=new (window.AudioContext||window.webkitAudioContext)();
      const buffer=await ctx.decodeAudioData(await file.arrayBuffer()),lufs=await measure(buffer);
      if(version!==versions[key])return;
      slots[key]={buffer,lufs,name:file.name};controls();
      if(duration()){
        const values=['A','B'].map(k=>k+' · '+slots[k].name+' ('+(Number.isFinite(slots[k].lufs)?slots[k].lufs.toFixed(1)+' LUFS':'silent / unmeasurable')+')');
        $('abStatus').textContent=values.join(' | ')+'. Compare by ear.'+(Math.abs(slots.A.buffer.duration-slots.B.buffer.duration)>0.1?' Lengths differ; playback ends with the shorter file. Check start alignment.':'')+(!Number.isFinite(slots.A.lufs)||!Number.isFinite(slots.B.lufs)?' Loudness matching unavailable for silent or unmeasurable audio.':'');
      }else $('abStatus').textContent=key+' ready. Load the other master to compare.';
    }catch(error){if(version===versions[key])$('abStatus').textContent='Could not load '+key+': '+error.message;}
  });
  $('abPlay').addEventListener('click',()=>playing?stop():start());
  $('abA').addEventListener('click',()=>switchTo('A'));$('abB').addEventListener('click',()=>switchTo('B'));
  $('abMatch').addEventListener('change',()=>switchTo(which));
  $('abSeek').addEventListener('input',e=>{const requested=Number(e.target.value),resume=playing;stop();offset=Math.max(0,Math.min(duration(),requested));update();if(resume)start();});
  window.addEventListener('fix-room-playback',e=>{if(e.detail==='repair')stop();});
  window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='studio-tool-visibility'&&!e.data.visible)stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
})();
