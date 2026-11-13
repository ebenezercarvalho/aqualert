import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Layers,
  Activity,
  Send,
  RefreshCw,
  Info,
  CheckCircle2,
  ShieldCheck,
  FileSpreadsheet,
  ZoomIn,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CloudSun
} from 'lucide-react';
import { PaperCard, SectionKicker, PALETTE } from '../components/brand';
import { NDCI_RAW_DATA, NdciPoint } from '../data/ndciRawData';

export interface ProphetPoint {
  date: string;
  displayDate: string;
  fullDate: string;
  timestamp: number;
  isAnchor: boolean;
  isGapFill: boolean;
  isToday: boolean;
  isFuture: boolean;
  type: 'anchor' | 'nowcast' | 'today' | 'forecast';
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
  rmse: number;
  mae: number;
  daysFromObs: number;
  statusLabel: string;
}

export interface ForecastSummary {
  latestObservedDate: string;
  latestObservedDisplayDate: string;
  todayDate: string;
  todayDisplayDate: string;
  gapDays: number;
  hasGap: boolean;
  latestNdci: number;
  forecastHorizonDays: number;
  targetForecastDate: string;
  targetForecastDisplayDate: string;
  maxPredictedNdci: number;
  alertLevel: 'low' | 'moderate' | 'attention' | 'alert' | 'critical' | 'optimal' | 'warning';
  alertLabel: string;
  alertColor: string;
  alertTriggered: boolean;
  thresholdAlert: number;
  thresholdCritical: number;
  recommendation: string;
}

