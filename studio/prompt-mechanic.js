(function(){
  const panel=document.getElementById('panel-prompts'), $=id=>panel.querySelector('#'+id);
  let busy=false;
  const status=text=>{$('pmStatus').textContent=text;};
  const count=()=>{$('pmCount').textContent=$('pmOutput').value.length+' / 1000 characters';};
  $('pmOutput').addEventListener('input',count);
  const sync=()=>{if(document.activeElement!==$('pmKey'))$('pmKey').value=window.StudioSession.getKey();};
  window.StudioSession.subscribe(sync);sync();
  $('pmKey').addEventListener('input',e=>window.StudioSession.setKey(e.target.value));
  $('pmClearKey').addEventListener('click',()=>window.StudioSession.setKey(''));
  panel.querySelectorAll('[data-pm-example]').forEach(button=>button.addEventListener('click',()=>{$('pmReference').value=button.dataset.pmExample;$('pmReference').focus();}));
  async function generate(refine){
    if(busy)return;
    const reference=$('pmReference').value.trim(),current=$('pmOutput').value.trim(),refinement=$('pmRefinement').value.trim();
    if(!reference){status('Enter an artist, instrument, sound or musical reference.');$('pmReference').focus();return;}
    if(refine&&(!current||!refinement)){status('Add a style prompt and describe the change you want.');(!current?$('pmOutput'):$('pmRefinement')).focus();return;}
    const key=window.StudioSession.getKey();
    if(!key.trim()){$('pmConnection').open=true;$('pmKey').focus();status('Connect your API key to generate a style prompt.');return;}
    busy=true;
    panel.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=true);
    panel.setAttribute('aria-busy','true');status(refine?'Refining your style prompt…':'Building your style prompt…');
    try{
      const response=await fetch('/api/song-creator/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,reference,current:refine?current:'',refinement:refine?refinement:''}),signal:AbortSignal.timeout(100000)});
      let data;try{data=await response.json();}catch{throw Error('Your studio session may have expired. Reload the page and reconnect AI.');}
      if(!response.ok)throw Error(data.error||'Generation failed. Try again.');
      if(typeof data.style!=='string'||!data.style.trim()||data.style.length>1000)throw Error('The returned prompt was incomplete. Try again.');
      $('pmOutput').value=data.style;count();status('Ready to edit or copy into Suno’s Style field.');
    }catch(error){status(error.name==='TimeoutError'?'Generation timed out. Your draft is unchanged.':error.message);}
    finally{busy=false;panel.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=false);panel.setAttribute('aria-busy','false');sync();}
  }
  $('pmForm').addEventListener('submit',e=>{e.preventDefault();generate(false);});
  $('pmRefine').addEventListener('click',()=>generate(true));
  $('pmEdit').addEventListener('click',()=>{$('pmOutput').focus();status('Edit the style directly, then copy your updated prompt.');});
  $('pmCopy').addEventListener('click',async()=>{
    const text=$('pmOutput').value.trim();if(!text){status('Generate or type a style prompt first.');return;}
    try{await window.studioCopy(text);status('Copied. Paste into Suno’s Style field.');}catch{status('Clipboard unavailable. Select and copy the style prompt manually.');$('pmOutput').focus();$('pmOutput').select();}
  });
  count();
})();
