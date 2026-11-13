import React, { useEffect, useMemo, useState } from 'react';
import {
  Send,
  Heart,
  MessageCircle,
  Smile,
  Meh,
  Frown,
  CheckCircle2,
  Quote,
} from 'lucide-react';
import { Blob, PlayfulText, SpeechBubbles, PaperCard, SectionKicker, PALETTE } from '../components/brand';

interface NpsVote {
  score: number;
  date: string;
}

interface FeedbackItem {
  id: string;
  name: string;
  category: string;
  message: string;
  date: string;
  likes: number;
}

const NPS_KEY = 'aqualert_nps_votes';
const FEEDBACK_KEY = 'aqualert_feedback';

const MOCK_DISTRIBUTION: Record<number, number> = { 0: 0, 1: 0, 2: 1, 3: 0, 4: 1, 5: 1, 6: 2, 7: 4, 8: 5, 9: 11, 10: 15 };


const MOCK_FEEDBACK: FeedbackItem[] = [
  {
    id: 'f1',
    name: 'Operador ETA',
    category: 'Usabilidade',
    message: 'Os indicadores de pH e turbidez ficaram muito mais visíveis e claros. Ajuda muito na rotina do turno.',
    date: '2026-10-15T10:20:00',
    likes: 7,
  },
  {
    id: 'f2',
    name: 'Analista Ambiental',
    category: 'Ideia',
    message: 'A visualização por satélite do reservatório facilita antecipar florações de algas antes da coleta em campo.',
    date: '2026-10-16T14:05:00',
    likes: 12,
  },
  {
    id: 'f3',
    name: 'Coordenação de Operações',
    category: 'Dados',
    message: 'A correlação entre precipitação e turbidez permitiu planejar a dosagem com antecedência.',
    date: '2026-10-17T08:45:00',
    likes: 5,
  },
];

const CATEGORIES = [
  { id: 'Usabilidade', color: PALETTE.teal },
  { id: 'Design', color: PALETTE.orange },
  { id: 'Dados', color: PALETTE.navy },
  { id: 'Ideia', color: PALETTE.yellow },
  { id: 'Operação', color: PALETTE.green },
];

const loadArray = <T,>(key: string, fallback: T[]): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
};

const saveSafe = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignora falhas de cota ou navegação anônima restrita (UI-09)
  }
};

const scoreColor = (s: number) => (s <= 6 ? PALETTE.orange : s <= 8 ? PALETTE.yellow : PALETTE.green);

const npsZone = (nps: number) => {
  if (nps >= 75) return { label: 'Zona de Excelência', color: PALETTE.green };
  if (nps >= 50) return { label: 'Zona de Qualidade', color: PALETTE.teal };
  if (nps >= 0) return { label: 'Zona de Aperfeiçoamento', color: '#DDA01B' };
  return { label: 'Zona Crítica', color: PALETTE.orange };
};

const NpsGauge: React.FC<{ value: number }> = ({ value }) => {
  const pct = (value + 100) / 200;
  const r = 80;
  const cx = 100;
  const cy = 100;
  const angle = Math.PI * (1 - pct);
  const nx = cx + (r - 6) * Math.cos(angle);
  const ny = cy - (r - 6) * Math.sin(angle);
  const arc = (from: number, to: number) => {
    const a1 = Math.PI * (1 - from);
    const a2 = Math.PI * (1 - to);
    return `M ${cx + r * Math.cos(a1)} ${cy - r * Math.sin(a1)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(a2)} ${cy - r * Math.sin(a2)}`;
  };

  return (
    <svg viewBox="0 0 200 120" className="w-full max-w-[260px]" role="img" aria-label={`NPS ${value}`}>
      <path d={arc(0, 0.5)} stroke={PALETTE.orange} strokeWidth="16" fill="none" />
      <path d={arc(0.5, 0.75)} stroke={PALETTE.yellow} strokeWidth="16" fill="none" />
      <path d={arc(0.75, 0.875)} stroke={PALETTE.teal} strokeWidth="16" fill="none" />
      <path d={arc(0.875, 1)} stroke={PALETTE.green} strokeWidth="16" fill="none" />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={PALETTE.navy} strokeWidth="5" strokeLinecap="round" style={{ transition: 'all .8s cubic-bezier(.2,.8,.2,1)' }} />
      <circle cx={cx} cy={cy} r="8" fill={PALETTE.navy} />
      <text x="16" y="116" fontSize="11" fontWeight="700" fill="#64748B">-100</text>
      <text x="164" y="116" fontSize="11" fontWeight="700" fill="#64748B">100</text>
    </svg>
  );
};

