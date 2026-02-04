# Prototyp Strážcovského panelu

## 📁 Soubory

### 1. `strazce-panel.html` (154 KB, 985 řádků)
**Funkční HTML prototyp** aplikace vygenerovaný pomocí Google Gemini.

**Co obsahuje:**
- Kompletní dark mode UI
- Interaktivní karty (NPC, příšery, lokace)
- Odpočet (countdown) systém
- Tahy Strážce (Keeper moves)
- Embedded CSS a JavaScript
- Standalone soubor - otevřeš v prohlížeči a běží

**Jak spustit:**
```bash
# Lokálně
xdg-open strazce-panel.html

# Nebo přetáhni soubor do Chrome/Firefox
```

**Vizuální ukázka:**
- Dark theme (#1a1a1a pozadí)
- Příklad příšery: Rev. Silas Thorne (Černokněžník)
- Příklad NPC: Dave Holloway (Barman)
- Odpočet: Day → Shadows → Sunset → Dusk → Night → Midnight
- Tahy: Měkké vs. Tvrdé tahy Strážce

**Status:** ✅ Funkční prototyp
- UI funguje
- Karty jsou interaktivní
- Dark mode je implementován
- Žádné externí závislosti (vše embedded)

---

### 2. `docs/wireframe-zadani.md` (55 KB, 1499 řádků)
**Design brief a wireframe dokumentace** pro grafika/designéra.

**Co obsahuje:**
1. Executive summary
2. Vizuální směr a atmosféra (barvy, fonty, UI feeling)
3. Layout a navigace
4. Wireframy všech 4 sekcí (ASCII art):
   - Kampaň (campaign management)
   - Záhada (mystery preparation)
   - Sezení (live session) ← **nejdůležitější**
   - Pravidla (rules reference)
5. UI komponenty a patterns
6. Responsive behavior (desktop → tablet → mobile)
7. Příklady reálného obsahu (typy příšer, tahy, zbraně)
8. Prioritizace (MVP fáze)
9. Technické požadavky
10. Deliverables od grafika
11. Reference a inspirace
12. Timeline (4 týdny)

**Cílová skupina:** Grafik/designer, který bude navrhovat vizuální podobu aplikace

**Formát:** Markdown s ASCII wireframy

**Status:** ✅ Kompletní dokumentace připravená k handoff

---

## 🎯 Co dál?

### Možnost A: Vývoj podle prototypu
- Vzít `strazce-panel.html` jako základ
- Rozdělit HTML/CSS/JS do samostatných souborů
- Přidat datový model (localStorage/IndexedDB)
- Implementovat zbývající funkce z `app-spec.md`

### Možnost B: Profesionální design workflow
1. Poslat `wireframe-zadani.md` grafikovi
2. Grafik vytvoří high-fidelity wireframes (Figma/Sketch)
3. Implementovat podle designu grafika

### Možnost C: Hybridní přístup
- Použít prototyp jako proof-of-concept
- Grafik vytvoří finální design systém
- Merge nejlepších prvků z obou verzí

---

## 📊 Srovnání

| Aspekt | Prototyp (HTML) | Wireframe (MD) |
|--------|-----------------|----------------|
| **Účel** | Funkční demo | Design spec |
| **Pro koho** | Vývojáře, testery | Grafiky, designéry |
| **Stav** | Běžící kód | Dokumentace |
| **Interaktivita** | Plně funkční | Statické wireframy |
| **Vizuální kvalita** | Základní dark mode | ASCII art + design směr |
| **Kompletnost** | Částečná (hlavní UI) | Kompletní (všechny sekce) |

---

## 🔍 Technické detaily

### Prototyp (HTML)
- **Jazyk:** HTML5 + CSS3 + Vanilla JavaScript
- **Velikost:** 154,829 znaků
- **Dark mode:** ✅ Implementováno
- **Responsive:** ⚠️ Desktop-first (tablet/mobile TBD)
- **Data:** Hardcoded (žádné localStorage/IndexedDB)
- **Browser support:** Chrome/Firefox tested

### Wireframe dokumentace
- **Formát:** Markdown (GitHub Flavored)
- **Wireframy:** ASCII art (textové)
- **Barevná paleta:** HEX kódy specifikovány
- **Typografie:** Font recommendations
- **Breakpoints:** 1920x1080, 1440x900, 1024x768, 375x667

---

## 📝 Poznámky

**Zdroj prototypu:** Google Gemini (AI-generated)
- Vygenerováno z `wireframe-zadani.md` jako vstup
- Extrahováno z browser snapshot pomocí Playwright
- Datum vytvoření: 2026-02-01

**Důležité:**
- Prototyp je pouze **proof-of-concept**
- Pro produkční verzi doporučuji profesionální design review
- Wireframe dokumentace je autoritativní zdroj pro požadavky

---

Vytvořeno: 2026-02-02 00:00 UTC
