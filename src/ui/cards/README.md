# Cartes

`cards.svg` és un sprite amb un `<symbol>` per carta (`pl-<pal>-<número>`, pal 0 piques, 1 cors, 2 diamants, 3 trèvols; número 2..14) i el comodí (`pl-joker`). Estil pòquer online: número i pal grans a dalt a l'esquerra, i al centre un pal gran o la figura. Els colors dels pals, el fons i la vora són variables CSS (`--c-heart`, `--c-diamond`, `--c-spade`, `--c-club`, `--card-bg`, `--card-edge`), així una carta daurada només canvia variables.

## Origen i llicències
- **Cartes (52)**: dibuixos d'Adrian Kennard ([me.uk/cards](https://www.me.uk/cards/)), via el paquet npm `@letele/playing-cards`, **CC0 1.0** (domini públic). Reorganitzades: índex gran, pal o figura al centre.
- **Comodí**: el bufó vermell de [SVG-cards](https://github.com/htdebeer/SVG-cards) (David Bellot, Huub de Beer), **LGPL-2.1** (`LICENSE-LGPL-2.1.txt`). Se n'ha tret la vora original; la figura i les lletres són les mateixes.
