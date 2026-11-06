/* Memory only: share the current AI connection with the same-origin creator. */
(function(root){
  if(root.parent!==root){
    try{if(root.parent.StudioSession){root.StudioSession=root.parent.StudioSession;return;}}catch{}
  }
  let key='';const listeners=new Set();
  root.StudioSession={
    getKey:()=>key,
    setKey(value){key=value;listeners.forEach(listener=>listener());},
    subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);}
  };
})(window);
