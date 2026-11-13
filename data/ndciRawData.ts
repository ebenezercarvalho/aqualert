// Serie temporal bruta do NDCI extraida do Sentinel-2 (Grade nativa 20m UTM 23S - max 270 pixels)
// Total de registros: 519 (2019-01-02 a 2026-10-04)

export interface NdciPoint {
  date: string;
  year: number;
  ndci: number;
  stdDev?: number | null;
  pointsCount?: number;
}

export const NDCI_RAW_DATA: NdciPoint[] = [
  {
    "date": "2019-01-02",
    "year": 2019,
    "ndci": -0.00448,
    "stdDev": 0.01798,
    "pointsCount": 270
  },
  {
    "date": "2019-01-09",
    "year": 2019,
    "ndci": 0.14938,
    "stdDev": 0.01519,
    "pointsCount": 270
  },
  {
    "date": "2019-01-12",
    "year": 2019,
    "ndci": 0.06446,
    "stdDev": 0.00835,
    "pointsCount": 120
  },
  {
    "date": "2019-01-14",
    "year": 2019,
    "ndci": 0.12735,
    "stdDev": 0.02065,
    "pointsCount": 270
  },
  {
    "date": "2019-01-17",
    "year": 2019,
    "ndci": 0.20828,
    "stdDev": 0.02661,
    "pointsCount": 270
  },
  {
    "date": "2019-01-22",
    "year": 2019,
    "ndci": 0.10959,
    "stdDev": 0.01877,
    "pointsCount": 264
  },
  {
    "date": "2019-01-27",
    "year": 2019,
    "ndci": 0.03167,
    "stdDev": 0.03075,
    "pointsCount": 132
  },
  {
    "date": "2019-01-29",
    "year": 2019,
    "ndci": 0.11987,
    "stdDev": 0.02114,
    "pointsCount": 270
  },
  {
    "date": "2019-02-01",
    "year": 2019,
    "ndci": 0.213,
    "stdDev": 0.01796,
    "pointsCount": 270
  },
  {
    "date": "2019-02-08",
    "year": 2019,
    "ndci": -0.13816,
    "stdDev": 0.00969,
    "pointsCount": 270
  },
  {
    "date": "2019-02-26",
    "year": 2019,
    "ndci": 0.00561,
    "stdDev": 0.02765,
    "pointsCount": 270
  },
  {
    "date": "2019-03-05",
    "year": 2019,
    "ndci": -0.13562,
    "stdDev": 0.01555,
    "pointsCount": 270
  },
  {
    "date": "2019-03-08",
    "year": 2019,
    "ndci": -0.03799,
    "stdDev": 0.05195,
    "pointsCount": 270
  },
  {
    "date": "2019-03-10",
    "year": 2019,
    "ndci": -0.034,
    "stdDev": 0.01283,
    "pointsCount": 269
  },
  {
    "date": "2019-03-15",
    "year": 2019,
    "ndci": 0.06084,
    "stdDev": 0.03468,
    "pointsCount": 213
  },
  {
    "date": "2019-03-23",
    "year": 2019,
    "ndci": -0.13548,
    "stdDev": 0.01619,
    "pointsCount": 117
  },
  {
    "date": "2019-03-25",
    "year": 2019,
    "ndci": -0.1002,
    "stdDev": 0.01602,
    "pointsCount": 270
  },
  {
    "date": "2019-03-30",
    "year": 2019,
    "ndci": -0.12401,
    "stdDev": 0.00819,
    "pointsCount": 270
  },
  {
    "date": "2019-04-02",
    "year": 2019,
    "ndci": -0.10139,
    "stdDev": 0.0135,
    "pointsCount": 270
  },
  {
    "date": "2019-04-04",
    "year": 2019,
    "ndci": 0.03606,
    "stdDev": 0.0293,
    "pointsCount": 270
  },
  {
    "date": "2019-04-12",
    "year": 2019,
    "ndci": 0.01963,
    "stdDev": 0.03127,
    "pointsCount": 270
  },
  {
    "date": "2019-04-17",
    "year": 2019,
    "ndci": -0.02577,
    "stdDev": 0.03705,
    "pointsCount": 270
  },
  {
    "date": "2019-04-19",
    "year": 2019,
    "ndci": -0.02338,
    "stdDev": 0.02815,
    "pointsCount": 270
  },
  {
    "date": "2019-04-22",
    "year": 2019,
    "ndci": 0.08093,
    "stdDev": 0.05986,
    "pointsCount": 270
  },
  {
    "date": "2019-04-24",
    "year": 2019,
    "ndci": 0.0448,
    "stdDev": 0.02754,
    "pointsCount": 270
  },
  {
    "date": "2019-04-27",
    "year": 2019,
    "ndci": 0.0444,
    "stdDev": 0.04023,
    "pointsCount": 270
  },
  {
    "date": "2019-04-29",
    "year": 2019,
    "ndci": 0.01879,
    "stdDev": 0.04544,
    "pointsCount": 270
  },
  {
    "date": "2019-05-07",
    "year": 2019,
    "ndci": -0.0106,
    "stdDev": 0.02185,
    "pointsCount": 270
  },
  {
    "date": "2019-05-12",
    "year": 2019,
    "ndci": -0.07878,
    "stdDev": 0.02178,
    "pointsCount": 270
  },
  {
    "date": "2019-05-22",
    "year": 2019,
    "ndci": -0.12034,
    "stdDev": 0.02281,
    "pointsCount": 270
  },
  {
    "date": "2019-06-01",
    "year": 2019,
    "ndci": -0.00077,
    "stdDev": 0.03687,
    "pointsCount": 270
  },
  {
    "date": "2019-06-06",
    "year": 2019,
    "ndci": -0.1486,
    "stdDev": 0.05277,
    "pointsCount": 236
  },
  {
    "date": "2019-06-11",
    "year": 2019,
    "ndci": -0.18141,
    "stdDev": 0.04063,
    "pointsCount": 270
  },
  {
    "date": "2019-06-13",
    "year": 2019,
    "ndci": -0.10568,
    "stdDev": 0.04319,
    "pointsCount": 270
  },
  {
    "date": "2019-06-16",
    "year": 2019,
    "ndci": -0.097,
    "stdDev": 0.03877,
    "pointsCount": 270
  },
  {
    "date": "2019-06-18",
    "year": 2019,
    "ndci": -0.09127,
    "stdDev": 0.03677,
    "pointsCount": 259
  },
  {
    "date": "2019-06-23",
    "year": 2019,
    "ndci": -0.18312,
    "stdDev": 0.03539,
    "pointsCount": 270
  },
  {
    "date": "2019-06-26",
    "year": 2019,
    "ndci": -0.13067,
    "stdDev": 0.04526,
    "pointsCount": 270
  },
  {
    "date": "2019-07-08",
    "year": 2019,
    "ndci": -0.17751,
    "stdDev": 0.03776,
    "pointsCount": 270
  },
  {
    "date": "2019-07-11",
    "year": 2019,
    "ndci": -0.20024,
    "stdDev": 0.03773,
    "pointsCount": 270
  },
  {
    "date": "2019-07-13",
    "year": 2019,
    "ndci": -0.12408,
    "stdDev": 0.04271,
    "pointsCount": 270
  },
  {
    "date": "2019-07-16",
    "year": 2019,
    "ndci": -0.10297,
    "stdDev": 0.02796,
    "pointsCount": 270
  },
  {
    "date": "2019-07-18",
    "year": 2019,
    "ndci": 0.00407,
    "stdDev": 0.028,
    "pointsCount": 267
  },
  {
    "date": "2019-07-23",
    "year": 2019,
    "ndci": -0.02828,
    "stdDev": 0.03728,
    "pointsCount": 270
  },
  {
    "date": "2019-07-28",
    "year": 2019,
    "ndci": -0.02988,
    "stdDev": 0.0384,
    "pointsCount": 227
  },
  {
    "date": "2019-07-31",
    "year": 2019,
    "ndci": -0.06854,
    "stdDev": 0.05184,
    "pointsCount": 270
  },
  {
    "date": "2019-08-02",
    "year": 2019,
    "ndci": -0.06575,
    "stdDev": 0.03071,
    "pointsCount": 270
  },
  {
    "date": "2019-08-10",
    "year": 2019,
    "ndci": -0.02965,
    "stdDev": 0.03313,
    "pointsCount": 270
  },
  {
    "date": "2019-08-12",
    "year": 2019,
    "ndci": -0.04551,
    "stdDev": 0.02369,
    "pointsCount": 270
  },
  {
    "date": "2019-08-25",
    "year": 2019,
    "ndci": 0.02706,
    "stdDev": 0.03163,
    "pointsCount": 253
  },
  {
    "date": "2019-08-30",
    "year": 2019,
    "ndci": 0.02052,
    "stdDev": 0.15189,
    "pointsCount": 270
  },
  {
    "date": "2019-09-09",
    "year": 2019,
    "ndci": 0.28342,
    "stdDev": 0.06093,
    "pointsCount": 270
  },
  {
    "date": "2019-09-16",
    "year": 2019,
    "ndci": 0.09337,
    "stdDev": 0.01915,
    "pointsCount": 270
  },
  {
    "date": "2019-09-19",
    "year": 2019,
    "ndci": -0.01989,
    "stdDev": 0.03534,
    "pointsCount": 270
  },
  {
    "date": "2019-10-04",
    "year": 2019,
    "ndci": 0.01634,
    "stdDev": 0.01535,
    "pointsCount": 270
  },
  {
    "date": "2019-10-06",
    "year": 2019,
    "ndci": 0.11797,
    "stdDev": 0.01506,
    "pointsCount": 270
  },
  {
    "date": "2019-10-14",
    "year": 2019,
    "ndci": 0.43578,
    "stdDev": 0.03444,
    "pointsCount": 270
  },
  {
    "date": "2019-10-24",
    "year": 2019,
    "ndci": 0.04531,
    "stdDev": 0.01499,
    "pointsCount": 264
  },
  {
    "date": "2019-11-03",
    "year": 2019,
    "ndci": 0.07955,
    "stdDev": 0.02093,
    "pointsCount": 237
  },
  {
    "date": "2019-12-25",
    "year": 2019,
    "ndci": 0.17798,
    "stdDev": 0.04678,
    "pointsCount": 270
  },
  {
    "date": "2019-12-28",
    "year": 2019,
    "ndci": 0.00719,
    "stdDev": 0.01453,
    "pointsCount": 257
  },
  {
    "date": "2019-12-30",
    "year": 2019,
    "ndci": 0.03615,
    "stdDev": 0.017,
    "pointsCount": 270
  },
  {
    "date": "2020-01-07",
    "year": 2020,
    "ndci": 0.20454,
    "stdDev": 0.03055,
    "pointsCount": 270
  },
  {
    "date": "2020-01-27",
    "year": 2020,
    "ndci": 0.11785,
    "stdDev": 0.06839,
    "pointsCount": 270
  },
  {
    "date": "2020-02-01",
    "year": 2020,
    "ndci": 0.1637,
    "stdDev": 0.05672,
    "pointsCount": 270
  },
  {
    "date": "2020-02-08",
    "year": 2020,
    "ndci": -0.04279,
    "stdDev": 0.02117,
    "pointsCount": 270
  },
  {
    "date": "2020-03-07",
    "year": 2020,
    "ndci": -0.02952,
    "stdDev": 0.02151,
    "pointsCount": 270
  },
  {
    "date": "2020-03-09",
    "year": 2020,
    "ndci": -0.09181,
    "stdDev": 0.0108,
    "pointsCount": 270
  },
  {
    "date": "2020-03-12",
    "year": 2020,
    "ndci": -0.05559,
    "stdDev": 0.0145,
    "pointsCount": 270
  },
  {
    "date": "2020-03-24",
    "year": 2020,
    "ndci": -0.14103,
    "stdDev": 0.00961,
    "pointsCount": 270
  },
  {
    "date": "2020-03-29",
    "year": 2020,
    "ndci": 0.01256,
    "stdDev": 0.02491,
    "pointsCount": 126
  },
  {
    "date": "2020-04-01",
    "year": 2020,
    "ndci": -0.05142,
    "stdDev": 0.0309,
    "pointsCount": 260
  },
  {
    "date": "2020-04-06",
    "year": 2020,
    "ndci": -0.03821,
    "stdDev": 0.03436,
    "pointsCount": 252
  },
  {
    "date": "2020-04-21",
    "year": 2020,
    "ndci": -0.16315,
    "stdDev": 0.00898,
    "pointsCount": 270
  },
  {
    "date": "2020-04-26",
    "year": 2020,
    "ndci": -0.16453,
    "stdDev": 0.01458,
    "pointsCount": 270
  },
  {
    "date": "2020-04-28",
    "year": 2020,
    "ndci": -0.1916,
    "stdDev": 0.01442,
    "pointsCount": 270
  },
  {
    "date": "2020-05-01",
    "year": 2020,
    "ndci": -0.11523,
    "stdDev": 0.01384,
    "pointsCount": 270
  },
  {
    "date": "2020-05-11",
    "year": 2020,
    "ndci": -0.25538,
    "stdDev": 0.02431,
    "pointsCount": 270
  },
  {
    "date": "2020-05-13",
    "year": 2020,
    "ndci": -0.12934,
    "stdDev": 0.02153,
    "pointsCount": 270
  },
  {
    "date": "2020-05-21",
    "year": 2020,
    "ndci": -0.17346,
    "stdDev": 0.02492,
    "pointsCount": 270
  },
  {
    "date": "2020-05-26",
    "year": 2020,
    "ndci": -0.22725,
    "stdDev": 0.02817,
    "pointsCount": 270
  },
  {
    "date": "2020-05-28",
    "year": 2020,
    "ndci": -0.17556,
    "stdDev": 0.02357,
    "pointsCount": 270
  },
  {
    "date": "2020-05-31",
    "year": 2020,
    "ndci": -0.21527,
    "stdDev": 0.03339,
    "pointsCount": 270
  },
  {
    "date": "2020-06-02",
    "year": 2020,
    "ndci": -0.15667,
    "stdDev": 0.03676,
    "pointsCount": 270
  },
  {
    "date": "2020-06-20",
    "year": 2020,
    "ndci": -0.19609,
    "stdDev": 0.04909,
    "pointsCount": 270
  },
  {
    "date": "2020-06-22",
    "year": 2020,
    "ndci": 0.03532,
    "stdDev": 0.0328,
    "pointsCount": 270
  },
  {
    "date": "2020-07-02",
    "year": 2020,
    "ndci": 0.00802,
    "stdDev": 0.04214,
    "pointsCount": 202
  },
  {
    "date": "2020-07-07",
    "year": 2020,
    "ndci": -0.05988,
    "stdDev": 0.02573,
    "pointsCount": 270
  },
  {
    "date": "2020-07-12",
    "year": 2020,
    "ndci": -0.06324,
    "stdDev": 0.02822,
    "pointsCount": 270
  },
  {
    "date": "2020-07-17",
    "year": 2020,
    "ndci": -0.12273,
    "stdDev": 0.02674,
    "pointsCount": 270
  },
  {
    "date": "2020-07-20",
    "year": 2020,
    "ndci": -0.22258,
    "stdDev": 0.04592,
    "pointsCount": 270
  },
  {
    "date": "2020-07-22",
    "year": 2020,
    "ndci": -0.11105,
    "stdDev": 0.03603,
    "pointsCount": 270
  },
  {
    "date": "2020-07-25",
    "year": 2020,
    "ndci": -0.14562,
    "stdDev": 0.0515,
    "pointsCount": 270
  },
  {
    "date": "2020-08-04",
    "year": 2020,
    "ndci": -0.16105,
    "stdDev": 0.03374,
    "pointsCount": 269
  },
  {
    "date": "2020-08-06",
    "year": 2020,
    "ndci": -0.17511,
    "stdDev": 0.0342,
    "pointsCount": 270
  },
  {
    "date": "2020-08-09",
    "year": 2020,
    "ndci": -0.04911,
    "stdDev": 0.03101,
    "pointsCount": 270
  },
  {
    "date": "2020-08-11",
    "year": 2020,
    "ndci": -0.02613,
    "stdDev": 0.02924,
    "pointsCount": 270
  },
  {
    "date": "2020-08-14",
    "year": 2020,
    "ndci": 0.11548,
    "stdDev": 0.03574,
    "pointsCount": 270
  },
  {
    "date": "2020-08-24",
    "year": 2020,
    "ndci": 0.0067,
    "stdDev": 0.03246,
    "pointsCount": 270
  },
  {
    "date": "2020-08-26",
    "year": 2020,
    "ndci": -0.06335,
    "stdDev": 0.03307,
    "pointsCount": 270
  },
  {
    "date": "2020-08-29",
    "year": 2020,
    "ndci": -0.01456,
    "stdDev": 0.03713,
    "pointsCount": 270
  },
  {
    "date": "2020-09-03",
    "year": 2020,
    "ndci": -0.05984,
    "stdDev": 0.01913,
    "pointsCount": 270
  },
  {
    "date": "2020-09-08",
    "year": 2020,
    "ndci": 0.16264,
    "stdDev": 0.01989,
    "pointsCount": 270
  },
  {
    "date": "2020-09-13",
    "year": 2020,
    "ndci": 0.20563,
    "stdDev": 0.02714,
    "pointsCount": 270
  },
  {
    "date": "2020-09-18",
    "year": 2020,
    "ndci": 0.16863,
    "stdDev": 0.01902,
    "pointsCount": 270
  },
  {
    "date": "2020-09-25",
    "year": 2020,
    "ndci": 0.16175,
    "stdDev": 0.03816,
    "pointsCount": 270
  },
  {
    "date": "2020-09-28",
    "year": 2020,
    "ndci": 0.23557,
    "stdDev": 0.03127,
    "pointsCount": 270
  },
  {
    "date": "2020-09-30",
    "year": 2020,
    "ndci": 0.03968,
    "stdDev": 0.0199,
    "pointsCount": 270
  },
  {
    "date": "2020-10-03",
    "year": 2020,
    "ndci": 0.26581,
    "stdDev": 0.02944,
    "pointsCount": 270
  },
  {
    "date": "2020-10-05",
    "year": 2020,
    "ndci": 0.01582,
    "stdDev": 0.01604,
    "pointsCount": 270
  },
  {
    "date": "2020-10-13",
    "year": 2020,
    "ndci": 0.08045,
    "stdDev": 0.01875,
    "pointsCount": 270
  },
  {
    "date": "2020-10-23",
    "year": 2020,
    "ndci": 0.01351,
    "stdDev": 0.00671,
    "pointsCount": 270
  },
  {
    "date": "2020-10-28",
    "year": 2020,
    "ndci": 0.15249,
    "stdDev": 0.03349,
    "pointsCount": 270
  },
  {
    "date": "2020-11-04",
    "year": 2020,
    "ndci": 0.02553,
    "stdDev": 0.0294,
    "pointsCount": 261
  },
  {
    "date": "2020-11-09",
    "year": 2020,
    "ndci": 0.03223,
    "stdDev": 0.02175,
    "pointsCount": 265
  },
  {
    "date": "2020-11-17",
    "year": 2020,
    "ndci": 0.08688,
    "stdDev": 0.00991,
    "pointsCount": 270
  },
  {
    "date": "2020-11-24",
    "year": 2020,
    "ndci": -0.01525,
    "stdDev": 0.01248,
    "pointsCount": 270
  },
  {
    "date": "2020-11-27",
    "year": 2020,
    "ndci": 0.06499,
    "stdDev": 0.03492,
    "pointsCount": 222
  },
  {
    "date": "2020-11-29",
    "year": 2020,
    "ndci": 0.13878,
    "stdDev": 0.01119,
    "pointsCount": 270
  },
  {
    "date": "2020-12-04",
    "year": 2020,
    "ndci": 0.24352,
    "stdDev": 0.01529,
    "pointsCount": 270
  },
  {
    "date": "2020-12-19",
    "year": 2020,
    "ndci": -0.09478,
    "stdDev": 0.01013,
    "pointsCount": 270
  },
  {
    "date": "2021-01-03",
    "year": 2021,
    "ndci": -0.02295,
    "stdDev": 0.034,
    "pointsCount": 270
  },
  {
    "date": "2021-01-16",
    "year": 2021,
    "ndci": 0.01021,
    "stdDev": 0.01576,
    "pointsCount": 270
  },
  {
    "date": "2021-01-18",
    "year": 2021,
    "ndci": -0.02317,
    "stdDev": 0.01394,
    "pointsCount": 270
  },
  {
    "date": "2021-01-21",
    "year": 2021,
    "ndci": -0.04928,
    "stdDev": 0.01624,
    "pointsCount": 270
  },
  {
    "date": "2021-01-28",
    "year": 2021,
    "ndci": 0.10512,
    "stdDev": 0.02573,
    "pointsCount": 270
  },
  {
    "date": "2021-02-02",
    "year": 2021,
    "ndci": 0.1151,
    "stdDev": 0.02008,
    "pointsCount": 270
  },
  {
    "date": "2021-02-22",
    "year": 2021,
    "ndci": -0.0664,
    "stdDev": 0.01371,
    "pointsCount": 270
  },
  {
    "date": "2021-03-04",
    "year": 2021,
    "ndci": 0.01296,
    "stdDev": 0.02966,
    "pointsCount": 270
  },
  {
    "date": "2021-03-12",
    "year": 2021,
    "ndci": -0.09017,
    "stdDev": 0.01756,
    "pointsCount": 270
  },
  {
    "date": "2021-03-22",
    "year": 2021,
    "ndci": -0.09425,
    "stdDev": 0.01372,
    "pointsCount": 270
  },
  {
    "date": "2021-03-24",
    "year": 2021,
    "ndci": -0.04627,
    "stdDev": 0.01439,
    "pointsCount": 270
  },
  {
    "date": "2021-03-27",
    "year": 2021,
    "ndci": -0.04754,
    "stdDev": 0.03346,
    "pointsCount": 270
  },
  {
    "date": "2021-03-29",
    "year": 2021,
    "ndci": 0.00073,
    "stdDev": 0.01708,
    "pointsCount": 270
  },
  {
    "date": "2021-04-03",
    "year": 2021,
    "ndci": -0.01397,
    "stdDev": 0.02072,
    "pointsCount": 270
  },
  {
    "date": "2021-04-08",
    "year": 2021,
    "ndci": -0.07491,
    "stdDev": 0.05519,
    "pointsCount": 134
  },
  {
    "date": "2021-04-11",
    "year": 2021,
    "ndci": -0.14207,
    "stdDev": 0.01151,
    "pointsCount": 270
  },
  {
    "date": "2021-04-16",
    "year": 2021,
    "ndci": -0.16365,
    "stdDev": 0.01005,
    "pointsCount": 270
  },
  {
    "date": "2021-04-21",
    "year": 2021,
    "ndci": -0.15874,
    "stdDev": 0.02299,
    "pointsCount": 270
  },
  {
    "date": "2021-04-23",
    "year": 2021,
    "ndci": -0.20461,
    "stdDev": 0.01323,
    "pointsCount": 270
  },
  {
    "date": "2021-04-26",
    "year": 2021,
    "ndci": -0.08136,
    "stdDev": 0.02367,
    "pointsCount": 267
  },
  {
    "date": "2021-05-06",
    "year": 2021,
    "ndci": -0.07387,
    "stdDev": 0.05318,
    "pointsCount": 270
  },
  {
    "date": "2021-05-08",
    "year": 2021,
    "ndci": -0.13447,
    "stdDev": 0.03334,
    "pointsCount": 270
  },
  {
    "date": "2021-05-18",
    "year": 2021,
    "ndci": -0.12168,
    "stdDev": 0.01683,
    "pointsCount": 270
  },
  {
    "date": "2021-05-26",
    "year": 2021,
    "ndci": -0.12576,
    "stdDev": 0.01874,
    "pointsCount": 270
  },
  {
    "date": "2021-06-02",
    "year": 2021,
    "ndci": -0.13992,
    "stdDev": 0.0352,
    "pointsCount": 270
  },
  {
    "date": "2021-06-05",
    "year": 2021,
    "ndci": -0.20373,
    "stdDev": 0.02817,
    "pointsCount": 270
  },
  {
    "date": "2021-06-07",
    "year": 2021,
    "ndci": -0.06556,
    "stdDev": 0.0203,
    "pointsCount": 270
  },
  {
    "date": "2021-06-10",
    "year": 2021,
    "ndci": -0.00094,
    "stdDev": 0.04496,
    "pointsCount": 136
  },
  {
    "date": "2021-06-17",
    "year": 2021,
    "ndci": -0.11068,
    "stdDev": 0.02918,
    "pointsCount": 270
  },
  {
    "date": "2021-06-20",
    "year": 2021,
    "ndci": -0.11911,
    "stdDev": 0.03947,
    "pointsCount": 270
  },
  {
    "date": "2021-06-25",
    "year": 2021,
    "ndci": -0.13901,
    "stdDev": 0.03268,
    "pointsCount": 270
  },
  {
    "date": "2021-06-30",
    "year": 2021,
    "ndci": -0.17519,
    "stdDev": 0.02559,
    "pointsCount": 270
  },
  {
    "date": "2021-07-02",
    "year": 2021,
    "ndci": -0.14516,
    "stdDev": 0.03777,
    "pointsCount": 270
  },
  {
    "date": "2021-07-07",
    "year": 2021,
    "ndci": -0.10118,
    "stdDev": 0.09593,
    "pointsCount": 151
  },
  {
    "date": "2021-07-10",
    "year": 2021,
    "ndci": -0.11554,
    "stdDev": 0.03259,
    "pointsCount": 270
  },
  {
    "date": "2021-07-12",
    "year": 2021,
    "ndci": -0.12612,
    "stdDev": 0.04326,
    "pointsCount": 270
  },
  {
    "date": "2021-07-20",
    "year": 2021,
    "ndci": -0.13699,
    "stdDev": 0.03965,
    "pointsCount": 86
  },
  {
    "date": "2021-07-25",
    "year": 2021,
    "ndci": -0.09844,
    "stdDev": 0.08161,
    "pointsCount": 270
  },
  {
    "date": "2021-07-27",
    "year": 2021,
    "ndci": 0.03612,
    "stdDev": 0.06872,
    "pointsCount": 270
  },
  {
    "date": "2021-08-04",
    "year": 2021,
    "ndci": -0.00838,
    "stdDev": 0.03986,
    "pointsCount": 155
  },
  {
    "date": "2021-08-09",
    "year": 2021,
    "ndci": 0.19317,
    "stdDev": 0.1371,
    "pointsCount": 270
  },
  {
    "date": "2021-08-11",
    "year": 2021,
    "ndci": 0.00871,
    "stdDev": 0.08431,
    "pointsCount": 270
  },
  {
    "date": "2021-08-19",
    "year": 2021,
    "ndci": 0.21008,
    "stdDev": 0.07506,
    "pointsCount": 270
  },
  {
    "date": "2021-08-21",
    "year": 2021,
    "ndci": 0.29072,
    "stdDev": 0.02989,
    "pointsCount": 270
  },
  {
    "date": "2021-08-24",
    "year": 2021,
    "ndci": 0.41583,
    "stdDev": 0.03848,
    "pointsCount": 270
  },
  {
    "date": "2021-08-26",
    "year": 2021,
    "ndci": 0.42608,
    "stdDev": 0.05546,
    "pointsCount": 268
  },
  {
    "date": "2021-09-03",
    "year": 2021,
    "ndci": -0.09458,
    "stdDev": 0.02197,
    "pointsCount": 270
  },
  {
    "date": "2021-09-05",
    "year": 2021,
    "ndci": -0.11902,
    "stdDev": 0.01803,
    "pointsCount": 255
  },
  {
    "date": "2021-09-20",
    "year": 2021,
    "ndci": -0.10218,
    "stdDev": 0.01522,
    "pointsCount": 270
  },
  {
    "date": "2021-09-28",
    "year": 2021,
    "ndci": 0.01504,
    "stdDev": 0.02304,
    "pointsCount": 270
  },
  {
    "date": "2021-10-13",
    "year": 2021,
    "ndci": -0.00667,
    "stdDev": 0.02422,
    "pointsCount": 270
  },
  {
    "date": "2021-10-15",
    "year": 2021,
    "ndci": 0.08842,
    "stdDev": 0.01714,
    "pointsCount": 270
  },
  {
    "date": "2021-10-23",
    "year": 2021,
    "ndci": 0.02066,
    "stdDev": 0.01754,
    "pointsCount": 270
  },
  {
    "date": "2021-11-04",
    "year": 2021,
    "ndci": 0.02645,
    "stdDev": 0.02379,
    "pointsCount": 270
  },
  {
    "date": "2021-11-07",
    "year": 2021,
    "ndci": 0.03162,
    "stdDev": 0.02325,
    "pointsCount": 156
  },
  {
    "date": "2021-11-27",
    "year": 2021,
    "ndci": 0.34771,
    "stdDev": 0.01631,
    "pointsCount": 270
  },
  {
    "date": "2021-11-29",
    "year": 2021,
    "ndci": 0.22747,
    "stdDev": 0.01657,
    "pointsCount": 270
  },
  {
    "date": "2021-12-02",
    "year": 2021,
    "ndci": 0.17212,
    "stdDev": 0.03513,
    "pointsCount": 217
  },
  {
    "date": "2021-12-22",
    "year": 2021,
    "ndci": 0.06717,
    "stdDev": 0.02489,
    "pointsCount": 270
  },
  {
    "date": "2021-12-27",
    "year": 2021,
    "ndci": 0.06384,
    "stdDev": 0.01974,
    "pointsCount": 269
  },
  {
    "date": "2021-12-29",
    "year": 2021,
    "ndci": 0.22894,
    "stdDev": 0.04232,
    "pointsCount": 270
  },
  {
    "date": "2022-01-16",
    "year": 2022,
    "ndci": 0.07376,
    "stdDev": 0.02943,
    "pointsCount": 177
  },
  {
    "date": "2022-01-18",
    "year": 2022,
    "ndci": 0.15486,
    "stdDev": 0.05029,
    "pointsCount": 270
  },
  {
    "date": "2022-01-21",
    "year": 2022,
    "ndci": 0.23556,
    "stdDev": 0.06742,
    "pointsCount": 270
  },
  {
    "date": "2022-01-23",
    "year": 2022,
    "ndci": 0.05807,
    "stdDev": 0.01902,
    "pointsCount": 270
  },
  {
    "date": "2022-01-26",
    "year": 2022,
    "ndci": 0.15918,
    "stdDev": 0.02264,
    "pointsCount": 270
  },
  {
    "date": "2022-02-15",
    "year": 2022,
    "ndci": -0.00878,
    "stdDev": 0.01936,
    "pointsCount": 270
  },
  {
    "date": "2022-02-17",
    "year": 2022,
    "ndci": 0.0166,
    "stdDev": 0.02369,
    "pointsCount": 132
  },
  {
    "date": "2022-02-22",
    "year": 2022,
    "ndci": 0.18555,
    "stdDev": 0.06752,
    "pointsCount": 270
  },
  {
    "date": "2022-03-02",
    "year": 2022,
    "ndci": 0.19724,
    "stdDev": 0.04787,
    "pointsCount": 270
  },
  {
    "date": "2022-03-04",
    "year": 2022,
    "ndci": 0.35033,
    "stdDev": 0.07226,
    "pointsCount": 270
  },
  {
    "date": "2022-03-07",
    "year": 2022,
    "ndci": 0.18406,
    "stdDev": 0.04756,
    "pointsCount": 270
  },
  {
    "date": "2022-03-09",
    "year": 2022,
    "ndci": 0.20267,
    "stdDev": 0.01687,
    "pointsCount": 269
  },
  {
    "date": "2022-03-14",
    "year": 2022,
    "ndci": 0.1299,
    "stdDev": 0.04864,
    "pointsCount": 270
  },
  {
    "date": "2022-03-17",
    "year": 2022,
    "ndci": 0.27404,
    "stdDev": 0.02605,
    "pointsCount": 270
  },
  {
    "date": "2022-03-22",
    "year": 2022,
    "ndci": 0.00567,
    "stdDev": 0.01989,
    "pointsCount": 249
  },
  {
    "date": "2022-03-24",
    "year": 2022,
    "ndci": -0.04555,
    "stdDev": 0.02406,
    "pointsCount": 270
  },
  {
    "date": "2022-03-27",
    "year": 2022,
    "ndci": 0.16859,
    "stdDev": 0.02668,
    "pointsCount": 268
  },
  {
    "date": "2022-04-11",
    "year": 2022,
    "ndci": -0.03039,
    "stdDev": 0.03048,
    "pointsCount": 184
  },
  {
    "date": "2022-04-16",
    "year": 2022,
    "ndci": -0.07923,
    "stdDev": 0.01471,
    "pointsCount": 270
  },
  {
    "date": "2022-04-18",
    "year": 2022,
    "ndci": -0.12158,
    "stdDev": 0.01699,
    "pointsCount": 270
  },
  {
    "date": "2022-04-23",
    "year": 2022,
    "ndci": 0.06514,
    "stdDev": 0.06471,
    "pointsCount": 268
  },
  {
    "date": "2022-04-26",
    "year": 2022,
    "ndci": -0.10934,
    "stdDev": 0.03079,
    "pointsCount": 266
  },
  {
    "date": "2022-04-28",
    "year": 2022,
    "ndci": 0.08179,
    "stdDev": 0.09669,
    "pointsCount": 270
  },
  {
    "date": "2022-05-01",
    "year": 2022,
    "ndci": 0.00922,
    "stdDev": 0.02921,
    "pointsCount": 270
  },
  {
    "date": "2022-05-03",
    "year": 2022,
    "ndci": -0.04159,
    "stdDev": 0.02216,
    "pointsCount": 270
  },
  {
    "date": "2022-05-06",
    "year": 2022,
    "ndci": -0.08986,
    "stdDev": 0.02416,
    "pointsCount": 270
  },
  {
    "date": "2022-05-08",
    "year": 2022,
    "ndci": -0.16096,
    "stdDev": 0.01854,
    "pointsCount": 270
  },
  {
    "date": "2022-05-11",
    "year": 2022,
    "ndci": -0.02684,
    "stdDev": 0.04344,
    "pointsCount": 267
  },
  {
    "date": "2022-05-18",
    "year": 2022,
    "ndci": -0.17975,
    "stdDev": 0.02293,
    "pointsCount": 270
  },
  {
    "date": "2022-05-23",
    "year": 2022,
    "ndci": -0.17136,
    "stdDev": 0.01736,
    "pointsCount": 270
  },
  {
    "date": "2022-05-26",
    "year": 2022,
    "ndci": -0.17234,
    "stdDev": 0.02534,
    "pointsCount": 270
  },
  {
    "date": "2022-06-02",
    "year": 2022,
    "ndci": -0.08965,
    "stdDev": 0.0281,
    "pointsCount": 267
  },
  {
    "date": "2022-06-05",
    "year": 2022,
    "ndci": -0.13549,
    "stdDev": 0.02296,
    "pointsCount": 270
  },
  {
    "date": "2022-06-07",
    "year": 2022,
    "ndci": -0.16584,
    "stdDev": 0.03435,
    "pointsCount": 250
  },
  {
    "date": "2022-06-17",
    "year": 2022,
    "ndci": -0.09662,
    "stdDev": 0.04054,
    "pointsCount": 270
  },
  {
    "date": "2022-06-22",
    "year": 2022,
    "ndci": -0.0501,
    "stdDev": 0.05665,
    "pointsCount": 270
  },
  {
    "date": "2022-06-25",
    "year": 2022,
    "ndci": -0.08498,
    "stdDev": 0.03675,
    "pointsCount": 270
  },
  {
    "date": "2022-06-30",
    "year": 2022,
    "ndci": -0.009,
    "stdDev": 0.02353,
    "pointsCount": 145
  },
  {
    "date": "2022-07-02",
    "year": 2022,
    "ndci": -0.06243,
    "stdDev": 0.02899,
    "pointsCount": 270
  },
  {
    "date": "2022-07-05",
    "year": 2022,
    "ndci": -0.09819,
    "stdDev": 0.04503,
    "pointsCount": 270
  },
  {
    "date": "2022-07-07",
    "year": 2022,
    "ndci": -0.06946,
    "stdDev": 0.05443,
    "pointsCount": 270
  },
  {
    "date": "2022-07-17",
    "year": 2022,
    "ndci": -0.03,
    "stdDev": 0.03965,
    "pointsCount": 270
  },
  {
    "date": "2022-07-25",
    "year": 2022,
    "ndci": 0.00151,
    "stdDev": 0.02436,
    "pointsCount": 270
  },
  {
    "date": "2022-07-30",
    "year": 2022,
    "ndci": 0.01769,
    "stdDev": 0.03446,
    "pointsCount": 270
  },
  {
    "date": "2022-08-04",
    "year": 2022,
    "ndci": 0.01163,
    "stdDev": 0.03077,
    "pointsCount": 188
  },
  {
    "date": "2022-08-11",
    "year": 2022,
    "ndci": -0.07898,
    "stdDev": 0.03651,
    "pointsCount": 270
  },
  {
    "date": "2022-08-14",
    "year": 2022,
    "ndci": -0.01203,
    "stdDev": 0.07099,
    "pointsCount": 270
  },
  {
    "date": "2022-08-24",
    "year": 2022,
    "ndci": -0.0534,
    "stdDev": 0.01868,
    "pointsCount": 270
  },
  {
    "date": "2022-08-31",
    "year": 2022,
    "ndci": -0.01364,
    "stdDev": 0.0224,
    "pointsCount": 230
  },
  {
    "date": "2022-09-03",
    "year": 2022,
    "ndci": 0.25831,
    "stdDev": 0.07703,
    "pointsCount": 270
  },
  {
    "date": "2022-09-08",
    "year": 2022,
    "ndci": 0.03051,
    "stdDev": 0.02482,
    "pointsCount": 270
  },
  {
    "date": "2022-09-10",
    "year": 2022,
    "ndci": 0.27975,
    "stdDev": 0.04053,
    "pointsCount": 270
  },
  {
    "date": "2022-09-18",
    "year": 2022,
    "ndci": 0.00143,
    "stdDev": 0.02111,
    "pointsCount": 270
  },
  {
    "date": "2022-09-23",
    "year": 2022,
    "ndci": 0.04871,
    "stdDev": 0.01504,
    "pointsCount": 270
  },
  {
    "date": "2022-10-20",
    "year": 2022,
    "ndci": 0.26764,
    "stdDev": 0.01159,
    "pointsCount": 270
  },
  {
    "date": "2022-10-28",
    "year": 2022,
    "ndci": 0.19034,
    "stdDev": 0.01753,
    "pointsCount": 270
  },
  {
    "date": "2022-10-30",
    "year": 2022,
    "ndci": 0.40126,
    "stdDev": 0.03314,
    "pointsCount": 270
  },
  {
    "date": "2022-11-12",
    "year": 2022,
    "ndci": 0.04663,
    "stdDev": 0.0243,
    "pointsCount": 270
  },
  {
    "date": "2022-11-17",
    "year": 2022,
    "ndci": 0.03179,
    "stdDev": 0.00695,
    "pointsCount": 240
  },
  {
    "date": "2022-11-27",
    "year": 2022,
    "ndci": 0.38356,
    "stdDev": 0.03191,
    "pointsCount": 257
  },
  {
    "date": "2022-12-09",
    "year": 2022,
    "ndci": 0.14272,
    "stdDev": 0.01032,
    "pointsCount": 270
  },
  {
    "date": "2022-12-14",
    "year": 2022,
    "ndci": 0.07763,
    "stdDev": 0.00958,
    "pointsCount": 270
  },
  {
    "date": "2023-01-01",
    "year": 2023,
    "ndci": -0.02815,
    "stdDev": 0.01559,
    "pointsCount": 270
  },
  {
    "date": "2023-01-16",
    "year": 2023,
    "ndci": -0.00685,
    "stdDev": 0.00874,
    "pointsCount": 270
  },
  {
    "date": "2023-01-18",
    "year": 2023,
    "ndci": -0.03575,
    "stdDev": 0.00855,
    "pointsCount": 270
  },
  {
    "date": "2023-01-26",
    "year": 2023,
    "ndci": 0.00548,
    "stdDev": 0.00832,
    "pointsCount": 199
  },
  {
    "date": "2023-02-10",
    "year": 2023,
    "ndci": 0.02354,
    "stdDev": 0.01184,
    "pointsCount": 251
  },
  {
    "date": "2023-02-15",
    "year": 2023,
    "ndci": -0.03122,
    "stdDev": 0.02197,
    "pointsCount": 270
  },
  {
    "date": "2023-02-17",
    "year": 2023,
    "ndci": -0.02641,
    "stdDev": 0.03122,
    "pointsCount": 270
  },
  {
    "date": "2023-02-20",
    "year": 2023,
    "ndci": -0.00392,
    "stdDev": 0.02706,
    "pointsCount": 152
  },
  {
    "date": "2023-02-27",
    "year": 2023,
    "ndci": -0.18607,
    "stdDev": 0.01702,
    "pointsCount": 270
  },
  {
    "date": "2023-03-02",
    "year": 2023,
    "ndci": -0.00251,
    "stdDev": 0.0257,
    "pointsCount": 155
  },
  {
    "date": "2023-03-04",
    "year": 2023,
    "ndci": -0.02335,
    "stdDev": 0.05681,
    "pointsCount": 270
  },
  {
    "date": "2023-03-09",
    "year": 2023,
    "ndci": -0.06,
    "stdDev": 0.02111,
    "pointsCount": 270
  },
  {
    "date": "2023-03-17",
    "year": 2023,
    "ndci": -0.09855,
    "stdDev": 0.00708,
    "pointsCount": 270
  },
  {
    "date": "2023-03-19",
    "year": 2023,
    "ndci": -0.07343,
    "stdDev": 0.01649,
    "pointsCount": 90
  },
  {
    "date": "2023-03-22",
    "year": 2023,
    "ndci": -0.03761,
    "stdDev": 0.00676,
    "pointsCount": 270
  },
  {
    "date": "2023-03-24",
    "year": 2023,
    "ndci": -0.04739,
    "stdDev": 0.01099,
    "pointsCount": 270
  },
  {
    "date": "2023-04-01",
    "year": 2023,
    "ndci": -0.05485,
    "stdDev": 0.01124,
    "pointsCount": 270
  },
  {
    "date": "2023-04-11",
    "year": 2023,
    "ndci": -0.12732,
    "stdDev": 0.02358,
    "pointsCount": 149
  },
  {
    "date": "2023-04-16",
    "year": 2023,
    "ndci": -0.1316,
    "stdDev": 0.00783,
    "pointsCount": 270
  },
  {
    "date": "2023-04-21",
    "year": 2023,
    "ndci": -0.14635,
    "stdDev": 0.00861,
    "pointsCount": 270
  },
  {
    "date": "2023-05-01",
    "year": 2023,
    "ndci": -0.13209,
    "stdDev": 0.03285,
    "pointsCount": 270
  },
  {
    "date": "2023-05-08",
    "year": 2023,
    "ndci": -0.14722,
    "stdDev": 0.00863,
    "pointsCount": 270
  },
  {
    "date": "2023-05-16",
    "year": 2023,
    "ndci": -0.18542,
    "stdDev": 0.00903,
    "pointsCount": 270
  },
  {
    "date": "2023-05-18",
    "year": 2023,
    "ndci": -0.1722,
    "stdDev": 0.01004,
    "pointsCount": 270
  },
  {
    "date": "2023-05-21",
    "year": 2023,
    "ndci": -0.19237,
    "stdDev": 0.01223,
    "pointsCount": 270
  },
  {
    "date": "2023-05-23",
    "year": 2023,
    "ndci": -0.15838,
    "stdDev": 0.01107,
    "pointsCount": 270
  },
  {
    "date": "2023-05-26",
    "year": 2023,
    "ndci": -0.1605,
    "stdDev": 0.02581,
    "pointsCount": 270
  },
  {
    "date": "2023-05-28",
    "year": 2023,
    "ndci": -0.1387,
    "stdDev": 0.01503,
    "pointsCount": 270
  },
  {
    "date": "2023-06-02",
    "year": 2023,
    "ndci": -0.02449,
    "stdDev": 0.02003,
    "pointsCount": 240
  },
  {
    "date": "2023-06-05",
    "year": 2023,
    "ndci": -0.21385,
    "stdDev": 0.01647,
    "pointsCount": 270
  },
  {
    "date": "2023-06-10",
    "year": 2023,
    "ndci": -0.19813,
    "stdDev": 0.02115,
    "pointsCount": 270
  },
  {
    "date": "2023-06-12",
    "year": 2023,
    "ndci": -0.16693,
    "stdDev": 0.01915,
    "pointsCount": 270
  },
  {
    "date": "2023-06-17",
    "year": 2023,
    "ndci": -0.18038,
    "stdDev": 0.02148,
    "pointsCount": 270
  },
  {
    "date": "2023-06-20",
    "year": 2023,
    "ndci": -0.14807,
    "stdDev": 0.01533,
    "pointsCount": 270
  },
  {
    "date": "2023-06-27",
    "year": 2023,
    "ndci": -0.19083,
    "stdDev": 0.03082,
    "pointsCount": 270
  },
  {
    "date": "2023-06-30",
    "year": 2023,
    "ndci": -0.05525,
    "stdDev": 0.04625,
    "pointsCount": 230
  },
  {
    "date": "2023-07-02",
    "year": 2023,
    "ndci": -0.14785,
    "stdDev": 0.03098,
    "pointsCount": 270
  },
  {
    "date": "2023-07-05",
    "year": 2023,
    "ndci": -0.20517,
    "stdDev": 0.02916,
    "pointsCount": 270
  },
  {
    "date": "2023-07-07",
    "year": 2023,
    "ndci": -0.15103,
    "stdDev": 0.02867,
    "pointsCount": 270
  },
  {
    "date": "2023-07-15",
    "year": 2023,
    "ndci": -0.06869,
    "stdDev": 0.02354,
    "pointsCount": 150
  },
  {
    "date": "2023-07-17",
    "year": 2023,
    "ndci": -0.03859,
    "stdDev": 0.04452,
    "pointsCount": 239
  },
  {
    "date": "2023-07-22",
    "year": 2023,
    "ndci": -0.15608,
    "stdDev": 0.0752,
    "pointsCount": 194
  },
  {
    "date": "2023-07-25",
    "year": 2023,
    "ndci": 0.07839,
    "stdDev": 0.0946,
    "pointsCount": 270
  },
  {
    "date": "2023-07-27",
    "year": 2023,
    "ndci": -0.01251,
    "stdDev": 0.02857,
    "pointsCount": 270
  },
  {
    "date": "2023-08-01",
    "year": 2023,
    "ndci": -0.01977,
    "stdDev": 0.05308,
    "pointsCount": 110
  },
  {
    "date": "2023-08-04",
    "year": 2023,
    "ndci": -0.02232,
    "stdDev": 0.02192,
    "pointsCount": 232
  },
  {
    "date": "2023-08-06",
    "year": 2023,
    "ndci": -0.03854,
    "stdDev": 0.01946,
    "pointsCount": 270
  },
  {
    "date": "2023-08-11",
    "year": 2023,
    "ndci": -0.06896,
    "stdDev": 0.02549,
    "pointsCount": 270
  },
  {
    "date": "2023-08-19",
    "year": 2023,
    "ndci": -0.02794,
    "stdDev": 0.01771,
    "pointsCount": 270
  },
  {
    "date": "2023-08-21",
    "year": 2023,
    "ndci": 0.04466,
    "stdDev": 0.01948,
    "pointsCount": 270
  },
  {
    "date": "2023-09-03",
    "year": 2023,
    "ndci": 0.15633,
    "stdDev": 0.06322,
    "pointsCount": 270
  },
  {
    "date": "2023-09-08",
    "year": 2023,
    "ndci": -0.00729,
    "stdDev": 0.01713,
    "pointsCount": 270
  },
  {
    "date": "2023-09-13",
    "year": 2023,
    "ndci": 0.1892,
    "stdDev": 0.01755,
    "pointsCount": 270
  },
  {
    "date": "2023-09-18",
    "year": 2023,
    "ndci": 0.28244,
    "stdDev": 0.04849,
    "pointsCount": 270
  },
  {
    "date": "2023-09-20",
    "year": 2023,
    "ndci": 0.146,
    "stdDev": 0.02812,
    "pointsCount": 270
  },
  {
    "date": "2023-09-23",
    "year": 2023,
    "ndci": 0.24232,
    "stdDev": 0.03124,
    "pointsCount": 270
  },
  {
    "date": "2023-09-25",
    "year": 2023,
    "ndci": 0.33419,
    "stdDev": 0.01636,
    "pointsCount": 270
  },
  {
    "date": "2023-10-23",
    "year": 2023,
    "ndci": -0.00295,
    "stdDev": 0.01924,
    "pointsCount": 221
  },
  {
    "date": "2023-11-09",
    "year": 2023,
    "ndci": 0.0993,
    "stdDev": 0.01303,
    "pointsCount": 270
  },
  {
    "date": "2023-11-12",
    "year": 2023,
    "ndci": 0.261,
    "stdDev": 0.03299,
    "pointsCount": 238
  },
  {
    "date": "2023-11-14",
    "year": 2023,
    "ndci": 0.35262,
    "stdDev": 0.01447,
    "pointsCount": 270
  },
  {
    "date": "2023-11-22",
    "year": 2023,
    "ndci": 0.31974,
    "stdDev": 0.01426,
    "pointsCount": 270
  },
  {
    "date": "2023-12-02",
    "year": 2023,
    "ndci": 0.05574,
    "stdDev": 0.01227,
    "pointsCount": 270
  },
  {
    "date": "2023-12-04",
    "year": 2023,
    "ndci": 0.07876,
    "stdDev": 0.01123,
    "pointsCount": 270
  },
  {
    "date": "2023-12-17",
    "year": 2023,
    "ndci": 0.00992,
    "stdDev": 0.01722,
    "pointsCount": 139
  },
  {
    "date": "2023-12-19",
    "year": 2023,
    "ndci": 0.0373,
    "stdDev": 0.01095,
    "pointsCount": 81
  },
  {
    "date": "2023-12-22",
    "year": 2023,
    "ndci": 0.01374,
    "stdDev": 0.01815,
    "pointsCount": 270
  },
  {
    "date": "2023-12-24",
    "year": 2023,
    "ndci": 0.04024,
    "stdDev": 0.02724,
    "pointsCount": 270
  },
  {
    "date": "2023-12-29",
    "year": 2023,
    "ndci": -0.03067,
    "stdDev": 0.02602,
    "pointsCount": 270
  },
  {
    "date": "2024-01-06",
    "year": 2024,
    "ndci": -0.04293,
    "stdDev": 0.03873,
    "pointsCount": 270
  },
  {
    "date": "2024-01-08",
    "year": 2024,
    "ndci": -0.16006,
    "stdDev": 0.01422,
    "pointsCount": 270
  },
  {
    "date": "2024-01-11",
    "year": 2024,
    "ndci": -0.06503,
    "stdDev": 0.0264,
    "pointsCount": 270
  },
  {
    "date": "2024-01-18",
    "year": 2024,
    "ndci": -0.08248,
    "stdDev": 0.03225,
    "pointsCount": 269
  },
  {
    "date": "2024-01-26",
    "year": 2024,
    "ndci": 0.01791,
    "stdDev": 0.01183,
    "pointsCount": 265
  },
  {
    "date": "2024-01-28",
    "year": 2024,
    "ndci": -0.07639,
    "stdDev": 0.01397,
    "pointsCount": 270
  },
  {
    "date": "2024-02-05",
    "year": 2024,
    "ndci": -0.01382,
    "stdDev": 0.05251,
    "pointsCount": 268
  },
  {
    "date": "2024-02-12",
    "year": 2024,
    "ndci": -0.18309,
    "stdDev": 0.0145,
    "pointsCount": 270
  },
  {
    "date": "2024-02-17",
    "year": 2024,
    "ndci": -0.13084,
    "stdDev": 0.02566,
    "pointsCount": 270
  },
  {
    "date": "2024-02-27",
    "year": 2024,
    "ndci": -0.17759,
    "stdDev": 0.01603,
    "pointsCount": 270
  },
  {
    "date": "2024-03-01",
    "year": 2024,
    "ndci": -0.04529,
    "stdDev": 0.05133,
    "pointsCount": 253
  },
  {
    "date": "2024-03-03",
    "year": 2024,
    "ndci": -0.20202,
    "stdDev": 0.03391,
    "pointsCount": 267
  },
  {
    "date": "2024-03-18",
    "year": 2024,
    "ndci": -0.01464,
    "stdDev": 0.01791,
    "pointsCount": 270
  },
  {
    "date": "2024-03-21",
    "year": 2024,
    "ndci": -0.01294,
    "stdDev": 0.01649,
    "pointsCount": 270
  },
  {
    "date": "2024-03-31",
    "year": 2024,
    "ndci": -0.11285,
    "stdDev": 0.04398,
    "pointsCount": 258
  },
  {
    "date": "2024-04-05",
    "year": 2024,
    "ndci": -0.12569,
    "stdDev": 0.01061,
    "pointsCount": 270
  },
  {
    "date": "2024-04-07",
    "year": 2024,
    "ndci": -0.10412,
    "stdDev": 0.03606,
    "pointsCount": 148
  },
  {
    "date": "2024-04-22",
    "year": 2024,
    "ndci": -0.15834,
    "stdDev": 0.01113,
    "pointsCount": 270
  },
  {
    "date": "2024-04-25",
    "year": 2024,
    "ndci": 0.05288,
    "stdDev": 0.11419,
    "pointsCount": 270
  },
  {
    "date": "2024-04-27",
    "year": 2024,
    "ndci": -0.14042,
    "stdDev": 0.01121,
    "pointsCount": 270
  },
  {
    "date": "2024-04-30",
    "year": 2024,
    "ndci": -0.0639,
    "stdDev": 0.02544,
    "pointsCount": 270
  },
  {
    "date": "2024-05-02",
    "year": 2024,
    "ndci": -0.08299,
    "stdDev": 0.01858,
    "pointsCount": 270
  },
  {
    "date": "2024-05-05",
    "year": 2024,
    "ndci": -0.14071,
    "stdDev": 0.02515,
    "pointsCount": 270
  },
  {
    "date": "2024-05-07",
    "year": 2024,
    "ndci": -0.12216,
    "stdDev": 0.01967,
    "pointsCount": 270
  },
  {
    "date": "2024-05-10",
    "year": 2024,
    "ndci": -0.03843,
    "stdDev": 0.01965,
    "pointsCount": 270
  },
  {
    "date": "2024-05-12",
    "year": 2024,
    "ndci": -0.06955,
    "stdDev": 0.02387,
    "pointsCount": 270
  },
  {
    "date": "2024-05-17",
    "year": 2024,
    "ndci": -0.07287,
    "stdDev": 0.02295,
    "pointsCount": 270
  },
  {
    "date": "2024-05-25",
    "year": 2024,
    "ndci": -0.19477,
    "stdDev": 0.02779,
    "pointsCount": 270
  },
  {
    "date": "2024-05-30",
    "year": 2024,
    "ndci": -0.21258,
    "stdDev": 0.02212,
    "pointsCount": 270
  },
  {
    "date": "2024-06-01",
    "year": 2024,
    "ndci": -0.24951,
    "stdDev": 0.03071,
    "pointsCount": 270
  },
  {
    "date": "2024-06-11",
    "year": 2024,
    "ndci": -0.22475,
    "stdDev": 0.04419,
    "pointsCount": 270
  },
  {
    "date": "2024-06-14",
    "year": 2024,
    "ndci": -0.19183,
    "stdDev": 0.03526,
    "pointsCount": 270
  },
  {
    "date": "2024-06-16",
    "year": 2024,
    "ndci": -0.12355,
    "stdDev": 0.05508,
    "pointsCount": 270
  },
  {
    "date": "2024-06-19",
    "year": 2024,
    "ndci": -0.17168,
    "stdDev": 0.0451,
    "pointsCount": 270
  },
  {
    "date": "2024-06-21",
    "year": 2024,
    "ndci": -0.13967,
    "stdDev": 0.05933,
    "pointsCount": 270
  },
  {
    "date": "2024-06-24",
    "year": 2024,
    "ndci": -0.03701,
    "stdDev": 0.05296,
    "pointsCount": 270
  },
  {
    "date": "2024-06-26",
    "year": 2024,
    "ndci": 0.00634,
    "stdDev": 0.03542,
    "pointsCount": 149
  },
  {
    "date": "2024-06-29",
    "year": 2024,
    "ndci": -0.06255,
    "stdDev": 0.03591,
    "pointsCount": 270
  },
  {
    "date": "2024-07-06",
    "year": 2024,
    "ndci": -0.00624,
    "stdDev": 0.03803,
    "pointsCount": 270
  },
  {
    "date": "2024-07-11",
    "year": 2024,
    "ndci": -0.01765,
    "stdDev": 0.02976,
    "pointsCount": 161
  },
  {
    "date": "2024-07-16",
    "year": 2024,
    "ndci": -0.15284,
    "stdDev": 0.04357,
    "pointsCount": 270
  },
  {
    "date": "2024-07-19",
    "year": 2024,
    "ndci": -0.02266,
    "stdDev": 0.03984,
    "pointsCount": 110
  },
  {
    "date": "2024-07-24",
    "year": 2024,
    "ndci": -0.0848,
    "stdDev": 0.02942,
    "pointsCount": 270
  },
  {
    "date": "2024-07-26",
    "year": 2024,
    "ndci": -0.19543,
    "stdDev": 0.0589,
    "pointsCount": 270
  },
  {
    "date": "2024-07-29",
    "year": 2024,
    "ndci": -0.03282,
    "stdDev": 0.04681,
    "pointsCount": 270
  },
  {
    "date": "2024-08-03",
    "year": 2024,
    "ndci": -0.14668,
    "stdDev": 0.03976,
    "pointsCount": 270
  },
  {
    "date": "2024-08-05",
    "year": 2024,
    "ndci": -0.15972,
    "stdDev": 0.0466,
    "pointsCount": 270
  },
  {
    "date": "2024-08-08",
    "year": 2024,
    "ndci": -0.05291,
    "stdDev": 0.02693,
    "pointsCount": 270
  },
  {
    "date": "2024-08-15",
    "year": 2024,
    "ndci": -0.13858,
    "stdDev": 0.02795,
    "pointsCount": 270
  },
  {
    "date": "2024-08-18",
    "year": 2024,
    "ndci": -0.01991,
    "stdDev": 0.0177,
    "pointsCount": 270
  },
  {
    "date": "2024-08-20",
    "year": 2024,
    "ndci": -0.07581,
    "stdDev": 0.02403,
    "pointsCount": 270
  },
  {
    "date": "2024-08-23",
    "year": 2024,
    "ndci": -0.13486,
    "stdDev": 0.01809,
    "pointsCount": 270
  },
  {
    "date": "2024-08-30",
    "year": 2024,
    "ndci": -0.05705,
    "stdDev": 0.03476,
    "pointsCount": 270
  },
  {
    "date": "2024-09-04",
    "year": 2024,
    "ndci": -0.02738,
    "stdDev": 0.02201,
    "pointsCount": 270
  },
  {
    "date": "2024-09-07",
    "year": 2024,
    "ndci": 0.04654,
    "stdDev": 0.01493,
    "pointsCount": 270
  },
  {
    "date": "2024-09-09",
    "year": 2024,
    "ndci": 0.03354,
    "stdDev": 0.01136,
    "pointsCount": 270
  },
  {
    "date": "2024-09-12",
    "year": 2024,
    "ndci": 0.18821,
    "stdDev": 0.03806,
    "pointsCount": 270
  },
  {
    "date": "2024-09-14",
    "year": 2024,
    "ndci": 0.25258,
    "stdDev": 0.02586,
    "pointsCount": 117
  },
  {
    "date": "2024-09-19",
    "year": 2024,
    "ndci": 0.00137,
    "stdDev": 0.01052,
    "pointsCount": 270
  },
  {
    "date": "2024-09-22",
    "year": 2024,
    "ndci": 0.23253,
    "stdDev": 0.08007,
    "pointsCount": 267
  },
  {
    "date": "2024-09-24",
    "year": 2024,
    "ndci": -0.02292,
    "stdDev": 0.01337,
    "pointsCount": 270
  },
  {
    "date": "2024-10-02",
    "year": 2024,
    "ndci": 0.18778,
    "stdDev": 0.03474,
    "pointsCount": 270
  },
  {
    "date": "2024-10-17",
    "year": 2024,
    "ndci": 0.19794,
    "stdDev": 0.01999,
    "pointsCount": 270
  },
  {
    "date": "2024-10-22",
    "year": 2024,
    "ndci": 0.11555,
    "stdDev": 0.03345,
    "pointsCount": 270
  },
  {
    "date": "2024-11-01",
    "year": 2024,
    "ndci": 0.00692,
    "stdDev": 0.01271,
    "pointsCount": 270
  },
  {
    "date": "2024-11-11",
    "year": 2024,
    "ndci": 0.03573,
    "stdDev": 0.02358,
    "pointsCount": 269
  },
  {
    "date": "2024-11-18",
    "year": 2024,
    "ndci": 0.11628,
    "stdDev": 0.03865,
    "pointsCount": 270
  },
  {
    "date": "2024-11-26",
    "year": 2024,
    "ndci": 0.03411,
    "stdDev": 0.0058,
    "pointsCount": 270
  },
  {
    "date": "2024-11-28",
    "year": 2024,
    "ndci": 0.32358,
    "stdDev": 0.03456,
    "pointsCount": 270
  },
  {
    "date": "2024-12-01",
    "year": 2024,
    "ndci": 0.09105,
    "stdDev": 0.0181,
    "pointsCount": 112
  },
  {
    "date": "2024-12-06",
    "year": 2024,
    "ndci": 0.13558,
    "stdDev": 0.0744,
    "pointsCount": 270
  },
  {
    "date": "2024-12-31",
    "year": 2024,
    "ndci": -0.04586,
    "stdDev": 0.02341,
    "pointsCount": 270
  },
  {
    "date": "2025-01-02",
    "year": 2025,
    "ndci": -0.12348,
    "stdDev": 0.01103,
    "pointsCount": 270
  },
  {
    "date": "2025-01-05",
    "year": 2025,
    "ndci": -0.00897,
    "stdDev": 0.007,
    "pointsCount": 152
  },
  {
    "date": "2025-01-10",
    "year": 2025,
    "ndci": -0.06056,
    "stdDev": 0.0516,
    "pointsCount": 263
  },
  {
    "date": "2025-01-17",
    "year": 2025,
    "ndci": -0.0858,
    "stdDev": 0.04445,
    "pointsCount": 266
  },
  {
    "date": "2025-01-20",
    "year": 2025,
    "ndci": -0.04683,
    "stdDev": 0.03926,
    "pointsCount": 255
  },
  {
    "date": "2025-01-25",
    "year": 2025,
    "ndci": 0.04263,
    "stdDev": 0.03422,
    "pointsCount": 111
  },
  {
    "date": "2025-02-06",
    "year": 2025,
    "ndci": -0.07175,
    "stdDev": 0.01785,
    "pointsCount": 270
  },
  {
    "date": "2025-02-09",
    "year": 2025,
    "ndci": -0.0143,
    "stdDev": 0.01782,
    "pointsCount": 215
  },
  {
    "date": "2025-02-14",
    "year": 2025,
    "ndci": 0.06478,
    "stdDev": 0.02784,
    "pointsCount": 270
  },
  {
    "date": "2025-02-16",
    "year": 2025,
    "ndci": 0.00099,
    "stdDev": 0.01576,
    "pointsCount": 270
  },
  {
    "date": "2025-02-21",
    "year": 2025,
    "ndci": -0.01436,
    "stdDev": 0.01942,
    "pointsCount": 270
  },
  {
    "date": "2025-02-24",
    "year": 2025,
    "ndci": 0.03885,
    "stdDev": 0.02027,
    "pointsCount": 270
  },
  {
    "date": "2025-02-26",
    "year": 2025,
    "ndci": -0.035,
    "stdDev": 0.01675,
    "pointsCount": 270
  },
  {
    "date": "2025-03-01",
    "year": 2025,
    "ndci": 0.021,
    "stdDev": 0.0115,
    "pointsCount": 270
  },
  {
    "date": "2025-03-03",
    "year": 2025,
    "ndci": -0.08914,
    "stdDev": 0.02116,
    "pointsCount": 269
  },
  {
    "date": "2025-03-06",
    "year": 2025,
    "ndci": -0.02606,
    "stdDev": 0.02934,
    "pointsCount": 258
  },
  {
    "date": "2025-03-08",
    "year": 2025,
    "ndci": -0.19441,
    "stdDev": 0.00937,
    "pointsCount": 270
  },
  {
    "date": "2025-03-11",
    "year": 2025,
    "ndci": 0.00672,
    "stdDev": 0.03234,
    "pointsCount": 187
  },
  {
    "date": "2025-03-13",
    "year": 2025,
    "ndci": -0.07562,
    "stdDev": 0.01606,
    "pointsCount": 270
  },
  {
    "date": "2025-03-26",
    "year": 2025,
    "ndci": -0.1131,
    "stdDev": 0.01937,
    "pointsCount": 270
  },
  {
    "date": "2025-03-28",
    "year": 2025,
    "ndci": -0.04897,
    "stdDev": 0.07464,
    "pointsCount": 178
  },
  {
    "date": "2025-04-02",
    "year": 2025,
    "ndci": -0.10143,
    "stdDev": 0.02593,
    "pointsCount": 270
  },
  {
    "date": "2025-04-10",
    "year": 2025,
    "ndci": -0.20343,
    "stdDev": 0.01044,
    "pointsCount": 270
  },
  {
    "date": "2025-04-12",
    "year": 2025,
    "ndci": -0.13926,
    "stdDev": 0.02155,
    "pointsCount": 270
  },
  {
    "date": "2025-04-17",
    "year": 2025,
    "ndci": -0.18268,
    "stdDev": 0.04235,
    "pointsCount": 261
  },
  {
    "date": "2025-04-30",
    "year": 2025,
    "ndci": -0.18667,
    "stdDev": 0.02491,
    "pointsCount": 270
  },
  {
    "date": "2025-05-02",
    "year": 2025,
    "ndci": -0.2059,
    "stdDev": 0.01213,
    "pointsCount": 270
  },
  {
    "date": "2025-05-05",
    "year": 2025,
    "ndci": -0.10088,
    "stdDev": 0.04105,
    "pointsCount": 204
  },
  {
    "date": "2025-05-07",
    "year": 2025,
    "ndci": -0.19001,
    "stdDev": 0.02885,
    "pointsCount": 270
  },
  {
    "date": "2025-05-17",
    "year": 2025,
    "ndci": -0.19563,
    "stdDev": 0.05847,
    "pointsCount": 268
  },
  {
    "date": "2025-05-19",
    "year": 2025,
    "ndci": -0.15246,
    "stdDev": 0.02295,
    "pointsCount": 270
  },
  {
    "date": "2025-05-20",
    "year": 2025,
    "ndci": -0.26289,
    "stdDev": 0.02447,
    "pointsCount": 270
  },
  {
    "date": "2025-05-22",
    "year": 2025,
    "ndci": -0.0308,
    "stdDev": 0.02784,
    "pointsCount": 161
  },
  {
    "date": "2025-05-25",
    "year": 2025,
    "ndci": -0.19398,
    "stdDev": 0.02216,
    "pointsCount": 270
  },
  {
    "date": "2025-06-04",
    "year": 2025,
    "ndci": -0.20923,
    "stdDev": 0.0205,
    "pointsCount": 270
  },
  {
    "date": "2025-06-06",
    "year": 2025,
    "ndci": -0.20774,
    "stdDev": 0.02311,
    "pointsCount": 270
  },
  {
    "date": "2025-06-11",
    "year": 2025,
    "ndci": -0.17845,
    "stdDev": 0.01561,
    "pointsCount": 270
  },
  {
    "date": "2025-06-16",
    "year": 2025,
    "ndci": -0.19595,
    "stdDev": 0.03985,
    "pointsCount": 270
  },
  {
    "date": "2025-06-19",
    "year": 2025,
    "ndci": -0.18736,
    "stdDev": 0.039,
    "pointsCount": 270
  },
  {
    "date": "2025-06-21",
    "year": 2025,
    "ndci": -0.17898,
    "stdDev": 0.02957,
    "pointsCount": 270
  },
  {
    "date": "2025-06-29",
    "year": 2025,
    "ndci": -0.24211,
    "stdDev": 0.02173,
    "pointsCount": 270
  },
  {
    "date": "2025-07-09",
    "year": 2025,
    "ndci": -0.10593,
    "stdDev": 0.06902,
    "pointsCount": 186
  },
  {
    "date": "2025-07-14",
    "year": 2025,
    "ndci": -0.20939,
    "stdDev": 0.02016,
    "pointsCount": 270
  },
  {
    "date": "2025-07-18",
    "year": 2025,
    "ndci": -0.15754,
    "stdDev": 0.02073,
    "pointsCount": 270
  },
  {
    "date": "2025-07-19",
    "year": 2025,
    "ndci": -0.22509,
    "stdDev": 0.02086,
    "pointsCount": 270
  },
  {
    "date": "2025-07-31",
    "year": 2025,
    "ndci": -0.18428,
    "stdDev": 0.02306,
    "pointsCount": 270
  },
  {
    "date": "2025-08-03",
    "year": 2025,
    "ndci": -0.11363,
    "stdDev": 0.03411,
    "pointsCount": 270
  },
  {
    "date": "2025-08-08",
    "year": 2025,
    "ndci": -0.10166,
    "stdDev": 0.01886,
    "pointsCount": 270
  },
  {
    "date": "2025-08-10",
    "year": 2025,
    "ndci": -0.22124,
    "stdDev": 0.02278,
    "pointsCount": 270
  },
  {
    "date": "2025-08-13",
    "year": 2025,
    "ndci": -0.11424,
    "stdDev": 0.02263,
    "pointsCount": 270
  },
  {
    "date": "2025-08-20",
    "year": 2025,
    "ndci": -0.1259,
    "stdDev": 0.01837,
    "pointsCount": 270
  },
  {
    "date": "2025-08-23",
    "year": 2025,
    "ndci": -0.05896,
    "stdDev": 0.02174,
    "pointsCount": 270
  },
  {
    "date": "2025-08-25",
    "year": 2025,
    "ndci": -0.04002,
    "stdDev": 0.01996,
    "pointsCount": 270
  },
  {
    "date": "2025-08-30",
    "year": 2025,
    "ndci": 0.25467,
    "stdDev": 0.04734,
    "pointsCount": 270
  },
  {
    "date": "2025-09-02",
    "year": 2025,
    "ndci": -0.04953,
    "stdDev": 0.01888,
    "pointsCount": 270
  },
  {
    "date": "2025-09-09",
    "year": 2025,
    "ndci": 0.01579,
    "stdDev": 0.03015,
    "pointsCount": 270
  },
  {
    "date": "2025-09-16",
    "year": 2025,
    "ndci": 0.02883,
    "stdDev": 0.0197,
    "pointsCount": 270
  },
  {
    "date": "2025-09-17",
    "year": 2025,
    "ndci": 0.22963,
    "stdDev": 0.03792,
    "pointsCount": 270
  },
  {
    "date": "2025-09-27",
    "year": 2025,
    "ndci": -0.10298,
    "stdDev": 0.01727,
    "pointsCount": 270
  },
  {
    "date": "2025-10-16",
    "year": 2025,
    "ndci": -0.00292,
    "stdDev": 0.04784,
    "pointsCount": 270
  },
  {
    "date": "2025-10-17",
    "year": 2025,
    "ndci": 0.08112,
    "stdDev": 0.01881,
    "pointsCount": 270
  },
  {
    "date": "2025-10-22",
    "year": 2025,
    "ndci": 0.02013,
    "stdDev": 0.0083,
    "pointsCount": 234
  },
  {
    "date": "2025-10-24",
    "year": 2025,
    "ndci": -0.02473,
    "stdDev": 0.02211,
    "pointsCount": 270
  },
  {
    "date": "2025-10-27",
    "year": 2025,
    "ndci": 0.27137,
    "stdDev": 0.09913,
    "pointsCount": 264
  },
  {
    "date": "2025-11-01",
    "year": 2025,
    "ndci": 0.05965,
    "stdDev": 0.02272,
    "pointsCount": 162
  },
  {
    "date": "2025-11-13",
    "year": 2025,
    "ndci": 0.18692,
    "stdDev": 0.01736,
    "pointsCount": 270
  },
  {
    "date": "2025-11-18",
    "year": 2025,
    "ndci": 0.39271,
    "stdDev": 0.06908,
    "pointsCount": 270
  },
  {
    "date": "2025-11-21",
    "year": 2025,
    "ndci": 0.03253,
    "stdDev": 0.00929,
    "pointsCount": 270
  },
  {
    "date": "2025-11-25",
    "year": 2025,
    "ndci": 0.19256,
    "stdDev": 0.02797,
    "pointsCount": 270
  },
  {
    "date": "2025-11-26",
    "year": 2025,
    "ndci": 0.31427,
    "stdDev": 0.03419,
    "pointsCount": 270
  },
  {
    "date": "2025-11-28",
    "year": 2025,
    "ndci": 0.12773,
    "stdDev": 0.03041,
    "pointsCount": 270
  },
  {
    "date": "2025-12-01",
    "year": 2025,
    "ndci": 0.07025,
    "stdDev": 0.04378,
    "pointsCount": 270
  },
  {
    "date": "2025-12-03",
    "year": 2025,
    "ndci": 0.34284,
    "stdDev": 0.03333,
    "pointsCount": 270
  },
  {
    "date": "2025-12-08",
    "year": 2025,
    "ndci": 0.26483,
    "stdDev": 0.02668,
    "pointsCount": 270
  },
  {
    "date": "2025-12-21",
    "year": 2025,
    "ndci": 0.01401,
    "stdDev": 0.00806,
    "pointsCount": 103
  },
  {
    "date": "2025-12-23",
    "year": 2025,
    "ndci": 0.16218,
    "stdDev": 0.02393,
    "pointsCount": 270
  },
  {
    "date": "2025-12-26",
    "year": 2025,
    "ndci": 0.24411,
    "stdDev": 0.07178,
    "pointsCount": 185
  },
  {
    "date": "2025-12-28",
    "year": 2025,
    "ndci": 0.28362,
    "stdDev": 0.01575,
    "pointsCount": 270
  },
  {
    "date": "2026-01-04",
    "year": 2026,
    "ndci": 0.601,
    "stdDev": 0.04267,
    "pointsCount": 235
  },
  {
    "date": "2026-01-10",
    "year": 2026,
    "ndci": 0.13135,
    "stdDev": 0.02317,
    "pointsCount": 270
  },
  {
    "date": "2026-01-12",
    "year": 2026,
    "ndci": 0.31066,
    "stdDev": 0.01994,
    "pointsCount": 270
  },
  {
    "date": "2026-01-27",
    "year": 2026,
    "ndci": -0.15813,
    "stdDev": 0.01795,
    "pointsCount": 270
  },
  {
    "date": "2026-02-01",
    "year": 2026,
    "ndci": 0.20109,
    "stdDev": 0.03316,
    "pointsCount": 270
  },
  {
    "date": "2026-02-06",
    "year": 2026,
    "ndci": 0.10482,
    "stdDev": 0.035,
    "pointsCount": 270
  },
  {
    "date": "2026-02-14",
    "year": 2026,
    "ndci": -0.06195,
    "stdDev": 0.01378,
    "pointsCount": 270
  },
  {
    "date": "2026-02-16",
    "year": 2026,
    "ndci": 0.03778,
    "stdDev": 0.02736,
    "pointsCount": 255
  },
  {
    "date": "2026-02-19",
    "year": 2026,
    "ndci": 0.125,
    "stdDev": 0.02336,
    "pointsCount": 270
  },
  {
    "date": "2026-03-06",
    "year": 2026,
    "ndci": -0.04724,
    "stdDev": 0.01243,
    "pointsCount": 270
  },
  {
    "date": "2026-03-08",
    "year": 2026,
    "ndci": -0.01409,
    "stdDev": 0.01674,
    "pointsCount": 270
  },
  {
    "date": "2026-03-15",
    "year": 2026,
    "ndci": -0.02595,
    "stdDev": 0.01442,
    "pointsCount": 270
  },
  {
    "date": "2026-03-16",
    "year": 2026,
    "ndci": -0.0735,
    "stdDev": 0.01562,
    "pointsCount": 270
  },
  {
    "date": "2026-03-21",
    "year": 2026,
    "ndci": -0.09736,
    "stdDev": 0.01366,
    "pointsCount": 270
  },
  {
    "date": "2026-03-26",
    "year": 2026,
    "ndci": -0.14313,
    "stdDev": 0.01073,
    "pointsCount": 270
  },
  {
    "date": "2026-03-28",
    "year": 2026,
    "ndci": -0.10673,
    "stdDev": 0.01421,
    "pointsCount": 270
  },
  {
    "date": "2026-04-02",
    "year": 2026,
    "ndci": -0.1613,
    "stdDev": 0.01283,
    "pointsCount": 270
  },
  {
    "date": "2026-04-04",
    "year": 2026,
    "ndci": -0.06483,
    "stdDev": 0.02471,
    "pointsCount": 270
  },
  {
    "date": "2026-04-05",
    "year": 2026,
    "ndci": -0.08494,
    "stdDev": 0.02686,
    "pointsCount": 270
  },
  {
    "date": "2026-04-07",
    "year": 2026,
    "ndci": -0.07132,
    "stdDev": 0.02953,
    "pointsCount": 270
  },
  {
    "date": "2026-04-12",
    "year": 2026,
    "ndci": -0.22478,
    "stdDev": 0.00778,
    "pointsCount": 270
  },
  {
    "date": "2026-04-20",
    "year": 2026,
    "ndci": -0.08559,
    "stdDev": 0.02934,
    "pointsCount": 270
  },
  {
    "date": "2026-04-24",
    "year": 2026,
    "ndci": -0.14898,
    "stdDev": 0.0106,
    "pointsCount": 270
  },
  {
    "date": "2026-04-25",
    "year": 2026,
    "ndci": -0.18571,
    "stdDev": 0.01151,
    "pointsCount": 270
  },
  {
    "date": "2026-04-30",
    "year": 2026,
    "ndci": -0.12473,
    "stdDev": 0.04359,
    "pointsCount": 266
  },
  {
    "date": "2026-05-02",
    "year": 2026,
    "ndci": -0.21041,
    "stdDev": 0.01461,
    "pointsCount": 270
  },
  {
    "date": "2026-05-05",
    "year": 2026,
    "ndci": -0.16745,
    "stdDev": 0.0293,
    "pointsCount": 270
  },
  {
    "date": "2026-05-07",
    "year": 2026,
    "ndci": -0.20037,
    "stdDev": 0.01568,
    "pointsCount": 270
  },
  {
    "date": "2026-05-27",
    "year": 2026,
    "ndci": -0.1436,
    "stdDev": 0.02012,
    "pointsCount": 270
  },
  {
    "date": "2026-06-04",
    "year": 2026,
    "ndci": -0.05347,
    "stdDev": 0.04613,
    "pointsCount": 245
  },
  {
    "date": "2026-06-06",
    "year": 2026,
    "ndci": -0.16681,
    "stdDev": 0.02285,
    "pointsCount": 270
  },
  {
    "date": "2026-06-19",
    "year": 2026,
    "ndci": -0.23175,
    "stdDev": 0.03222,
    "pointsCount": 270
  },
  {
    "date": "2026-06-21",
    "year": 2026,
    "ndci": -0.06422,
    "stdDev": 0.05143,
    "pointsCount": 265
  },
  {
    "date": "2026-06-29",
    "year": 2026,
    "ndci": -0.13717,
    "stdDev": 0.03413,
    "pointsCount": 270
  },
  {
    "date": "2026-07-01",
    "year": 2026,
    "ndci": -0.12384,
    "stdDev": 0.03385,
    "pointsCount": 270
  },
  {
    "date": "2026-07-06",
    "year": 2026,
    "ndci": -0.16927,
    "stdDev": 0.03771,
    "pointsCount": 270
  },
  {
    "date": "2026-07-11",
    "year": 2026,
    "ndci": -0.14707,
    "stdDev": 0.03762,
    "pointsCount": 270
  },
  {
    "date": "2026-07-14",
    "year": 2026,
    "ndci": -0.3418,
    "stdDev": 0.05152,
    "pointsCount": 270
  },
  {
    "date": "2026-07-16",
    "year": 2026,
    "ndci": -0.25439,
    "stdDev": 0.03619,
    "pointsCount": 270
  },
  {
    "date": "2026-07-19",
    "year": 2026,
    "ndci": -0.26859,
    "stdDev": 0.03661,
    "pointsCount": 270
  },
  {
    "date": "2026-07-21",
    "year": 2026,
    "ndci": -0.16047,
    "stdDev": 0.03258,
    "pointsCount": 270
  },
  {
    "date": "2026-07-26",
    "year": 2026,
    "ndci": -0.12933,
    "stdDev": 0.05094,
    "pointsCount": 268
  },
  {
    "date": "2026-07-29",
    "year": 2026,
    "ndci": -0.04046,
    "stdDev": 0.03055,
    "pointsCount": 270
  },
  {
    "date": "2026-08-02",
    "year": 2026,
    "ndci": -0.14172,
    "stdDev": 0.03839,
    "pointsCount": 270
  },
  {
    "date": "2026-08-03",
    "year": 2026,
    "ndci": -0.13688,
    "stdDev": 0.03185,
    "pointsCount": 270
  },
  {
    "date": "2026-08-05",
    "year": 2026,
    "ndci": -0.05428,
    "stdDev": 0.03653,
    "pointsCount": 270
  },
  {
    "date": "2026-08-13",
    "year": 2026,
    "ndci": -0.08169,
    "stdDev": 0.02469,
    "pointsCount": 270
  },
  {
    "date": "2026-08-18",
    "year": 2026,
    "ndci": -0.00311,
    "stdDev": 0.02267,
    "pointsCount": 270
  },
  {
    "date": "2026-08-20",
    "year": 2026,
    "ndci": 0.00602,
    "stdDev": 0.0223,
    "pointsCount": 270
  },
  {
    "date": "2026-08-28",
    "year": 2026,
    "ndci": 0.1172,
    "stdDev": 0.03527,
    "pointsCount": 270
  },
  {
    "date": "2026-08-30",
    "year": 2026,
    "ndci": 0.35166,
    "stdDev": 0.04492,
    "pointsCount": 269
  },
  {
    "date": "2026-09-02",
    "year": 2026,
    "ndci": 0.20984,
    "stdDev": 0.02695,
    "pointsCount": 270
  },
  {
    "date": "2026-09-04",
    "year": 2026,
    "ndci": 0.30384,
    "stdDev": 0.0104,
    "pointsCount": 270
  },
  {
    "date": "2026-09-27",
    "year": 2026,
    "ndci": 0.03662,
    "stdDev": 0.01502,
    "pointsCount": 270
  },
  {
    "date": "2026-10-01",
    "year": 2026,
    "ndci": 0.1163,
    "stdDev": 0.02184,
    "pointsCount": 251
  },
  {
    "date": "2026-10-04",
    "year": 2026,
    "ndci": 0.07465,
    "stdDev": 0.01234,
    "pointsCount": 268
  }
];
