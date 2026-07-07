# Ceramic Summary Form PWA

Scheda HTML/PWA per conteggio ceramico, pensata per uso offline su tablet/e-ink Boox.

## Funzioni

- Campi compilabili: Area, Strat.Unit, Room.
- Tabella editabile: Type/Form, Rims, Handles, Feet, Bodies.
- Riquadro destro con note e schizzo a penna/stilo.
- Esportazione JSON.
- Importazione JSON.
- Salvataggio locale nel browser.
- Esportazione PDF tramite stampa del browser.
- PWA installabile e utilizzabile offline dopo il primo caricamento.

## Pubblicazione su GitHub Pages

1. Crea un nuovo repository GitHub.
2. Carica tutti i file di questa cartella nella root del repository.
3. Vai in Settings > Pages.
4. In Build and deployment scegli Deploy from a branch.
5. Seleziona branch `main` e cartella `/root`.
6. Apri il link GitHub Pages generato.

## Uso su Boox

1. Apri il link GitHub Pages dal browser del Boox.
2. Usa il menu del browser per aggiungere la pagina alla schermata home, se disponibile.
3. Dopo il primo caricamento, la PWA dovrebbe funzionare anche offline.
4. Per PDF usa il pulsante `Esporta PDF`, poi salva tramite la finestra di stampa del browser.

## Nota tecnica

Lo schizzo viene salvato sia come tratti vettoriali interni sia come immagine PNG dentro al JSON. Questo aumenta il peso del file JSON, ma permette di riaprire la scheda mantenendo il disegno.
