(function(){
  const panel=document.getElementById('panel-trends'),$=selector=>panel.querySelector(selector);
  const CACHE='terry_genre_trends_v2';let current=null,busy=false,filter='all';
  const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
  const validUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
  function valid(report){return report&&typeof report.reviewedOn==='string'&&typeof report.summary==='string'&&typeof report.coverage==='string'&&Array.isArray(report.cards)&&report.cards.length>0&&report.cards.length<=6&&Array.isArray(report.sources)&&report.sources.length>=2&&report.sources.every(s=>s&&validUrl(s.url)&&typeof s.title==='string')&&report.cards.every(c=>c&&typeof c.genre==='string'&&typeof c.evidence==='string'&&typeof c.productionTip==='string'&&Array.isArray(c.sourceUrls));}
  function link(source){const a=node('a',source.title);a.href=validUrl(source.url);a.target='_blank';a.rel='noopener noreferrer';return a;}
  function applyFilter(){panel.querySelectorAll('.trend-card').forEach(card=>card.classList.toggle('hide',filter!=='all'&&card.dataset.cat!==filter));}
  function render(report){
    if(!valid(report))throw Error('Invalid trends report');
    current=report;
    $('#trendAsOf').textContent='Research checked '+report.reviewedOn+' · source dates and data periods listed below';
    $('#trendSummary').textContent=report.summary;$('#trendCoverage').textContent=report.coverage;
    const sources=new Map(report.sources.map(s=>[s.url,s]));
    const cards=report.cards.map(card=>{
      const article=node('article',undefined,'trend-card');article.dataset.cat=card.category;
      article.append(node('span',card.signal,'trend-signal'),node('h3',card.genre),node('p',card.evidence));
      const advice=node('p',undefined,'mastering-note');advice.append(node('b','Production idea · studio advice'),document.createElement('br'),document.createTextNode(card.productionTip));article.append(advice);
      const refs=node('p',undefined,'trend-card-sources');refs.append(document.createTextNode('Evidence: '));
      card.sourceUrls.forEach((url,i)=>{const source=sources.get(url);if(!source)return;if(i)refs.append(document.createTextNode(' · '));refs.append(link(source));});article.append(refs);return article;
    });
    $('#trendGenreGrid').replaceChildren(...cards);
    $('#trendSources').replaceChildren(...report.sources.map(source=>{const item=node('li');item.append(link(source),node('span',' — published '+source.publishedAt+' · '+source.period));return item;}));
    applyFilter();
  }
  async function loadBaseline(){
    let cached;try{cached=JSON.parse(localStorage.getItem(CACHE)||'null');if(valid(cached))render(cached);}catch{}
    try{
      const response=await fetch('/studio/genre-trends.json',{cache:'no-cache'});if(!response.ok)throw Error();const baseline=await response.json();
      if(!current||(current===cached&&baseline.reviewedOn>current.reviewedOn))render(baseline);
    }catch{if(!current)$('#trendStatus').textContent='The saved research snapshot could not load. Try refreshing the page.';}
  }
  $('#trendGenreChips').addEventListener('click',e=>{
    const chip=e.target.closest('button[data-filter]');if(!chip)return;
    filter=chip.dataset.filter;$('#trendGenreChips').querySelectorAll('button').forEach(btn=>{const on=btn===chip;btn.classList.toggle('on',on);btn.setAttribute('aria-pressed',String(on));});applyFilter();
  });
  const syncKey=()=>{if(document.activeElement!==$('#trendsKey'))$('#trendsKey').value=window.StudioSession.getKey();};
  window.StudioSession.subscribe(syncKey);syncKey();
  $('#trendsKey').addEventListener('input',e=>window.StudioSession.setKey(e.target.value));
  $('#trendsClearKey').addEventListener('click',()=>{window.StudioSession.setKey('');$('#trendsKey').value='';});
  $('#trendRefresh').addEventListener('click',async()=>{
    if(busy)return;
    const key=window.StudioSession.getKey();
    if(!key.trim()){$('#trendsConnection').open=true;$('#trendsKey').focus();$('#trendStatus').textContent='Connect your API key for this session, then click Refresh with AI. The current report stays available.';return;}
    busy=true;$('#trendRefresh').disabled=true;$('#trendRefresh').textContent='Researching sources…';$('#trendStatus').textContent='Searching current sources. The previous report stays visible until a complete sourced update is ready.';
    try{
      const response=await fetch('/api/song-creator/trends',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key}),signal:AbortSignal.timeout(130000)});
      let report;try{report=await response.json();}catch{throw Error('Your studio session may have expired. Reload and reconnect AI; your previous report is unchanged.');}
      if(!response.ok)throw Error(report.error||'Research failed. Your previous report is unchanged.');
      if(!valid(report))throw Error('The research response was incomplete. Your previous report is unchanged.');
      render(report);
      try{localStorage.setItem(CACHE,JSON.stringify(report));$('#trendStatus').textContent='Updated with researched sources. This report is saved on this browser for your next visit.';}
      catch{$('#trendStatus').textContent='Research updated for this visit, but browser storage was unavailable. The previous saved report is unchanged.';}
    }catch(error){$('#trendStatus').textContent=error.name==='TimeoutError'?'Research timed out. Your previous report is unchanged; try again later.':error.message;}
    finally{busy=false;$('#trendRefresh').disabled=false;$('#trendRefresh').textContent='Refresh with AI';}
  });
  loadBaseline();
})();
