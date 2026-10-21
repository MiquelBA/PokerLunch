# POKER LUNCH — Regles (v0.4)

Font de veritat de les regles. Els valors són a `src/engine/config.ts`.

## 1. Tauler i cartes
- Tauler de 5×5, sempre ple, amb cartes de pòquer reals. Veïns: les 8 caselles del voltant.
- Les cartes surten d'un **sabot de 2 baralles (104 cartes) i 3 comodins**, barrejat amb la llavor de la partida. Quan s'acaba, se'n barreja un de nou.
- Un 4% de les cartes que surten són **daurades** (mai un comodí).

## 2. La jugada
- Es traça un camí de **3 a 5 cartes** veïnes, sense repetir casella; pot girar.
- **Totes les cartes del camí han de formar part de la mà.** L'ordre no importa.
- L'as fa d'1 o de 14. El **comodí** fa de la carta que falti; la mà ha de tenir com a mínim una carta real.

| Cartes | Mans possibles |
|---|---|
| 3 | Trio |
| 4 | Doble parella, pòquer |
| 5 | Escala, color, full, escala de color, repòquer (5 iguals, possible amb 2 baralles), escala reial |

## 3. Punts i efectes
`punts = (punts de la mà + suma dels números de les cartes reals) × combo × 2^(daurades) × varietat`

L'ordre i els punts segueixen el pòquer real: com més difícil, molt més val.

| Mà | Punts | Fitxes | Temps | Efecte al tauler | Poder (varietat) |
|---|---:|---:|---:|---|---|
| Doble parella | 100 | 2 | | | +3 s |
| Trio | 150 | 3 | | | Cau un comodí |
| Escala | 250 | 2 | | | Rebenta la fila de l'última carta |
| Color | 350 | 2 | | | Tempesta: rebenta totes les cartes del pal |
| Full | 800 | 2 | +2 s | | Les cartes del número del trio es tornen daurades |
| Pòquer | 2.000 | ∞ | +3 s | Rebenta la fila i la columna de l'última carta | Punts ×2 |
| Escala de color | 5.000 | ∞ | +4 s | Rebenta les cartes del mateix pal que toquen el camí | Punts ×2 |
| Repòquer | 10.000 | ∞ | +4 s | Rebenta totes les cartes d'aquell número | Punts ×2 |
| Escala reial | 20.000 | ∞ | +5 s | Rebenta tot el tauler | Punts ×2 |

### Espectacle per nivell
- **Escala**: una llum corre carta a carta pel traç i una ràfega creua el tauler, amb una escala musical que puja.
- **Color**: una font de símbols del pal (♥ ♦ ♠ ♣) que salta i cau sobre el tauler, amb un acord brillant.
- **Full**: jackpot, pluja de fitxes de casino i el marcador roda com una escurabutxaques.
- **Pòquer**: feixos de llum, triple ona, sacsejada forta i espurnes.
- **Escala de color**: ona gegant del color del pal i focs artificials.
- **Repòquer**: la pantalla s'enfosqueix, les cartes giren cap al centre i confeti.
- **Escala reial**: pantalla completa més llarga, pluja d'or, totes les cartes daurades un moment i fanfàrria.

- Cada carta rebentada val 40 punts × combo.
- **Combo de velocitat**: una mà a menys de 2,5 s de l'anterior; multiplicadors ×1,2, ×1,5, ×2.
- Bonificació de temps màxima per partida: +20 s (el +3 s del poder de la doble parella no hi compta).

### Fitxes
Les mans petites tenen fitxes (els punts daurats de la barra de sota). Fer una mà en gasta una; fer qualsevol altra mà en torna una a cada mà que no les tingui totes. **Sense fitxes, aquella mà no es pot fer** (el traç surt en vermell). Així no es poden fer colors (ni cap altra mà) seguits sense parar.

### Varietat
**3 mans diferents seguides**: la 3a val **×2** i desferma el seu **poder** (taula de dalt). Repetir una mà que ja és a la ratxa la torna a començar; completar-la també.

Calibratge (`npm run sim -- 12 30`, 30 jugades): un bot que mira la varietat fa uns 83.000 punts; un que fa colors sempre que pot, uns 38.000.

## 4. Gravetat, reposició i remenat
- Les cartes cauen per omplir els forats; les noves surten del sabot, columna per columna, de baix a dalt.
- Si hi ha menys de 3 mans possibles, el tauler es remena (fins a 20 intents); si no n'hi ha prou, es reparteix un tauler nou.

## 5. Partida
- Les cartes es reparteixen cap per avall durant el compte enrere i es giren totes alhora al «Som-hi!».
- **Pista**: després de 20 s sense jugar, s'il·luminen les cartes d'una mà possible (en les 3 primeres mans d'un jugador nou, un dit la dibuixa).
- 2 minuts, amb compte enrere. El rellotge s'atura mentre es reprodueixen les animacions i quan l'app passa a segon pla.
- **Repte diari**: la mateixa llavor per a tothom cada dia (hora de Barcelona); només compta el primer intent, després és pràctica. Ratxa de dies seguits.
- **Classificació** compartida (Supabase): una general (partides lliures, rànquing `poker-v3`) i una per a cada repte diari (només el primer intent).

## 6. Dades del simulador (`npm run sim -- 12 30`)
Tauler de 5×5 amb 3 comodins: unes 65 mans jugables de mitjana. Percentatge de taulers on hi ha cada mà: doble parella 99%, color 90%, full 85%, escala 85%, trio 68%, pòquer 22%, escala de color 8%, repòquer 6%, escala reial 1%. Un bot que juga la mà que més puntua tenint en compte la varietat fa unes 7,5 ratxes de varietat per partida.
