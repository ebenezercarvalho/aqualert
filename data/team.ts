import type { BrandColor } from '../components/brand';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  area: string;
  bio: string;
  skills: string[];
  superpower: string;
  email: string;
  city: string;
  avatar?: string;
  color: BrandColor;
}

export const TEAM: TeamMember[] = [
  {
    id: 'm-ian',
    name: 'Ian Hage',
    role: 'Engenharia de Processos Hídricos',
    area: 'Tratamento & Qualidade',
    bio: 'Especialista em processos operacionais de ETA/ETE, padrões de potabilidade e monitoramento em campo.',
    skills: ['Tratamento de Água', 'Normas CONAMA', 'Processos ETA/ETE'],
    superpower: 'Visão sistêmica de processos',
    email: 'ian.hage@aqualert.com.br',
    city: 'São Paulo, SP',
    color: 'orange',
  },
  {
    id: 'm-jefferson',
    name: 'Jefferson Luiz',
    role: 'Cientista de Dados & IA',
    area: 'Modelagem Preditiva',
    bio: 'Desenvolve modelos de aprendizado de máquina para antecipar eventos de floração de algas e correlações físico-químicas.',
    skills: ['Machine Learning', 'Séries Temporais', 'Python & SQL'],
    superpower: 'Prevê tendências nos dados',
    email: 'jefferson.luiz@aqualert.com.br',
    city: 'Belo Horizonte, MG',
    color: 'green',
  },
  {
    id: 'm-lucas',
    name: 'Lucas Regis',
    role: 'Engenheiro de Software & Infra',
    area: 'Sistemas & Cloud',
    bio: 'Arquiteta soluções escaláveis e pipelines de dados em tempo real para ingestão contínua de sensores IoT.',
    skills: ['Arquitetura Cloud', 'APIs de Alta Performance', 'DevOps'],
    superpower: 'Estabilidade e resiliência',
    email: 'lucas.regis@aqualert.com.br',
    city: 'Curitiba, PR',
    color: 'teal',
  },
  {
    id: 'm-paola',
    name: 'Paola Pessoa',
    role: 'Designer de Produto & UX',
    area: 'Experiência do Usuário',
    bio: 'Traduz dados complexos de satélite e sensores em interfaces limpas, humanizadas e práticas para tomada de decisão.',
    skills: ['UX Research', 'Design System', 'Prototipação Rápida'],
    superpower: 'Simplifica o complexo',
    email: 'paola.pessoa@aqualert.com.br',
    city: 'Brasília, DF',
    color: 'yellow',
  },
  {
    id: 'm-yago',
    name: 'Yago Moreira',
    role: 'Gestor de Inovação & Operações',
    area: 'Estratégia & Saneamento',
    bio: 'Conecta os alertas de qualidade às rotinas de operação e tomada de decisão estratégica nas concessionárias.',
    skills: ['Gestão de Inovação', 'Operações de Saneamento', 'Pitch & Negócios'],
    superpower: 'Articula estratégia e ação',
    email: 'yago.moreira@aqualert.com.br',
    city: 'Volta Redonda, RJ',
    color: 'orange',
  },
  {
    id: 'm-ebenezer',
    name: 'Ebenezer de Paula',
    role: 'Biólogo · Dev Full Stack',
    area: 'Bioinformática & Dados',
    bio: 'Une biologia e código para transformar dados de qualidade da água e sensoriamento remoto em decisões rápidas.',
    skills: ['Sensoriamento Remoto', 'React & Python', 'Ciência Ambiental'],
    superpower: 'Traduz satélite em alerta',
    email: 'ebenezer.paula@aqualert.com.br',
    city: 'Rio de Janeiro, RJ',
    avatar: 'https://avatars.githubusercontent.com/u/65116965?v=4',
    color: 'navy',
  },
];
