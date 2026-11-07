// A second HTTP mutation lands after the first HabitLogs page was read;
// retained feed replay must repair that older row in the real consumer.
process.env.GDIARY_SNAPSHOT_CONCURRENT='1';
require('./verify-habit-log-continuous-browser.cjs');
