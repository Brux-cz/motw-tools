# Prompt Lab & Presety — Návod

## Co to je

**Prompt Lab** je sandbox kde ladíš AI prompty izolovaně od mystery editoru.
**Presety** umožňují uložit odladěné instrukce a pak je jedním klikem aktivovat v mystery editoru.

---

## Prompt Lab (tab "Lab" v sidebaru)

### Struktura karty pole

Každé pole záhady (název, koncept, hook, příšera...) má kartu s:

| Prvek | K čemu slouží |
|-------|--------------|
| **Zámek** (vlevo) | Zamkne hodnotu pole → stane se kontextem pro všechny AI prompty |
| **Aktuální hodnota** | Současná hodnota pole záhady (editovatelná) |
| **Doplňující instrukce** | Tvoje úprava stylu/tónu — přidá se K defaultnímu promptu (ne nahradí) |
| **▸ Finální prompt** | Kliknutím zobrazíš přesně co AI dostane (barevně odlišené části) |
| **Test** | Pošle prompt do AI, ukáže odpověď. Můžeš ji "Použít" do pole |

### Barvy ve finálním promptu

- **Zelená** — kontext ze zamčených polí
- **Šedá** — defaultní instrukce (automaticky generovaná)
- **Fialová** — tvoje doplňující instrukce
- **Žlutá** — JSON formát (automaticky přidaný)

### Ovládání

1. **Import záhady** — načte aktivní záhadu z kampaně jako pracovní kopii
2. **Nová** — vymaže vše, začne s prázdnou záhadou
3. **Zamknout pole** — klikni na zámek. Zamčená pole se přidají jako kontext do VŠECH promptů
4. **Napsat override** — do "Doplňující instrukce" napiš styl/tón (např. "ve stylu 80s hororu")
5. **Testovat** — klikni "Test" na kartě nebo "Test celé záhady" nahoře
6. **Resetovat override** — tlačítko "Resetovat" se ukáže jen když override existuje

### Filtrování

Tlačítka nahoře (Všechny / Koncept / Příšera / Odpočet / NPC / Lokace) filtrují zobrazené karty.

---

## Presety

### Uložení presetu (v Labu)

1. Nastav doplňující instrukce na polích kde chceš změnit styl
2. Zamkni pole jejichž hodnoty chceš zachovat
3. Klikni **Uložit preset** → zadej název (např. "80s horor")
4. Preset uloží: všechny overrides + zamčená pole + jejich hodnoty

### Načtení presetu (v Labu)

Vyber preset z dropdownu "Presety..." → načte overrides i zamčená pole.

### Smazání presetu

Vyber preset v dropdownu → klikni "Smazat".

---

## Preset v Mystery editoru

### Aktivace

1. Otevři mystery editor (+ Nový prvek)
2. V headeru vedle šablony je dropdown s presety
3. Vyber preset → objeví se fialový indikátor

### Co preset dělá

Když je preset aktivní, **každý AI prompt** v editoru automaticky dostane tvé doplňující instrukce:

- **✨ Generuj celou záhadu** — overrides se přidají jako kontext
- **✨ Generuj AI** na sekci (příšera, NPC, lokace, odpočet) — overrides se vloží před JSON suffix
- **↻ Regen** na jednotlivém poli — override pro dané pole se injektuje do promptu

### Deaktivace

Vyber "Bez presetu" v dropdownu → AI bude generovat s defaultními prompty.

### Persistence

Aktivní preset se pamatuje v prohlížeči (localStorage). Při příštím otevření editoru bude předvybraný.

---

## Typický workflow

```
1. Lab: Import záhady z kampaně
2. Lab: Napiš override na hook → "ve stylu 80s hororu, temně"
3. Lab: Napiš override na monster.description → "poetický a děsivý popis"
4. Lab: Otestuj pár polí → funguje styl? → uprav
5. Lab: Uložit preset "80s horor"

6. Mystery editor: Vyber preset "80s horor"
7. Mystery editor: Vyplň koncept + hook
8. Mystery editor: Generuj celou záhadu → AI generuje vše ve zvoleném stylu
9. Mystery editor: Regen na jednotlivých polích → styl se zachová
```
