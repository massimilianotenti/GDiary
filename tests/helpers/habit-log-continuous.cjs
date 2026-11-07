const {createDayRoutingServer}=require('./day-routing-server.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
function open(snapshot,enabled=true,options={}){
 const server=createDayRoutingServer(snapshot,snapshot?options:{...options,seedPractices:Array.from({length:12},()=>({steps:'Primo 🌱\nSecondo'}))});
 server.ctx.syncHabitLogMaintenanceEnabled_=()=>enabled;
 if(!snapshot){server.habitLogController.register({habitLogsSheetId:14,indexSheetId:11,blockSheetId:12,habitsSheetId:15,goalsSheetId:16});server.habitLogController.setMode({mode:'active',expectedRevision:1});}
 const scope={...server.scope,protocolVersion:1,schemaVersion:1};
 const input=n=>{const p=server.practices[Math.floor(n/84)],day=n%84,date=new Date(Date.UTC(2026,9,1+day)).toISOString().slice(0,10);return {scope,operation:{operationId:'continuous-habit-operation-'+n.toString().padStart(4,'0'),baseVersion:null,habitUpdatedAt:p.habit.updatedAt,log:{key:p.habit.id+'|'+date,habitId:p.habit.id,date,status:'pending',checklist:JSON.stringify({checked:[],steps:JSON.parse(p.habit.steps)})}}};};
 // Legacy seed logs are deliberately left untouched. Skip their dates.
 const request=n=>{const result=input(n);if(result.operation.log.date==='2026-10-28')result.operation.log.date='2026-12-30';result.operation.log.key=result.operation.log.habitId+'|'+result.operation.log.date;return result;};
 return {...server,scope,request,call:n=>copy(server.ctx.saveHabitLogOperation(request(n)))};
}
module.exports={open,copy};
