# BoTariello — il listino dei prezzi

Questo repository **non contiene il prodotto**: contiene un **lavoro
programmato** che ogni quarto d'ora rigenera il listino dei prezzi e lo
pubblica su due rami.

    ramo dati      ->  listino-console.json, listino-pc.json, stato.json
    ramo galleria  ->  catalogo-fc27.json

L'estensione li legge da qui:

    https://raw.githubusercontent.com/GioPo00/BoTariello/dati/listino-console.json
    https://raw.githubusercontent.com/GioPo00/BoTariello/galleria/catalogo-fc27.json

## Perché esiste

Il listino lo serviva una funzione del sito, che scaricava da `fut.gg`.
Ha smesso di funzionare: `fut.gg` non risponde più ai server. Misurato il
20/09/2026, stessa ora, stessi indirizzi:

| da dove | esito |
|---|---|
| un computer qualunque | 200 |
| il server dei bot | 200 |
| la funzione Netlify del sito | 502 |
| il Worker Cloudflare | 403 |

Serviva quindi una macchina che `fut.gg` accetti e che giri da sola. In più,
da quando il sito è a crediti, ogni pubblicazione su Netlify ne costa 15:
qui non si tocca il sito e non si spende niente.

## Come funziona

`costruisci-listino.mjs` legge il manifesto dei prezzi, scarica i tre pezzi
che servono e ne fa **un file per piattaforma**, nella forma che l'estensione
sa già leggere:

    { "v": 2, "id0": 27, "d": [ …differenze fra un id e il successivo… ], "p": [ …prezzi… ], "n": [ …fuori mercato… ] }

* `d` sono **differenze**, non identificativi: 19.870 carte stanno in qualche
  migliaio di numeri. Il file pesa ~128 KB.
* `p` è in parallelo a `d`: la voce *i* di `p` è il prezzo della carta il cui
  id si ricostruisce sommando le differenze.
* Uno **zero** in `p` vuol dire "nessun prezzo", non "gratis": chi legge lo
  scarta.
* `n` elenca le carte che il mercato non vende (stato diverso da 0).
* I prezzi buoni sono quelli del file `-dyn`: misurato il 20/09/2026, 1.722
  carte su 19.870 avevano un prezzo diverso fra `-dyn` e file fermo. Dove il
  `-dyn` non ha un numero si usa il file fermo, e dove non c'è nessuno dei due
  la carta resta senza prezzo — mai a zero.

### Il ciclo da 22 giri

Il `cron` di GitHub «ogni 15 minuti» in realtà parte **ogni 3-6 ore** (misurato
il 16/10/2026: 04:32, 09:32, 14:44, 18:58). Perciò **una sola esecuzione resta
accesa quasi sei ore** (il massimo di GitHub) e dentro rigenera il listino ogni
quarto d'ora da sola:

    while [ $giro -lt 22 ]; do        # 22 giri da 15 minuti = 5h30
      node costruisci-listino.mjs listino
      git push --force HEAD:dati      # il ramo viene riscritto: il repo non cresce
      sleep fino alla prossima mezz'ora
    done

Quando l'esecuzione finisce o viene uccisa, l'ultimo passo **rilancia il
lavoro** (`gh workflow run`), così il ciclo non si interrompe mai.

Il repository è pubblico, quindi i minuti non costano niente.

### Il catalogo della Gallery

`galleria.yml` gira ogni 3 ore (alle `:20`, lontano dal quarto d'ora) e rilegge
da `fut.gg` gli album — nuovi album, requisiti, gradi, rarità — pubblicando
`catalogo-fc27.json` sul ramo `galleria`. Le soglie non cambiano durante
l'anno, quindi non serve rifarlo ogni 15 minuti.

## Configurazione necessaria

Il repository dev'essere **pubblico**: su un repository privato il piano Free
dà 2.000 minuti di Actions al mese, mentre il ciclo ne consuma ~21.900
(~720 al giorno) e si esaurirebbe in tre giorni.

E in `Settings → Actions → General → Workflow permissions` va messo
**«Read and write permissions»**, altrimenti il `git push` del workflow
fallisce.

## I file

    costruisci-listino.mjs              produce il listino
    .github/workflows/listino.yml       il lavoro che rigenera ogni 15 minuti
    .github/workflows/galleria.yml      il lavoro che aggiorna gli album
    tools/gallery/scarica.mjs           legge gli album da fut.gg
    tools/gallery/genera.mjs            compone il catalogo
    tools/gallery/controlla-catalogo.mjs  lo verifica prima di pubblicare

## Nota

I prezzi vengono da `r2.fut.gg`, che è la fonte in blocco dei prezzi di
fut.gg: è roba di terzi e si legge senza permessi. Questo repository non
aggiunge niente ai prezzi: li raccoglie, li compatta e li pubblica ogni 15
minuti.
