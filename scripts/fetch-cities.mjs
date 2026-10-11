/**
 * Baixa do IBGE os dados das cidades jogáveis e grava em data/ (rodar só quando a lista mudar).
 *
 * Quais cidades: as capitais, as metrópoles e as capitais regionais da REGIC 2018 (Regiões de
 * Influência das Cidades — as "cidades-polo" de cada estado), mais os municípios com 500 mil
 * habitantes ou mais no Censo 2022 que a REGIC agrupa no arranjo da capital (Guarulhos etc.).
 *
 * Fontes (dados públicos do IBGE):
 *  - População: Censo 2022, SIDRA tabela 4709 (população residente).
 *  - Contornos: API de Malhas Territoriais v3, qualidade intermediária.
 *
 * Saídas: data/cidades-ibge.json e data/geo/br-cidades-ibge.geojson.
 * Depois rode `npm run generate:map` para gerar os arquivos usados pelo jogo (que não acessa a
 * internet).
 *
 * Uso: node scripts/fetch-cities.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UA = { 'User-Agent': 'republica-jogo (scripts/fetch-cities.mjs)' };

/** Código IBGE → nível na hierarquia urbana da REGIC 2018 ('metro' = 500 mil+ no arranjo da capital). */
// prettier-ignore
const CITIES = {
  // Norte
  1200401: '2C', 1302603: '1C', 1600303: '2C', 1400100: '2C', 1721000: '2B', 1702109: '2C',
  1100205: '2B', 1100122: '2C', 1100049: '2C',
  1501402: '1C', 1504208: '2C', 1506807: '2C', 1502400: '2C',
  // Nordeste
  2704302: '2A', 2700300: '2C',
  2927408: '1C', 2910800: '2B', 2933307: '2B', 2914802: '2B', 2913606: '2C', 2903201: '2C', 2910727: '2C',
  2304400: '1C', 2307304: '2B', 2312908: '2C',
  2111300: '2A', 2105302: '2C',
  2507507: '2A', 2504009: '2C',
  2611606: '1C', 2604106: '2B', 2611101: '2C', 2606002: '2C', 2607901: 'metro',
  2211001: '2A',
  2408102: '2A', 2408003: '2C',
  2800308: '2A',
  // Centro-Oeste
  5300108: '1B',
  5208707: '1C', 5201108: '2C', 5201405: 'metro',
  5002704: '2A', 5003702: '2C',
  5103403: '2A', 5107602: '2C', 5107909: '2C',
  // Sudeste
  3205309: '1C', 3201209: '2C', 3205002: 'metro',
  3106200: '1C', 3170206: '2B', 3136702: '2B', 3143302: '2B', 3131307: '2C', 3170107: '2C', 3167202: '2C',
  3152501: '2C', 3151800: '2C', 3127701: '2C', 3122306: '2C', 3170701: '2C', 3168606: '2C', 3118601: 'metro',
  3304557: '1B', 3302403: '2C', 3301009: '2C', 3306305: '2C', 3303906: '2C', 3300704: '2C',
  3301702: 'metro', 3303500: 'metro', 3304904: 'metro',
  3550308: '1A', 3509502: '1C', 3543402: '2A', 3549904: '2B', 3552205: '2B', 3549805: '2B', 3506003: '2B',
  3525904: '2C', 3548500: '2C', 3538709: '2C', 3501608: '2C', 3526902: '2C', 3516200: '2C', 3503208: '2C',
  3548906: '2C', 3541406: '2C', 3529005: '2C', 3502804: '2C', 3518404: '2C', 3511102: '2C', 3505500: '2C',
  3525300: '2C', 3518800: 'metro', 3534401: 'metro', 3547809: 'metro', 3548708: 'metro',
  // Sul
  4106902: '1C', 4113700: '2B', 4115200: '2B', 4104808: '2B', 4119905: '2C', 4108304: '2C',
  4205407: '1C', 4208203: '2B', 4209102: '2B', 4202404: '2B', 4204608: '2B', 4204202: '2B', 4202909: '2C',
  4218707: '2C', 4209300: '2C', 4203006: '2C', 4209003: '2C',
  4314902: '1C', 4305108: '2B', 4314100: '2B', 4316808: '2C', 4314407: '2C', 4316907: '2C', 4311403: '2C',
};

// prettier-ignore
const CAPITALS = new Set([
  1200401, 2704302, 1302603, 1600303, 2927408, 2304400, 5300108, 3205309, 5208707, 2111300, 3106200,
  5002704, 5103403, 1501402, 2507507, 2611606, 2211001, 4106902, 3304557, 2408102, 1100205, 1400100,
  4314902, 4205407, 2800308, 3550308, 1721000,
].map(String));

// prettier-ignore
const UF_CODES = {
  11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE',
  24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP',
  41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF',
};

async function getJson(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} em ${url}`);
  return res.json();
}

const codes = Object.keys(CITIES);
console.log(`Cidades: ${codes.length}`);

// População e nome oficial (Censo 2022).
const census = await getJson(
  `https://apisidra.ibge.gov.br/values/t/4709/n6/${codes.join(',')}/v/93/p/2022`,
);
const info = new Map();
for (const row of census.slice(1)) {
  // O SIDRA devolve "Nome (UF)" ou "Nome - UF", conforme a consulta; a UF vem do próprio código.
  const name = row.D1N.replace(/\s*(\([A-Z]{2}\)|- [A-Z]{2})$/, '');
  info.set(row.D1C, { name, uf: UF_CODES[row.D1C.slice(0, 2)], population: Number(row.V) });
}

// Contornos: uma requisição por estado, filtrando só as cidades da lista.
const features = [];
for (const ufCode of [...new Set(codes.map((c) => c.slice(0, 2)))]) {
  const mesh = await getJson(
    `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${ufCode}?intrarregiao=municipio&formato=application/vnd.geo%2Bjson&qualidade=intermediaria`,
  );
  for (const f of mesh.features)
    if (CITIES[f.properties.codarea])
      features.push({
        type: 'Feature',
        properties: { codarea: f.properties.codarea },
        geometry: f.geometry,
      });
  console.log(`  ${UF_CODES[ufCode]}: ok`);
}

const cities = codes.map((code) => {
  const c = info.get(code);
  if (!c) throw new Error(`Sem dados do Censo para ${code}`);
  if (!features.some((f) => f.properties.codarea === code))
    throw new Error(`Sem contorno para ${code}`);
  return {
    code,
    name: c.name,
    uf: c.uf,
    population: c.population,
    regic: CITIES[code],
    capital: CAPITALS.has(code),
  };
});

mkdirSync(resolve(root, 'data/geo'), { recursive: true });
writeFileSync(resolve(root, 'data/cidades-ibge.json'), `${JSON.stringify(cities, null, 1)}\n`);
writeFileSync(
  resolve(root, 'data/geo/br-cidades-ibge.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features }),
);
console.log(`Gravado: ${cities.length} cidades, ${features.length} contornos.`);
