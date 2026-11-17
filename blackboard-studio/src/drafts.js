/* Optional local recovery. No network access; one replaceable draft per browser origin. */
(function(root){
'use strict';
class DraftStore{
 constructor(factory=root.indexedDB){this.factory=factory;this.database=null;}
 async open(){
  if(this.database)return this.database;
  if(!this.factory)throw Error('Local recovery is unavailable in this browser.');
  this.database=await new Promise((resolve,reject)=>{const request=this.factory.open('blackboard-studio-recovery',1);request.onupgradeneeded=()=>request.result.createObjectStore('drafts');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Could not open local draft storage.'));request.onblocked=()=>reject(Error('Close other Blackboard tabs and retry draft recovery.'));});
  return this.database;
 }
 async operation(mode,action){const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction('drafts',mode);let value;const request=action(tx.objectStore('drafts'));if(request)request.onsuccess=()=>value=request.result;tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(Error('Local draft storage failed or is full.'));tx.onabort=()=>reject(Error('Local draft save was interrupted.'));});}
 async save(project){if(project.kind!=='blackboard-studio-project'||typeof project.source?.dataURL!=='string')throw Error('Invalid recovery draft.');return this.operation('readwrite',store=>store.put({...project,savedAt:new Date().toISOString()},'latest'));}
 read(){return this.operation('readonly',store=>store.get('latest'));}
 clear(){return this.operation('readwrite',store=>store.delete('latest'));}
 close(){this.database?.close();this.database=null;}
}
root.BlackboardDraftStore=DraftStore;
if(typeof module!=='undefined'&&module.exports)module.exports=DraftStore;
})(typeof globalThis!=='undefined'?globalThis:this);
