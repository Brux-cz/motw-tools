# motw-tools

Repozitář pro vývoj různých nástrojů ke hře "Monster of the Week" — např. generátor postav, správce playbooků, sledovač sezení, NPC manager a další.

Status a nastavení
- Jméno repozitáře: `motw-tools`
- Viditelnost: **public** — vybráno kvůli GitHub Pages
- Licence: **MIT**
- Výchozí větev: `main`
- Počáteční stack: **Python** (CLI nástroje) — jednoduché pro prototypování
- Issues: povoleny (doporučeno pro sledování nápadů a chyb)

Struktura (navržená)
- README.md — tento soubor
- LICENSE — MIT licence
- .gitignore — Python šablona
- docs/ — obsah pro GitHub Pages (dokumentace, notes, landing page)
- tools/
  - character-generator/ — příklad jednoduchého Python CLI nástroje
  - session-tracker/ — prostor pro další nástroje
- .github/workflows/ — volitelně CI (testy/lint)

Rychlý start (pro Python nástroj)
1. Klonujte repo:
   - git clone https://github.com/Brux-cz/motw-tools.git
2. Vytvořte virtuální prostředí:
   - python -m venv .venv
   - source .venv/bin/activate (Linux/macOS) nebo `.venv\Scripts\activate` (Windows)
3. Nainstalujte závislosti (pokud existují):
   - pip install -r tools/character-generator/requirements.txt
4. Spusťte generátor:
   - python tools/character-generator/generator.py

GitHub Pages
- Výchozí nastavení: publikovat z větve `main`, složky `docs/`.
- Obsah `docs/` bude jednoduchá úvodní stránka s popisem projektu a odkazem na jednotlivé nástroje.

Další kroky
- Pokud chcete, mohu vám dát přesné příkazy pro vytvoření repozitáře lokálně a pushnutí na GitHub.
- Pokud chcete, mohu soubory i upravit (jiný text v README, jiný název repo nebo licence) — napište.