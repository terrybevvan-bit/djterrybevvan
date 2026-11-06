/* Shared local library. Credentials and generated image bytes never belong here. */
(function(root){
  const KEY='terry_saved_tracks_v1';
  function read(strict=false){
    try{
      const raw=localStorage.getItem(KEY);
      if(!raw)return [];
      const tracks=JSON.parse(raw);
      if(!Array.isArray(tracks))throw Error('The local track library could not be read.');
      return tracks;
    }catch(error){if(strict)throw error;return [];}
  }
  function write(tracks){
    localStorage.setItem(KEY,JSON.stringify(tracks));
    const notify=target=>target.dispatchEvent(new Event('tracks-changed'));
    notify(root);
    if(root.parent!==root){try{notify(root.parent);}catch{}}
  }
  root.TrackStore={
    all:read,
    get:id=>read().find(track=>track.id===id),
    count:()=>read().length,
    save(track){
      const tracks=read(true),existing=tracks.find(item=>item.id===track.id);
      const saved={...track,id:existing?.id||'t'+Date.now()+Math.random().toString(36).slice(2,8),savedAt:Date.now()};
      write([saved,...tracks.filter(item=>item.id!==saved.id)]);
      return saved.id;
    },
    add(track){return this.save({...track,id:undefined});},
    remove(id){write(read(true).filter(track=>track.id!==id));}
  };
})(window);
