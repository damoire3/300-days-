import { useState, useEffect } from 'react'

const TOT = 300
const COLS = ['#8fe3b0', '#7cc4ff', '#ffb86b', '#ff8fa3', '#b9a2ff', '#f5e27a']
const J = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MOODS = ['😞', '😕', '😐', '🙂', '😄']
const TODAY = (new Date().getDay() + 6) % 7
const PK = 'app300:profiles', pkey = id => 'app300:p:' + id
const loadProfiles = () => { try { return JSON.parse(localStorage.getItem(PK)) || [] } catch { return [] } }
const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true } catch { return false } }
const phKey = id => 'app300:ph:' + id, avKey = id => 'app300:av:' + id
const shrink = (file, max) => new Promise((res, rej) => {
  const r = new FileReader()
  r.onload = () => {
    const im = new Image()
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas')
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k)
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height)
      res(c.toDataURL('image/jpeg', 0.7))
    }
    im.onerror = rej; im.src = r.result
  }
  r.onerror = rej; r.readAsDataURL(file)
})
const ping = name => { try { fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ 'form-name': 'installs', profil: name, date: new Date().toISOString().slice(0, 10) }).toString() }).catch(() => {}) } catch {} }

const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
const dayOf = st => {
  const a = new Date(st + 'T00:00:00'), n = new Date()
  n.setHours(0, 0, 0, 0)
  return Math.max(1, Math.min(TOT, Math.round((n - a) / 864e5) + 1))
}

const DEF = {
  start: iso(new Date()), name: 'Toi', rg: 0, hide: {}, h: {}, mood: {}, notes: {}, focus: {},
  cats: [{ id: 'sport', n: 'Sport', c: COLS[0] }, { id: 'pro', n: 'Professionnel', c: COLS[1] }, { id: 'perso', n: 'Personnel', c: COLS[2] }],
  tasks: [{ t: 'Courir 30 min', d: 0, c: 'sport' }, { t: 'Travailler 1 h sur mon projet', d: 0, c: 'pro' }, { t: 'Lire 20 pages', d: 0, c: 'perso' }],
  quit: [{ n: 'Réseaux sociaux la nuit', s: 0, d: 0 }, { n: 'Procrastination', s: 0, d: 0 }],
  sport: [0, 0, 0, 0, 0, 0, 0], proj: [{ n: 'Mon projet', p: 0 }],
  quotes: [
    { t: 'Ce que tu fais chaque jour compte plus que ce que tu fais de temps en temps.', a: '' },
    { t: 'Je ne dois rien à mon ancien moi.', a: '' },
    { t: 'Un petit pas aujourd’hui vaut mieux qu’un grand plan demain.', a: '' },
  ],
}

const rec = n => {
  const o = {}
  n.cats.forEach(c => {
    const t = n.tasks.filter(x => x.c === c.id)
    if (t.length) o[c.id] = Math.round(t.filter(x => x.d).length / t.length * 100)
  })
  return o
}

function load(id, name) {
  let s = { ...DEF, name }
  try { const x = JSON.parse(localStorage.getItem(pkey(id))); if (x) s = { ...s, ...x } } catch {}
  const d = dayOf(s.start)
  if (s.ld !== d) s = { ...s, ld: d, tasks: s.tasks.map(t => ({ ...t, d: 0 })), quit: s.quit.map(q => ({ ...q, d: 0 })) }
  return s
}

const score = s => {
  const tot = Math.max(1, s.tasks.length + s.quit.length)
  const ok = s.tasks.filter(t => t.d).length + s.quit.filter(q => q.d).length
  return { ok, tot, p: Math.round(ok / tot * 100) }
}
const range = (s, day) => (s.rg === 0 ? Math.max(1, day - 6) : s.rg === 1 ? Math.max(1, day - 29) : 1)
const series = s => [
  ...s.cats.map(c => ({ ...c, v: d => s.h[d]?.[c.id] ?? null })),
  { id: 'mood', n: 'Humeur', c: '#f5e27a', v: d => (s.mood[d] ? s.mood[d] * 20 : null) },
]

/* ---------- petits composants ---------- */
const Row = ({ t, sub, r, go }) => (
  <button className="card row sp lk" onClick={go}>
    <div className="grow"><b>{t}</b><p className="sm">{sub}</p></div>
    <span className="chip">{r}</span><span className="ar">›</span>
  </button>
)

