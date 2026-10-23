# Classificació (Supabase)

Poker Lunch comparteix el projecte de Supabase d'Orca Lunch (`gjfkfmqweimyjvapdoof`). Les taules, les polítiques i els límits de la classificació ja hi són (els SQL són al repositori d'Orca Lunch: `leaderboard.sql`, `protect-and-stats.sql`, `daily.sql`). Les taules del Poker (`poker_tables` i `poker_seats`) són a [`tables.sql`](tables.sql): s'ha d'executar un cop al SQL editor de Supabase.

- Rànquing general: `poker-v3`. Canvia la versió a `src/leaderboard/config.ts` quan canviï la puntuació, per començar una classificació nova.
- Taules: `poker_tables` (codi, llavor, versió de regles i qui l'ha muntada) i `poker_seats` (nom, puntuació i jugades de cada jugador; un sol seient per jugador i taula). El joc només hi llegeix: s'escriu amb tres funcions, `poker_open_table` (la taula nova amb la partida de qui la munta), `poker_sit` (reserva el seient en començar i torna una clau secreta) i `poker_finish` (amb aquesta clau, completa el seient un sol cop i dins d'una hora). Límits: 30 taules noves i 150 seients per jugador i dia, i els mateixos noms prohibits. Moderació: `hidden = true`.
- Límits de la base de dades: noms de la llista `banned-words.txt`, puntuacions d'1 a 400.000, 100 s entre dues puntuacions d'un mateix jugador i 60 al dia.
- Moderació: posa `hidden = true` a la fila (Table editor) per treure-la de la classificació.

Per fer servir un projecte propi, crea'l, executa-hi els tres SQL d'Orca Lunch i posa `VITE_LEADERBOARD_URL` i `VITE_LEADERBOARD_KEY` al build (o canvia `src/leaderboard/config.ts`).

`banned-words.txt` és una còpia de la d'Orca Lunch: si s'hi afegeixen paraules, cal fer-ho també a la base de dades.

## Estadístiques i comentaris

El joc també escriu a les taules `events` (visites, partides, comparticions, instal·lacions, 👍👎) i `feedback` (comentaris) de l'Orca Lunch. Cada fila del Poker porta `meta.game = 'poker'`; les de l'Orca no en porten. Per exemple, al SQL editor de Supabase:

```sql
-- Últims comentaris del Poker Lunch
select created_at, message, meta from feedback where meta->>'game' = 'poker' order by created_at desc limit 50;

-- Activitat del Poker per dia
select date_trunc('day', created_at)::date as dia, kind, count(*) from events
where meta->>'game' = 'poker' group by 1, 2 order by 1 desc, 2;
```

Per treure el Poker de les estadístiques de l'Orca, afegeix `and meta->>'game' is null` a les consultes de l'Orca.
