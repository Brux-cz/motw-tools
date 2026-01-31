# VISION — Co stavíme a proč

> Tento dokument zachycuje celkovou vizi projektu motw-tools.
> Je to živý dokument — bude se vyvíjet spolu s projektem.
> Poslední aktualizace: 2026-01-31

---

## Jednou větou

**Osobní asistent a pomocník pro hraní hry Příšera týdne (Monster of the Week).**

---

## Co to je

Ne jeden nástroj, ale **prostředí** — sada propojených pomůcek, které pomáhají
Strážci (a hráčům) s přípravou i průběhem hry. Něco jako osobní herní deník,
generátor, referenční příručka a pomocník v jednom.

## Co to NENÍ

- Není to náhrada pravidel — pravidla jsou v knize
- Není to virtuální tabletop (Roll20, Foundry) — hra se hraje u stolu
- Není to databáze — jde o praktické pomůcky, ne o skladiště dat
- Není to pevný software s jedním účelem — je to rostoucí ekosystém

---

## Proč to stavíme

Příšera týdne je hra, kde:
- Příprava je **minimální** (pár minut, ne hodiny)
- Hra je **improvizovaná konverzace** — ne scénář
- Strážce potřebuje **rychlé pomůcky**, ne složité systémy
- Klíčové je mít po ruce **správné informace ve správný čas**

Existující nástroje (generické RPG trackery, tabulky) neodpovídají tomuto
stylu hry. Potřebujeme něco šitého na míru.

---

## Z čeho vycházíme (poznatky z brainstormingu)

### Jak hra reálně funguje u stolu

1. Strážce má před sebou **vyplněnou šablonu záhady** na papíře
2. Během hry **škrtá odpočet** tužkou
3. Má po ruce **nápovědní kartu tahů** a **seznam jmen NPC**
4. Vše ostatní improvizuje na základě konverzace s hráči
5. Mezi sezeními analyzuje poznámky a připravuje novou záhadu

### Co z toho plyne pro nástroje

- **Rychlost je klíčová** — nástroj musí být rychlejší než tužka a papír
- **Jednoduchost** — žádné složité wizardy, formuláře na 20 minut
- **Inspirace > zadávání dat** — nástroj má nabízet nápady, ne vyžadovat input
- **Tisknutelné výstupy** — výsledek musí jít vzít k hernímu stolu
- **Offline first** — u stolu nemusí být internet

---

## Co by prostředí mohlo obsahovat

### Vrstva 1: Znalostní báze (už existuje)
Strukturovaný přehled pravidel v `docs/rules/`. Slouží jako:
- Referenční příručka pro Strážce i hráče
- Datový základ pro generátory
- Živý dokument rozšiřovaný o nový obsah (Tome of Mysteries, komunita)

### Vrstva 2: Generátory a pomůcky
Rychlé CLI nástroje pro přípravu hry:

| Pomůcka | Co dělá | Priorita |
|---------|---------|----------|
| **Šablona záhady** | Vygeneruje prázdnou/předvyplněnou šablonu k tisku | Vysoká |
| **Randomizér příšer** | Náhodný typ + motivace + slabina pro inspiraci | Vysoká |
| **Generátor NPC** | Jméno + typ + motivace + krátký popis | Vysoká |
| **Nápovědní karty** | Tahy Strážce, typy hrozeb, štítky — k tisku | Střední |
| **Generátor odpočtu** | Pomoc s tvorbou 6 fází na základě příšery | Střední |
| **Generátor záhady** | Kompletní záhada z náhodných/vybraných prvků | Nízká (ambiciózní) |

### Vrstva 3: Sledování kampaně (budoucnost)
- Archiv odehraných záhad
- Sledování příběhových oblouků a jejich odpočtů
- Seznam NPC, které lovci potkali
- Herní deník

### Vrstva 4: AI asistent (budoucnost)
- Propojení s NotebookLM přes MCP pro research v pravidlech
- AI generování záhad na základě vstupů Strážce
- Interaktivní brainstorming příšer, NPC, zápletek

---

## Principy vývoje

1. **Jednoduchost** — radši malý užitečný nástroj než velký nepoužitelný systém
2. **Postupně** — stavíme po malých krocích, každý krok musí být sám o sobě užitečný
3. **Praxe rozhoduje** — pokud to nepomáhá u stolu, nemá to smysl
4. **Otevřenost** — nový obsah (záhady, příšery, NPC) jde přidávat bez změny kódu
5. **Brainstorming first** — hodně mluvit a přemýšlet, pak teprve kódovat

---

## Co máme (stav k 2026-01-31)

### Hotovo
- [x] Znalostní báze pravidel (`docs/rules/` — 7 souborů)
- [x] Analýza NotebookLM integrace (`docs/notebooklm-collaboration-analysis.md`)
- [x] Vize projektu (tento dokument)

### Rozpracováno
- [ ] Koncept mystery-creator nástroje (plán existuje, nezačala implementace)
- [ ] Sběr pravidel z NotebookLM (základ hotov, chybí bonusové playbooky, Tome of Mysteries)

### Budoucí nápady
- [ ] Randomizér příšer
- [ ] Generátor NPC jmen
- [ ] Nápovědní karty k tisku
- [ ] Sledování kampaně
- [ ] AI integrace (MCP + NotebookLM)
- [ ] Generátor kompletních záhad
- [ ] Import záhad z komunity / jiných knih

---

## Technologie

- **Python** — CLI nástroje, jednoduché pro prototypování
- **Markdown** — formát pro znalostní bázi i výstupy
- **JSON** — datový formát pro uložení záhad, NPC, kampaní
- **Git** — verzování všeho

---

## Jak na tom pracujeme

1. **Brainstorming** — konverzace, sbírání nápadů, výzkum pravidel
2. **NotebookLM** — zdroj informací z pravidel (přes MCP nebo manuální export)
3. **Znalostní báze** — ukládání poznatků do `docs/rules/`
4. **Tento dokument** — aktualizace vize na základě nových poznatků
5. **Implementace** — až bude koncept jasný, začneme kódovat

> Aktuálně jsme ve fázi 1–2: brainstormujeme a sbíráme znalosti.
