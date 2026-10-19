/** Decorative neon circuit traces along the screen edges. Pure SVG, no assets; pulses run only when animation intensity is not Off. */
const PATHS = [
  'M1600 180H1380L1330 230V420L1280 470H1180', 'M1600 560H1450L1400 610V760L1350 810H1240',
  'M1600 880H1500L1460 840H1300', 'M0 760H150L200 710V600L250 550H340', 'M0 520H90L130 480V360',
  'M420 900V820L470 770H640', 'M1000 0V70L1040 110H1180', 'M560 0V60L520 100H400',
];
const NODES: [number, number][] = [[1180, 470], [1240, 810], [1300, 840], [340, 550], [130, 360], [640, 770], [1180, 110], [400, 100]];
export function Circuits() {
  return (
    <svg className="circuits" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {PATHS.map((d, i) => <path key={`t${i}`} className="trace" d={d} />)}
      {PATHS.map((d, i) => <path key={`p${i}`} className="pulse" d={d} pathLength={1000} />)}
      {NODES.map(([x, y], i) => <circle key={`n${i}`} className="node" cx={x} cy={y} r="3.5" />)}
    </svg>
  );
}
