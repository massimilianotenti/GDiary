// Deterministic invented records only. No Google calls, credentials or imports.
function createSyntheticArchive({entryCount=1000,revisionCount=1,revisedEntryCount=10,longBodyLength=12000}={}){
 for(const [key,value,max] of [['entryCount',entryCount,50000],['revisionCount',revisionCount,100],['revisedEntryCount',revisedEntryCount,100],['longBodyLength',longBodyLength,100000]])if(!Number.isInteger(value)||value<0||value>max)throw Error('Invalid synthetic option: '+key);
 if(!entryCount||!revisionCount)throw Error('Synthetic archive requires records and versions');
 const entries=[],plans=[],layout=[],days=[],weeks=[],habitLogs=[],start=Date.UTC(2020,0,1);
 for(let i=0;i<entryCount;i++){
  const id='synthetic-entry-'+String(i).padStart(6,'0'),date=new Date(start+(i%2490)*86400000).toISOString().slice(0,10),time=date+'T12:00:00.000Z',task=i%5===0;
  const status=task?(i%50===0?'open':i%10===0?'done':'cancelled'):'';
  entries.push([id,date,task?'task':'note','Voce sintetica '+i,i%3===0?'progetto-sintetico':'','',status,time,time,'synthetic-request-'+i,i%3===0?'project':'personal','',status==='done'?time:'',i%7===0?'privato':'esempio']);
  layout.push([id,String(i),time]);
  if(task)plans.push([id,status==='open'?date:'',time,'','','normal']);
 }
 // Common records span years without growing payloads or using real dates/data.
 for(let i=0;i<Math.min(entryCount,2490);i++){
  const date=new Date(start+i*86400000).toISOString().slice(0,10),time=date+'T12:00:00.000Z';
  days.push([date,'Intenzione sintetica','Riflessione sintetica',time,'','','','','','','','','']);
  habitLogs.push(['synthetic-habit|'+date,'synthetic-habit',date,i%2?'done':'skipped',time,'']);
  if(i%7===5)weeks.push([date,'Focus sintetico','','','','','','','3','',time]);
 }
 function content(i,revision){const version=new Date(Date.UTC(2026,9,1)+revision*1000).toISOString(),text='Contenuto sintetico caffè 🌱 ago-corpo-'+i+' revisione '+revision;
  const body=i%100===0?(text+'\n'+'testo di prova '.repeat(Math.ceil(longBodyLength/14))).slice(0,Math.max(text.length,longBodyLength)):text;
  return {version,body,rich:[{type:'paragraph',runs:[{text:body,bold:i%2===0}]}],baselineBody:null,baselineRich:null,headerTitle:'Voce sintetica '+i};
 }
 function* contentRows(){for(let i=0;i<entryCount;i++){const versions=i<revisedEntryCount?revisionCount:1;for(let revision=0;revision<versions;revision++){const value=content(i,revision),raw=JSON.stringify(value);let part=0;for(let at=0;at<raw.length;){let end=Math.min(raw.length,at+30000);if(end<raw.length&&raw.charCodeAt(end-1)>=0xD800&&raw.charCodeAt(end-1)<=0xDBFF)end--;yield [entries[i][0]+':'+value.version+':'+part,entries[i][0],String(part++),raw.slice(at,end)];at=end;}}}}
 return {entries,plans,layout,days,weeks,habitLogs,content,contentRows,summary:{entryCount,taskCount:entries.filter(e=>e[2]==='task').length,activeTaskCount:entries.filter(e=>e[6]==='open').length,revisionCount,revisedEntryCount:Math.min(revisedEntryCount,entryCount)}};
}
module.exports={createSyntheticArchive};
