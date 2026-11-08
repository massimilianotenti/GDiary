const assert=require('node:assert/strict'),{open,copy}=require('./helpers/habit-log-continuous.cjs');
let server=open(),checkpoints=new Map(),acks=[],retired=0;
for(let n=0;n<1000;n++){
 if([95,127,128,999].includes(n))checkpoints.set(n,server.snapshot());
 server.ledger.reset();const ack=server.call(n);acks.push(ack);
 assert.equal(ack.log.key,server.request(n).operation.log.key);
 if(process.env.GDIARY_CONTINUOUS_FIXTURE&&[127,128,129,256].includes(n+1))require('node:fs').writeFileSync(process.env.GDIARY_CONTINUOUS_FIXTURE.replace(/\.json$/,'-'+(n+1)+'.json'),JSON.stringify(server.snapshot()));
 if((n+1)%32===0)console.log('Progressive application writes:',n+1);if((n+1)%128===0||[128,999].includes(n)){server=open(server.snapshot());}
}
const final=server.snapshot();const activeCounts=new Map();for(const row of final.ledger.index.data)if(/^k:/.test(row[0]))activeCounts.set(row[0],(activeCounts.get(row[0])||0)+1);assert(Math.max(...activeCounts.values())<=512,'all active reference keys stay within the original hard limit');retired=final.ledger.index.data.filter(row=>/^retired:/.test(row[0])).length;assert(retired>0);assert.equal(acks.length,1000);
for(const n of [0,127,128,999]){server.ledger.reset();assert.deepEqual(server.call(n),acks[n]);assert.equal(server.ledger.metrics().events.length,0,'lost ACK replay does not write');}
const snapshotCursor=copy(server.ctx.getSyncCheckpoint({}).cursor),snapshotPage=copy(server.ctx.getSnapshotPage({collection:'habitLogs',limit:1,cursor:snapshotCursor}));assert.equal(snapshotPage.coverage.canonical,1000,'application snapshot proves all 1,000 canonical identities');assert.equal(snapshotPage.coverage.complete,false,'legacy coverage remains explicit');assert.equal(snapshotPage.records.length,1);assert.equal(snapshotPage.observedCursor.sequence,snapshotCursor.sequence);
const full=copy(checkpoints.get(127));for(const row of full.ledger.index.data)if(/^retired:/.test(row[0]))row[0]=JSON.parse(Buffer.from(row[2].slice(3),'base64').toString('utf8')).key;const disabled=open(full,false);disabled.ledger.reset();assert.throws(()=>disabled.ctx.saveHabitLogOperation({...disabled.request(127),maintenanceEnabled:true,context:{maintenanceEnabled:true}}),e=>e.name==='ProtocolUnavailable');assert.equal(disabled.ledger.metrics().events.length,0,'client flags cannot enable a disabled server policy');
if(process.env.GDIARY_CONTINUOUS_FIXTURE)require('node:fs').writeFileSync(process.env.GDIARY_CONTINUOUS_FIXTURE,JSON.stringify(final));
// Every persistent RPC boundary of the first threshold write and the v2 transition.
let faults=0;for(const n of [95,128]){
 const baseline=open(checkpoints.get(n));baseline.ledger.reset();baseline.call(n);const count=baseline.ledger.metrics().events.length;
 for(const phase of ['before','after','partial'])for(let at=1;at<=count;at++){
  const trial=open(checkpoints.get(n));trial.ledger.reset();trial.ledger.fault(at,phase);try{trial.call(n);}catch(e){assert(['StorageError','ProtocolUnavailable','ProtocolCorrupt','CommitBlocked'].includes(e.name),e.name);}
  const reboot=open(trial.snapshot());assert.deepEqual(reboot.call(n),acks[n],`${n}/${phase}/${at}`);assert.deepEqual(copy(reboot.ctx.getHabitLogOperationReceipt({scope:reboot.scope,request:reboot.request(n).operation})).status,'committed');faults++;
 }
 console.log('Threshold/transition fault boundaries:',n,count);
}
console.log(JSON.stringify({created:1000,retired,faults,physicalRows:final.ledger.index.data.length,head:server.ctx.getSyncCheckpoint({}).highWater}));
