# App nativa (iOS i Android)

L'app de l'App Store i de Google Play és el mateix joc web empaquetat amb [Capacitor](https://capacitorjs.com). El codi del joc és a `src/`, com sempre. Els projectes natius són a `ios/` i `android/`, i la configuració és a `capacitor.config.ts`.

- **La web no canvia.** Tot el que és natiu passa per `src/ui/native.ts` i només s'activa dins de l'app.
- **Identificador de l'app:** `com.pokerlunch.app`.
- **Icones i pantalla d'inici:** es generen a partir de `assets/` amb `npx @capacitor/assets generate --ios --android`.

## Ordres

| Ordre | Què fa |
|---|---|
| `npm run app:ios` | Compila el joc, el copia al projecte d'iOS i obre Xcode |
| `npm run app:android` | El mateix amb Android Studio |
| `npm run app:sync` | Compila i copia el joc als dos projectes, sense obrir res |

## Provar-ho a l'iPhone (amb el Mac)

### Una sola vegada

1. **Xcode.** Instal·la'l des de l'App Store del Mac (és gratuït i ocupa uns 10 GB). Obre'l un cop, accepta la llicència i, quan t'ho demani, instal·la la plataforma **iOS**.
2. **Node.js.** Instal·la la versió LTS des de [nodejs.org](https://nodejs.org).
3. **El codi.** Obre el Terminal i escriu:
   ```sh
   git clone https://github.com/MiquelBA/PokerLunch.git
   cd PokerLunch
   git checkout claude/project-thread-nebyvn
   npm ci
   ```
4. **El teu Apple ID a Xcode.** Ves a Xcode → Settings → Accounts i prem **+** → Apple ID. Encara no cal el compte de desenvolupador de pagament.
5. **L'iPhone en mode desenvolupador.** Connecta l'iPhone al Mac amb el cable i, si t'ho pregunta, prem «Confia en aquest ordinador». Després, a l'iPhone, ves a Configuració → Privacitat i seguretat → **Mode de desenvolupador**, activa'l i deixa que es reiniciï.

### Cada vegada que vulguis provar una versió nova

1. Al Terminal, dins de la carpeta `PokerLunch`:
   ```sh
   git pull
   npm ci
   npm run app:ios
   ```
   S'obrirà Xcode. La primera vegada triga un minut a baixar els paquets: ho veuràs a baix a l'esquerra.
2. A l'esquerra, clica **App**. Després ves a la pestanya **Signing & Capabilities** i a **Team** tria el teu nom («Personal Team»). Només cal fer-ho la primera vegada.
   - Si surt un error vermell que diu que l'identificador no està disponible, canvia el **Bundle Identifier** per `com.pokerlunch.app.miquel`. És només per a aquestes proves.
3. A dalt de tot, tria el teu iPhone com a destinació i prem el botó **▶** (Run).
4. La primera vegada, l'iPhone no deixarà obrir l'app. Ves a Configuració → General → **Gestió de VPN i dispositius**, toca el teu Apple ID i prem **Confia**.

Amb l'Apple ID gratuït, l'app deixa de funcionar al cap de 7 dies. Si passa, connecta l'iPhone i torna a prémer ▶. Quan tinguem el compte de desenvolupador de pagament, passarem a **TestFlight**: l'app arribarà a l'iPhone (i al de qui vulguis) sense cable, com qualsevol altra app.

**Sense iPhone:** a la destinació pots triar un simulador (per exemple, «iPhone 16») i prémer ▶. El simulador no necessita signatura, però no vibra.

### Què cal mirar

- Que les cartes i el traçat vagin fluids, i que l'app no quedi tapada per la càmera ni per la barra de baix.
- Que vibri amb les mans grans.
- Que el botó de compartir obri el menú de l'iPhone i que l'enllaç sigui de pokerlunch.com.
- Que l'idioma canviï amb els botons CA, ES i EN de la portada.
- Que, si surts de l'app enmig d'una partida, el joc es posi en pausa.

## Android

De moment no hi ha cap mòbil Android per provar-ho. Quan n'hi hagi, el procés és el mateix amb [Android Studio](https://developer.android.com/studio) i `npm run app:android`.

## Pendent

- **Enllaços de les taules dins de l'app:** perquè un enllaç `pokerlunch.com/#t=…` obri l'app i no el navegador, cal publicar dos fitxers a `pokerlunch.com/.well-known/` (`apple-app-site-association` i `assetlinks.json`), amb dades dels comptes de desenvolupador. L'app ja sap què fer amb l'enllaç (`appUrlOpen` a `src/ui/native.ts`).
- **Compartir la imatge del trofeu:** dins de l'app, de moment només es comparteix el text.
- **Fonts:** es carreguen de Google Fonts. Sense connexió, el joc fa servir les fonts del sistema.
