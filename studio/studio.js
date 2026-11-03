document.querySelectorAll('.navitem, span.chip').forEach(el=>{
  el.tabIndex=0; el.setAttribute('role','button');
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}});
});
document.querySelectorAll('#panel-master input[type=range]').forEach(el=>{
  if(!el.getAttribute('aria-label')) el.setAttribute('aria-label',el.closest('.ctl,.mb-ctl')?.querySelector('.top')?.textContent.trim()||el.id);
});
document.getElementById('drop').tabIndex=0;
document.getElementById('drop').setAttribute('role','button');
document.getElementById('drop').setAttribute('aria-label','Load audio files');
document.getElementById('drop').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();document.getElementById('fileInput').click();}});
