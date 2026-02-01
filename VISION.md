# VISION — Co stavíme a proč

> Tento dokument zachycuje celkovou vizi projektu motw-tools.
> Je to živý dokument — bude se vyvíjet spolu s projektem.
> Poslední aktualizace: 2026-02-01

---

## Jednou větou

**Strážcovský panel — webová appka pro online vedení hry Příšera týdne (Monster of the Week).**

---

## Co to je

Webová aplikace běžící vedle Discord voice callu. Slouží jako **kokpit Strážce** —
vše co potřebuješ pro přípravu, vedení a sledování hry na jednom místě.

Příprava záhad, tracking lovců, NPC a lokací jako karty, quick reference pravidel,
generátory pro inspiraci za běhu.

## Co to NENÍ

- Není to VTT (Roll20, Foundry) — MotW je theater of the mind
- Není to nástroj pro hráče — hráči mají PDF playbooky, komunikují hlasem
- Není to náhrada pravidel — je to rychlá reference a organizační nástroj
- Není to databáze — jde o praktické pomůcky pro živou hru

---

## Herní styl a setting

**Supernatural styl — americký setting.** Hra se odehrává převážně v USA,
inspirace seriálem Supernatural (a podobnými: Buffy, X-Files). Český folklór
a české reálie nejsou priorita — nástroje by měly generovat americká jména,
americká města, americké reálie.

**Způsob hraní:** Online přes Discord voice. Strážce má appku vedle Discordu
na obrazovce. Hráči appku nevidí.

---

## Proč to stavíme

Příšera týdne je hra, kde:
- Příprava je **minimální** (pár minut, ne hodiny)
- Hra je **improvizovaná konverzace** — ne scénář
- Strážce potřebuje **rychlé pomůcky**, ne složité systémy
- Klíčové je mít po ruce **správné informace ve správný čas**
- Online hra vyžaduje **digitální tracking** — nemáš papír před sebou

Existující nástroje (generické RPG trackery, tabulky) neodpovídají tomuto
stylu hry. Potřebujeme něco šitého na míru.

---

## Architektura appky

### 4 hlavní sekce

| Sekce | Kdy se používá | Co obsahuje |
|-------|----------------|-------------|
| **Kampaň** | Mezi sezeními | Lovci, příběhové oblouky, NPC archiv, historie |
| **Záhada** | Příprava před hrou | Příšera, NPC, lokace, odpočet, tahy na míru |
| **Sezení** | Během živé hry | Odpočet, karty, harm tracking, poznámky, Strážcův panel |
| **Pravidla** | Kdykoli | Quick reference, fulltextové hledání |

Detailní specifikace: [`docs/app-spec.md`](docs/app-spec.md)

---

## Klíčové principy designu

### Kokpit, ne kniha
- **Vidíš pořád:** harm lovců, odpočet, zdraví příšery
- **Mrkneš vpravo:** měkký/tvrdý tah — 5 slov na řádek
- **Najedeš myší:** detail s příkladem
- **Klikneš:** plné pravidlo

### Progresivní detail (3 úrovně)
1. **Mrkneš** — kompaktní, vždy viditelné (90 % situací)
2. **Rozklikneš** — detail tahu, otázky, selhání
3. **Plný text** — výjimečně, spor o pravidlo

### Všechno je karta
NPC, lokace, příšera, přisluhovač — jednotný formát. Karty jsou editovatelné
kdykoli, patří kampani, přežijí záhadu, dají se znovu použít.

### Rychlost > komplexita
Nástroj musí být rychlejší než hledání v pravidlech. Žádné wizardy,
žádné formuláře na 20 minut. Jeden klik → výsledek → edituj.

---

## Datový základ

### Vrstva 1: Znalostní báze (hotovo)
Strukturovaný přehled pravidel v `docs/rules/`. Slouží jako:
- Zdroj dat pro appku (tahy, typy hrozeb, zbraně, playbooky)
- Referenční materiál pro Strážce
- 13 souborů pravidel + 12 playbooků

### Vrstva 2: Strukturovaná data (potřeba vytvořit)
JSON soubory pro appku:
- Playbooky (atributy, tahy, zbraně, štěstěna)
- Zbraně (harm, dosah, štítky)
- Typy hrozeb (příšery, přisluhovači, přihlížející, lokace)
- Tahy (základní, pokročilé, Strážce)
- Jména NPC (americká, muž/žena/neutrální)

---

## Technologie

- **Static web app** — HTML + CSS + JS, žádný backend
- **localStorage / IndexedDB** — persistentní stav (kampaň, záhady, lovci)
- **JSON** — herní data i uložené kampaně
- **GitHub Pages** — hosting zdarma přímo z repa
- **Offline capable** — jednou načtené = běží bez internetu
- **Export/import JSON** — backup a přenos dat

---

## Fáze implementace

### Fáze 1: Kostra + reference
- Panel se záložkami (Kampaň, Záhada, Sezení, Pravidla)
- JSON data (tahy, typy hrozeb, zbraně, jména)
- Pravidla tab — quick reference s progresivním detailem
- Strážcův panel (tahy Strážce měkký/tvrdý, tahy lovců)

### Fáze 2: Příprava záhady
- Formulář záhady (příšera, NPC, lokace, odpočet, tahy na míru)
- Generátory (příšera 🎲, NPC 🎲, lokace 🎲)
- Kartový systém (NPC, lokace, přisluhovači)

### Fáze 3: Session tracking
- Harm/štěstí/XP tracking lovců (spodní lišta)
- Odpočet tracker
- Připnuté karty ve scéně
- Poznámky za běhu

### Fáze 4: Kampaň
- Seznam lovců s poznámkami Strážce
- Příběhové oblouky s odpočty
- NPC archiv (filtrování, tagy, stavy)
- Historie sezení

### Fáze 5: Budoucnost
- AI asistent (MCP + NotebookLM)
- Generátor kompletních záhad
- Import záhad z komunity
- Sdílený tldraw canvas link

---

## Co máme (stav k 2026-02-01)

### Hotovo
- [x] Znalostní báze pravidel (`docs/rules/` — 13 souborů + 12 playbooků)
- [x] Analýza NotebookLM integrace (`docs/notebooklm-collaboration-analysis.md`)
- [x] Vize projektu (tento dokument)
- [x] Česká lokalizace a slovník termínů
- [x] Specifikace appky (`docs/app-spec.md`)

### Další kroky
- [ ] Konverze pravidel do JSON datových souborů
- [ ] Kostra webové appky (HTML + CSS + JS)
- [ ] Pravidla tab s progresivním detailem
- [ ] Strážcův panel (tahy Strážce + tahy lovců)
- [ ] NPC generátor
- [ ] Příprava záhady

---

## Jak na tom pracujeme

1. **Brainstorming** — konverzace, UX design, iterace na specifikaci
2. **Znalostní báze** — pravidla v `docs/rules/` jako zdroj dat
3. **Specifikace** — detailní popis v `docs/app-spec.md`
4. **Implementace** — po malých krocích, každý krok sám o sobě užitečný

> Aktuálně: specifikace hotová, připraveno na implementaci.
