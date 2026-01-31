# Analýza: Programatický přístup a kolaborace s Google NotebookLM

## Kontext

Tato analýza zkoumá možnosti programatického přístupu ke Google NotebookLM
notebooku (`c57e9e3e-4091-49d9-be6d-8530ee7c4ca8`) a obecně možnosti kolaborace
AI asistenta s obsahem NotebookLM.

---

## 1. Přímý přístup k notebooku — shrnutí

**Přímý přístup k obsahu konkrétního NotebookLM notebooku z externího nástroje
není triviální.** NotebookLM je webová aplikace s autentizací přes Google účet.
URL notebooku (`notebooklm.google.com/notebook/...`) vyžaduje přihlášení a
neposkytuje veřejné API pro čtení obsahu.

### Co to znamená v praxi

- AI asistent (Claude, GPT aj.) **nemůže přímo otevřít** a přečíst obsah
  NotebookLM notebooku přes URL.
- NotebookLM neexportuje obsah ve formátu, který by šel snadno stáhnout přes
  HTTP request bez autentizace.
- Pro kolaboraci je nutné použít jeden z přístupů popsaných níže.

---

## 2. Oficiální Google NotebookLM Enterprise API

Google v září 2025 spustil **NotebookLM Enterprise API** (alpha verze).

### Dostupné operace

| Operace | Metoda | Popis |
|---------|--------|-------|
| Vytvořit notebook | `notebooks.create` | POST request pro vytvoření nového notebooku |
| Získat notebook | `notebooks.get` | Načtení konkrétního notebooku podle ID |
| Přidat zdroje | `notebooks.sources.batchCreate` | Hromadné přidání zdrojů (URL, soubory, Drive) |
| Sdílet notebook | `notebooks.share` | Sdílení přes IAM role (Owner/Editor/Viewer) |

### Předpoklady

- Google Cloud projekt s povoleným NotebookLM Enterprise API
- Autentizace přes `gcloud auth login` nebo OAuth token
- Endpoint: `discoveryengine.googleapis.com` (v1alpha)
- **Cena: $9/licence/měsíc**

### Omezení

- API je v **alpha** stavu — ne všechny funkce fungují dle dokumentace
- Nepokrývá všechny funkce webového rozhraní (např. Reports, Audio Overview)
- Maximální velikost dokumentu: 200 MB nebo 500 000 slov
- Excel: max ~150 000 aktivních buněk
- Data uložena v US nebo EU multi-regionu
- **Neexistuje pro consumer/free verzi NotebookLM** — pouze Enterprise

### Hodnocení pro náš případ

Enterprise API by teoreticky umožnilo programatický přístup, ale:

1. Vyžaduje placenou Enterprise licenci
2. API je v alpha a nemusí být stabilní
3. Neumožňuje číst/exportovat poznámky a konverzace — zaměřuje se na správu
   notebooků a zdrojů

---

## 3. Neoficiální nástroje a knihovny

### 3.1 notebooklm-py (Python)

