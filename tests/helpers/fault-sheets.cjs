// Small persistent Sheets model with failures at individual RPC boundaries.
// This is not a claim about Google service atomicity or response ordering.
const crypto=require('crypto');
const copy=value=>JSON.parse(JSON.stringify(value));
function createFaultSheets(snapshot){
 const state=snapshot?copy(snapshot):{index:{data:[['key','operation','reference','publication']],capacity:2},blocks:{data:[['generation','part','payload']],capacity:2}};
 let events=[],fault=null,locked=false,reads=[],searches=[],enabled=true,authorized=true;
 const event=(label,apply,partial)=>{const at=events.push(label);if(fault?.at===at&&fault.phase==='before')throw Error('PRIVATE simulated Sheets outage');if(fault?.at===at&&fault.phase==='partial'){partial?.();throw Error('PRIVATE torn Sheets write');}apply();if(fault?.at===at&&fault.phase==='after')throw Error('PRIVATE lost Sheets ACK');};
 class Sheet{
  // Model the metadata RPC without rescanning the growing synthetic sheet
  // on every authorization check. Cell writes invalidate/update the cache.
  constructor(name){this.name=name;this.lastColumn=null;}
  getLastRow(){const rows=state[this.name].data;for(let i=rows.length-1;i>=0;i--)if(rows[i]?.some(value=>value!==''&&value!==undefined))return i+1;return 0;}
  getLastColumn(){if(this.lastColumn===null)this.lastColumn=Math.max(0,...state[this.name].data.map(row=>{for(let i=row.length-1;i>=0;i--)if(row[i]!==''&&row[i]!==undefined)return i+1;return 0;}));return this.lastColumn;}
  getMaxRows(){return state[this.name].capacity;}
  insertRowsAfter(after,count){if(after!==this.getMaxRows())throw Error('Unexpected capacity growth');event(this.name+':capacity',()=>{state[this.name].capacity+=count;},()=>{state[this.name].capacity+=Math.max(1,Math.floor(count/2));});}
  getRange(row,column,count=1,width=1){
   const sheet=this;if(row<1||column<1||row+count-1>sheet.getMaxRows())throw Error('Range outside sheet capacity');
   return {
    getRow:()=>row,setNumberFormat(){event(sheet.name+':format',()=>{},()=>{});return this;},
    setValues(values){
     if(values.length!==count||values.some(value=>value.length!==width))throw Error('Range dimensions mismatch');
     const cells=[];values.forEach((line,i)=>line.forEach((value,j)=>cells.push([row+i,column+j,String(value)])));
     const apply=items=>items.forEach(([r,c,text])=>{state[sheet.name].data[r-1]??=[];const old=state[sheet.name].data[r-1][c-1];state[sheet.name].data[r-1][c-1]=text;if(sheet.lastColumn!==null){if(text!=='')sheet.lastColumn=Math.max(sheet.lastColumn,c);else if(old&&c===sheet.lastColumn)sheet.lastColumn=null;}});
     event(sheet.name+':write:'+count+'x'+width,()=>apply(cells),()=>{
      if(cells.length===1){const cell=cells[0];apply([[cell[0],cell[1],cell[2].slice(0,fault?.prefix??Math.floor(cell[2].length/2))]]);}
      else apply(cells.slice(0,fault?.prefix??Math.max(1,Math.floor(cells.length/2))));
     });return this;
    },
    setValue(value){return this.setValues([[value]]);},
    getDisplayValues(){reads.push({sheet:sheet.name,row,column,count,width});return Array.from({length:count},(_,i)=>Array.from({length:width},(_,j)=>state[sheet.name].data[row-1+i]?.[column-1+j]??''));},
    createTextFinder(value){let regex=false,entire=false;return {
     useRegularExpression(flag){regex=flag;return this;},matchEntireCell(flag){entire=flag;return this;},
     findAll(){searches.push({sheet:sheet.name,column,count});const found=[];for(let i=0;i<count;i++){const text=state[sheet.name].data[row-1+i]?.[column-1]||'';if(regex?new RegExp(value).test(text):entire?text===value:text.includes(value))found.push(sheet.getRange(row+i,column));}return found;}
    };}
   };
  }
 }
 const index=new Sheet('index'),blocks=new Sheet('blocks');
 const globals={
  SpreadsheetApp:{flush(){event('flush',()=>{},()=>{});}},
  LockService:{getScriptLock:()=>({tryLock(){if(locked)return false;locked=true;return true;},releaseLock(){if(!locked)throw Error('Unowned release');locked=false;}})},
  Utilities:{
   getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},
   computeDigest(algorithm,text,charset){return [...crypto.createHash(algorithm).update(text,charset).digest()].map(byte=>byte>127?byte-256:byte);},
   base64Encode:(text,charset)=>Buffer.from(text,charset).toString('base64'),base64Decode:text=>[...Buffer.from(text,'base64')].map(byte=>byte>127?byte-256:byte),
   newBlob:bytes=>({getDataAsString:()=>Buffer.from(bytes.map(byte=>(byte+256)%256)).toString('utf8')})
  }
 };
 return {index,blocks,globals,services:{enabled:()=>enabled,authorize:()=>authorized},snapshot:()=>copy(state),
  fault(at,phase,prefix){fault={at,phase,prefix};},reset(){fault=null;events=[];reads=[];searches=[];},
  setEnabled:value=>{enabled=value;},setAuthorized:value=>{authorized=value;},
  metricCounts:()=>({events:events.length,reads:reads.length,searches:searches.length}),
  metrics:()=>copy({events,reads,searches}),mutate(fn){const data=this.snapshot();fn(data);return createFaultSheets(data);}
 };
}
module.exports={createFaultSheets};
