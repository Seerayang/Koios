const P = require('../src/parser.js');
const now = new Date(2026, 9, 31, 19, 25); // Sat Oct 31 2026
let fails = 0;
const eq = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { fails++; console.log('FAIL', name, '\n  got ', g, '\n  want', w); } else console.log('ok  ', name);
};
const run = (t, ctx = {}) => P.parseCommand(t, Object.assign({ now, pending: null, last: null, awaiting: null }, ctx));
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] !== undefined).map(k => [k, o[k]]));

// brief examples
let r = run('put running for me every monday 3PM');
eq('running every monday', pick(r, ['intent', 'title', 'days', 'start', 'end', 'kind']), { intent: 'create', title: 'Running', days: [1], start: 900, end: 945, kind: 'habit' });
r = run('i have a conference next monday 2PM');
eq('conference next monday', pick(r, ['intent', 'title', 'date', 'start', 'end', 'kind', 'milestone']), { intent: 'create', title: 'Conference', date: '2026-11-02', start: 840, end: 900, kind: 'once', milestone: true });
r = run('meeting with Audrey', { pending: { date: '2026-10-31', start: 1320, end: 1440 } });
eq('drag + meeting with Audrey', pick(r, ['intent', 'title', 'date', 'start', 'end', 'kind']), { intent: 'create', title: 'Meeting with Audrey', date: '2026-10-31', start: 1320, end: 1440, kind: 'once' });
r = run('Today 10PM–12AM… meeting with Audrey');
eq('starter text parsed', pick(r, ['intent', 'title', 'date', 'start', 'end']), { intent: 'create', title: 'Meeting with Audrey', date: '2026-10-31', start: 1320, end: 1440 });
const last = { id: 'e1', title: 'Meeting with Audrey', start: 1320, end: 1440 };
r = run('make it end at 12:30', { last });
eq('adjust end 12:30', r, { intent: 'adjust', end: 750 });
r = run('make it 10-12:30', { last });
eq('adjust range 10-12:30', pick(r, ['intent', 'start', 'end']), { intent: 'adjust', start: 600, end: 750 });
r = run('move it to tomorrow', { last });
eq('move tomorrow', pick(r, ['intent', 'date']), { intent: 'adjust', date: '2026-11-01' });
r = run('extend it by 30 minutes', { last });
eq('extend 30', r, { intent: 'adjust', extend: 30 });
r = run('rename it to Coffee chat', { last });
eq('rename', r, { intent: 'adjust', title: 'Coffee chat' });
r = run('delete it', { last });
eq('delete', r, { intent: 'delete' });

// more creates
r = run('piano practice every tuesday and thursday at 7pm');
eq('piano tue/thu', pick(r, ['title', 'days', 'start', 'end', 'kind']), { title: 'Piano practice', days: [2, 4], start: 1140, end: 1185, kind: 'habit' });
r = run('gym lesson fridays 5:30pm-6:30pm');
eq('gym fridays', pick(r, ['title', 'days', 'start', 'end', 'kind']), { title: 'Gym lesson', days: [5], start: 1050, end: 1110, kind: 'habit' });
r = run('chemistry exam on nov 18 at 10am');
eq('exam date', pick(r, ['title', 'date', 'start', 'end', 'milestone', 'kind']), { title: 'Chemistry exam', date: '2026-11-18', start: 600, end: 720, milestone: true, kind: 'once' });
r = run('dentist tomorrow 4pm');
eq('dentist tomorrow', pick(r, ['title', 'date', 'start', 'end']), { title: 'Dentist', date: '2026-11-01', start: 960, end: 1020 });
r = run('lunch with sam friday 12-1pm');
eq('lunch range', pick(r, ['title', 'date', 'start', 'end']), { title: 'Lunch with sam', date: '2026-11-06', start: 720, end: 780 });
r = run('dentist 4pm');
eq('ask day', pick(r, ['intent', 'title', 'start']), { intent: 'ask', title: 'Dentist', start: 960 });
r = run('friday', { awaiting: { title: 'Dentist', start: 960, end: 1020, kind: 'once', milestone: false } });
eq('answer day', pick(r, ['intent', 'title', 'date', 'start']), { intent: 'create', title: 'Dentist', date: '2026-11-06', start: 960 });
r = run('read every day');
eq('read daily no time', pick(r, ['title', 'days', 'start', 'kind']), { title: 'Read', days: [0, 1, 2, 3, 4, 5, 6], kind: 'habit' });
r = run('my run day is every monday');
eq('theme A', r, { intent: 'theme', dows: [1], word: 'run' });
r = run('mondays are run day');
eq('theme B', r, { intent: 'theme', dows: [1], word: 'run' });
r = run('make fridays gym day');
eq('theme C', r, { intent: 'theme', dows: [5], word: 'gym' });
r = run('show month');
eq('zoom month', r, { intent: 'zoom', level: 'month' });
r = run('blah');
eq('nothing', pick(r, ['intent']).intent === 'ask' || r.intent === 'unknown', true);
r = run('stop labeling weeks');
eq('themes off', r, { intent: 'themesOff' });
r = run('team standup weekdays 9:30am');
eq('weekdays', pick(r, ['title', 'days', 'start']), { title: 'Team standup', days: [1, 2, 3, 4, 5], start: 570 });
r = run('tonight dinner with mom');
eq('tonight', pick(r, ['title', 'date', 'start']), { title: 'Dinner with mom', date: '2026-10-31', start: 1200 });
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