function Ring({ p }) {
  const r = 62, c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 150 150" width="150" height="150">
      <circle cx="75" cy="75" r={r} fill="none" stroke="#2d2450" strokeWidth="10" />
      <circle cx="75" cy="75" r={r} fill="none" stroke="#b9a2ff" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} transform="rotate(-90 75 75)" style={{ transition: 'stroke-dashoffset .6s' }} />
      <text x="75" y="80" textAnchor="middle" fill="#ece8f8" fontFamily="Press Start 2P" fontSize="16">{p}%</text>
      <text x="75" y="102" textAnchor="middle" fill="#8d84a8" fontSize="11">du jour</text>
    </svg>
  )
}

function Chart({ list, from, to, hide }) {
  const W = 340, H = 150, n = to - from + 1
  const px = d => 12 + (n > 1 ? (d - from) / (n - 1) : 0.5) * (W - 24)
  const py = v => H - 10 - v / 100 * (H - 20)
  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} width="100%" role="img" aria-label="Courbes d’évolution">
      {[0, 50, 100].map(v => (
        <g key={v}>
          <line x1="12" x2={W - 12} y1={py(v)} y2={py(v)} stroke="#2d2450" strokeDasharray="3 4" />
          <text x="0" y={py(v) - 3} fill="#8d84a8" fontSize="9">{v}</text>
        </g>
      ))}
      {list.filter(c => !hide[c.id]).map(c => {
        const pts = []
        for (let d = from; d <= to; d++) { const v = c.v(d); if (v != null) pts.push([px(d), py(v)]) }
        return (
          <g key={c.id}>
            {pts.length > 1 && <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={c.c} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
            {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 2.5} fill={c.c} />)}
          </g>
        )
      })}
      <text x="12" y={H + 12} fill="#8d84a8" fontSize="10">Jour {from}</text>
      <text x={W - 12} y={H + 12} textAnchor="end" fill="#8d84a8" fontSize="10">Jour {to}</text>
    </svg>
  )
}

