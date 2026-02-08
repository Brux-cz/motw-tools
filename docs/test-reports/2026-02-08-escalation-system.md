# Test: Eskalační systém (soft→hard move)

**Datum:** 2026-02-08 | **Metoda:** Playwright browser test | **Výsledek:** 4/4 PASS

## Co jsme testovali

Ověření že GM engine správně implementuje MotW pravidla pro eskalaci keeper tahů:
- Failure → soft move (setup/varování), NE okamžitý hard move
- Ignorování varování → golden opportunity → hard move
- Reakce na varování → žádný hard move
- Partial success u KSA → oboustranný harm dle pravidel

## Výsledky

### Test A: Failure → soft move ✅
- Hráč hodil failure na Investigate a Mystery
- GM engine vygeneroval soft move (varování/setup)
- Žádný okamžitý harm, žádné mechanické důsledky
- Narativ končí otázkou "Co uděláš?"

### Test B: Ignorování → hard move ✅
- Po soft move hráč zadal nesouvisející akci (ignoroval varování)
- `detectIfPlayerAddressedSetup()` vrátil false
- GM engine provedl hard move (golden opportunity)
- Console log: `[GM Engine] Player ignored setup → golden opportunity → hard move`
- Mechanické důsledky aplikovány

### Test C: Reakce → no hard move ✅
- Po soft move hráč zareagoval na varování (reaktivní klíčová slova)
- `detectIfPlayerAddressedSetup()` vrátil true
- Žádný hard move, tension snížen
- Console log: `[GM Engine] Player addressed setup → no hard move`

### Test D: Partial KSA → oboustranný harm ✅
- Hráč hodil 7-9 na Kick Some Ass
- Obě strany si udělily harm (dle pravidel tahu)
- `applyHarm()` zavolán s 1 harm pro lovce
- Narativ popisuje oboustrannou výměnu úderů

## Zjištění / Problémy k řešení

- **Session začíná příliš akčně** — tension startuje na 5/10, chybí úvodní "teaser" fáze
- Opening scene je `'mysterious'` místo klidného příjezdu do města
- AI nemá pacing instrukce pro pomalý buildup (Supernatural styl)
- → Řešení: Přidána fáze `teaser` s tension 2/10 a pacing instrukcemi

## Technické poznámky

- `Math.random` override pro řízení hodů kostkami (deterministické testování)
- Console logy potvrzují správný flow eskalace
- Test pokrývá celý lifecycle: soft move → pending setup → detection → hard/no hard move
- `pendingSetup` objekt správně ukládá a čistí stav mezi akcemi
