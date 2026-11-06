// Only the two record families with full-snapshot outbox contracts.
import {DAY_FIELDS,daySnapshot,validDayOperation,validDayDate} from './day-operation.mjs';
import {WEEK_FIELDS,weekSnapshot,validWeekOperation,validWeek} from './week-operation.mjs';
const periods=Object.freeze({
 day:Object.freeze({key:'date',collection:'days',fields:DAY_FIELDS,snapshot:daySnapshot,validOperation:validDayOperation,validIdentity:validDayDate,saveMethod:'saveDayOperation',receiptMethod:'getDayOperationReceipt'}),
 week:Object.freeze({key:'week',collection:'weeks',fields:WEEK_FIELDS,snapshot:weekSnapshot,validOperation:validWeekOperation,validIdentity:validWeek,saveMethod:'saveWeekOperation',receiptMethod:'getWeekOperationReceipt'})
});
export const periodOperation=kind=>periods[kind]||null;
