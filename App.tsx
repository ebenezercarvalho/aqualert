import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Droplets,
  Map as MapIcon,
  BarChart3,
  Bell,
  Search,
  Wind,
  Waves,
  Thermometer,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Menu,
  Battery,
  Wifi,
  FileText,
  Bot,
  Download,
  Share2,
  Calendar,
  Filter,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  MessageSquareHeart,
  Lightbulb,
  Laptop,
  Puzzle,
  MapPin,
  Radio,
  Sliders,
  ChevronRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { WaterMetric, ChartDataPoint, WaterQualityRecord } from './types';
import { Blob, PlayfulText, SpeechBubbles, AqualertLogo, PaperCard, SectionKicker, PALETTE } from './components/brand';
import TeamView from './views/TeamView';
import FeedbackView from './views/FeedbackView';
import ForecastView from './views/ForecastView';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// --- Statistical Analysis ---

interface MetricStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
}

const calculateStats = (values: number[]): MetricStats => {
  if (values.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return { mean, stdDev, min, max };
};

const getMetricStatus = (
  value: number,
  stats: MetricStats,
  metricName: string
): 'optimal' | 'warning' | 'critical' => {
  const zScore = stats.stdDev > 0 ? (value - stats.mean) / stats.stdDev : 0;

  if (metricName.includes('pH')) {
    if (value < 4.5 || value > 8.5) return 'critical';
    if (value < 5 || value > 8) return 'warning';
    return 'optimal';
  }

  if (metricName.includes('Turbidez') || metricName.includes('Temperatura') || metricName.includes('Turbidity') || metricName.includes('Temperature')) {
    if (zScore > 2 || value > stats.max * 0.95) return 'critical';
    if (zScore > 1) return 'warning';
    return 'optimal';
  }

  if (metricName.includes('Oxigênio') || metricName.includes('Oxygen')) {
    if (zScore < -2 || value < stats.min * 1.05) return 'critical';
    if (zScore < -1) return 'warning';
    return 'optimal';
  }

  return 'optimal';
};

const getProgressWidth = (value: number, stats: MetricStats): number => {
  if (stats.max === stats.min || stats.stdDev === 0) return 50;
  const zScore = (value - stats.mean) / stats.stdDev;
  const width = 50 + (zScore * 25);
  return Math.min(Math.max(width, 0), 100);
};

const INITIAL_METRICS: WaterMetric[] = [
  { id: '1', name: 'Nível de pH', value: 0, unit: 'pH', status: 'optimal', trend: 0 },
  { id: '2', name: 'Oxigênio Dissolvido', value: 0, unit: 'mg/L', status: 'optimal', trend: 0 },
  { id: '3', name: 'Turbidez', value: 0, unit: 'NTU', status: 'warning', trend: 0 },
  { id: '4', name: 'Temperatura', value: 0, unit: '°C', status: 'optimal', trend: 0 },
];

// --- Shared Components ---

interface SidebarItemProps {
  id?: string;
  icon: any;
  label: string;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
  accent?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  id,
  icon: Icon, 
  label, 
  badge, 
  active, 
  onClick, 
  collapsed, 
  accent = PALETTE.yellow 
}) => (
  <button
    id={id}
    onClick={onClick}
    title={collapsed ? label : undefined}
    aria-current={active ? 'page' : undefined}
    className={`w-full flex items-center rounded-xl transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group relative text-left overflow-hidden p-2
      ${active ? 'bg-white text-navy font-bold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/10 font-medium'}
    `}
  >
    <span
      className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-all duration-200
        ${active ? 'bg-navy text-white shadow-xs' : 'bg-white/10 text-slate-300 group-hover:text-white group-hover:bg-white/20'}
      `}
      style={active ? { backgroundColor: PALETTE.navy } : undefined}
    >
      <Icon size={19} className="transition-transform duration-200 group-hover:scale-110" />
    </span>

    <div
      className={`flex-1 flex items-center justify-between min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
        collapsed ? 'max-w-0 opacity-0 -translate-x-2 pointer-events-none' : 'max-w-[170px] opacity-100 translate-x-0 ml-3'
      }`}
    >
      <span className="text-sm tracking-wide truncate">{label}</span>
      {badge && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-tang text-white uppercase tracking-wider shrink-0 ml-2">
          {badge}
        </span>
      )}
    </div>

    <div
      className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] shrink-0 ${
        collapsed || !active ? 'max-w-0 opacity-0 scale-50' : 'max-w-[12px] opacity-100 scale-100 ml-1.5'
      }`}
    >
      <span className="block w-1.5 h-4 rounded-full bg-tang" />
    </div>
  </button>
);

