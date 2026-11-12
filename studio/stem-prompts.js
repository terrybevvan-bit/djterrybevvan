(function(){
  const container=document.getElementById('stemPromptCards');
  if(!container)return;
  const common='Process only this selected stem with a subtle, bypassable audio effects chain. Preserve the original audio, notes, timing, arrangement and character; do not regenerate or add musical parts. Check existing effects first and avoid duplicating processing. ';
  const finish=' Use small adjustments only where needed; leave clean areas unchanged. Match output loudness to bypass, preserve dynamics and leave headroom. No final loudness maximization or brickwall limiting. Show the effects and settings used so I can adjust or bypass them.';
  const mixIntro='Apply a subtle, bypassable final mix check to the combined mix after the individual stems have been processed and balanced. Preserve the original performance, arrangement and character; do not regenerate audio or add musical parts. Review existing stem and bus effects before adding anything, and avoid repeating their EQ, compression or cleanup. ';
  const presets=[
    ['Main Mix','Use once on the combined mix after stem balancing. Keep the original full-song track muted when using extracted stems.', 'Check the overall tonal balance and dynamics in context. If you can inspect individual stems, suggest a stem-level correction for an isolated problem rather than processing the whole mix. Only if a broad tonal imbalance remains, use a very small, broad EQ adjustment. Add light bus compression only if the mix actually needs cohesion; retain kick punch, bass weight, vocal clarity and section-to-section dynamics, with no audible pumping. Preserve the stereo image and existing ambience. Do not add saturation, stereo widening, reverb or automatic normalization. If the mix already sounds balanced, leave the effects bypassed. This mix will be mastered separately in the Master Room.'],
    ['Drums','Punch and definition; keep the groove.', 'Keep the kick weight and drum transients intact. Gently reduce boxiness or harsh cymbal buildup only if present. Use light compression only if needed to control uneven hits, with enough attack to retain punch and a release that recovers naturally between hits. Preserve the groove; avoid extra reverb, widening and audible pumping.'],
    ['Bass','Steady weight without losing the low end.', 'Keep the fundamental, note lengths and bass groove intact. Gently control boomy resonances and uneven notes without thinning the sub or flattening articulation. Remove only unwanted rumble below the useful bass range. Preserve the existing stereo image and do not widen the low end. Do not add kick ducking by default; retain the original envelope.'],
    ['Percussion','Clear detail and natural movement.', 'Preserve swing, accents, hand-drum body and natural transient detail. Gently reduce unwanted low rumble and piercing shaker or hi-hat resonances only where present. Use minimal dynamics control if needed for stray peaks. Keep existing pan positions and ambience; do not add reverb or hard gating that cuts off tails.'],
    ['Keyboard','Clear chords with the warmth intact.', 'Preserve chord voicings, touch, sustain and the natural body of this keyboard stem. Gently reduce unwanted low rumble or muddy low-mid buildup only where present, without thinning the instrument. Smooth harsh attacks only if needed. Keep compression light and retain existing ambience and stereo placement; add no new reverb or widening.'],
    ['Synth','Smooth presence; preserve the sound design.', 'Preserve the synth tone, filter movement, modulation, envelopes and existing stereo image. Gently control resonant peaks or harsh upper mids only if present. Remove low rumble only when it is not part of the intended synth sound; preserve intentional sub content. Avoid extra saturation, widening, reverb or compression that changes the sound design.'],
    ['FX','Controlled peaks with full transition tails.', 'Preserve the timing, movement, stereo placement and full delay and reverb tails of risers, impacts, sweeps and atmospheric effects. Gently tame painful resonances or isolated excessive peaks only if present. Retain intentional low-frequency impacts; remove only unrelated rumble. Avoid hard gates, extra ambience or compression that flattens build-ups.'],
    ['Vocals','Clear words and a natural performance.', 'Preserve the voice identity, words, phrasing, breaths and expression. Gently reduce unwanted rumble and muddy resonances only if present. Soften excessive sibilance without dulling consonants or creating a lisp. Use light compression only if needed for uneven phrases. Preserve existing ambience; add no new tuning, harmonies, doubling, delay or reverb. Do not use hard gating or aggressive denoising.']
  ];
  const status=document.getElementById('stemPromptStatus');
  presets.forEach(([name,description,direction],index)=>{
    const card=document.createElement('article');card.className='stem-prompt-card';
    const title=document.createElement('h4');title.textContent=name;
    const summary=document.createElement('p');summary.className='note';summary.textContent=description;
    const label=document.createElement('label');label.className='field';
    const caption=document.createElement('span');caption.className='cap';caption.textContent=name+' · Studio chat prompt';
    const isMix=name==='Main Mix';
    const text=document.createElement('textarea');text.id='stemPrompt'+index;text.rows=7;text.value=(isMix?mixIntro:common)+direction+finish;
    label.append(caption,text);
    const button=document.createElement('button');button.type='button';button.className='btn';button.textContent='Copy '+name.toLowerCase()+' prompt';
    button.addEventListener('click',async()=>{
      try{await window.studioCopy(text.value);status.textContent=isMix?'Main Mix prompt copied. Target the combined mix bus, or an exported mix reimported on its own, and paste into Suno Studio chat.':name+' prompt copied. Select the '+name.toLowerCase()+' stem and paste into Suno Studio chat.';}
      catch{status.textContent='Clipboard unavailable. The '+name.toLowerCase()+' prompt is selected; copy it manually.';text.focus();text.select();}
    });
    card.append(title,summary,label,button);container.append(card);
  });
})();