**Repozitář:** [teng-lin/notebooklm-py](https://github.com/teng-lin/notebooklm-py)

Nejkompletnější neoficiální knihovna. Nabízí:

- Správa notebooků (CRUD)
- Správa zdrojů (URL, PDF, YouTube, Google Drive, soubory)
- **Chat s notebookem** — programatický dotaz s historií konverzace
- Generování obsahu: audio přehledy (50+ jazyků), videa, prezentace,
  infografiky, kvízy, flashcards, reporty, myšlenkové mapy
- Batch download a export (JSON/Markdown/HTML)
- Programatické sdílení

**Rizika:**
- Používá **neoficiální/nedokumentované Google API**
- Může přestat fungovat kdykoliv bez varování
- Není afiliován s Google

### 3.2 notebooklm-mcp-cli

**Repozitář:** [jacob-bd/notebooklm-mcp-cli](https://github.com/jacob-bd/notebooklm-mcp-cli)

MCP (Model Context Protocol) server pro NotebookLM — umožňuje AI asistentům
(Claude, Gemini) přímo pracovat s NotebookLM:

- Vytváření a správa notebooků
- Přidávání zdrojů (URL, text, Drive, soubory)
- **Dotazování notebooku přes AI chat**
- Generování obsahu (podcasty, videa, briefing dokumenty, flashcards aj.)
- Web a Drive research s automatickým importem zdrojů
- Sdílení a kolaborace

**Integrace:** Claude Code, Gemini CLI, Cursor, VS Code, Claude Desktop

**Toto je nejslibnější cesta pro kolaboraci AI asistenta s NotebookLM.**

### 3.3 nblm-rs (Rust + Python SDK)

**Repozitář:** [K-dash/nblm-rs](https://github.com/K-dash/nblm-rs)

Klient pro NotebookLM Enterprise API postavený na Rustu:
- CLI pro shell scripting a automatizaci
- Python SDK pro aplikační integraci
- Strukturované JSON výstupy

### 3.4 Open Notebook (open-source alternativa)

**Repozitář:** [lfnovo/open-notebook](https://github.com/lfnovo/open-notebook)

Self-hosted alternativa k NotebookLM s plným REST API:

| Vlastnost | Open Notebook | NotebookLM |
|-----------|---------------|------------|
| Deployment | Self-hosted / cloud | Google only |
| AI poskytovatelé | 16+ (OpenAI, Anthropic, Ollama...) | Pouze Google |
| Podcast formát | 1-4 mluvčí s profily | 2 mluvčí |
| API přístup | Plné REST API | Omezené (Enterprise) |
| Cena | Platíte jen za AI usage | Předplatné |

### 3.5 Apify NotebookLM Actor

**URL:** [Apify NotebookLM API](https://apify.com/clearpath/notebooklm-api)

Export NotebookLM notebooků do JSON, CSV, Markdown nebo Excel — včetně
konverzací, metadat zdrojů a mapování citací.

---

## 4. Praktické scénáře kolaborace

### Scénář A: Export obsahu z NotebookLM → AI asistent

**Postup:**
1. Manuálně exportovat/zkopírovat obsah z NotebookLM
2. Vložit jako soubor do repozitáře (markdown, JSON)
3. AI asistent pracuje s lokální kopií

**Výhody:** Jednoduché, žádné závislosti
**Nevýhody:** Ruční práce, obsah se rychle stane neaktuální

### Scénář B: MCP integrace (notebooklm-mcp-cli)

**Postup:**
1. Nainstalovat `notebooklm-mcp-cli`
2. Nakonfigurovat MCP server v Claude Code / Claude Desktop
3. AI asistent přímo vytváří, dotazuje a spravuje notebooky

**Výhody:** Plná obousměrná kolaborace, automatizace
**Nevýhody:** Neoficiální API, vyžaduje autentizaci Google účtem

### Scénář C: Open Notebook jako self-hosted alternativa

**Postup:**
1. Nasadit Open Notebook (Docker)
2. Naimportovat zdroje z NotebookLM
3. Využít plné REST API pro integraci

**Výhody:** Plná kontrola, stabilní API, volba AI modelu
**Nevýhody:** Nutnost self-hostingu, migrace obsahu

### Scénář D: Hybrid — NotebookLM pro research, repozitář pro kolaboraci

**Postup:**
1. NotebookLM slouží jako research/brainstorming nástroj
2. Klíčové výstupy se ukládají do `docs/` v repozitáři
3. AI asistent pracuje s repozitářem jako zdrojem pravdy

**Výhody:** Best of both worlds, verzování obsahu
**Nevýhody:** Ruční synchronizace

---

## 5. Doporučení pro motw-tools

Pro projekt motw-tools doporučuji **kombinaci přístupů D a B**:

### Krátkodobě (ihned)

1. **Exportovat klíčový obsah z NotebookLM** do `docs/` složky v repozitáři
2. Vytvořit strukturu pro ukládání poznámek, světotvorby a herních materiálů
3. AI asistent pracuje s obsahem repozitáře

### Střednědobě (pokud se potřeba prohloubí)

1. Nastavit **notebooklm-mcp-cli** pro přímou integraci
2. Automatizovat synchronizaci mezi NotebookLM a repozitářem
3. Využít NotebookLM pro AI-powered research nad herními materiály

### Dlouhodobě (pokud Google stabilizuje API)

1. Přejít na oficiální Enterprise API (až vyjde z alpha)
2. Nebo zvážit Open Notebook pro plnou kontrolu

---

## 6. Shrnutí

| Přístup | Funkčnost | Stabilita | Cena | Složitost |
|---------|-----------|-----------|------|-----------|
| Oficiální Enterprise API | Omezená | Alpha | $9/měs/licence | Střední |
| notebooklm-py | Plná | Nestabilní | Zdarma | Nízká |
| notebooklm-mcp-cli | Plná + AI | Nestabilní | Zdarma | Střední |
| Open Notebook | Plná | Stabilní | Hosting + AI | Vysoká |
| Manuální export | Základní | Stabilní | Zdarma | Nízká |

**Klíčový závěr:** Google NotebookLM v současnosti **neposkytuje veřejné API
pro consumer verzi**. Programatický přístup je možný přes neoficiální nástroje
nebo placené Enterprise API (alpha). Pro projekt motw-tools je nejpraktičtější
kombinace manuálního exportu s postupnou automatizací přes MCP integraci.

---

## Zdroje

- [Google Cloud — NotebookLM Enterprise API](https://docs.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks)
- [notebooklm-py](https://github.com/teng-lin/notebooklm-py)
- [notebooklm-mcp-cli](https://github.com/jacob-bd/notebooklm-mcp-cli)
- [nblm-rs](https://github.com/K-dash/nblm-rs)
- [Open Notebook](https://github.com/lfnovo/open-notebook)
- [Apify NotebookLM API](https://apify.com/clearpath/notebooklm-api)
- [Google AI Developers Forum — NotebookLM API diskuze](https://discuss.ai.google.dev/t/how-to-access-notebooklm-via-api/5084)