const METRIC_THEME: Record<string, { color: string; bg: string }> = {
  '1': { color: PALETTE.teal, bg: 'bg-lagoon-soft text-lagoon' },
  '2': { color: PALETTE.green, bg: 'bg-leaf-soft text-leaf' },
  '3': { color: PALETTE.orange, bg: 'bg-tang-soft text-tang' },
  '4': { color: '#DDA01B', bg: 'bg-sun-soft text-[#B07F12]' },
};

const STATUS_BADGE: Record<'optimal' | 'warning' | 'critical', { label: string; cls: string }> = {
  optimal: { label: 'Normal', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  warning: { label: 'Atenção', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  critical: { label: 'Crítico', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const StatCard: React.FC<{ metric: WaterMetric; index?: number }> = ({ metric, index = 0 }) => {
  const progressWidth = metric.stats ? getProgressWidth(metric.value, metric.stats) : 50;
  const displayWidth = Math.max(progressWidth, 5);
  const theme = METRIC_THEME[metric.id] || METRIC_THEME['1'];
  const statusInfo = STATUS_BADGE[metric.status] || STATUS_BADGE.optimal;
  const Icon = metric.id === '1' ? Droplets : metric.id === '2' ? Wind : metric.id === '4' ? Thermometer : Waves;

  return (
    <div 
      className="rise bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${theme.bg}`}>
            <Icon size={24} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
            <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${metric.trend >= 0 ? 'bg-leaf-soft text-leaf border-leaf/20' : 'bg-tang-soft text-tang border-tang/20'}`}>
              {metric.trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(metric.trend)}%
            </span>
          </div>
        </div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{metric.name}</p>
        <h3 className="font-display text-3xl font-extrabold text-slate-800 tracking-tight mt-1">
          {metric.value} <span className="text-base text-slate-400 font-semibold">{metric.unit}</span>
        </h3>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100">
        <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
          <span>Escala Telemetria</span>
          {metric.stats && metric.stats.max > 0 && (
            <span>Máx: {metric.stats.max.toFixed(1)} {metric.unit}</span>
          )}
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${displayWidth}%`, backgroundColor: theme.color }}
          />
        </div>
      </div>
    </div>
  );
};

// --- VIEW COMPONENTS ---

const toValidNumber = (val: any): number | null => {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};

const DashboardView = ({ data }: { data: WaterQualityRecord[] }) => {
  const [metrics, setMetrics] = useState<WaterMetric[]>(INITIAL_METRICS);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [scraperStatus, setScraperStatus] = useState<{
    running: boolean;
    last_run: string | null;
    last_status: string;
    last_record_cetesb: string | null;
    interval_hours: number;
    is_in_progress: boolean;
  } | null>(null);
  const [triggeringScraper, setTriggeringScraper] = useState(false);

  // Monitora o status da raspagem periódica de 2h da CETESB
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/scraper/status`);
        if (res.ok) {
          const json = await res.json();
          setScraperStatus(json);
        }
      } catch {
        // Backend offline ou indisponível
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerScraper = async () => {
    setTriggeringScraper(true);
    try {
      await fetch(`${API_BASE_URL}/api/scraper/trigger`, { method: 'POST' });
      setTimeout(async () => {
        const res = await fetch(`${API_BASE_URL}/api/scraper/status`);
        if (res.ok) setScraperStatus(await res.json());
        setTriggeringScraper(false);
      }, 3000);
    } catch {
      setTriggeringScraper(false);
    }
  };

  useEffect(() => {
    if (data && data.length > 0) {
      const parseDate = (dateStr: string) => {
        if (!dateStr) return new Date(0);
        const parts = dateStr.trim().split(' ');
        if (parts.length < 2) return new Date(0);
        const [day, month, year] = parts[0].split('/');
        return new Date(`${year}-${month}-${day}T${parts[1]}:00`);
      };

      const sortedChronological = [...data].sort((a: any, b: any) => {
        const timeA = parseDate(a.data_coleta_txt).getTime();
        const timeB = parseDate(b.data_coleta_txt).getTime();
        return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
      });

      const latest = sortedChronological[sortedChronological.length - 1];
      const previous = sortedChronological.length > 1 ? sortedChronological[sortedChronological.length - 2] : null;

      const calculateTrend = (current: number | null, prev: number | null | undefined) => {
        if (current === null || prev === undefined || prev === null || prev === 0) return 0;
        return Number((((current - prev) / prev) * 100).toFixed(1));
      };

      // Filtra apenas números finitos reais para não distorcer média/desvio com null (UI-06)
      const phValues = sortedChronological.map((item) => toValidNumber(item.ph)).filter((v): v is number => v !== null);
      const oxygenValues = sortedChronological.map((item) => toValidNumber(item.oxigenio_dissolvido)).filter((v): v is number => v !== null);
      const turbidityValues = sortedChronological.map((item) => toValidNumber(item.turbidez)).filter((v): v is number => v !== null);
      const tempValues = sortedChronological.map((item) => toValidNumber(item.temperatura)).filter((v): v is number => v !== null);

      const phStats = calculateStats(phValues);
      const oxygenStats = calculateStats(oxygenValues);
      const turbidityStats = calculateStats(turbidityValues);
      const tempStats = calculateStats(tempValues);

      const latestPh = toValidNumber(latest.ph) ?? (phValues[phValues.length - 1] ?? 0);
      const latestOx = toValidNumber(latest.oxigenio_dissolvido) ?? (oxygenValues[oxygenValues.length - 1] ?? 0);
      const latestTurb = toValidNumber(latest.turbidez) ?? (turbidityValues[turbidityValues.length - 1] ?? 0);
      const latestTemp = toValidNumber(latest.temperatura) ?? (tempValues[tempValues.length - 1] ?? 0);

      const newMetrics: WaterMetric[] = [
        {
          id: '1',
          name: 'Nível de pH',
          value: latestPh,
          unit: 'pH',
          status: getMetricStatus(latestPh, phStats, 'Nível de pH'),
          trend: previous ? calculateTrend(latestPh, toValidNumber(previous.ph)) : 0,
          stats: phStats
        },
        {
          id: '2',
          name: 'Oxigênio Dissolvido',
          value: latestOx,
          unit: 'mg/L',
          status: getMetricStatus(latestOx, oxygenStats, 'Oxigênio Dissolvido'),
          trend: previous ? calculateTrend(latestOx, toValidNumber(previous.oxigenio_dissolvido)) : 0,
          stats: oxygenStats
        },
        {
          id: '3',
          name: 'Turbidez',
          value: latestTurb,
          unit: 'NTU',
          status: getMetricStatus(latestTurb, turbidityStats, 'Turbidez'),
          trend: previous ? calculateTrend(latestTurb, toValidNumber(previous.turbidez)) : 0,
          stats: turbidityStats
        },
        {
          id: '4',
          name: 'Temperatura',
          value: latestTemp,
          unit: '°C',
          status: getMetricStatus(latestTemp, tempStats, 'Temperatura'),
          trend: previous ? calculateTrend(latestTemp, toValidNumber(previous.temperatura)) : 0,
          stats: tempStats
        },
      ];
      setMetrics(newMetrics);

      let filteredData = [...sortedChronological];

      if (filteredData.length > 0) {
        const latestDate = parseDate(latest.data_coleta_txt);

        if (timeRange === 'daily') {
          // Filtra por janela real de 48h a partir da leitura mais recente (UI-07)
          const fortyEightHoursAgo = new Date(latestDate.getTime() - 48 * 3600 * 1000);
          const filtered = filteredData.filter((item: any) => parseDate(item.data_coleta_txt) >= fortyEightHoursAgo);
          filteredData = filtered.length >= 4 ? filtered : filteredData.slice(-24);
        } else if (timeRange === 'weekly') {
          const sevenDaysAgo = new Date(latestDate);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const filtered = filteredData.filter((item: any) => parseDate(item.data_coleta_txt) >= sevenDaysAgo);
          filteredData = filtered.length >= 5 ? filtered : filteredData.slice(-48);
        } else if (timeRange === 'monthly') {
          const thirtyDaysAgo = new Date(latestDate);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const filtered = filteredData.filter((item: any) => parseDate(item.data_coleta_txt) >= thirtyDaysAgo);
          filteredData = filtered.length >= 10 ? filtered : filteredData.slice(-120);
        }
      }

      // Amostragem em intervalos de 2 horas (mínimo ~1h45m entre medições) para visualização consistente
      const sampleAt2HourIntervals = (records: any[]) => {
        if (records.length <= 1) return records;
        const sampled: any[] = [];
        let lastTimestamp = 0;
        for (const item of records) {
          const t = parseDate(item.data_coleta_txt).getTime();
          if (isNaN(t) || t === 0) continue;
          if (sampled.length === 0 || (t - lastTimestamp) >= (105 * 60 * 1000)) {
            sampled.push(item);
            lastTimestamp = t;
          }
        }
        const lastItem = records[records.length - 1];
        if (sampled.length > 0 && sampled[sampled.length - 1] !== lastItem) {
          sampled.push(lastItem);
        }
        return sampled;
      };

      const finalSampledData = sampleAt2HourIntervals(filteredData);

      // Preserva null quando sensor não reportou valor, evitando zeros falsos (UI-06)
      setChartData(finalSampledData.map((item: any) => {
        const parts = (item.data_coleta_txt || '').trim().split(' ');
        const dateParts = (parts[0] || '').split('/');
        const timePart = parts[1] || '';
        const day = dateParts[0] || '';
        const month = dateParts[1] || '';
        return {
          time: `${day}/${month} ${timePart}`.trim(),
          ph: toValidNumber(item.ph),
          oxygen: toValidNumber(item.oxigenio_dissolvido),
          turbidity: toValidNumber(item.turbidez),
          precipitation: toValidNumber(item.precipitacao)
        };
      }));
    }
  }, [data, timeRange]);

  const timeRanges: { id: 'daily' | 'weekly' | 'monthly'; label: string }[] = [
    { id: 'daily', label: 'Diário (2h)' },
    { id: 'weekly', label: 'Semanal' },
    { id: 'monthly', label: 'Mensal' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner Principal com Inspiração da Semana da Inovação */}
      <section className="rise relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
        <Blob color={PALETTE.green} shape="leaf" className="absolute -left-10 -bottom-24 w-48 h-56 opacity-10" />
        <Blob color={PALETTE.yellow} round className="absolute left-[38%] -bottom-16 w-28 h-28 opacity-15 hidden lg:block" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[auto_minmax(0,1fr)_auto] items-center">
          {/* Badge Inovação */}
          <div className="relative px-7 py-6 rounded-2xl bg-navy text-white shadow-md max-w-md">
            <SpeechBubbles className="absolute -top-2 right-2 w-14 h-12" />
            <p className="text-white/80 text-sm font-semibold uppercase tracking-wider">Monitoramento com</p>
            <div className="mt-1">
              <PlayfulText text="Inovação" className="text-white text-5xl md:text-6xl" />
            </div>
            <p className="font-display text-sun font-bold text-sm tracking-wider mt-1">HACKATHON 2026</p>
          </div>

          <div className="space-y-2">
            <SectionKicker color="orange">Estação de Telemetria Automática</SectionKicker>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-800 leading-tight">Estação EF26 - Queluz</h2>
            <p className="text-slate-600 text-sm leading-relaxed max-w-2xl">
              Monitoramento contínuo das águas do rio Paraíba do Sul na divisa entre São Paulo e Rio de Janeiro, em direção ao Reservatório do Funil.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200">
                <MapPin size={13} className="text-tang" /> Latitude: 22° 32′ 44″ S
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200">
                <MapPin size={13} className="text-lagoon" /> Longitude: 44° 47′ 49″ O
              </span>
            </div>
          </div>

          {/* Cluster de Elementos da Imagem */}
          <div className="relative hidden xl:flex items-center gap-3 pr-2">
            <div className="flex flex-col gap-2">
              <div className="w-14 h-14 rounded-2xl bg-tang-soft flex items-center justify-center text-tang shadow-sm" title="Ideias e Soluções">
                <Lightbulb size={28} />
              </div>
              <div className="w-14 h-14 rounded-2xl bg-leaf-soft flex items-center justify-center text-leaf shadow-sm" title="Análise de Dados">
                <Laptop size={28} />
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <div className="w-14 h-14 rounded-2xl bg-lagoon-soft flex items-center justify-center text-lagoon shadow-sm" title="Integração do Time">
                <Puzzle size={28} />
              </div>
              <div className="w-14 h-14 rounded-2xl bg-sun-soft flex items-center justify-center text-[#B07F12] shadow-sm" title="Visão em Tempo Real">
                <Search size={28} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((metric, i) => (
          <StatCard key={metric.id} metric={metric} index={i} />
        ))}
      </div>

      {/* Gráfico de Tendências */}
      <div className="w-full">
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4 mb-6">
            <div>
              <SectionKicker color="teal">Série Temporal · Intervalo de 2 Horas</SectionKicker>
              <h3 className="font-display text-2xl font-extrabold text-slate-800 mt-1">Tendência dos Índices de Qualidade</h3>
              <p className="text-xs font-medium text-slate-500">
                Amostragem telemétrica a cada 2 horas · Correlação entre Turbidez, Oxigênio Dissolvido e Chuva
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Badge e Ação do Scraper CETESB (2h) */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                  <Radio size={12} className="text-leaf animate-pulse" />
                  <span>Atualização CETESB: a cada 2h</span>
                  {scraperStatus?.last_record_cetesb && (
                    <span className="text-slate-400 font-normal">
                      · {scraperStatus.last_record_cetesb}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleTriggerScraper}
                  disabled={triggeringScraper || scraperStatus?.is_in_progress}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                  title="Sincronizar medições mais recentes do SIMQUA/CETESB"
                >
                  <RefreshCw size={12} className={triggeringScraper || scraperStatus?.is_in_progress ? 'animate-spin text-tang' : 'text-slate-500'} />
                  {triggeringScraper || scraperStatus?.is_in_progress ? 'Atualizando...' : 'Atualizar Agora'}
                </button>
              </div>

              {/* Seletor de Intervalo de Tempo */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl self-start" role="group" aria-label="Filtro de tempo">
                {timeRanges.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setTimeRange(r.id)}
                    aria-pressed={timeRange === r.id}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      timeRange === r.id 
                        ? 'bg-white text-navy shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorO2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.green} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={PALETTE.green} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTurbidity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.orange} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={PALETTE.orange} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: 12, 
                    border: '1px solid #E2E8F0', 
                    background: '#FFFFFF', 
                    boxShadow: '0 4px 14px rgba(0,0,0,0.06)' 
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 14, fontSize: 12, fontWeight: 600 }} />
                <Area connectNulls type="monotone" dataKey="turbidity" stroke={PALETTE.orange} strokeWidth={2.5} fillOpacity={1} fill="url(#colorTurbidity)" name="Turbidez (NTU)" />
                <Area connectNulls type="monotone" dataKey="oxygen" stroke={PALETTE.green} strokeWidth={2.5} fillOpacity={1} fill="url(#colorO2)" name="Oxigênio Dissolvido (mg/L)" />
                <Area connectNulls type="monotone" dataKey="precipitation" stroke={PALETTE.navy} strokeWidth={2} strokeDasharray="5 5" fill="none" name="Precipitação (mm)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const MapResizer = () => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 800);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
};

const ReservoirMap = () => {
  const [tileUrl, setTileUrl] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('2025-09-01');
  const [endDate, setEndDate] = useState('2025-09-25');

  const [inputStartDate, setInputStartDate] = useState('2025-09-01');
  const [inputEndDate, setInputEndDate] = useState('2025-09-25');

  const [sensitivity, setSensitivity] = useState(0.15);
  const [showCalibration, setShowCalibration] = useState(false);

  const mapCenter: [number, number] = [-22.530116, -44.563915];
  const defaultZoom = 12;

  const fetchMapTiles = async (start: string, end: string, maxSens: number) => {
    setLoading(true);
    setMapError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/map/ndci?start_date=${start}&end_date=${end}&max=${maxSens}`);
      if (response.ok) {
        const data = await response.json();
        setTileUrl(data.url);
      } else {
        let detail = 'Nenhuma imagem limpa do Sentinel-2 disponível para este intervalo.';
        try {
          const errJson = await response.json();
          if (errJson?.detail) detail = errJson.detail;
        } catch {
          // ignore
        }
        setTileUrl(null);
        setMapError(detail);
      }
    } catch (error) {
      console.error('Error fetching map tiles:', error);
      setMapError('Camada GEE indisponível no momento (verifique a conexão com o backend FastAPI).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapTiles(startDate, endDate, sensitivity);
  }, []);

  // Legenda com faixas numéricas dinâmicas alinhadas à paleta de 5 níveis [-0.05, sensitivity] (UI-08)
  const step = (sensitivity - -0.05) / 4;
  const NDCI_LEGEND = [
    { color: '#FF0000', label: `Crítico (≥ +${sensitivity.toFixed(2)})` },
    { color: '#F1D71B', label: `Alerta (+${(-0.05 + 2 * step).toFixed(2)} a +${sensitivity.toFixed(2)})` },
    { color: '#7CFA00', label: `Atenção (+${(-0.05 + step).toFixed(2)} a +${(-0.05 + 2 * step).toFixed(2)})` },
    { color: '#006A4E', label: `Moderado (-0.05 a +${(-0.05 + step).toFixed(2)})` },
    { color: '#01042A', label: 'Baixo (< -0.05)' },
  ];

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header Limpo do Reservatório */}
      <section className="rise bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="space-y-4">
            <div>
              <SectionKicker color="teal">Monitoramento por Satélite · Qualidade da Água</SectionKicker>
              <h2 className="font-display text-3xl font-extrabold text-slate-800 mt-1">Reservatório do Funil</h2>
              <p className="text-slate-600 text-sm mt-0.5">
                Mapeamento da concentração de clorofila e presença de algas na superfície do reservatório
              </p>
            </div>

            {/* Controles de Filtro */}
            <div className="flex flex-wrap items-end gap-3 pt-1">
              <div className="flex flex-col gap-1">
                <label htmlFor="ndci-start" className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Data Inicial</label>
                <input
                  id="ndci-start"
                  type="date"
                  value={inputStartDate}
                  onChange={(e) => setInputStartDate(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-navy transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="ndci-end" className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Data Final</label>
                <input
                  id="ndci-end"
                  type="date"
                  value={inputEndDate}
                  onChange={(e) => setInputEndDate(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-navy transition-colors"
                />
              </div>
              <button
                onClick={() => {
                  setStartDate(inputStartDate);
                  setEndDate(inputEndDate);
                  fetchMapTiles(inputStartDate, inputEndDate, sensitivity);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white rounded-xl text-sm font-bold shadow-sm hover:bg-navy-soft transition-all disabled:opacity-60 cursor-pointer"
                disabled={loading}
              >
                <Filter size={15} />
                {loading ? 'Processando...' : 'Aplicar Filtro'}
              </button>
              <button
                onClick={() => setShowCalibration(!showCalibration)}
                aria-expanded={showCalibration}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Sliders size={15} />
                {showCalibration ? 'Ocultar Calibração' : 'Calibração'}
              </button>
            </div>

            {/* Painel de Calibração */}
            {showCalibration && (
              <div className="pop p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-xl">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="ndci-sens" className="text-xs font-bold uppercase tracking-wider text-slate-700">Sensibilidade (Threshold Máximo): <span className="text-tang font-extrabold">{sensitivity}</span></label>
                </div>
                <input
                  id="ndci-sens"
                  type="range"
                  min="0.01"
                  max="0.40"
                  step="0.01"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-[#EE7A3B]"
                />
                <p className="text-xs text-slate-500 mt-1">Ajuste o teto da escala de cor para calibrar a sensibilidade visual na lâmina d'água.</p>
              </div>
            )}

            {mapError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                {mapError}
              </div>
            )}
          </div>

          {/* Legenda NDCI */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 xl:text-right">Nível de Clorofila (NDCI)</span>
            <div className="flex flex-wrap gap-2" aria-label="Legenda NDCI">
              {NDCI_LEGEND.map(item => (
                <div key={item.label} className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200 text-xs font-bold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mapa do Reservatório */}
      <div className="w-full h-[580px] bg-slate-100 rounded-3xl overflow-hidden relative border border-slate-200 shadow-sm z-0">
        <MapContainer center={mapCenter} zoom={defaultZoom} style={{ height: '100%', width: '100%' }} className="z-0">
          <MapResizer />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Earthstar Geographics'
          />
          {tileUrl && (
            <TileLayer
              url={tileUrl}
              opacity={0.75}
            />
          )}
        </MapContainer>

        {loading && (
          <div className="absolute inset-0 flex flex-col gap-3 items-center justify-center bg-white/70 backdrop-blur-sm z-[1000]" role="status">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-navy"></div>
            <span className="text-sm font-bold text-navy">Carregando telemetria geoespacial…</span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Footer Profissional ---

const Footer = () => (
  <footer className="mt-14 mb-4 rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-5 md:px-8">
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
      <div className="flex items-center gap-3">
        <AqualertLogo size={34} />
        <div>
          <p className="font-display text-base font-extrabold text-navy tracking-wide">AQUALERT</p>
          <p className="text-slate-400 text-[11px]">Plataforma de Monitoramento Hídrico e Saneamento Ambiental · Hackaton Rede de Inovação 2026</p>
        </div>
      </div>
      <div className="text-center sm:text-right">
        <p className="font-semibold text-slate-700">
          Desenvolvido pelos <span className="text-navy font-bold">Maiorais da Inovação</span> · Time AQUALERT
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Hackaton Rede de Inovação 2026 · Monitoramento e Saneamento Ambiental
        </p>
      </div>
    </div>
  </footer>
);

// --- Main App ---

export default function App() {
  const getInitialView = (): 'dashboard' | 'map' | 'forecast' | 'team' | 'feedback' => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (['dashboard', 'map', 'forecast', 'team', 'feedback'].includes(hash)) {
        return hash as any;
      }
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (tab && ['dashboard', 'map', 'forecast', 'team', 'feedback'].includes(tab)) {
        return tab as any;
      }
    }
    return 'dashboard';
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'map' | 'forecast' | 'team' | 'feedback'>(getInitialView);
  const [items, setItems] = useState<WaterQualityRecord[]>([]);
  const [telemetryOnline, setTelemetryOnline] = useState<boolean>(true);

  const handleSelectView = (view: 'dashboard' | 'map' | 'forecast' | 'team' | 'feedback') => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      window.location.hash = view;
    }
  };

  // Sincroniza navegação Voltar/Avançar do navegador via hashchange (UI-10)
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['dashboard', 'map', 'forecast', 'team', 'feedback'].includes(hash)) {
        setCurrentView(hash as any);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      let accumulatedItems: WaterQualityRecord[] = [];
      let offset = 0;
      let hasMore = true;

      try {
        while (hasMore && accumulatedItems.length < 500) {
          const response = await fetch(`${API_BASE_URL}/?offset=${offset}&limit=100`);
          if (!response.ok) {
            console.error('API Error:', response.status);
            setTelemetryOnline(false);
            break;
          }

          const data = await response.json();

          if (data.items && Array.isArray(data.items)) {
            accumulatedItems = [...accumulatedItems, ...data.items];
          }

          hasMore = data.hasMore && data.items && data.items.length > 0;
          if (hasMore) {
            offset += data.count || data.limit || 100;
          }
        }

        if (accumulatedItems.length > 0) {
          setItems(accumulatedItems);
          setTelemetryOnline(true);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setTelemetryOnline(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView data={items} />;
      case 'map': return <ReservoirMap />;
      case 'forecast': return <ForecastView />;
      case 'team': return <TeamView />;
      case 'feedback': return <FeedbackView />;
      default: return <DashboardView data={items} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 overflow-hidden font-sans">

      {/* Sidebar Corporativa AQUALERT */}
      <aside
        className={`
          fixed md:relative z-50 h-full bg-[#132342] text-white flex flex-col shadow-xl select-none
          transition-[width,transform] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]
          overflow-hidden
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-20 translate-x-0'}
        `}
      >
        {/* Logo / Header da Sidebar */}
        <div className="h-16 px-3.5 flex items-center border-b border-white/10 shrink-0 overflow-hidden">
          <div className="flex items-center min-w-max">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <AqualertLogo size={36} className="shrink-0" />
            </div>
            <div
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                isSidebarOpen ? 'max-w-[180px] opacity-100 ml-3 translate-x-0' : 'max-w-0 opacity-0 -translate-x-2 ml-0 pointer-events-none'
              }`}
            >
              <h1 className="font-display text-xl font-extrabold tracking-wider text-white">AQUALERT</h1>
            </div>
          </div>
        </div>

        {/* Itens de Navegação */}
        <nav className="flex-1 mt-4 space-y-1.5 px-2.5 overflow-y-auto overflow-x-hidden">
          <div
            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
              isSidebarOpen ? 'max-h-8 opacity-100 px-2 py-1' : 'max-h-0 opacity-0 py-0 pointer-events-none'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Monitoramento
            </span>
          </div>
          <SidebarItem
            id="tab-dashboard"
            icon={LayoutDashboard}
            label="Painel"
            collapsed={!isSidebarOpen}
            active={currentView === 'dashboard'}
            onClick={() => handleSelectView('dashboard')}
          />
          <SidebarItem
            id="tab-map"
            icon={MapIcon}
            label="Reservatório"
            collapsed={!isSidebarOpen}
            active={currentView === 'map'}
            onClick={() => handleSelectView('map')}
          />
          <SidebarItem
            id="tab-forecast"
            icon={TrendingUp}
            label="Alerta NDCI"
            collapsed={!isSidebarOpen}
            active={currentView === 'forecast'}
            onClick={() => handleSelectView('forecast')}
          />

          <div
            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
              isSidebarOpen ? 'max-h-10 opacity-100 px-2 pt-4 pb-1' : 'max-h-0 opacity-0 py-0 pt-0 pointer-events-none'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Hackathon
            </span>
          </div>
          <SidebarItem
            id="tab-team"
            icon={Users}
            label="Equipe"
            collapsed={!isSidebarOpen}
            active={currentView === 'team'}
            onClick={() => handleSelectView('team')}
          />
          <SidebarItem
            id="tab-feedback"
            icon={MessageSquareHeart}
            label="Avaliação NPS"
            collapsed={!isSidebarOpen}
            active={currentView === 'feedback'}
            onClick={() => handleSelectView('feedback')}
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">

        {/* Header Superior Limpo */}
        <header className="h-16 px-6 md:px-8 flex items-center justify-between bg-white border-b border-slate-200 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-navy transition-all duration-200 active:scale-95"
              aria-label="Alternar menu lateral"
              title={isSidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
            >
              <Menu size={20} className={`transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${!isSidebarOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-navy text-lg tracking-wide hidden sm:inline">AQUALERT</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {currentView === 'dashboard' && 'Painel da Estação'}
                {currentView === 'map' && 'Satélite do Reservatório'}
                {currentView === 'forecast' && 'Alerta e Previsões NDCI'}
                {currentView === 'team' && 'Participantes do Time'}
                {currentView === 'feedback' && 'Métricas NPS & Feedback'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
                telemetryOnline
                  ? 'bg-leaf-soft text-leaf border-leaf/20'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  telemetryOnline ? 'bg-leaf animate-pulse' : 'bg-amber-500'
                }`}
              />
              {telemetryOnline ? 'Telemetria Ativa' : 'Modo Cache / Offline'}
            </div>
          </div>
        </header>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="max-w-7xl mx-auto h-full flex flex-col justify-between">
            <div>
              {renderView()}
            </div>
            <Footer />
          </div>
        </div>
      </main>
    </div>
  );
}
