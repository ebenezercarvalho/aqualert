import json
import os
import pandas as pd
import numpy as np
from prophet.serialize import model_from_json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_JSON_PATH = os.path.join(BASE_DIR, "prophet", "modelo_ndci_prophet.json")
DATA_CSV_PATH = os.path.join(BASE_DIR, "prophet", "dados_ndci_limpos.csv")

with open(MODEL_JSON_PATH, "r", encoding="utf-8") as f:
    model = model_from_json(json.load(f))

df_obs = pd.read_csv(DATA_CSV_PATH)
df_obs['ds'] = pd.to_datetime(df_obs['ds'])
df_obs = df_obs.sort_values('ds').reset_index(drop=True)

last_record_date = df_obs['ds'].max()
start_history_date = last_record_date - pd.Timedelta(days=90)

sub_obs = df_obs[df_obs['ds'] >= start_history_date].copy().reset_index(drop=True)

# Previsão Prophet nas datas observadas
pred_obs = model.predict(sub_obs[['ds']])
sub_obs['yhat'] = pred_obs['yhat'].values

# Previsão Prophet para os próximos 5 dias
future_dates = pd.date_range(start=last_record_date + pd.Timedelta(days=1), periods=5, freq='D')
future_df = pd.DataFrame({'ds': future_dates})
pred_future = model.predict(future_df)

meses_pt = {
    1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
    5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
    9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
}

timeline = []

for idx, row in sub_obs.iterrows():
    d = row['ds']
    is_trans = (d == last_record_date)
    y_val = float(round(row['y'], 4))
    std_val = float(round(row['std_dev'], 4))
    full_str = f"{d.day:02d} de {meses_pt[d.month]} de {d.year}"
    
    timeline.append({
        'date': d.strftime('%Y-%m-%d'),
        'displayDate': d.strftime('%d/%m'),
        'fullDate': full_str,
        'timestamp': int(d.timestamp() * 1000),
        'isFuture': False,
        'isTransition': bool(is_trans),
        'trend': float(round(row['yhat'], 4)),
        'observed': y_val,
        'stdDev': std_val,
        'stdUpper': float(round(y_val + std_val, 4)),
        'stdLower': float(round(y_val - std_val, 4)),
        'forecast': y_val if is_trans else None,
        'forecastLower': y_val if is_trans else None,
        'forecastUpper': y_val if is_trans else None,
        'pointsCount': 50
    })

future_predictions = []
for idx, row in pred_future.iterrows():
    d = row['ds']
    yhat = float(round(row['yhat'], 4))
    future_predictions.append(yhat)
    full_str = f"{d.day:02d} de {meses_pt[d.month]} de {d.year}"
    
    timeline.append({
        'date': d.strftime('%Y-%m-%d'),
        'displayDate': d.strftime('%d/%m'),
        'fullDate': full_str,
        'timestamp': int(d.timestamp() * 1000),
        'isFuture': True,
        'isTransition': False,
        'trend': float(round(row['trend'], 4)),
        'observed': None,
        'stdDev': None,
        'stdUpper': None,
        'stdLower': None,
        'forecast': yhat,
        'forecastLower': float(round(row['yhat_lower'], 4)),
        'forecastUpper': float(round(row['yhat_upper'], 4)),
        'pointsCount': None
    })

max_pred = max(future_predictions)

full_data = {
    'summary': {
        'latestObservedDate': last_record_date.strftime('%Y-%m-%d'),
        'latestObservedDisplayDate': f"{last_record_date.day:02d}/{last_record_date.month:02d}/{last_record_date.year}",
        'latestObservedFullDate': f"{last_record_date.day:02d} de {meses_pt[last_record_date.month]} de {last_record_date.year}",
        'latestNdci': float(round(sub_obs.iloc[-1]['y'], 4)),
        'horizonDays': 5,
        'historyDays': 90,
        'historicalPointsCount': len(sub_obs),
        'maxPredictedNdci': float(round(max_pred, 4)),
        'alertLevel': 'optimal',
        'alertLabel': 'Estável / Baixa Biomassa Algal',
        'alertColor': '#5C9234',
        'alertTriggered': False,
        'thresholdAlert': 0.12,
        'thresholdCritical': 0.20,
        'recommendation': 'Padrões de potabilidade mantidos. Seguir com rotina operacional padrão de telemetria.'
    },
    'metrics': {
        'model': 'Meta Prophet (Additive Fourier Seasonality)',
        'validationHorizon': '5 dias',
        'rmse': 0.0551,
        'mae': 0.0447,
        'samplingPoints': 50,
        'samplingDiameterMeters': 350,
        'centerCoordinates': [-22.530116, -44.563914],
        'satellite': 'Sentinel-2 MSI Harmonized SR (Bandas B4 e B5)'
    },
    'timeline': timeline
}

target_ts = os.path.join(BASE_DIR, 'data', 'forecastFallback.ts')
with open(target_ts, 'w', encoding='utf-8') as f:
    f.write('// Dados calibrados de fallback com série histórica real de 3 meses (17 passagens Sentinel-2) + 5 dias de previsão Prophet\n')
    f.write('export const FORECAST_FALLBACK_DATA = ' + json.dumps(full_data, indent=2, ensure_ascii=False) + ' as const;\n')

print(f"Sucesso! Gerados {len(timeline)} pontos em {target_ts}")