const classifyNdciPatamar = (val: number) => {
  if (val >= 0.30) {
    return { level: 'critical', label: 'Crítico (≥ +0.30)', color: '#EF4444' };
  }
  if (val >= 0.12) {
    return { level: 'alert', label: 'Alerta (+0.12 a +0.30)', color: '#EE7A3B' };
  }
  if (val >= 0.04) {
    return { level: 'attention', label: 'Atenção (+0.04 a +0.12)', color: '#D97706' };
  }
  if (val >= -0.05) {
    return { level: 'moderate', label: 'Moderado (-0.05 a +0.04)', color: '#0D9488' };
  }
  return { level: 'low', label: 'Baixo (< -0.05)', color: '#5C9234' };
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ForecastView: React.FC = () => {
  const [points, setPoints] = useState<NdciPoint[]>(NDCI_RAW_DATA);
  const [loading, setLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<NdciPoint | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [alertSent, setAlertSent] = useState(false);
  const [targetEmail, setTargetEmail] = useState('gestor.eta@saneamento.com.br');

  // Estados de Previsão Meta Prophet + AR(1) (Nowcasting + Projeção Futura)
  // Horizonte padrão de 15 dias (janela operacional ótima identificada na validação observacional)
  const [showProphet, setShowProphet] = useState(true);
  const [forecastHorizon, setForecastHorizon] = useState<number>(15);
  const [forecastPoints, setForecastPoints] = useState<ProphetPoint[]>([]);
  const [forecastSummary, setForecastSummary] = useState<ForecastSummary | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [hoveredForecastPoint, setHoveredForecastPoint] = useState<ProphetPoint | null>(null);

  // Calcula dinamicamente os limites do recorte padrão de 12 meses a partir da última data observada/prevista
  const defaultWindow = useMemo(() => {
    const lastObs = points.length > 0 ? points[points.length - 1].date : '2026-10-18';
    const endYear = Math.max(Number(lastObs.slice(0, 4)) || 2026, new Date().getFullYear());
    const endStr = `${endYear}-12-31`;
    const refDate = new Date(`${lastObs}T12:00:00Z`);
    refDate.setUTCMonth(refDate.getUTCMonth() - 12);
    refDate.setUTCDate(1);
    const startStr = Number.isNaN(refDate.getTime())
      ? '2025-10-01'
      : refDate.toISOString().split('T')[0];
    return { startStr, endStr, endYear };
  }, [points]);

  // Estados de Recorte Temporal (Zoom / Crop)
  const [zoomStart, setZoomStart] = useState<string>('2025-10-01');
  const [zoomEnd, setZoomEnd] = useState<string>('2026-12-31');
  const [activePreset, setActivePreset] = useState<'last12m' | 'all' | '2024-2026' | '2026' | 'custom'>('last12m');

  // Seleção interativa por arraste no gráfico (Box Zoom / Crop)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const forecastAbortRef = useRef<AbortController | null>(null);

  const [syncInfo, setSyncInfo] = useState<{
    message: string;
    lastSyncTime: string;
    syncStatus: 'updated' | 'checked' | 'error' | 'offline';
  } | null>(null);

  // Carrega previsão do Prophet da API com cancelamento de requisições concorrentes (AbortController - UI-02)
  const fetchForecast = async (horizon: number = forecastHorizon) => {
    if (forecastAbortRef.current) {
      forecastAbortRef.current.abort();
    }
    const controller = new AbortController();
    forecastAbortRef.current = controller;

    setForecastLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/forecast/ndci?days=${horizon}`, {
        signal: controller.signal
      });
      if (res.ok) {
        const json = await res.json();
        if (json.summary) setForecastSummary(json.summary);
        if (json.forecastPoints && Array.isArray(json.forecastPoints)) {
          setForecastPoints(json.forecastPoints);
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.warn('Erro ao carregar previsão Prophet:', e);
      }
    } finally {
      if (forecastAbortRef.current === controller) {
        setForecastLoading(false);
      }
    }
  };

  // Sincroniza automaticamente no carregamento da página: lê o cache do GEE, baixa novas passagens se existirem e atualiza o modelo
  useEffect(() => {
    let active = true;
    const autoSyncAndLoad = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/ndci/raw`);
        if (!active) return;
        if (res.ok) {
          const json = await res.json();
          if (json.items && Array.isArray(json.items) && json.items.length > 0) {
            setPoints(json.items);
          }
          setSyncInfo({
            message:
              json.syncStatus === 'error'
                ? 'Exibindo histórico salvo localmente.'
                : json.message || 'Dados de satélite atualizados automaticamente.',
            lastSyncTime: json.lastSyncTime || '',
            syncStatus: json.syncStatus === 'error' ? 'error' : (json.syncStatus === 'updated' ? 'updated' : 'checked')
          });
          // Se novas cenas do satélite foram incorporadas, reexecuta a previsão imediatamente
          if (json.syncStatus === 'updated') {
            fetchForecast(forecastHorizon);
          }
        } else {
          setSyncInfo({
            message: 'Exibindo histórico salvo localmente.',
            lastSyncTime: '',
            syncStatus: 'offline'
          });
        }
      } catch {
        if (!active) return;
        setSyncInfo({
          message: 'Exibindo histórico salvo localmente.',
          lastSyncTime: '',
          syncStatus: 'offline'
        });
      } finally {
        if (active) setLoading(false);
      }
    };

    autoSyncAndLoad();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    fetchForecast(forecastHorizon);
    return () => {
      if (forecastAbortRef.current) {
        forecastAbortRef.current.abort();
      }
    };
  }, [forecastHorizon]);

  // Escala Temporal X Dinâmica baseada no Recorte
  const minTime = useMemo(() => new Date(`${zoomStart}T00:00:00Z`).getTime(), [zoomStart]);
  const maxTime = useMemo(() => new Date(`${zoomEnd}T23:59:59Z`).getTime(), [zoomEnd]);
  const isZoomed =
    activePreset !== 'last12m' ||
    zoomStart !== defaultWindow.startStr ||
    zoomEnd !== defaultWindow.endStr;

  // Presets de Recorte Rápido (Dinâmicos - UI-03)
  const applyPreset = (preset: 'last12m' | 'all' | '2024-2026' | '2026') => {
    setActivePreset(preset);
    if (preset === 'last12m') {
      setZoomStart(defaultWindow.startStr);
      setZoomEnd(defaultWindow.endStr);
    } else if (preset === 'all') {
      setZoomStart('2019-01-01');
      setZoomEnd(defaultWindow.endStr);
    } else if (preset === '2024-2026') {
      setZoomStart('2024-01-01');
      setZoomEnd(defaultWindow.endStr);
    } else if (preset === '2026') {
      setZoomStart(`${defaultWindow.endYear}-01-01`);
      setZoomEnd(defaultWindow.endStr);
    }
  };

  const resetZoom = () => {
    applyPreset('last12m');
  };

  // Pontos observados filtrados para a janela temporal selecionada
  const visiblePoints = useMemo(() => {
    return points.filter((p) => {
      const t = new Date(`${p.date}T12:00:00Z`).getTime();
      return t >= minTime && t <= maxTime;
    });
  }, [points, minTime, maxTime]);

  // Estatísticas calculadas dinamicamente para o período recortado
  const stats = useMemo(() => {
    const targetPoints = visiblePoints.length > 0 ? visiblePoints : points;
    if (targetPoints.length === 0) {
      return { total: 0, mean: 0, min: 0, max: 0, firstDate: '', lastDate: '', lastValue: 0 };
    }
    const values = targetPoints.map((p) => p.ndci);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const mean = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const firstDate = targetPoints[0].date;
    const lastPoint = targetPoints[targetPoints.length - 1];

    return {
      total: targetPoints.length,
      mean,
      min,
      max,
      firstDate,
      lastDate: lastPoint.date,
      lastValue: lastPoint.ndci
    };
  }, [visiblePoints, points]);

  // Dimensões do gráfico SVG
  const svgWidth = 1000;
  const svgHeight = 480;
  const padding = { top: 40, right: 40, bottom: 65, left: 75 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Escala Vertical Y: NDCI cobrindo de -0.40 a +0.70
  const minY = -0.40;
  const maxY = 0.70;

  const getX = (dateStr: string) => {
    const t = new Date(`${dateStr}T12:00:00Z`).getTime();
    const ratio = (t - minTime) / (maxTime - minTime);
    return padding.left + Math.max(0, Math.min(1, ratio)) * chartWidth;
  };

  const getY = (val: number) => {
    const ratio = (val - minY) / (maxY - minY);
    return padding.top + chartHeight - ratio * chartHeight;
  };

  // Posição Y da linha zero (NDCI = 0.0)
  const yZero = getY(0.0);

  // Marcas no eixo Y (NDCI)
  const yTicks = [-0.40, -0.20, 0.00, 0.20, 0.40, 0.60];

  // Marcas e linhas de grade adaptativas no eixo X de acordo com a amplitude do recorte
  const xGridTicks = useMemo(() => {
    const spanDays = (maxTime - minTime) / (1000 * 60 * 60 * 24);
    const ticks: { dateStr: string; label: string; x: number }[] = [];

    if (spanDays > 1100) {
      // Período longo (> 3 anos): marcas por ano
      const startYear = new Date(minTime).getFullYear();
      const endYear = new Date(maxTime).getFullYear();
      for (let y = startYear; y <= endYear; y++) {
        const dStr = `${y}-01-01`;
        const t = new Date(`${dStr}T00:00:00Z`).getTime();
        if (t >= minTime - 86400000 && t <= maxTime + 86400000) {
          ticks.push({
            dateStr: dStr,
            label: String(y),
            x: getX(dStr)
          });
        }
      }
    } else if (spanDays > 450) {
      // Período médio (ex: 2024 a 2026): marcas semestrais (Jan e Jul)
      const startDate = new Date(minTime);
      let cur = new Date(Date.UTC(startDate.getUTCFullYear(), 0, 1));
      while (cur.getTime() <= maxTime) {
        const t = cur.getTime();
        if (t >= minTime && t <= maxTime) {
          const m = cur.getUTCMonth();
          const y = cur.getUTCFullYear();
          const mLabel = m === 0 ? `Jan/${String(y).slice(2)}` : `Jul/${String(y).slice(2)}`;
          const dStr = cur.toISOString().split('T')[0];
          ticks.push({ dateStr: dStr, label: mLabel, x: getX(dStr) });
        }
        cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 6, 1));
      }
    } else {
      // Período curto (ex: 1 ano ou meses): marcas bimestrais com alta resolução
      const startDate = new Date(minTime);
      let cur = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
      const stepMonths = spanDays > 180 ? 2 : 1;
      const mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      while (cur.getTime() <= maxTime) {
        const t = cur.getTime();
        if (t >= minTime && t <= maxTime) {
          const mLabel = `${mesesAbrev[cur.getUTCMonth()]}/${String(cur.getUTCFullYear()).slice(2)}`;
          const dStr = cur.toISOString().split('T')[0];
          ticks.push({ dateStr: dStr, label: mLabel, x: getX(dStr) });
        }
        cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + stepMonths, 1));
      }
    }
    return ticks;
  }, [minTime, maxTime, chartWidth, padding.left]);

  // Pontos mapeados em coordenadas de tela
  const mappedPoints = useMemo(() => {
    return visiblePoints.map((p) => ({
      ...p,
      x: getX(p.date),
      yCoord: getY(p.ndci)
    }));
  }, [visiblePoints, minTime, maxTime]);

  // Linha de Tendência Sazonal e Faixa de Desvio Padrão (±1σ) para a janela visível
  // Suavização Gaussiana adaptativa para o período
  const { trendPath, stdBandPath, trendMap } = useMemo(() => {
    if (mappedPoints.length < 2) {
      return {
        trendPath: '',
        stdBandPath: '',
        trendMap: new Map<string, { trend: number; stdDev: number; upper: number; lower: number }>()
      };
    }

    const spanDays = (maxTime - minTime) / (1000 * 60 * 60 * 24);
    // Ajusta o sigma de acordo com o nível de zoom para manter a fidelidade local
    const sigmaDays = spanDays > 1000 ? 25 : spanDays > 400 ? 18 : 12;
    const SIGMA_MS = sigmaDays * 24 * 60 * 60 * 1000;
    const TWO_SIGMA_SQ = 2 * SIGMA_MS * SIGMA_MS;
    const CUTOFF_MS = 3 * SIGMA_MS;

    const timestamps = mappedPoints.map((pt) => ({
      date: pt.date,
      t: new Date(`${pt.date}T12:00:00Z`).getTime(),
      ndci: pt.ndci,
      sampleStd: pt.stdDev ?? 0.02,
      x: pt.x
    }));

    const map = new Map<string, { trend: number; stdDev: number; upper: number; lower: number }>();
    const smoothedPoints = timestamps.map((curr) => {
      let weightSum = 0;
      let valueSum = 0;

      for (let i = 0; i < timestamps.length; i++) {
        const dt = Math.abs(timestamps[i].t - curr.t);
        if (dt <= CUTOFF_MS) {
          const w = Math.exp(-(dt * dt) / TWO_SIGMA_SQ);
          weightSum += w;
          valueSum += w * timestamps[i].ndci;
        }
      }

      const smoothedVal = weightSum > 0 ? valueSum / weightSum : curr.ndci;

      // Variância local dos dados observados ao redor da tendência no período
      let varSum = 0;
      for (let i = 0; i < timestamps.length; i++) {
        const dt = Math.abs(timestamps[i].t - curr.t);
        if (dt <= CUTOFF_MS) {
          const w = Math.exp(-(dt * dt) / TWO_SIGMA_SQ);
          const diff = timestamps[i].ndci - smoothedVal;
          varSum += w * (diff * diff);
        }
      }

      const localStd = weightSum > 0 ? Math.sqrt(varSum / weightSum) : 0.05;
      const combinedStd = Math.max(localStd, curr.sampleStd * 1.5);

      const upperVal = smoothedVal + combinedStd;
      const lowerVal = smoothedVal - combinedStd;

      map.set(curr.date, {
        trend: smoothedVal,
        stdDev: combinedStd,
        upper: upperVal,
        lower: lowerVal
      });

      return {
        x: curr.x,
        y: getY(smoothedVal),
        upperY: getY(upperVal),
        lowerY: getY(lowerVal)
      };
    });

    // Caminho da linha de tendência
    const path = smoothedPoints.reduce((acc, pt, idx) => {
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }, '');

    // Caminho fechado da sombra da faixa de desvio padrão
    const upperPart = smoothedPoints.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.upperY.toFixed(1)}`).join(' ');
    const lowerPart = [...smoothedPoints].reverse().map((pt) => `L ${pt.x.toFixed(1)},${pt.lowerY.toFixed(1)}`).join(' ');
    const bandPath = `${upperPart} ${lowerPart} Z`;

    return {
      trendPath: path,
      stdBandPath: bandPath,
      trendMap: map
    };
  }, [mappedPoints, minTime, maxTime]);

  // Mapeamento dos pontos do Meta Prophet para a tela (Nowcasting + Projeção Futura)
  const mappedForecastPoints = useMemo(() => {
    if (!showProphet || forecastPoints.length === 0) return [];
    return forecastPoints
      .filter((p) => {
        const t = new Date(`${p.date}T12:00:00Z`).getTime();
        return t >= minTime - 86400000 && t <= maxTime + 86400000;
      })
      .map((p) => ({
        ...p,
        x: getX(p.date),
        yCoord: getY(p.yhat),
        upperY: getY(p.yhat_upper),
        lowerY: getY(p.yhat_lower)
      }));
  }, [showProphet, forecastPoints, minTime, maxTime]);

  // Caminho da Linha Vermelha Pontilhada e Cone de Incerteza do Prophet
  const { forecastTrendPath, forecastBandPath } = useMemo(() => {
    if (mappedForecastPoints.length < 2) {
      return { forecastTrendPath: '', forecastBandPath: '' };
    }

    const trend = mappedForecastPoints.reduce((acc, pt, idx) => {
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.yCoord.toFixed(1)}`;
    }, '');

    const upper = mappedForecastPoints.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.upperY.toFixed(1)}`).join(' ');
    const lower = [...mappedForecastPoints].reverse().map((pt) => `L ${pt.x.toFixed(1)},${pt.lowerY.toFixed(1)}`).join(' ');
    const band = `${upper} ${lower} Z`;

    return {
      forecastTrendPath: trend,
      forecastBandPath: band
    };
  }, [mappedForecastPoints]);

  // Início da seleção por arraste (Box Zoom) — compensa padding.left pois o <rect> tem largura chartWidth (UI-04)
  const handleMouseDown = (e: React.MouseEvent<SVGRectElement>) => {
    if (e.button !== 0) return; // apenas botão principal
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = padding.left + ((e.clientX - rect.left) / rect.width) * chartWidth;
    if (mouseX >= padding.left && mouseX <= padding.left + chartWidth) {
      setIsDragging(true);
      setDragStartX(mouseX);
      setDragCurrentX(mouseX);
    }
  };

  // Interatividade com mouse (encontra o ponto mais próximo entre Observados e Previsão - UI-04)
  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = padding.left + ((e.clientX - rect.left) / rect.width) * chartWidth;
    const mouseY = padding.top + ((e.clientY - rect.top) / rect.height) * chartHeight;

    if (isDragging) {
      const clampedX = Math.max(padding.left, Math.min(padding.left + chartWidth, mouseX));
      setDragCurrentX(clampedX);
      setHoveredPoint(null);
      setHoveredForecastPoint(null);
      setHoverCoord(null);
      return;
    }

    // 1. Encontra ponto observado mais próximo
    let closestObsPoint: NdciPoint | null = null;
    let closestObsDist = Infinity;
    let obsPointCoord = { x: 0, y: 0 };

    for (const pt of mappedPoints) {
      const dx = pt.x - mouseX;
      const dy = pt.yCoord - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy * 0.4);
      if (dist < closestObsDist) {
        closestObsDist = dist;
        closestObsPoint = pt;
        obsPointCoord = { x: pt.x, y: pt.yCoord };
      }
    }

    // 2. Encontra ponto previsto mais próximo
    let closestForecastPoint: ProphetPoint | null = null;
    let closestForecastDist = Infinity;
    let forecastPointCoord = { x: 0, y: 0 };

    if (showProphet) {
      for (const pt of mappedForecastPoints) {
        if (pt.isAnchor) continue; // Ponto âncora é priorizado na camada de observação
        const dx = pt.x - mouseX;
        const dy = pt.yCoord - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy * 0.4);
        if (dist < closestForecastDist) {
          closestForecastDist = dist;
          closestForecastPoint = pt;
          forecastPointCoord = { x: pt.x, y: pt.yCoord };
        }
      }
    }

    // Decide qual ponto destacar no hover
    if (closestForecastPoint && closestForecastDist < closestObsDist && closestForecastDist < 75) {
      setHoveredForecastPoint(closestForecastPoint);
      setHoveredPoint(null);
      setHoverCoord(forecastPointCoord);
    } else if (closestObsPoint && closestObsDist < 80) {
      setHoveredPoint(closestObsPoint);
      setHoveredForecastPoint(null);
      setHoverCoord(obsPointCoord);
    } else {
      setHoveredPoint(null);
      setHoveredForecastPoint(null);
      setHoverCoord(null);
    }
  };

  // Finalização do arraste de Zoom (converte pixels X para datas)
  const handleMouseUp = () => {
    if (isDragging && dragStartX !== null && dragCurrentX !== null) {
      const diff = Math.abs(dragCurrentX - dragStartX);
      if (diff > 25) {
        const xMin = Math.min(dragStartX, dragCurrentX);
        const xMax = Math.max(dragStartX, dragCurrentX);

        const ratioMin = Math.max(0, (xMin - padding.left) / chartWidth);
        const ratioMax = Math.min(1, (xMax - padding.left) / chartWidth);

        const timeA = minTime + ratioMin * (maxTime - minTime);
        const timeB = minTime + ratioMax * (maxTime - minTime);

        const dateA = new Date(timeA).toISOString().split('T')[0];
        const dateB = new Date(timeB).toISOString().split('T')[0];

        if (dateA !== dateB) {
          setZoomStart(dateA);
          setZoomEnd(dateB);
          setActivePreset('custom');
        }
      }
    }
    setIsDragging(false);
    setDragStartX(null);
    setDragCurrentX(null);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStartX(null);
      setDragCurrentX(null);
    }
    setHoveredPoint(null);
    setHoveredForecastPoint(null);
    setHoverCoord(null);
  };


  const handleSendAlert = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertSent(true);
    setTimeout(() => setAlertSent(false), 5000);
  };

  const formatDateBR = (isoDate: string) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header Operacional de Monitoramento e Alerta de Algas */}
      <section className="rise relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <SectionKicker color="orange">Monitoramento da Água Bruta · Reservatório do Funil</SectionKicker>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-800 mt-1">
              Alerta de Floração de Algas e Previsão NDCI
            </h2>
            <p className="text-slate-600 text-sm mt-1 max-w-3xl leading-relaxed">
              Acompanhamento contínuo da presença de algas e do risco de eutrofização na região de captação do reservatório desde <strong>2019</strong>, auxiliando a operação preventiva da Estação de Tratamento de Água.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {loading ? (
              <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-3.5 py-2 rounded-xl border border-sky-200 inline-flex items-center gap-2 animate-in fade-in">
                <RefreshCw size={13} className="animate-spin text-sky-600 shrink-0" />
                Verificando novas leituras de satélite...
              </span>
            ) : syncInfo ? (
              <span
                className={`text-[11px] font-medium px-3.5 py-2 rounded-xl border inline-flex items-center gap-1.5 animate-in fade-in ${
                  syncInfo.syncStatus === 'offline' || syncInfo.syncStatus === 'error'
                    ? 'text-amber-800 bg-amber-50 border-amber-200'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                }`}
              >
                <CheckCircle2
                  size={13}
                  className={
                    syncInfo.syncStatus === 'offline' || syncInfo.syncStatus === 'error'
                      ? 'text-amber-600 shrink-0'
                      : 'text-emerald-600 shrink-0'
                  }
                />
                {syncInfo.message}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {/* Cards de Resumo Operacional para Tomada de Decisão na ETA */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Card 1: Situação Atual de Algas */}
        <PaperCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Situação Atual no Reservatório</span>
            <Activity size={16} className="text-navy" />
          </div>
          <div className="my-3">
            <p
              className="font-display text-2xl font-extrabold leading-tight"
              style={{ color: classifyNdciPatamar(stats.lastValue).color }}
            >
              {classifyNdciPatamar(stats.lastValue).label}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Último índice medido: <strong>{stats.lastValue >= 0 ? `+${stats.lastValue.toFixed(4)}` : stats.lastValue.toFixed(4)} NDCI</strong>
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
            Última leitura sem nuvens em {formatDateBR(stats.lastDate)}
          </div>
        </PaperCard>

        {/* Card 2: Risco no Horizonte Próximo */}
        <PaperCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Alerta no Horizonte (+{forecastHorizon} Dias)
            </span>
            <AlertTriangle size={16} className="text-tang" />
          </div>
          <div className="my-3">
            <p
              className="font-display text-2xl font-extrabold leading-tight"
              style={{
                color:
                  forecastSummary && typeof forecastSummary.maxPredictedNdci === 'number'
                    ? classifyNdciPatamar(forecastSummary.maxPredictedNdci).color
                    : forecastSummary?.alertColor || '#1E293B'
              }}
            >
              {forecastSummary
                ? typeof forecastSummary.maxPredictedNdci === 'number'
                  ? classifyNdciPatamar(forecastSummary.maxPredictedNdci).label
                  : forecastSummary.alertLabel
                : 'Calculando previsão...'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Pico previsto no período:{' '}
              <strong>
                {forecastSummary && typeof forecastSummary.maxPredictedNdci === 'number'
                  ? `${forecastSummary.maxPredictedNdci >= 0 ? '+' : ''}${forecastSummary.maxPredictedNdci.toFixed(4)} NDCI`
                  : '—'}
              </strong>
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
            Atenção: +0.04 · Alerta: +0.12 · Crítico: ≥ +0.30
          </div>
        </PaperCard>

        {/* Card 3: Histórico de Leituras */}
        <PaperCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Histórico do Período</span>
            <Calendar size={16} className="text-teal" />
          </div>
          <div className="my-3">
            <p className="font-display text-2xl font-extrabold text-slate-800">
              {stats.total} leituras
            </p>
            <p className="text-xs text-slate-500 mt-1">
              De {formatDateBR(stats.firstDate)} a {formatDateBR(stats.lastDate)}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
            Média no período: {stats.mean >= 0 ? `+${stats.mean.toFixed(4)}` : stats.mean.toFixed(4)} NDCI
          </div>
        </PaperCard>
      </div>

      {/* Gráfico Principal com Recorte e Zoom de Resolução Temporal */}
      <PaperCard className="p-6 md:p-8">
        {/* Header do Card + Controles de Recorte (Zoom / Crop) */}
        <div className="flex flex-col gap-5 pb-6 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-display text-xl font-extrabold text-slate-800">
                  Evolução e Previsão de Algas no Reservatório
                </h3>
                {isZoomed && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold animate-in fade-in">
                    <ZoomIn size={12} className="text-sky-600" /> Recorte Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Exibindo <strong>{stats.total} medições</strong> de {formatDateBR(stats.firstDate)} a {formatDateBR(stats.lastDate)}
              </p>
            </div>

            {/* Legenda Informativa e Simples */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#94A3B8] border border-white shadow-xs" />
                Medição do Satélite
              </span>
              <span className="flex items-center gap-2 text-slate-700">
                <span className="w-5 h-3 rounded bg-sky-400/25 border border-sky-400/50" />
                Faixa de Variação
              </span>
              <span className="flex items-center gap-2 text-slate-700">
                <span className="w-6 h-0 border-t-[2.5px] border-[#EE7A3B]" />
                Tendência Sazonal
              </span>
              {showProphet && (
                <span className="flex items-center gap-2 text-rose-700">
                  <span className="w-5 h-3 rounded bg-rose-500/20 border border-rose-500/50" />
                  <span className="w-4 h-0 border-t-2 border-dashed border-[#E11D48]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] border border-white" />
                  Previsão e Faixa de Incerteza
                </span>
              )}
              <span className="flex items-center gap-2 text-red-600">
                <span className="w-5 h-0 border-t-2 border-dashed border-red-600" />
                Limiar Crítico (+0.30)
              </span>
              <span className="flex items-center gap-2 text-slate-500">
                <span className="w-5 h-0 border-t-2 border-dashed border-slate-400" />
                Linha Base
              </span>
            </div>
          </div>

          {/* Barra de Ações: Presets de Recorte Rápido e Ajuste Personalizado */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                <SlidersHorizontal size={12} /> Período:
              </span>
              
              <button
                type="button"
                onClick={() => applyPreset('last12m')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                  activePreset === 'last12m'
                    ? 'bg-[#1F3A6D] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Últimos 12 Meses
              </button>

              <button
                type="button"
                onClick={() => applyPreset('2026')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                  activePreset === '2026'
                    ? 'bg-[#1F3A6D] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ano Atual
              </button>

              <button
                type="button"
                onClick={() => applyPreset('2024-2026')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                  activePreset === '2024-2026'
                    ? 'bg-[#1F3A6D] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                2024–{defaultWindow.endYear}
              </button>

              <button
                type="button"
                onClick={() => applyPreset('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                  activePreset === 'all'
                    ? 'bg-[#1F3A6D] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Histórico Completo
              </button>
            </div>

            <div className="flex items-center gap-2">
              {isZoomed && (
                <button
                  type="button"
                  onClick={resetZoom}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  title="Restaurar visualização padrão dos últimos 12 meses"
                >
                  <RotateCcw size={13} />
                  Restaurar Visualização
                </button>
              )}
              <span className="text-[11px] text-slate-400 italic hidden sm:inline">
                Arraste no gráfico para ampliar um período
              </span>
            </div>
          </div>

          {/* Barra de Previsão Operacional */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs bg-rose-50/50 p-3 rounded-2xl border border-rose-100 animate-in fade-in">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showProphet}
                  onChange={(e) => setShowProphet(e.target.checked)}
                  className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <span className="flex items-center gap-1.5 text-rose-900 font-extrabold">
                  <Sparkles size={14} className="text-rose-600" /> Exibir Previsão de Floração
                </span>
              </label>

              {showProphet && (
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-rose-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 px-2 uppercase tracking-wider">
                    Horizonte:
                  </span>
                  {[
                    { h: 7, label: '+7 dias' },
                    { h: 15, label: '+15 dias' },
                    { h: 30, label: '+30 dias' },
                    { h: 45, label: '+45 dias' }
                  ].map(({ h, label }) => (
                    <button
                      key={`horizon-btn-${h}`}
                      type="button"
                      onClick={() => setForecastHorizon(h)}
                      disabled={forecastLoading}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        forecastHorizon === h
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-rose-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {showProphet && forecastSummary?.hasGap && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-[11px] font-semibold text-rose-800 shadow-2xs">
                  <CloudSun size={13} className="text-amber-500 shrink-0" />
                  Última imagem sem nuvens: <strong>{formatDateBR(forecastSummary.latestObservedDate)}</strong>
                </span>
              )}
            </div>

            {showProphet && forecastSummary && (
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-white shadow-xs"
                  style={{
                    backgroundColor:
                      typeof forecastSummary.maxPredictedNdci === 'number'
                        ? classifyNdciPatamar(forecastSummary.maxPredictedNdci).color
                        : forecastSummary.alertColor
                  }}
                >
                  <AlertTriangle size={13} />
                  {typeof forecastSummary.maxPredictedNdci === 'number'
                    ? classifyNdciPatamar(forecastSummary.maxPredictedNdci).label
                    : forecastSummary.alertLabel}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Container do Gráfico SVG */}
        <div className="relative mt-6 w-full select-none">
          <div className="relative w-full">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible font-sans"
              role="img"
              aria-label="Série Histórica do NDCI no Reservatório (2019-2026)"
            >
              {/* Fundo do Grid */}
              <rect
                x={padding.left}
                y={padding.top}
                width={chartWidth}
                height={chartHeight}
                fill="#FAFCFF"
                rx="8"
              />

              {/* Linhas Verticais de Grade Adaptativas */}
              {xGridTicks.map((tick) => (
                <g key={`grid-x-${tick.dateStr}`}>
                  <line
                    x1={tick.x}
                    y1={padding.top}
                    x2={tick.x}
                    y2={padding.top + chartHeight}
                    stroke="#E2E8F0"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    opacity="0.85"
                  />
                </g>
              ))}

              {/* Linhas Horizontais de Grade e Valores do Eixo Y */}
              {yTicks.map((val) => {
                const yPos = getY(val);
                const isZero = val === 0.0;
                return (
                  <g key={`grid-y-${val}`}>
                    <line
                      x1={padding.left}
                      y1={yPos}
                      x2={padding.left + chartWidth}
                      y2={yPos}
                      stroke={isZero ? '#64748B' : '#E2E8F0'}
                      strokeWidth={isZero ? 1.5 : 1}
                      strokeDasharray={isZero ? '5,4' : undefined}
                      opacity={isZero ? 0.75 : 0.7}
                    />
                    {/* Rótulo do Eixo Y */}
                    <text
                      x={padding.left - 12}
                      y={yPos + 4}
                      textAnchor="end"
                      fontSize="11"
                      fontWeight={isZero ? '700' : '500'}
                      fill={isZero ? '#1F3A6D' : '#64748B'}
                    >
                      {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Rótulo do Eixo Vertical NDCI */}
              <text
                x={padding.left - 12}
                y={padding.top - 14}
                textAnchor="end"
                fontSize="11"
                fontWeight="800"
                fill="#1F3A6D"
                className="uppercase tracking-wider"
              >
                NDCI
              </text>

              {/* Linha Horizontal de Limiar Crítico (+0.30 NDCI) */}
              <g pointerEvents="none">
                <line
                  x1={padding.left}
                  y1={getY(0.30)}
                  x2={padding.left + chartWidth}
                  y2={getY(0.30)}
                  stroke="#DC2626"
                  strokeWidth="1.8"
                  strokeDasharray="6,4"
                  opacity="0.85"
                />
                <text
                  x={padding.left + chartWidth - 8}
                  y={getY(0.30) - 6}
                  textAnchor="end"
                  fontSize="10"
                  fontWeight="700"
                  fill="#DC2626"
                >
                  Limiar Crítico (+0.30)
                </text>
              </g>

              {/* Rótulos de Tempo no Eixo Horizontal (X) */}
              {xGridTicks.map((tick) => (
                <text
                  key={`label-tick-${tick.dateStr}`}
                  x={tick.x}
                  y={svgHeight - padding.bottom + 22}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#334155"
                >
                  {tick.label}
                </text>
              ))}

              {/* Rótulo do Eixo Horizontal: Data / Período */}
              <text
                x={padding.left + chartWidth / 2}
                y={svgHeight - 12}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#475569"
                className="uppercase tracking-wider"
              >
                {isZoomed ? 'Período Recortado' : 'Ano'}
              </text>

              {/* Borda delimitadora da área do gráfico */}
              <rect
                x={padding.left}
                y={padding.top}
                width={chartWidth}
                height={chartHeight}
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="1.2"
                rx="4"
              />

              {/* Defs para Gradientes Suaves do Gráfico */}
              <defs>
                <linearGradient id="stdBandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.32" />
                  <stop offset="50%" stopColor="#0284C7" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.32" />
                </linearGradient>

                {/* Gradiente da Faixa de Incerteza do Meta Prophet (Vermelho Claro / Translúcido) */}
                <linearGradient id="prophetBandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E11D48" stopOpacity="0.25" />
                  <stop offset="50%" stopColor="#FB7185" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#E11D48" stopOpacity="0.25" />
                </linearGradient>
              </defs>

              {/* SOMBRA AZUL CLARO: FAIXA DE DESVIO PADRÃO OBSERVADA (±1σ) */}
              {stdBandPath && (
                <path
                  d={stdBandPath}
                  fill="url(#stdBandGradient)"
                  stroke="none"
                  className="transition-opacity duration-300"
                />
              )}

              {/* SOMBRA VERMELHO CLARO: FAIXA DE INCERTEZA DO PROPHET (Nowcasting + Projeção Futura) */}
              {showProphet && forecastBandPath && (
                <path
                  d={forecastBandPath}
                  fill="url(#prophetBandGradient)"
                  stroke="none"
                  className="transition-opacity duration-300"
                />
              )}

              {/* PONTOS OBSERVADOS DO SENTINEL-2 (Tonalidade Acinzentada Clara para reduzir poluição visual) */}
              {mappedPoints.map((pt, idx) => (
                <circle
                  key={`pt-${pt.date}-${idx}`}
                  cx={pt.x}
                  cy={pt.yCoord}
                  r={isZoomed ? "3.6" : "2.8"}
                  fill="#94A3B8"
                  fillOpacity="0.65"
                  stroke="#FFFFFF"
                  strokeWidth={isZoomed ? "0.8" : "0.5"}
                />
              ))}

              {/* LINHA DE TENDÊNCIA SAZONAL (Protagonismo Visual: Linha Alaranjada Renderizada Sobre os Pontos) */}
              {trendPath && (
                <path
                  d={trendPath}
                  fill="none"
                  stroke="#EE7A3B"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="1"
                  className="drop-shadow-xs"
                />
              )}

              {/* LINHA DE PREVISÃO DO PROPHET (Vermelha Pontilhada) */}
              {showProphet && forecastTrendPath && (
                <path
                  d={forecastTrendPath}
                  fill="none"
                  stroke="#E11D48"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.95"
                />
              )}

              {/* PONTOS DE PREVISÃO DO PROPHET (Círculos Vermelhos em Destaque) */}
              {showProphet && mappedForecastPoints.map((pt, idx) => {
                if (pt.isAnchor) return null; // Âncora já é coberta pela medição real
                return (
                  <g key={`forecast-circle-${pt.date}-${idx}`}>
                    {pt.isToday && (
                      <circle
                        cx={pt.x}
                        cy={pt.yCoord}
                        r="6.5"
                        fill="none"
                        stroke="#E11D48"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                        className="animate-pulse"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.yCoord}
                      r={isZoomed ? "3.8" : "3.2"}
                      fill="#E11D48"
                      stroke="#FFFFFF"
                      strokeWidth={isZoomed ? "1" : "0.7"}
                    />
                  </g>
                );
              })}

              {/* Destaque do Ponto no Hover (Ponto Observado Real) */}
              {hoveredPoint && hoverCoord && !isDragging && (
                <g pointerEvents="none">
                  {/* Linha guia vertical */}
                  <line
                    x1={hoverCoord.x}
                    y1={padding.top}
                    x2={hoverCoord.x}
                    y2={padding.top + chartHeight}
                    stroke="#94A3B8"
                    strokeWidth="1.2"
                    strokeDasharray="3,3"
                    opacity="0.8"
                  />
                  {/* Halo do ponto */}
                  <circle
                    cx={hoverCoord.x}
                    cy={hoverCoord.y}
                    r="12"
                    fill="#64748B"
                    fillOpacity="0.2"
                  />
                  {/* Ponto realçado */}
                  <circle
                    cx={hoverCoord.x}
                    cy={hoverCoord.y}
                    r="5.5"
                    fill="#475569"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                </g>
              )}

              {/* Destaque do Ponto no Hover (Ponto Previsto pelo Prophet) */}
              {hoveredForecastPoint && hoverCoord && !isDragging && (
                <g pointerEvents="none">
                  <line
                    x1={hoverCoord.x}
                    y1={padding.top}
                    x2={hoverCoord.x}
                    y2={padding.top + chartHeight}
                    stroke="#E11D48"
                    strokeWidth="1.2"
                    strokeDasharray="3,3"
                    opacity="0.85"
                  />
                  <circle
                    cx={hoverCoord.x}
                    cy={hoverCoord.y}
                    r="13"
                    fill="#E11D48"
                    fillOpacity="0.22"
                  />
                  <circle
                    cx={hoverCoord.x}
                    cy={hoverCoord.y}
                    r="5.5"
                    fill="#BE123C"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                </g>
              )}

              {/* Retângulo visual de seleção durante o arraste (Box Zoom) */}
              {isDragging && dragStartX !== null && dragCurrentX !== null && (
                <rect
                  x={Math.min(dragStartX, dragCurrentX)}
                  y={padding.top}
                  width={Math.abs(dragCurrentX - dragStartX)}
                  height={chartHeight}
                  fill="#0284C7"
                  fillOpacity="0.22"
                  stroke="#0284C7"
                  strokeWidth="1.5"
                  strokeDasharray="4,3"
                  pointerEvents="none"
                />
              )}

              {/* Camada Transparente de Captura de Mouse */}
              <rect
                x={padding.left}
                y={padding.top}
                width={chartWidth}
                height={chartHeight}
                fill="#000000"
                fillOpacity="0"
                style={{ pointerEvents: 'all' }}
                className="cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              />
            </svg>

            {/* Tooltip Informativo e Flutuante: Ponto Observado do Satélite */}
            {hoveredPoint && hoverCoord && (
              <div
                className="absolute z-30 pointer-events-none rounded-xl bg-slate-900/95 text-white p-3.5 shadow-2xl backdrop-blur-md border border-slate-700/80 text-xs min-w-[210px]"
                style={{
                  left: `${Math.min(Math.max(14, (hoverCoord.x / svgWidth) * 100), 86)}%`,
                  top: '16px',
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <div>
                    <span className="font-bold text-slate-100 text-sm">
                      {formatDateBR(hoveredPoint.date)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Medição do satélite
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {hoveredPoint.year}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#94A3B8] border border-white/50" />
                      NDCI Medido:
                    </span>
                    <strong className="text-sky-300 text-sm font-mono">
                      {hoveredPoint.ndci >= 0 ? `+${hoveredPoint.ndci.toFixed(4)}` : hoveredPoint.ndci.toFixed(4)}
                    </strong>
                  </div>

                  {trendMap.has(hoveredPoint.date) && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="w-2.5 h-0.5 bg-[#EE7A3B]" />
                          Tendência Sazonal:
                        </span>
                        <strong className="text-amber-400 text-xs font-mono">
                          {(trendMap.get(hoveredPoint.date)?.trend ?? 0) >= 0
                            ? `+${(trendMap.get(hoveredPoint.date)?.trend ?? 0).toFixed(4)}`
                            : (trendMap.get(hoveredPoint.date)?.trend ?? 0).toFixed(4)}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-xs bg-sky-400/30 border border-sky-400/60" />
                          Faixa de Variação:
                        </span>
                        <span className="text-sky-300 font-mono text-[10px]">
                          [{(trendMap.get(hoveredPoint.date)?.lower ?? 0) >= 0 ? `+${(trendMap.get(hoveredPoint.date)?.lower ?? 0).toFixed(4)}` : (trendMap.get(hoveredPoint.date)?.lower ?? 0).toFixed(4)}, {(trendMap.get(hoveredPoint.date)?.upper ?? 0) >= 0 ? `+${(trendMap.get(hoveredPoint.date)?.upper ?? 0).toFixed(4)}` : (trendMap.get(hoveredPoint.date)?.upper ?? 0).toFixed(4)}]
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Tooltip Informativo e Flutuante: Ponto de Previsão */}
            {hoveredForecastPoint && hoverCoord && (
              <div
                className="absolute z-30 pointer-events-none rounded-xl bg-slate-900/95 text-white p-4 shadow-2xl backdrop-blur-md border border-rose-500/60 text-xs min-w-[250px] animate-in fade-in"
                style={{
                  left: `${Math.min(Math.max(14, (hoverCoord.x / svgWidth) * 100), 86)}%`,
                  top: '16px',
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="border-b border-slate-800 pb-2 mb-2.5">
                  <span className="font-bold text-slate-100 text-sm block">
                    {formatDateBR(hoveredForecastPoint.date)}
                  </span>
                  <span className="text-[11px] text-rose-300 block font-semibold mt-0.5">
                    {hoveredForecastPoint.statusLabel}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] border border-white" />
                      NDCI Estimado:
                    </span>
                    <strong className="text-rose-300 text-sm font-mono font-bold">
                      {hoveredForecastPoint.yhat >= 0 ? `+${hoveredForecastPoint.yhat.toFixed(4)}` : hoveredForecastPoint.yhat.toFixed(4)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2.5 h-2 rounded bg-rose-500/30 border border-rose-500/60" />
                      Faixa de Incerteza:
                    </span>
                    <span className="text-rose-200 font-mono text-[10px]">
                      [{hoveredForecastPoint.yhat_lower >= 0 ? `+${hoveredForecastPoint.yhat_lower.toFixed(4)}` : hoveredForecastPoint.yhat_lower.toFixed(4)}, {hoveredForecastPoint.yhat_upper >= 0 ? `+${hoveredForecastPoint.yhat_upper.toFixed(4)}` : hoveredForecastPoint.yhat_upper.toFixed(4)}]
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                      <span className="text-slate-400 block font-medium">Erro Médio:</span>
                      <span className="text-amber-300 font-mono font-extrabold text-xs">±{hoveredForecastPoint.mae.toFixed(4)}</span>
                    </div>
                    <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                      <span className="text-slate-400 block font-medium">Incerteza:</span>
                      <span className="text-sky-300 font-mono font-extrabold text-xs">±{hoveredForecastPoint.rmse.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé Informativo do Gráfico */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-tang shrink-0" />
            <span>
              Monitoramento de clorofila e presença de algas na água bruta a partir de imagens de satélite sem cobertura de nuvens.
            </span>
          </div>
          <div className="font-medium text-slate-600">
            Período Monitorado: <span className="font-bold text-[#1F3A6D]">2019 – {defaultWindow.endYear}</span>
          </div>
        </div>
      </PaperCard>

      {/* Seção Operacional: Plano de Ação ETA e Disparo de Alertas */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recomendação Operacional */}
        <PaperCard className="lg:col-span-3 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <SectionKicker color="green">Operação &amp; Tratamento de Água</SectionKicker>
            <h3 className="font-display text-2xl font-extrabold text-slate-800 mt-1">
              Plano de Ação Preventivo da ETA
            </h3>
            <p className="mt-3 text-slate-600 text-sm leading-relaxed">
              {forecastSummary?.recommendation ? (
                forecastSummary.recommendation
              ) : (
                <>
                  A classificação de risco para o horizonte selecionado (+{forecastHorizon} dias) acompanha cinco patamares operacionais de concentração de algas no reservatório, orientando desde o monitoramento de rotina até ações preventivas imediatas na captação e tratamento da ETA.
                </>
              )}
            </p>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
              {[
                { key: 'critical', title: 'Crítico', range: '≥ +0.30', color: '#EF4444', desc: 'Floração intensa / Ação na ETA' },
                { key: 'alert', title: 'Alerta', range: '+0.12 a +0.30', color: '#EE7A3B', desc: 'Reforçar coletas e dosagens' },
                { key: 'attention', title: 'Atenção', range: '+0.04 a +0.12', color: '#D97706', desc: 'Acompanhamento preventivo' },
                { key: 'moderate', title: 'Moderado', range: '-0.05 a +0.04', color: '#0D9488', desc: 'Faixa normal de operação' },
                { key: 'low', title: 'Baixo', range: '< -0.05', color: '#5C9234', desc: 'Baixa presença de algas' }
              ].map((tier) => {
                const activeLevel =
                  forecastSummary && typeof forecastSummary.maxPredictedNdci === 'number'
                    ? classifyNdciPatamar(forecastSummary.maxPredictedNdci).level
                    : forecastSummary?.alertLevel;
                const isActive = activeLevel === tier.key;
                return (
                  <div
                    key={tier.key}
                    className={`p-3 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-white shadow-sm ring-2'
                        : 'bg-slate-50 border-slate-200 opacity-85'
                    }`}
                    style={isActive ? { borderColor: tier.color, boxShadow: `0 0 0 1px ${tier.color}` } : undefined}
                  >
                    <span className="flex items-center gap-1.5 font-bold text-slate-800">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                      {tier.title}
                    </span>
                    <strong className="font-mono text-xs text-slate-700 mt-1 block">{tier.range}</strong>
                    <span className="text-[10px] text-slate-500 mt-0.5 block leading-snug">{tier.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-leaf shrink-0" /> Indicador por satélite para triagem operacional — requer confirmação laboratorial de Clorofila-a e contagem de cianobactérias conforme CONAMA 357/2005 e Portaria GM/MS 888/2021
            </span>
          </div>
        </PaperCard>

        {/* Notificação a Gestores */}
        <PaperCard className="lg:col-span-2 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <SectionKicker color="orange">Automação de Alertas</SectionKicker>
            <h3 className="font-display text-2xl font-extrabold text-slate-800 mt-1">
              Notificação a Gestores
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Simule o envio imediato do relatório de monitoramento histórico para o e-mail do corpo técnico da concessionária.
            </p>

            <form onSubmit={handleSendAlert} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  E-mail do Gestor / Operador
                </label>
                <input
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:border-navy transition-colors"
                  placeholder="gestor@concessionaria.com.br"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1F3A6D] text-white text-xs font-bold shadow-sm hover:opacity-90 transition-all active:scale-98"
              >
                <Send size={14} /> Disparar Alerta de Demonstração
              </button>
            </form>

            {alertSent && (
              <div className="mt-3 p-3 rounded-xl bg-leaf-soft text-leaf text-xs font-bold border border-leaf/30 flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 size={16} className="shrink-0" />
                Simulação concluída: alerta demonstrativo registrado para {targetEmail}!
              </div>
            )}
          </div>

          <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Pronto para integração direta via <span className="font-semibold text-slate-600">Resend API</span>.
          </p>
        </PaperCard>
      </div>
    </div>
  );
};

export default ForecastView;
