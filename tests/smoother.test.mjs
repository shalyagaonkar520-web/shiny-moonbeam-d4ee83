// The vehicle-motion engine behind the live tracking map: no browser needed.
import { build } from 'esbuild';

const out = await build({
  entryPoints: ['src/lib/smoothMove.ts'],
  bundle: true, write: false, format: 'esm', platform: 'neutral', logLevel: 'silent',
});
const lib = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));

let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`);
  if (!ok) failed++;
};

// A bike going north at ~10 m/s, a fix every 3 s (0.00027 deg ~ 30 m).
const STEP = 0.00027;
const fix = (i) => ({ lat: 14.96 + STEP * i, lng: 74.71 });
const m = lib.metresBetween;

{
  const s = new lib.Smoother();
  s.push(fix(0), 0);
  check('first fix is drawn where it is', m(s.at(0), fix(0)) < 0.01);
  check('nothing to redraw before it moves', !s.active(10));
}

{
  // Fixes land every 3 s; sample the drawn position every 50 ms.
  const s = new lib.Smoother();
  let t = 0;
  s.push(fix(0), t);
  const samples = [];
  for (let i = 1; i <= 8; i++) {
    t = i * 3000;
    s.push(fix(i), t);
    for (let k = 0; k < 60; k++) samples.push({ t: t + k * 50, p: s.at(t + k * 50) });
  }
  // After the first couple of fixes it should never stall or leap.
  const steady = samples.filter((x) => x.t > 9000);
  let stall = 0, longestStall = 0, maxStep = 0;
  for (let i = 1; i < steady.length; i++) {
    const d = m(steady[i - 1].p, steady[i].p);
    maxStep = Math.max(maxStep, d);
    if (d < 0.05) { stall += 50; longestStall = Math.max(longestStall, stall); } else stall = 0;
  }
  check('steady travel never stands still for more than 100 ms', longestStall <= 100, `stall ${longestStall} ms`);
  check('steady travel never leaps (under 1.5 m per 50 ms at ~10 m/s)', maxStep < 1.5, `step ${maxStep.toFixed(2)} m`);
  // It follows the real path within roughly one fix of lag.
  const last = samples[samples.length - 1];
  check('stays within about one fix of the real position', m(last.p, fix(8)) < 45, `${m(last.p, fix(8)).toFixed(1)} m behind`);
  check('heading is north', Math.abs(lib.angleDelta(s.heading(), 0)) < 2, String(s.heading()));
}

{
  // A late fix: keeps going, then settles, never runs away.
  const s = new lib.Smoother();
  s.push(fix(0), 0);
  s.push(fix(1), 3000);
  const at4s = s.at(4500);
  const at8s = s.at(9000);
  const atEnd = s.at(60000);
  check('keeps moving past the expected arrival', m(s.at(3000 + 3200), fix(1)) > 0.5);
  check('slows to a stop instead of running away', m(atEnd, fix(1)) < 20, `${m(atEnd, fix(1)).toFixed(1)} m past`);
  check('settles: no more redraws', !s.active(60000));
  check('extrapolation is bounded in time', m(at8s, atEnd) < 0.01);
  check('late fix: bike is ahead of the last fix, not behind it', at4s.lat >= fix(0).lat);
}

{
  // A new fix continues from where the bike is drawn: no snap back.
  const s = new lib.Smoother();
  s.push(fix(0), 0);
  s.push(fix(1), 3000);
  const before = s.at(4500);
  s.push(fix(2), 4500);
  const after = s.at(4500);
  check('a new fix never snaps the bike', m(before, after) < 0.01, `${m(before, after).toFixed(2)} m`);
}

{
  // Standing still: GPS wobble does not make it creep.
  const s = new lib.Smoother();
  s.push(fix(0), 0);
  s.push({ lat: fix(0).lat + 0.000003, lng: fix(0).lng }, 3000);
  check('a stopped rider does not creep', m(s.at(20000), fix(0)) < 2);
}

{
  // A huge jump (signal came back after a long time) shows at once.
  const s = new lib.Smoother();
  s.push(fix(0), 0);
  s.push({ lat: fix(0).lat + 0.05, lng: fix(0).lng }, 3000);
  check('a very long jump is shown immediately', m(s.at(3000), { lat: fix(0).lat + 0.05, lng: fix(0).lng }) < 1);
}

{
  check('bearing east is 90', Math.abs(lib.bearingDeg({ lat: 14.96, lng: 74.71 }, { lat: 14.96, lng: 74.72 }) - 90) < 0.5);
  check('bearing south is 180', Math.abs(lib.bearingDeg({ lat: 14.96, lng: 74.71 }, { lat: 14.95, lng: 74.71 }) - 180) < 0.5);
  check('bearing west is 270', Math.abs(lib.bearingDeg({ lat: 14.96, lng: 74.71 }, { lat: 14.96, lng: 74.70 }) - 270) < 0.5);
  check('turning through north takes the short way', lib.angleDelta(350, 10) === 20 && lib.angleDelta(10, 350) === -20);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
