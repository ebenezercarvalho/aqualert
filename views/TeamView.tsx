import React from 'react';
import { Mail, MapPin, Sparkles, HeartHandshake } from 'lucide-react';
import { Blob, PlayfulText, SpeechBubbles, PaperCard, SectionKicker, BRAND_BG, PALETTE, SHAPES, ShapeKey } from '../components/brand';
import { TEAM, TeamMember } from '../data/team';

const AVATAR_SHAPES: ShapeKey[] = ['a', 'b', 'c', 'd', 'a'];

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

const MemberCard: React.FC<{ member: TeamMember; index: number }> = ({ member, index }) => {
  const color = BRAND_BG[member.color];

  return (
    <PaperCard
      as="article"
      className="rise group relative overflow-hidden p-6 pt-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Header Banner */}
      <div className="relative -mx-6 h-24 mb-14" style={{ backgroundColor: `${color}15` }}>
        <Blob color={color} shape="banner" className="absolute inset-0 opacity-90" />
        <span className="absolute top-3 right-4 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-white/90 text-slate-800 shadow-sm">
          {member.area}
        </span>

        {/* Avatar */}
        <div className="absolute left-6 -bottom-10 w-20 h-20 transition-transform duration-300 group-hover:scale-105">
          <div
            className="absolute inset-0 bg-white shadow-md"
            style={{ clipPath: SHAPES[AVATAR_SHAPES[index % AVATAR_SHAPES.length]], transform: 'scale(1.1)' }}
          />
          {member.avatar ? (
            <img
              src={member.avatar}
              alt={`Foto de ${member.name}`}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ clipPath: SHAPES[AVATAR_SHAPES[index % AVATAR_SHAPES.length]] }}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center text-white"
              style={{ 
                clipPath: SHAPES[AVATAR_SHAPES[index % AVATAR_SHAPES.length]],
                backgroundColor: color 
              }}
            >
              <span className="font-display text-2xl font-extrabold">{initials(member.name)}</span>
            </div>
          )}
        </div>
      </div>

      <h3 className="font-display text-2xl font-extrabold text-slate-800 leading-tight">{member.name}</h3>
      <p className="text-sm font-bold mt-0.5" style={{ color }}>
        {member.role}
      </p>

      <p className="mt-3 text-sm text-slate-600 leading-relaxed min-h-[40px]">{member.bio}</p>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
        <Sparkles size={16} className="shrink-0 text-tang" />
        <span className="text-xs font-bold text-slate-700">
          Superpoder: <span className="font-medium text-slate-600">{member.superpower}</span>
        </span>
      </div>

      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Habilidades">
        {member.skills.map((s) => (
          <li key={s} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 text-slate-700 bg-slate-50">
            {s}
          </li>
        ))}
      </ul>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5 min-w-0">
          <MapPin size={14} className="shrink-0 text-slate-400" /> <span className="truncate">{member.city}</span>
        </span>
        <a
          href={`mailto:${member.email}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-navy text-white font-bold hover:bg-navy-soft transition-colors shadow-sm"
        >
          <Mail size={13} /> Contato
        </a>
      </div>
    </PaperCard>
  );
};

const TeamView: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner Hero */}
      <section className="rise relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
        <Blob color={PALETTE.green} shape="leaf" className="absolute -left-10 -bottom-20 w-48 h-56 opacity-10" />
        <Blob color={PALETTE.yellow} round className="absolute right-12 -top-10 w-36 h-36 opacity-15 hidden md:block" />
        <Blob color={PALETTE.orange} shape="c" className="absolute -right-8 -bottom-10 w-44 h-44 opacity-15 hidden sm:block" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative px-7 py-5 rounded-2xl bg-navy text-white shadow-md max-w-md">
            <SpeechBubbles className="absolute -top-2 right-2 w-14 h-12" />
            <h1 className="font-display text-4xl md:text-5xl font-extrabold text-white">Nosso Time</h1>
          </div>
        </div>
      </section>

      {/* Grid de Membros */}
      <div>
        <div className="mb-6">
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-800">
            Quem faz o AQUALERT são os <span className="text-tang">MAIORAIS DA INOVAÇÃO</span>
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {TEAM.map((m, i) => (
            <MemberCard key={m.id} member={m} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamView;