const FeedbackView: React.FC = () => {
  const [votes, setVotes] = useState<NpsVote[]>(() => loadArray<NpsVote>(NPS_KEY, []));
  const [feedback, setFeedback] = useState<FeedbackItem[]>(() => loadArray<FeedbackItem>(FEEDBACK_KEY, MOCK_FEEDBACK));
  const [selected, setSelected] = useState<number | null>(null);
  const [voted, setVoted] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    saveSafe(NPS_KEY, votes);
  }, [votes]);
  useEffect(() => {
    saveSafe(FEEDBACK_KEY, feedback);
  }, [feedback]);

  const stats = useMemo(() => {
    const dist: Record<number, number> = { ...MOCK_DISTRIBUTION };
    votes.forEach((v) => (dist[v.score] = (dist[v.score] || 0) + 1));
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    let promoters = 0, passives = 0, detractors = 0;
    Object.entries(dist).forEach(([k, n]) => {
      const s = Number(k);
      if (s >= 9) promoters += n;
      else if (s >= 7) passives += n;
      else detractors += n;
    });
    const nps = total ? Math.round(((promoters - detractors) / total) * 100) : 0;
    return { total, promoters, passives, detractors, nps };
  }, [votes]);

  const zone = npsZone(stats.nps);
  const pct = (n: number) => (stats.total ? Math.round((n / stats.total) * 100) : 0);

  const submitVote = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected === null) return;
    setVotes((v) => [...v, { score: selected, date: new Date().toISOString() }]);
    setVoted(true);
  };

  const submitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setFeedback((f) => [
      {
        id: `f-${Date.now()}`,
        name: name.trim() || 'Usuário da Plataforma',
        category,
        message: message.trim(),
        date: new Date().toISOString(),
        likes: 0,
      },
      ...f,
    ]);
    setMessage('');
    setName('');
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  const like = (id: string) => setFeedback((f) => f.map((x) => (x.id === id ? { ...x, likes: x.likes + 1 } : x)));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <section className="rise relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
        <Blob color={PALETTE.teal} round className="absolute -right-10 -top-12 w-44 h-44 opacity-15 hidden sm:block" />
        <Blob color={PALETTE.orange} shape="a" className="absolute right-28 -bottom-16 w-36 h-36 opacity-15 hidden md:block" />
        <Blob color={PALETTE.green} shape="leaf" className="absolute -left-8 -bottom-20 w-36 h-40 opacity-15" />

        <div className="relative z-10 flex flex-col lg:flex-row gap-6 lg:items-center">
          <div className="relative px-7 py-6 rounded-2xl bg-navy text-white shadow-md max-w-md">
            <SpeechBubbles className="absolute -top-2 right-2 w-14 h-12" />
            <p className="text-white/80 text-sm font-semibold uppercase tracking-wider">Sua avaliação move a</p>
            <div className="mt-1">
              <span className="font-display text-4xl md:text-5xl font-extrabold text-white">Inovação</span>
            </div>
            <p className="mt-1 text-sun font-display font-bold text-base">AQUALERT · Saneamento &amp; Tecnologia</p>
          </div>

          <div className="max-w-xl space-y-2">
            <SectionKicker color="orange">Métricas NPS &amp; Feedback Contínuo</SectionKicker>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-800">Avalie sua experiência com a plataforma</h2>
            <p className="text-slate-600 text-sm md:text-base leading-relaxed">
              Conte para o time como o AQUALERT apoia o monitoramento hídrico e a tomada de decisão. Cada retorno alimenta melhorias contínuas.
            </p>
          </div>
        </div>
      </section>

      {/* NPS Row */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Votação */}
        <PaperCard as="section" className="lg:col-span-3 p-6 md:p-8">
          <SectionKicker color="navy">Net Promoter Score</SectionKicker>
          {voted ? (
            <div className="pop flex flex-col items-center text-center py-10 gap-3">
              <span className="w-14 h-14 rounded-full bg-leaf text-white flex items-center justify-center shadow-md">
                <CheckCircle2 size={30} />
              </span>
              <h3 className="font-display text-2xl font-extrabold text-slate-800">Obrigado pela sua nota {selected}!</h3>
              <p className="text-slate-600 text-sm max-w-md">Seu voto já foi computado no indicador NPS ao lado. Compartilhe também suas sugestões no mural abaixo.</p>
              <button
                type="button"
                onClick={() => { setVoted(false); setSelected(null); }}
                className="mt-2 text-sm font-bold text-navy hover:text-navy-soft underline underline-offset-4"
              >
                Votar novamente
              </button>
            </div>
          ) : (
            <form onSubmit={submitVote} className="mt-3">
              <fieldset>
                <legend className="font-display text-xl md:text-2xl font-extrabold text-slate-800 leading-snug">
                  De 0 a 10, qual a probabilidade de recomendar o AQUALERT a outros técnicos e gestores?
                </legend>
                <div className="mt-6 grid grid-cols-6 sm:grid-cols-11 gap-2">
                  {Array.from({ length: 11 }, (_, s) => {
                    const active = selected === s;
                    return (
                      <label key={s} className="relative cursor-pointer">
                        <input
                          type="radio"
                          name="nps"
                          value={s}
                          checked={active}
                          onChange={() => setSelected(s)}
                          className="peer sr-only"
                        />
                        <span
                          className={`flex items-center justify-center aspect-square rounded-xl font-display text-lg font-bold border transition-all duration-200
                            peer-focus-visible:ring-2 peer-focus-visible:ring-navy
                            ${active 
                              ? 'text-white shadow-md border-transparent -translate-y-1' 
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'}`}
                          style={active ? { backgroundColor: scoreColor(s) } : undefined}
                        >
                          {s}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-between text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1"><Frown size={14} className="text-tang" /> Pouco provável (0-6)</span>
                  <span className="flex items-center gap-1">Muito provável (9-10) <Smile size={14} className="text-leaf" /></span>
                </div>
              </fieldset>
              <button
                type="submit"
                disabled={selected === null}
                className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-navy text-white text-sm font-bold shadow-sm hover:bg-navy-soft transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={16} /> Confirmar Avaliação
              </button>
            </form>
          )}
        </PaperCard>

        {/* Score & Gauge */}
        <PaperCard as="section" className="lg:col-span-2 p-6 md:p-8 flex flex-col items-center text-center">
          <SectionKicker color="green">Índice Atual</SectionKicker>
          <div className="relative mt-3 w-full flex justify-center">
            <NpsGauge value={stats.nps} />
          </div>
          <p className="font-display text-5xl font-extrabold text-slate-800 -mt-2">{stats.nps}</p>
          <span 
            className="mt-2 px-3 py-1 rounded-full text-xs font-bold" 
            style={{ backgroundColor: `${zone.color}18`, color: zone.color }}
          >
            {zone.label}
          </span>
          <p className="mt-2 text-xs text-slate-500 font-medium">
            {stats.total} respostas computadas <span className="text-slate-400">(Base demonstrativa Hackathon: 40 + {votes.length} local)</span>
          </p>

          <div className="mt-6 w-full space-y-2 text-left">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div style={{ width: `${pct(stats.promoters)}%`, backgroundColor: PALETTE.green }} className="transition-all duration-500" />
              <div style={{ width: `${pct(stats.passives)}%`, backgroundColor: PALETTE.yellow }} className="transition-all duration-500" />
              <div style={{ width: `${pct(stats.detractors)}%`, backgroundColor: PALETTE.orange }} className="transition-all duration-500" />
            </div>
            {[
              { icon: Smile, label: 'Promotores (9-10)', n: stats.promoters, color: PALETTE.green },
              { icon: Meh, label: 'Neutros (7-8)', n: stats.passives, color: '#DDA01B' },
              { icon: Frown, label: 'Detratores (0-6)', n: stats.detractors, color: PALETTE.orange },
            ].map(({ icon: Icon, label, n, color }) => (
              <div key={label} className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Icon size={14} style={{ color }} /> {label}
                </span>
                <span className="font-bold text-slate-800">{pct(n)}% <span className="text-slate-400">({n})</span></span>
              </div>
            ))}
          </div>
        </PaperCard>
      </div>

      {/* Feedback Form + Mural */}
      <div className="grid gap-6 lg:grid-cols-5">
        <PaperCard as="section" className="lg:col-span-2 p-6 md:p-8 h-fit">
          <SectionKicker color="orange">Canal de Sugestões</SectionKicker>
          <h3 className="font-display text-2xl font-extrabold text-slate-800 mt-1">Enviar Feedback</h3>
          <form onSubmit={submitFeedback} className="mt-5 space-y-4">
            <div>
              <label htmlFor="fb-name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Seu Nome ou Cargo <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input
                id="fb-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Operador ETA ou Anônimo"
                className="field w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white transition-colors"
              />
            </div>
            <fieldset>
              <legend className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Tema</legend>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <label key={c.id} className="cursor-pointer">
                    <input type="radio" name="fb-cat" value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} className="peer sr-only" />
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all
                        ${category === c.id ? 'bg-navy text-white border-navy shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category === c.id ? '#FFFFFF' : c.color }} />
                      {c.id}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="fb-msg" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Mensagem ou Ideia</label>
              <textarea
                id="fb-msg"
                required
                minLength={5}
                maxLength={500}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva observações sobre dados, usabilidade ou novas funcionalidades..."
                className="field w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white transition-colors resize-none"
              />
              <p className="text-right text-[11px] font-medium text-slate-400">{message.length}/500</p>
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-tang text-white text-sm font-bold shadow-sm hover:bg-tang-dark transition-all"
            >
              <MessageCircle size={16} /> Publicar Feedback
            </button>
            <p role="status" className={`text-xs font-bold text-leaf text-center transition-opacity ${sent ? 'opacity-100' : 'opacity-0'}`}>
              Mensagem registrada com sucesso!
            </p>
          </form>
        </PaperCard>

        {/* Mural de Recados */}
        <section className="lg:col-span-3" aria-labelledby="mural-title">
          <div className="flex items-end justify-between mb-4">
            <div>
              <SectionKicker color="yellow">Mural Interativo</SectionKicker>
              <h3 id="mural-title" className="font-display text-2xl font-extrabold text-slate-800 mt-0.5">Comentários da Equipe</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">{feedback.length} mensagens</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {feedback.map((f, i) => (
              <div
                key={f.id}
                className="rise bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                      {f.category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(f.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed">
                    "{f.message}"
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => like(f.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-tang hover:border-tang/40 transition-colors"
                  >
                    <Heart size={13} className={f.likes ? 'text-tang fill-tang' : 'text-slate-400'} />
                    <span className="font-bold">{f.likes}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default FeedbackView;
