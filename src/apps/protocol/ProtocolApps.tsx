import { ACH, getRank, MISSION_IDS, type AchState } from '../../core/achievements';
import { PROFILE, PROJECTS, SKILLS } from '../../data/profile';
import { APPS } from '../../os/apps';
import './protocol.css';

export function AchievementsApp({ ach, onOpenTerminal }: { ach: AchState; onOpenTerminal: () => void }) {
  const rank = getRank(ach);
  const done = ACH.filter(a => ach.unlocked[a.id]).length;
  const percent = rank.next ? Math.min(100, Math.round((rank.xp - rank.floor) / (rank.next - rank.floor) * 100)) : 100;
  return <div className="protocol-app">
    <div className="protocol-heading"><div><span className="protocol-eyebrow">LOCAL PROGRESS / NO ACCOUNT REQUIRED</span><h3>ACHIEVEMENTS.EXE</h3><p>Real challenges. Persistent badges. No grinding.</p></div><span className="protocol-rank-mark">LVL {rank.level}</span></div>
    <section className="protocol-rank" aria-label="XP progression">
      <div className="protocol-rank-meta"><strong>{rank.title}</strong><span>{rank.xp} XP{rank.next ? ` / ${rank.next} XP` : ' · MAX RANK'}</span></div>
      <div className="protocol-meter" role="progressbar" aria-label="Progress to next rank" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div style={{ width: `${percent}%` }}/></div>
      <p>{done} / {ACH.length} badges earned · {ach.missions.length} / {MISSION_IDS.length} missions solved</p>
    </section>
    <h4>BADGE COLLECTION</h4>
    <div className="protocol-badges">{ACH.map(a => <article key={a.id} className={`protocol-badge ${ach.unlocked[a.id] ? 'earned' : 'locked'}`}>
      <div className="protocol-medal" aria-hidden="true">{ach.unlocked[a.id] ? '✦' : '◇'}</div>
      <div><span className="protocol-tag">{a.rarity} · +{a.xp} XP</span><strong>{a.name}</strong><p>{a.how}</p><small>{ach.unlocked[a.id] ? `UNLOCKED · ${new Date(ach.unlocked[a.id]).toLocaleDateString()}` : 'LOCKED'}</small></div>
    </article>)}</div>
    <div className="protocol-callout"><p><strong>Secret challenges:</strong> Three hidden badges are waiting in the terminal. Run <code>secrets</code> for your first clue.</p><button onClick={onOpenTerminal}>OPEN TERMINAL →</button></div>
  </div>;
}

export function ProjectsApp() { return <div className="protocol-app">
  <div className="protocol-heading"><div><span className="protocol-eyebrow">DATA ANALYST / PORTFOLIO</span><h3>PROJECTS.EXE</h3><p>Selected projects documented in the original portfolio.</p></div></div>
  <div className="protocol-projects">{PROJECTS.map((p, i) => <article key={p.name} className="protocol-project"><span className="protocol-index">{String(i + 1).padStart(2, '0')} / {String(PROJECTS.length).padStart(2, '0')}</span><h4>{p.name} {p.fork && <small>(FORK)</small>}</h4><p>{p.summary}</p><div className="protocol-pills">{p.stack.map(x => <span key={x}>{x}</span>)}</div></article>)}</div>
  <p className="protocol-note">Portfolio reference only. No private business data is shown.</p>
</div>; }

export function ProfileApp() { return <div className="protocol-app">
  <div className="protocol-heading"><div><span className="protocol-eyebrow">IDENTITY VERIFIED / PUBLIC PROFILE</span><h3>PROFILE.EXE</h3><p>Professional background meets logic, chess, and code.</p></div><span className="protocol-rank-mark">PK</span></div>
  <section className="protocol-profile"><p className="protocol-eyebrow">HELLO, I'M</p><h4>{PROFILE.name}</h4><strong>{PROFILE.role}</strong><p>Data analytics, dashboard engineering, MIS automation, and practical business intelligence.</p><a href={`https://github.com/${PROFILE.github}`} target="_blank" rel="noopener noreferrer">VIEW GITHUB PROFILE ↗</a></section>
  <h4>TECHNICAL STACK</h4><div className="protocol-projects">{SKILLS.map(g => <div className="protocol-project" key={g.group}><strong>{g.group}</strong><div className="protocol-pills">{g.items.map(x => <span key={x}>{x}</span>)}</div></div>)}</div>
  <h4>INTERESTS</h4><div className="protocol-pills">{PROFILE.interests.map(x => <span key={x}>{x}</span>)}</div>
  <p className="protocol-note">Career summary uses the provided resume and portfolio reference. No personal contact details are shown.</p>
</div>; }

export function SystemMapApp({ onLaunch }: { onLaunch: (id: typeof APPS[number]['id']) => void }) { return <div className="protocol-app">
  <div className="protocol-heading"><div><span className="protocol-eyebrow">INTERACTIVE MODULE DIRECTORY</span><h3>SYSTEM_MAP.EXE</h3><p>Every installed application, connected in one place.</p></div></div>
  <div className="protocol-map">{APPS.map((a, i) => <button key={a.id} className="protocol-map-node" onClick={() => onLaunch(a.id)} aria-label={`Open ${a.title}`}>
    <span className="protocol-map-icon">{a.glyph}</span><span><strong>{a.file}</strong><small>{a.blurb}</small></span><span className="protocol-index">{String(i + 1).padStart(2, '0')}</span>
  </button>)}</div>
  <div className="protocol-callout"><p>The modules run in your browser. Your game progress and local data remain on your device.</p></div>
</div>; }