/* ---------- sous-écrans ---------- */
function Tasks({ s, up }) {
  const [fc, setFc] = useState('all')
  const [nt, setNt] = useState('')
  const [nc, setNc] = useState(s.cats[0]?.id)
  const cur = fc === 'all' ? nc : fc
  const add = () => { const t = nt.trim(); if (!t) return; up(n => { n.tasks.push({ t, d: 0, c: cur }) }); setNt('') }
  return (
    <>
      <div className="pills">
        {[{ id: 'all', n: 'Tout' }, ...s.cats].map(c => {
          const t = s.tasks.filter(x => c.id === 'all' || x.c === c.id)
          return <button key={c.id} className={'mini ' + (fc === c.id ? 'ok' : '')} onClick={() => setFc(c.id)}>{c.n} · {t.filter(x => x.d).length}/{t.length}</button>
        })}
      </div>
      {s.cats.filter(c => fc === 'all' || c.id === fc).map(c => {
        const ts = s.tasks.map((t, i) => [t, i]).filter(x => x[0].c === c.id)
        return (
          <div key={c.id}>
            <div className="cath"><span className="cat" style={{ '--cc': c.c }}><i className="dot" />{c.n}</span></div>
            <div className="card" style={{ padding: '2px 12px' }}>
              {ts.length ? ts.map(([t, i]) => (
                <div key={i} className={'item row ' + (t.d ? 'on' : '')}>
                  <button className="row grow" onClick={() => up(n => { n.tasks[i].d = n.tasks[i].d ? 0 : 1 })}>
                    <span className="chk">{t.d ? '✓' : ''}</span><span className="lbl">{t.t}</span>
                  </button>
                  <button className="x" aria-label="Supprimer" onClick={() => up(n => { n.tasks.splice(i, 1) })}>×</button>
                </div>
              )) : <p className="sm" style={{ padding: '12px 0' }}>Aucune tâche ici.</p>}
            </div>
          </div>
        )
      })}
      <div className="row" style={{ marginTop: 14 }}>
        {fc === 'all' && <select className="in sel" value={nc} onChange={e => setNc(e.target.value)} aria-label="Catégorie">{s.cats.map(c => <option key={c.id} value={c.id}>{c.n}</option>)}</select>}
        <input className="in" value={nt} placeholder="Nouvelle tâche" maxLength={60} onChange={e => setNt(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button className="add" aria-label="Ajouter" onClick={add}>+</button>
      </div>
    </>
  )
}

const Quit = ({ s, up, say }) => s.quit.map((q, i) => (
  <div className="card" key={i}>
    <div className="row sp"><div><b>{q.n}</b><p className="sm">Série en cours</p></div><div className="px" style={{ fontSize: 15, color: 'var(--ok)' }}>{q.s} j</div></div>
    <div className="row" style={{ marginTop: 12, gap: 8 }}>
      <button className={'mini ' + (q.d ? 'ok' : '')} onClick={() => { up(n => { const x = n.quit[i]; x.d = x.d ? 0 : 1; x.s += x.d ? 1 : -1 }); if (!q.d) say('Série : ' + (q.s + 1) + ' jours') }}>{q.d ? 'Tenu aujourd’hui ✓' : 'J’ai tenu aujourd’hui'}</button>
      <button className="mini rel" onClick={() => { up(n => { n.quit[i].s = 0; n.quit[i].d = 0 }); say('Ce n’est pas grave. On repart.') }}>Rechute</button>
    </div>
  </div>
))

function Evening({ s, up, day }) {
  return (
    <>
      <div className="card">
        <p style={{ marginBottom: 12 }}>Comment tu te sens aujourd’hui ?</p>
        <div className="mood">{MOODS.map((m, i) => <button key={i} className={s.mood[day] === i + 1 ? 'on' : ''} aria-label={'Humeur ' + (i + 1)} onClick={() => up(n => { n.mood[day] = i + 1 })}>{m}</button>)}</div>
      </div>
      <div className="card">
        <p>Une phrase sur ta journée</p>
        <textarea className="in" maxLength={300} value={s.notes[day] || ''} placeholder="Ce qui s’est bien passé, ce que je garde…" onChange={e => up(n => { n.notes[day] = e.target.value })} />
      </div>
    </>
  )
}

function Sport({ s, up }) {
  const n = s.sport.filter(Boolean).length
  return (
    <>
      <div className="card">
        <div className="row sp"><b>{n} séances cette semaine</b><span className="chip">{n >= 4 ? 'Objectif atteint' : 'Encore ' + (4 - n)}</span></div>
        <div className="days">{s.sport.map((v, i) => <button key={i} className={'d ' + (v ? 'on ' : '') + (i === TODAY ? 'td' : '')} onClick={() => up(x => { x.sport[i] = x.sport[i] ? 0 : 1 })}>{J[i]}</button>)}</div>
      </div>
      <p className="sm">Objectif : 4 séances par semaine.</p>
    </>
  )
}

function Proj({ s, up, say }) {
  const [np, setNp] = useState('')
  const add = () => { const n = np.trim(); if (!n) return; up(x => { x.proj.push({ n, p: 0 }) }); setNp('') }
  return (
    <>
      {s.proj.map((p, i) => (
        <div className="card" key={i}>
          <div className="row sp"><b>{p.n}</b><span className="px" style={{ fontSize: 10, color: 'var(--p)' }}>{p.p}%</span></div>
          <div className="bar" style={{ margin: '12px 0' }}><i style={{ width: p.p + '%' }} /></div>
          <div className="row" style={{ gap: 8 }}>
            <button className="mini" onClick={() => { up(x => { x.proj[i].p = Math.min(100, x.proj[i].p + 5) }); say('+5 % sur le projet') }}>+5 % aujourd’hui</button>
            <button className="mini rel" onClick={() => up(x => { x.proj.splice(i, 1) })}>Supprimer</button>
          </div>
        </div>
      ))}
      <div className="row"><input className="in" value={np} placeholder="Nouveau projet" maxLength={40} onChange={e => setNp(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} /><button className="add" aria-label="Ajouter" onClick={add}>+</button></div>
    </>
  )
}

function Focus({ s, up, say, day }) {
  const [t, setT] = useState(1500)
  const [on, setOn] = useState(false)
  useEffect(() => { if (!on) return; const i = setInterval(() => setT(x => x - 1), 1000); return () => clearInterval(i) }, [on])
  useEffect(() => { if (t <= 0) { setOn(false); setT(1500); up(n => { n.focus[day] = (n.focus[day] || 0) + 1 }); say('Session terminée, bravo !') } }, [t])
  const m = String(Math.floor(t / 60)).padStart(2, '0'), sec = String(t % 60).padStart(2, '0')
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="px" style={{ fontSize: 34, margin: '16px 0', color: 'var(--p)' }}>{m}:{sec}</div>
      <p style={{ marginBottom: 16 }}>Sessions terminées aujourd’hui : {s.focus[day] || 0}</p>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn" onClick={() => setOn(!on)}>{on ? 'Pause' : 'Démarrer 25 min'}</button>
        <button className="btn ghost" style={{ width: 'auto' }} onClick={() => { setOn(false); setT(1500) }}>↺</button>
      </div>
    </div>
  )
}

function Avg({ s, day }) {
  const from = range(s, day)
  return (
    <div className="card">
      {series(s).map(c => {
        let sum = 0, n = 0
        for (let d = from; d <= day; d++) { const v = c.v(d); if (v != null) { sum += v; n++ } }
        const a = n ? Math.round(sum / n) : 0
        return (
          <div key={c.id}>
            <div className="row sp sm" style={{ margin: '10px 0 6px' }}><span className="cat" style={{ '--cc': c.c }}><i className="dot" />{c.n}</span><span>{n ? a + ' %' : '—'}</span></div>
            <div className="bar"><i style={{ width: a + '%', background: c.c }} /></div>
          </div>
        )
      })}
    </div>
  )
}

function Grid({ s, day }) {
  const lv = d => { const o = s.h[d]; if (!o) return 0; const v = Object.values(o); return v.length ? Math.ceil(v.reduce((a, b) => a + b, 0) / v.length / 25) : 0 }
  return (
    <div className="card">
      <div className="grid">
        {Array.from({ length: 10 }, (_, m) => [
          <b key={'m' + m}>M{m + 1}</b>,
          ...Array.from({ length: 30 }, (_, k) => { const n = m * 30 + k + 1; return <i key={n} className={'c ' + (n > day ? 'fut ' : 'l' + lv(n) + ' ') + (n === day ? 'now' : '')} /> }),
        ])}
      </div>
    </div>
  )
}

function DayPick({ s, up, say, day }) {
  const [dn, setDn] = useState(day)
  const [ds, setDs] = useState(s.start)
  const setDay = () => { const n = Math.max(1, Math.min(TOT, parseInt(dn) || 1)), d = new Date(); d.setDate(d.getDate() - (n - 1)); up(x => { x.start = iso(d) }); say('Tu es au jour ' + n) }
  const setStart = () => { if (!ds) return; up(x => { x.start = ds }); say('Départ modifié') }
  return (
    <div className="card">
      <p style={{ marginBottom: 10 }}>Je suis au jour…</p>
      <div className="row"><input className="in" type="number" min="1" max={TOT} value={dn} onChange={e => setDn(e.target.value)} /><button className="mini ok" onClick={setDay}>Valider</button></div>
      <p style={{ margin: '14px 0 10px' }}>…ou mon parcours a commencé le</p>
      <div className="row"><input className="in" type="date" value={ds} onChange={e => setDs(e.target.value)} /><button className="mini ok" onClick={setStart}>Valider</button></div>
    </div>
  )
}

function Cats({ s, up, say }) {
  const [cn, setCn] = useState('')
  const [pc, setPc] = useState(COLS[3])
  const add = () => { const n = cn.trim(); if (!n) return; up(x => { x.cats.push({ id: 'c' + Date.now(), n, c: pc }) }); setCn(''); say('Catégorie créée') }
  const del = i => { if (s.cats.length < 2) return say('Garde au moins une catégorie'); up(x => { const id = x.cats[i].id; x.cats.splice(i, 1); x.tasks = x.tasks.filter(t => t.c !== id) }) }
  return (
    <>
      <div className="card" style={{ padding: '2px 12px' }}>
        {s.cats.map((c, i) => <div className="item row sp" key={c.id}><span className="cat" style={{ '--cc': c.c }}><i className="dot" />{c.n}</span><button className="x" aria-label="Supprimer" onClick={() => del(i)}>×</button></div>)}
      </div>
      <p className="sm" style={{ margin: '-2px 2px 12px' }}>Supprimer une catégorie supprime aussi ses tâches.</p>
      <div className="card">
        <input className="in" style={{ width: '100%', marginBottom: 10 }} value={cn} placeholder="Nouvelle catégorie" maxLength={24} onChange={e => setCn(e.target.value)} />
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>{COLS.map(c => <button key={c} className={'sw ' + (pc === c ? 'on' : '')} style={{ background: c }} aria-label="Couleur" onClick={() => setPc(c)} />)}</div>
        <button className="btn ghost" onClick={add}>Créer la catégorie</button>
      </div>
    </>
  )
}

function Quotes({ s, up, say }) {
  const [qn, setQn] = useState('')
  const [qa, setQa] = useState('')
  const add = () => { const t = qn.trim(); if (!t) return; up(x => { x.quotes.push({ t, a: qa.trim() }) }); setQn(''); setQa(''); say('Citation ajoutée') }
  return (
    <>
      <div className="card" style={{ padding: '2px 12px' }}>
        {s.quotes.map((q, i) => <div className="item row" key={i}><span className="grow" style={{ fontSize: 14 }}>{q.t}{q.a && <span className="sm"> — {q.a}</span>}</span><button className="x" aria-label="Supprimer" onClick={() => up(x => { x.quotes.splice(i, 1) })}>×</button></div>)}
      </div>
      <div className="card">
        <textarea className="in" style={{ marginTop: 0 }} value={qn} placeholder="Écris ta citation" maxLength={160} onChange={e => setQn(e.target.value)} />
        <input className="in" style={{ width: '100%', margin: '8px 0 10px' }} value={qa} placeholder="Auteur (facultatif)" maxLength={30} onChange={e => setQa(e.target.value)} />
        <button className="btn ghost" onClick={add}>Ajouter la citation</button>
      </div>
    </>
  )
}

function Terms() {
  const T = [
    ['Le but', 'Cette app est un outil personnel de suivi. Elle ne remplace pas l’avis d’un médecin, d’un coach ou d’un psychologue.'],
    ['Tes données', 'Tâches, habitudes, notes, humeur et photos restent sur ton téléphone (stockage du navigateur ou de l’app). Il n’y a ni compte ni serveur. Si tu effaces les données du navigateur ou désinstalles l’app, elles sont perdues.'],
    ['Ce qui peut être envoyé', 'Uniquement si tu coches « Prévenir le créateur » à la création du profil : ton prénom et la date de création sont envoyés au créateur de l’app. Tu es libre de ne pas cocher.'],
    ['Adresse IP', 'L’app elle-même ne collecte pas ton adresse IP. Comme pour tout site web, l’hébergeur peut conserver des journaux techniques (dont l’adresse IP) quand la page se charge.'],
    ['Photos', 'Tes photos sont réduites et gardées uniquement sur ton appareil. Elles ne sont jamais envoyées.'],
    ['Plusieurs profils', 'Les profils d’un même téléphone ne sont pas protégés par un mot de passe : chacun peut ouvrir les autres.'],
    ['Suppression', '« Supprimer ce profil » efface de cet appareil toutes les données et photos du profil.'],
    ['Responsabilité', 'Tu utilises l’app à tes propres risques. Pour le sport ou la santé, demande conseil à un professionnel si besoin.'],
  ]
  return (
    <div className="card terms">
      {T.map(([h, t]) => <div key={h}><b>{h}</b><p style={{ margin: '4px 0 12px' }}>{t}</p></div>)}
      <p className="sm">Dernière mise à jour : 1er novembre 2026.</p>
    </div>
  )
}

function Photos({ id, day, say }) {
  const [ph, setPh] = useState(() => rd(phKey(id), []))
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(null)
  const add = async e => {
    const f = e.target.files[0]; e.target.value = ''
    if (!f) return
    try {
      const img = await shrink(f, 520)
      const n = [...ph, { id: Date.now(), day, img, note: note.trim(), date: new Date().toISOString().slice(0, 10) }]
      if (wr(phKey(id), n)) { setPh(n); setNote(''); say('Photo ajoutée') } else say('Espace plein : supprime une photo')
    } catch { say('Photo illisible') }
  }
  const del = k => { const n = ph.filter(p => p.id !== k); wr(phKey(id), n); setPh(n); setOpen(null) }
  const cur = ph.find(p => p.id === open)
  if (cur) return (
    <div className="card">
      <img src={cur.img} alt={'Photo du jour ' + cur.day} style={{ width: '100%', borderRadius: 14 }} />
      <p style={{ margin: '12px 0 4px', color: 'var(--tx)' }}>Jour {cur.day} · {cur.date}</p>
      {cur.note && <p>{cur.note}</p>}
      <div className="row" style={{ gap: 8, marginTop: 14 }}>
        <button className="btn ghost" onClick={() => setOpen(null)}>Fermer</button>
        <button className="btn ghost rel" onClick={() => del(cur.id)}>Supprimer</button>
      </div>
    </div>
  )
  return (
    <>
      {ph.length > 1 && <div className="card"><div className="cmp">{[ph[0], ph[ph.length - 1]].map((p, i) => <div key={i}><img src={p.img} alt="" /><span>{i ? 'Maintenant' : 'Avant'} · jour {p.day}</span></div>)}</div></div>}
      <div className="card">
        <input className="in" style={{ width: '100%', marginBottom: 10 }} value={note} placeholder="Une note (facultatif)" maxLength={60} onChange={e => setNote(e.target.value)} />
        <label className="btn" style={{ display: 'block', textAlign: 'center' }}>Ajouter une photo<input type="file" accept="image/*" hidden onChange={add} /></label>
      </div>
      {ph.length ? <div className="ph">{ph.map(p => <button key={p.id} onClick={() => setOpen(p.id)}><img src={p.img} alt="" /><span>J{p.day}</span></button>)}</div>
        : <p className="sm">Prends une photo « avant » aujourd’hui, puis une nouvelle à chaque étape.</p>}
      <p className="sm" style={{ marginTop: 12 }}>Les photos restent sur ton téléphone.</p>
    </>
  )
}

const SUBS = {
  tasks: ['Tâches du jour', Tasks], quit: ['Habitudes à arrêter', Quit], evening: ['Bilan du soir', Evening],
  sport: ['Sport', Sport], proj: ['Projets', Proj], focus: ['Focus', Focus],
  photos: ['Photos d’évolution', Photos], terms: ['Conditions d’utilisation', Terms],
  avg: ['Moyennes', Avg], grid: ['Mes 300 jours', Grid], day: ['Jour du parcours', DayPick], cats: ['Catégories', Cats], quotes: ['Mes citations', Quotes],
}
const TABS = [
  ['Aujourd’hui', 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  ['Piliers', 'M12 3l2.5 5.5 6 .7-4.4 4.1 1.2 5.9L12 15.3 6.7 19.2l1.2-5.9L3.5 9.2l6-.7z'],
  ['Progression', 'M4 20V10M10 20V4M16 20v-7M22 20H2'],
  ['Profil', 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c0-4 4-6 8-6s8 2 8 6'],
]

/* ---------- app ---------- */
function Main({ id, name, onSwitch, onDelete }) {
  const [s, setS] = useState(() => load(id, name))
  const [tab, setTab] = useState(0)
  const [sub, setSub] = useState(null)
  const [qi, setQi] = useState(0)
  const [toast, setToast] = useState('')
  const [av, setAv] = useState(() => rd(avKey(id), null))
  const day = dayOf(s.start)

  useEffect(() => { try { localStorage.setItem(pkey(id), JSON.stringify(s)) } catch {} }, [s])
  useEffect(() => { const t = setInterval(() => setQi(i => i + 1), 10000); return () => clearInterval(t) }, [])
  const up = fn => setS(p => { const n = JSON.parse(JSON.stringify(p)); fn(n); n.h[dayOf(n.start)] = rec(n); return n })
  const say = m => { setToast(m); setTimeout(() => setToast(''), 1600) }
  const go = (t) => { setTab(t); setSub(null) }
  const pickAv = async e => {
    const f = e.target.files[0]; e.target.value = ''
    if (!f) return
    try { const img = await shrink(f, 200); if (wr(avKey(id), img)) setAv(img); else say('Espace plein') } catch { say('Photo illisible') }
  }
  const P = { s, up, say, day, id }

  const sc = score(s)
  const q = s.quotes.length ? s.quotes[qi % s.quotes.length] : null
  const tk = s.tasks.filter(t => t.d).length
  const qk = s.quit.filter(x => x.d).length
  const mx = Math.max(0, ...s.quit.map(x => x.s))
  const spN = s.sport.filter(Boolean).length
  const pAvg = s.proj.length ? Math.round(s.proj.reduce((a, p) => a + p.p, 0) / s.proj.length) : 0
  const from = range(s, day)

  const home = (
    <>
      <div className="row sp">
        <div><h1 className="serif">Bonjour, {s.name}</h1><p>Un pas de plus aujourd’hui.</p></div>
        <button className="chip" onClick={() => setSub('day')}>Jour {day}</button>
      </div>
      <div className="card good" style={{ margin: '16px 0 10px', padding: 0 }}>
        <button className="qc" onClick={() => setQi(i => i + 1)} aria-label="Citation suivante">
          {q ? <><span className="serif">« {q.t} »</span>{q.a && <p className="sm" style={{ marginTop: 8 }}>{q.a}</p>}</> : <p>Ajoute une citation dans ton profil.</p>}
        </button>
      </div>
      <div className="card row" style={{ gap: 16 }}>
        <Ring p={sc.p} />
        <div className="grow"><div className="mono">PARCOURS</div><div className="px" style={{ fontSize: 13, margin: '8px 0' }}>{day}/{TOT}</div><div className="bar"><i style={{ width: day / TOT * 100 + '%' }} /></div></div>
      </div>
      <Row t="Tâches du jour" sub={s.cats.length + ' catégories'} r={tk + '/' + s.tasks.length} go={() => setSub('tasks')} />
      <Row t="Habitudes à arrêter" sub={'Meilleure série : ' + mx + ' j'} r={qk + '/' + s.quit.length} go={() => setSub('quit')} />
      <Row t="Bilan du soir" sub="Humeur et note" r={s.mood[day] ? MOODS[s.mood[day] - 1] : 'À faire'} go={() => setSub('evening')} />
    </>
  )
  const piliers = (
    <>
      <h1 className="serif">Mes piliers</h1><p style={{ marginBottom: 18 }}>Touche un pilier pour voir le détail.</p>
      <Row t="Sport" sub="Cette semaine" r={spN + '/4'} go={() => setSub('sport')} />
      <Row t="Projets" sub={s.proj.length + ' en cours'} r={pAvg + ' %'} go={() => setSub('proj')} />
      <Row t="Focus" sub="Session de 25 minutes" r={(s.focus[day] || 0) + ' auj.'} go={() => setSub('focus')} />
    </>
  )
  const prog = (
    <>
      <h1 className="serif">Progression</h1><p>Ton évolution, jour après jour.</p>
      <div className="card" style={{ marginTop: 18 }}>
        <div className="row" style={{ gap: 6 }}>{['7 jours', '30 jours', 'Tout'].map((l, i) => <button key={l} className={'mini grow ' + (s.rg === i ? 'ok' : '')} style={{ justifyContent: 'center' }} onClick={() => up(x => { x.rg = i })}>{l}</button>)}</div>
        <Chart list={series(s)} from={from} to={day} hide={s.hide} />
        <div className="pills" style={{ flexWrap: 'wrap', marginTop: 8 }}>
          {series(s).map(c => <button key={c.id} className={'mini ' + (s.hide[c.id] ? 'off' : '')} style={{ '--cc': c.c }} onClick={() => up(x => { x.hide[c.id] = !x.hide[c.id] })}><i className="dot" />{c.n}</button>)}
        </div>
      </div>
      <Row t="Moyennes" sub="Par catégorie" r="Voir" go={() => setSub('avg')} />
      <Row t="Mes 300 jours" sub={'Jour ' + day + ' sur ' + TOT} r="Voir" go={() => setSub('grid')} />
      <Row t="Photos d’évolution" sub="Avant / maintenant" r="Voir" go={() => setSub('photos')} />
    </>
  )
  const profil = (
    <>
      <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
        <label className="av" aria-label="Changer ma photo de profil">{av ? <img src={av} alt="" /> : (s.name[0] || '?').toUpperCase()}<input type="file" accept="image/*" hidden onChange={pickAv} /></label>
        <h1 className="serif">{s.name}</h1><p>Niveau {1 + Math.floor(day / 30)} · touche la photo pour la changer</p>
      </div>
      <Row t="Jour du parcours" sub="Choisir mon jour" r={'Jour ' + day} go={() => setSub('day')} />
      <Row t="Catégories" sub={s.cats.map(c => c.n).join(', ')} r={s.cats.length} go={() => setSub('cats')} />
      <Row t="Mes citations" sub="Affichées sur l’accueil" r={s.quotes.length} go={() => setSub('quotes')} />
      <Row t="Conditions d’utilisation" sub="Données, photos, confidentialité" r="Lire" go={() => setSub('terms')} />
      <Row t="Changer de profil" sub="Un autre ami, un autre parcours" r="Ouvrir" go={onSwitch} />
      <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => { if (confirm('Supprimer ce profil et ses données ?')) onDelete() }}>Supprimer ce profil</button>
    </>
  )
  const Sub = sub && SUBS[sub][1]

  return (
    <div className="app">
      <div className="view">
        {sub ? (
          <>
            <div className="row" style={{ margin: '-6px 0 16px' }}>
              <button className="bk" aria-label="Retour" onClick={() => setSub(null)}>‹</button>
              <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>{SUBS[sub][0]}</h1>
            </div>
            <Sub {...P} />
          </>
        ) : [home, piliers, prog, profil][tab]}
      </div>
      <nav className="tabs">
        {TABS.map(([l, d], i) => (
          <button key={l} className={tab === i ? 'a' : ''} onClick={() => go(i)}>
            <svg viewBox="0 0 24 24"><path d={d} /></svg>{l}
          </button>
        ))}
      </nav>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

function Welcome({ ps, onPick, onCreate }) {
  const [nm, setNm] = useState('')
  const [ok, setOk] = useState(false)
  const [tm, setTm] = useState(false)
  const [showT, setShowT] = useState(false)
  const can = nm.trim() && tm
  const create = () => { if (can) onCreate(nm.trim(), ok) }
  return (
    <div className="app"><div className="view" style={{ textAlign: 'center' }}>
      <div className="big px" style={{ marginTop: 20 }}>300</div>
      <h1 className="serif" style={{ margin: '18px 0 8px', fontSize: 36 }}>10 mois pour changer</h1>
      <p style={{ marginBottom: 24 }}>Sport, projets, tâches, mauvaises habitudes.<br />Un jour à la fois.</p>
      {ps.length > 0 && <>
        <p className="sm" style={{ marginBottom: 8 }}>Qui es-tu ?</p>
        {ps.map(p => { const im = rd(avKey(p.id), null); return (
          <button key={p.id} className="card row sp lk" onClick={() => onPick(p.id)}>
            <span className="row">{im ? <img className="th" src={im} alt="" /> : <span className="th">{p.name[0]}</span>}<b>{p.name}</b></span><span className="ar">›</span>
          </button>) })}
      </>}
      <div className="card" style={{ textAlign: 'left', marginTop: 14 }}>
        <p style={{ marginBottom: 10 }}>{ps.length ? 'Nouveau profil' : 'Crée ton profil'}</p>
        <input className="in" style={{ width: '100%' }} value={nm} placeholder="Ton prénom" maxLength={20} onChange={e => setNm(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} />
        <label className="row sm" style={{ margin: '12px 0 4px', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={tm} onChange={e => setTm(e.target.checked)} />
          <span>J’accepte les conditions d’utilisation (obligatoire).</span>
        </label>
        <button className="mini" style={{ margin: '4px 0 8px' }} onClick={() => setShowT(!showT)}>{showT ? 'Masquer' : 'Lire'} les conditions</button>
        <label className="row sm" style={{ margin: '4px 0 12px', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} />
          <span>Prévenir le créateur que j’utilise l’app (seul mon prénom est envoyé). Facultatif.</span>
        </label>
        <button className="btn" disabled={!can} onClick={create}>Commencer</button>
      </div>
      {showT && <div style={{ textAlign: 'left' }}><Terms /></div>}
      <p className="sm">Tes données restent sur ce téléphone.</p>
    </div></div>
  )
}

export default function App() {
  const [ps, setPs] = useState(loadProfiles)
  const [pid, setPid] = useState(() => { try { return localStorage.getItem('app300:last') } catch { return null } })
  const save = (list, id) => {
    setPs(list); setPid(id)
    try { localStorage.setItem(PK, JSON.stringify(list)); id ? localStorage.setItem('app300:last', id) : localStorage.removeItem('app300:last') } catch {}
  }
  const cur = ps.find(p => p.id === pid)
  if (!cur) return <Welcome ps={ps} onPick={id => save(ps, id)}
    onCreate={(name, consent) => { const id = 't' + Date.now().toString(36); save([...ps, { id, name, terms: new Date().toISOString().slice(0, 10) }], id); if (consent) ping(name) }} />
  return <Main key={cur.id} id={cur.id} name={cur.name} onSwitch={() => save(ps, null)}
    onDelete={() => { try { [pkey, avKey, phKey].forEach(f => localStorage.removeItem(f(cur.id))) } catch {} save(ps.filter(p => p.id !== cur.id), null) }} />
}
