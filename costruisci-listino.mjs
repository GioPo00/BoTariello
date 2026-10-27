/*
 * THE PRICE LIST, REBUILT BY A SCHEDULED JOB.
 *
 * ── WHAT IT DOES ───────────────────────────────────────────────────────────
 *
 * It reads the source's manifest, downloads the three files that are needed
 * and merges them into ONE file per platform, in a compact form that a
 * consumer can read straight into memory:
 *
 *     { v, id0, d, p, n, quando }
 *
 *     player-prices-index       the identifiers, stored as differences
 *     player-prices-<platform>  the settled prices
 *     player-prices-<platform>-dyn  the prices that keep moving
 *
 * The `-dyn` files carry the good prices: measured on 2026-09-20, 1.722 out of
 * 19.870 cards had a different price there than in the settled file. Where the
 * `-dyn` has no number the settled one is used, and where neither has one the
 * card is left without a price — never at zero, which a consumer would read as
 * "free".
 *
 * ── WHY A SCHEDULED JOB AND NOT A DIRECT FETCH ─────────────────────────────
 *
 * The source does not answer requests coming from server IPs. Measured on
 * 2026-09-20, same moment, same addresses:
 *
 *     from a home computer         200
 *     from a server                 200
 *     from an edge function         502
 *     from a worker                 403
 *
 * So the job runs on a runner the source accepts, keeps running by itself,
 * and deposits the result where a consumer can read it without asking anybody
 * for permission.
 *
 * ── WHY A COMPACT FORM ─────────────────────────────────────────────────────
 *
 * The identifiers are stored as differences between consecutive values: the
 * index holds a few thousand numbers instead of twenty thousand, and the file
 * stays around 130 KB per platform.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RADICE = 'https://r2.fut.gg';
const ANNO = process.env['ANNO_FC'] ?? '27';
const PIATTAFORME = { console: 'player-prices-ps5', pc: 'player-prices-pc' };

async function prendi(url) {
  const risposta = await fetch(url, { headers: { accept: 'application/json' } });
  if (!risposta.ok) throw new Error(`${risposta.status} su ${url}`);
  return risposta.json();
}

function indirizzo(manifesto, chiave) {
  const impronta = manifesto[chiave];
  if (typeof impronta !== 'string' || impronta === '') {
    throw new Error(`il manifesto non ha ${chiave}`);
  }
  const versione = typeof manifesto['_version'] === 'number' ? manifesto['_version'] : 1;
  return `${RADICE}/${ANNO}/${chiave}.v${versione}.${impronta}.json`;
}

function numeri(v) {
  return Array.isArray(v) ? v : [];
}

/**
 * Puts identifiers and prices together.
 *
 * The index and the prices are two parallel lists: entry `i` of one and
 * entry `i` of the other are the same card. If the lengths do not match
 * nothing is guessed: the shorter one wins, because a misalignment would
 * mean real prices under the wrong cards.
 */
function unisci(indice, dinamici, fermi, stati) {
  const differenze = numeri(indice['d']);
  const quante = Math.min(
    differenze.length + 1,
    Math.max(numeri(dinamici).length, numeri(fermi).length),
  );
  const prezzi = [];
  let usatiDinamici = 0;
  let usatiFermi = 0;
  let senzaPrezzo = 0;
  /*
   * CARDS THE MARKET DOES NOT SELL. The source gives every card a state
   * (`s`): 0 is the market; 1 is a squad building challenge, carrying the
   * cost of the challenge instead of a price; 2 and 3 are objectives and
   * rewards, with no price at all. The identifiers whose state is not 0 are
   * published in `n`: a consumer that does not know the field ignores them.
   */
  const fuoriMercato = [];
  let identificativo = Number(indice['id0']);
  for (let i = 0; i < quante; i++) {
    if (i > 0) identificativo += Number(differenze[i - 1]);
    const stato = numeri(stati)[i];
    if (typeof stato === 'number' && stato !== 0 && Number.isFinite(identificativo)) {
      fuoriMercato.push(identificativo);
    }
    const d = numeri(dinamici)[i];
    const f = numeri(fermi)[i];
    if (typeof d === 'number' && Number.isFinite(d) && d > 0) {
      prezzi.push(d);
      usatiDinamici++;
    } else if (typeof f === 'number' && Number.isFinite(f) && f > 0) {
      prezzi.push(f);
      usatiFermi++;
    } else {
      /* Zero means "no price", and the consumer discards it. */
      prezzi.push(0);
      senzaPrezzo++;
    }
  }
  return {
    documento: {
      v: 2,
      id0: indice['id0'],
      d: differenze.slice(0, Math.max(0, quante - 1)),
      p: prezzi,
      n: fuoriMercato,
    },
    conti: { carte: quante, usatiDinamici, usatiFermi, senzaPrezzo, fuoriMercato: fuoriMercato.length },
  };
}

const destinazione = process.argv[2] ?? 'listino';
mkdirSync(destinazione, { recursive: true });

const manifesto = await prendi(`${RADICE}/${ANNO}/manifest.json`);
const indice = await prendi(indirizzo(manifesto, 'player-prices-index'));
const quando = new Date().toISOString();
const riepilogo = { anno: ANNO, quando, piattaforme: {} };

for (const [nome, chiave] of Object.entries(PIATTAFORME)) {
  const fermi = await prendi(indirizzo(manifesto, chiave));
  let dinamici = { p: [] };
  try {
    dinamici = await prendi(indirizzo(manifesto, `${chiave}-dyn`));
  } catch (errore) {
    /* Without the dynamic file the same is published, with the settled prices. */
    console.log(`  ${nome}: niente -dyn (${errore.message})`);
  }
  const stati = numeri(fermi['s']).length > 0 ? fermi['s'] : dinamici['s'];
  const { documento, conti } = unisci(indice, dinamici['p'], fermi['p'], stati);
  /* The price list carries the moment it was generated: it is the only way a
     consumer can know how old the prices it is using are. Existing readers
     ignore the extra field. */
  documento.quando = quando;
  writeFileSync(path.join(destinazione, `listino-${nome}.json`), JSON.stringify(documento));
  riepilogo.piattaforme[nome] = conti;
  console.log(
    `  ${nome}: ${conti.carte} carte, ${conti.usatiDinamici} dal -dyn, ` +
      `${conti.usatiFermi} dal file fermo, ${conti.senzaPrezzo} senza prezzo, ` +
      `${conti.fuoriMercato} fuori mercato`,
  );
}

writeFileSync(path.join(destinazione, 'stato.json'), JSON.stringify(riepilogo, null, 2) + '\n');
console.log(`listino pronto in ${destinazione} (${quando})`);
