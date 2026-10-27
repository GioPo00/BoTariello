# Price list and gallery catalogue

This repository contains no data. It contains two scheduled jobs that publish
two JSON files, rebuilt from scratch on a fixed cadence and meant to be read
straight into memory by a consumer.

| branch | file | rebuilt |
|---|---|---|
| `dati` | `listino-console.json` | every 15 minutes |
| `dati` | `listino-pc.json` | every 15 minutes |
| `dati` | `stato.json` | every 15 minutes |
| `galleria` | `catalogo-fc27.json` | every 3 hours |

Consumers read them straight from `raw.githubusercontent.com`, with no API key
and no rate limit of their own.

## The price list

The source publishes its data in bulk, split across several files, each one
identified by the fingerprint of its content. This job reads the manifest,
downloads the three files it needs and merges them into one compact file per
platform:

    { "v": 2, "id0": 27, "d": [...], "p": [...], "n": [...], "quando": "..." }

| field | meaning |
|---|---|
| `id0` | the identifier of the first card |
| `d` | the identifiers, stored as **differences** between consecutive values |
| `p` | one price per card, in the same order as `d` |
| `n` | the identifiers of the cards that are not on the market |
| `quando` | when this file was generated (ISO 8601) |

Two details that matter to a reader:

- **`p[i] === 0` means "no price", never "free".** It has to be discarded.
- **`n` is a set of exceptions, not a list to act on.** A card is in it when the
  source gives it a state other than 0: a squad building challenge (the price
  is the cost of the challenge), an objective or a reward. A reader that does
  not know the field can ignore it safely.

The identifiers are stored as differences because that is what keeps the file
small: about 130 KB per platform for twenty thousand cards.

### Which price wins

The source publishes two files per platform: a settled one and a `-dyn` one
that keeps moving. The dynamic one is the good one — measured on 2026-09-20,
1.722 cards out of 19.870 had a different price there. Where the dynamic file
has no number the settled one is used, and where neither has one the card is
left at zero.

### How fresh is it

The list is rebuilt every quarter of an hour. Measured over a ten minute
window, **31% of the prices change** — the cheapest listing of a card is sold
and the next one costs several times more. Consumers that need a live price
for a handful of cards should ask the market directly; this file is the bulk
view.

`quando` tells the consumer how old the file is, and it is the only way to
tell a fresh list from a stale one.

## The gallery catalogue

`tools/gallery/` reads the full album catalogue from the source and publishes
it as JSON: one entry per album, with the required cards, the five thresholds
and the five rewards.

The source is not the game: the game does not publish the collection, and the
web app only knows two fields of it. The source pages carry the game's club
identifier in the image address, which is the only way to tie the catalogue to
the teams the game declares.

The thresholds are fixed for a year, so they are downloaded once, checked, and
kept as plain data instead of being fetched on every use.

## Layout

    costruisci-listino.mjs              builds the price list
    .github/workflows/listino.yml        the job that rebuilds it every 15 minutes
    .github/workflows/galleria.yml       the job that rebuilds the catalogue
    tools/gallery/scarica.mjs            reads every album from the source
    tools/gallery/genera.mjs             turns the download into the catalogue
    tools/gallery/controlla-catalogo.mjs checks the catalogue before publishing
    tools/gallery/gemelle.json           hand measured pairs of men's and women's cards

## Running it by hand

    node costruisci-listino.mjs listino      # writes listino-console.json, listino-pc.json, stato.json
    node tools/gallery/scarica.mjs            # writes tools/gallery/gallery-fc27.json
    node tools/gallery/genera.mjs --json out.json

Node 22 or later. No dependencies.

## The two jobs

Both are plain GitHub Actions workflows, and both can be started by hand from
the Actions tab.

`listino` keeps a single run alive for almost six hours — GitHub's maximum —
and rebuilds the list on its own every quarter of an hour. GitHub's own
"every 15 minutes" cron does not fire every 15 minutes: it fires when it can,
i.e. every 3 to 6 hours. When the job ends, is killed or is cancelled it
starts another one, so the list never goes stale for long.

Both branches are **rewritten** on every run: one commit, always the same size.
Keeping the history would mean growing the repository by tens of megabytes a
day, forever, for a history nobody reads.

The repository must stay **public**: on the free plan a private repository
gets 2.000 Actions minutes a month, and the price list job alone uses about
21.900. There is nothing to protect in here — only published JSON and a script
that reads public data.

## Credits

The prices and the album catalogue come from
[fut.gg](https://www.fut.gg), which publishes them in bulk.
