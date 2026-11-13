

export interface WaterMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'optimal' | 'warning' | 'critical';
  trend: number; // percentage change
  stats?: { mean: number; stdDev: number; min: number; max: number; }; // statistical data
}

export interface SensorNode {
  id: string;
  label: string;
  type: 'reservoir' | 'river';
  lat: number; // Percentage for mock map x
  lng: number; // Percentage for mock map y
  status: 'active' | 'inactive' | 'maintenance' | 'warning';
  battery: number;
  lastUpdate: string;
}

export interface ChartDataPoint {
  time: string;
  ph: number | null;
  turbidity: number | null;
  oxygen: number | null;
  precipitation?: number | null;
}

export interface AIReport {
  id: string;
  date: string;
  title: string;
  summary: string;
  severity: 'low' | 'medium' | 'high';
  tags: string[];
}

export interface WaterQualityRecord {
  id: number;
  data_coleta_txt: string;
  data_registro: string;
  ph: number | null;
  oxigenio_dissolvido: number | null;
  condutividade: number | null;
  turbidez: number | null;
  temperatura: number | null;
  precipitacao: number | null;
}
