import './style.css'
import { supabase } from './supabase.js'

document.querySelector('#app').innerHTML = `
  <main class="container">
    <header class="kopfbereich">
      <div>
        <p class="untertitel">Gemeinsame Planung</p>
        <h1>🔥 Holzbackofen Backtage</h1>
      </div>
    </header>

    <section class="bereich formular-bereich">
      <h2 id="formular-ueberschrift">Neuen Backtag eintragen</h2>

      <form id="backtag-formular">
        <input id="eintrag-id" type="hidden">

        <div class="formular-raster">
          <div class="formular-feld">
            <label for="datum">📅 Backtag</label>
            <input id="datum" type="date" required>
          </div>

          <div class="formular-feld">
            <label for="heizer">🔥 Wer heizt den Ofen an?</label>
            <input
              id="heizer"
              type="text"
              placeholder="Name des Mitglieds"
              maxlength="100"
              required
            >
          </div>

          <div class="formular-feld volle-breite">
            <label for="teilnehmer">👥 Teilnehmer</label>
            <input
              id="teilnehmer"
              type="text"
              placeholder="Zum Beispiel: Anna, David, Michael"
              maxlength="500"
            >
            <small>Namen bitte durch Kommas trennen.</small>
          </div>

          <div class="formular-feld">
            <label for="brote">🍞 Anzahl Brote</label>
            <input
              id="brote"
              type="number"
              min="0"
              max="1000"
              value="0"
              required
            >
          </div>

          <div class="formular-feld">
            <label for="pizzen">🍕 Anzahl Pizzen</label>
            <input
              id="pizzen"
              type="number"
              min="0"
              max="1000"
              value="0"
              required
            >
          </div>

          <div class="formular-feld">
            <label for="fleisch">
              🥩 Fleisch nach dem Brotbacken
            </label>

            <select id="fleisch">
              <option value="false">Nein</option>
              <option value="true">Ja</option>
            </select>
          </div>

          <div class="formular-feld volle-breite">
            <label for="bemerkung">📝 Bemerkung</label>

            <textarea
              id="bemerkung"
              placeholder="Optionale Bemerkung"
              maxlength="2000"
            ></textarea>
          </div>
        </div>

        <div class="formular-aktionen">
          <button id="speichern-button" type="submit">
            Backtag speichern
          </button>

          <button
            id="abbrechen-button"
            type="button"
            class="sekundaer versteckt"
          >
            Bearbeitung abbrechen
          </button>
        </div>

        <p id="meldung" role="status"></p>
      </form>
    </section>

    <section class="bereich">
      <div class="listen-kopf">
        <div>
          <p class="untertitel">Übersicht</p>
          <h2>Geplante Backtage</h2>
        </div>

        <button
          id="aktualisieren-button"
          type="button"
          class="sekundaer kompakt"
        >
          ↻ Aktualisieren
        </button>
      </div>

      <div class="filter-raster">
        <div class="formular-feld">
          <label for="monatsfilter">📆 Monat</label>
          <input id="monatsfilter" type="month">
        </div>

        <div class="formular-feld">
          <label for="suchfilter">🔍 Suche</label>
          <input
            id="suchfilter"
            type="search"
            placeholder="Heizer oder Teilnehmer"
          >
        </div>

        <div class="formular-feld filter-button-feld">
          <button
            id="filter-zuruecksetzen"
            type="button"
            class="sekundaer"
          >
            Filter zurücksetzen
          </button>
        </div>
      </div>

      <p id="anzahl-anzeige" class="anzahl-anzeige"></p>

      <div id="backtage-liste">
        <p class="ladehinweis">Backtage werden geladen …</p>
      </div>
    </section>
  </main>
`

const formular = document.querySelector('#backtag-formular')
const formularUeberschrift =
  document.querySelector('#formular-ueberschrift')

const eintragId = document.querySelector('#eintrag-id')
const datum = document.querySelector('#datum')
const heizer = document.querySelector('#heizer')
const teilnehmer = document.querySelector('#teilnehmer')
const brote = document.querySelector('#brote')
const pizzen = document.querySelector('#pizzen')
const fleisch = document.querySelector('#fleisch')
const bemerkung = document.querySelector('#bemerkung')

const speichernButton =
  document.querySelector('#speichern-button')
const abbrechenButton =
  document.querySelector('#abbrechen-button')
const aktualisierenButton =
  document.querySelector('#aktualisieren-button')

const meldung = document.querySelector('#meldung')
const backtageListe =
  document.querySelector('#backtage-liste')
const anzahlAnzeige =
  document.querySelector('#anzahl-anzeige')

const monatsfilter =
  document.querySelector('#monatsfilter')
const suchfilter =
  document.querySelector('#suchfilter')
const filterZuruecksetzen =
  document.querySelector('#filter-zuruecksetzen')

let alleBacktage = []

formular.addEventListener('submit', speichereBacktag)
abbrechenButton.addEventListener(
  'click',
  setzeFormularZurueck
)
aktualisierenButton.addEventListener(
  'click',
  ladeBacktage
)
monatsfilter.addEventListener(
  'change',
  filtereBacktage
)
suchfilter.addEventListener(
  'input',
  filtereBacktage
)
filterZuruecksetzen.addEventListener(
  'click',
  setzeFilterZurueck
)

async function speichereBacktag(ereignis) {
  ereignis.preventDefault()
  leereMeldung()

  const eintrag = {
    datum: datum.value,
    heizer: heizer.value.trim(),
    teilnehmer: teilnehmer.value.trim() || null,
    brote: Number(brote.value) || 0,
    pizzen: Number(pizzen.value) || 0,
    fleisch: fleisch.value === 'true',
    bemerkung: bemerkung.value.trim() || null
  }

  if (!eintrag.datum) {
    zeigeMeldung(
      'Bitte wähle einen Backtag aus.',
      'error'
    )
    return
  }

  if (!eintrag.heizer) {
    zeigeMeldung(
      'Bitte gib an, wer den Ofen anheizt.',
      'error'
    )
    return
  }

  const id = eintragId.value
  const wirdBearbeitet = Boolean(id)

  speichernButton.disabled = true
  speichernButton.textContent = wirdBearbeitet
    ? 'Änderungen werden gespeichert …'
    : 'Backtag wird gespeichert …'

  let fehler

  if (wirdBearbeitet) {
    const { error } = await supabase
      .from('backtage')
      .update(eintrag)
      .eq('id', id)

    fehler = error
  } else {
    const { error } = await supabase
      .from('backtage')
      .insert(eintrag)

    fehler = error
  }

  speichernButton.disabled = false
  speichernButton.textContent = wirdBearbeitet
    ? 'Änderungen speichern'
    : 'Backtag speichern'

  if (fehler) {
    console.error('Fehler beim Speichern:', fehler)

    zeigeMeldung(
      `Fehler beim Speichern: ${fehler.message}`,
      'error'
    )
    return
  }

  zeigeMeldung(
    wirdBearbeitet
      ? 'Der Backtag wurde aktualisiert.'
      : 'Der Backtag wurde gespeichert.',
    'success'
  )

  setzeFormularZurueck(false)
  await ladeBacktage()
}

async function ladeBacktage() {
  backtageListe.innerHTML =
    '<p class="ladehinweis">Backtage werden geladen …</p>'

  aktualisierenButton.disabled = true

  const { data, error } = await supabase
    .from('backtage')
    .select(
      'id,datum,heizer,teilnehmer,brote,pizzen,fleisch,bemerkung'
    )
    .order('datum', { ascending: true })

  aktualisierenButton.disabled = false

  if (error) {
    console.error('Fehler beim Laden:', error)

    backtageListe.innerHTML = `
      <p class="error">
        Fehler beim Laden:
        ${maskiereHtml(error.message)}
      </p>
    `
    return
  }

  alleBacktage = data || []
  filtereBacktage()
}

function filtereBacktage() {
  const monat = monatsfilter.value
  const suchbegriff =
    suchfilter.value.trim().toLowerCase()

  const gefilterteBacktage = alleBacktage.filter(
    (eintrag) => {
      const passtZumMonat =
        !monat ||
        String(eintrag.datum).startsWith(monat)

      const suchtext = [
        eintrag.heizer,
        eintrag.teilnehmer,
        eintrag.bemerkung
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const passtZurSuche =
        !suchbegriff ||
        suchtext.includes(suchbegriff)

      return passtZumMonat && passtZurSuche
    }
  )

  zeigeBacktage(gefilterteBacktage)
}

function zeigeBacktage(backtage) {
  backtageListe.innerHTML = ''

  anzahlAnzeige.textContent =
    `${backtage.length} ` +
    `${backtage.length === 1 ? 'Backtag' : 'Backtage'} angezeigt`

  if (backtage.length === 0) {
    backtageListe.innerHTML = `
      <div class="leerzustand">
        <span>📅</span>
        <p>Keine passenden Backtage vorhanden.</p>
      </div>
    `
    return
  }

  backtage.forEach((eintrag) => {
    const karte = document.createElement('article')
    karte.className = 'eintrag'

    karte.innerHTML = `
      <div class="eintrag-kopf">
        <div>
          <span class="datum-symbol">📅</span>

          <strong class="eintrag-datum">
            ${formatiereDatum(eintrag.datum)}
          </strong>
        </div>

        <span class="fleisch-status ${
          eintrag.fleisch ? 'aktiv' : ''
        }">
          ${eintrag.fleisch
            ? '🥩 Fleisch geplant'
            : 'Kein Fleisch'}
        </span>
      </div>

      <div class="eintrag-daten">
        <p>
          <span>🔥 Heizer</span>
          <strong>${maskiereHtml(eintrag.heizer)}</strong>
        </p>

        <p>
          <span>👥 Teilnehmer</span>
          <strong>
            ${maskiereHtml(eintrag.teilnehmer || '–')}
          </strong>
        </p>

        <p>
          <span>🍞 Brote</span>
          <strong>${Number(eintrag.brote)}</strong>
        </p>

        <p>
          <span>🍕 Pizzen</span>
          <strong>${Number(eintrag.pizzen)}</strong>
        </p>
      </div>

      <div class="bemerkung-anzeige">
        <span>📝 Bemerkung</span>
        <p>${maskiereHtml(eintrag.bemerkung || '–')}</p>
      </div>

      <div class="eintrag-aktionen">
        <button
          type="button"
          class="bearbeiten-button sekundaer"
          data-id="${eintrag.id}"
        >
          ✏️ Bearbeiten
        </button>

        <button
          type="button"
          class="loeschen-button gefahr"
          data-id="${eintrag.id}"
        >
          🗑️ Löschen
        </button>
      </div>
    `

    karte
      .querySelector('.bearbeiten-button')
      .addEventListener('click', () => {
        starteBearbeitung(eintrag.id)
      })

    karte
      .querySelector('.loeschen-button')
      .addEventListener('click', () => {
        loescheBacktag(eintrag.id)
      })

    backtageListe.appendChild(karte)
  })
}

function starteBearbeitung(id) {
  const eintrag = alleBacktage.find(
    (backtag) => String(backtag.id) === String(id)
  )

  if (!eintrag) {
    zeigeMeldung(
      'Der Eintrag wurde nicht gefunden.',
      'error'
    )
    return
  }

  eintragId.value = eintrag.id
  datum.value = eintrag.datum || ''
  heizer.value = eintrag.heizer || ''
  teilnehmer.value = eintrag.teilnehmer || ''
  brote.value = Number(eintrag.brote) || 0
  pizzen.value = Number(eintrag.pizzen) || 0
  fleisch.value = String(Boolean(eintrag.fleisch))
  bemerkung.value = eintrag.bemerkung || ''

  formularUeberschrift.textContent =
    'Backtag bearbeiten'
  speichernButton.textContent =
    'Änderungen speichern'
  abbrechenButton.classList.remove('versteckt')

  formular.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}

async function loescheBacktag(id) {
  const eintrag = alleBacktage.find(
    (backtag) => String(backtag.id) === String(id)
  )

  if (!eintrag) {
    return
  }

  const bestaetigt = window.confirm(
    `Soll der Backtag am ` +
    `${formatiereDatum(eintrag.datum)} wirklich gelöscht werden?`
  )

  if (!bestaetigt) {
    return
  }

  const { error } = await supabase
    .from('backtage')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Fehler beim Löschen:', error)

    zeigeMeldung(
      `Fehler beim Löschen: ${error.message}`,
      'error'
    )
    return
  }

  zeigeMeldung(
    'Der Backtag wurde gelöscht.',
    'success'
  )

  if (String(eintragId.value) === String(id)) {
    setzeFormularZurueck(false)
  }

  await ladeBacktage()
}

function setzeFormularZurueck(
  meldungLoeschen = true
) {
  formular.reset()

  eintragId.value = ''
  brote.value = 0
  pizzen.value = 0
  fleisch.value = 'false'

  formularUeberschrift.textContent =
    'Neuen Backtag eintragen'
  speichernButton.textContent =
    'Backtag speichern'
  abbrechenButton.classList.add('versteckt')

  if (meldungLoeschen) {
    leereMeldung()
  }
}

function setzeFilterZurueck() {
  monatsfilter.value = ''
  suchfilter.value = ''
  filtereBacktage()
}

function formatiereDatum(datumswert) {
  if (!datumswert) {
    return 'Kein Datum'
  }

  const [jahr, monat, tag] =
    datumswert.split('-')

  return `${tag}.${monat}.${jahr}`
}

function maskiereHtml(wert) {
  return String(wert)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function zeigeMeldung(text, typ) {
  meldung.textContent = text
  meldung.className = typ
}

function leereMeldung() {
  meldung.textContent = ''
  meldung.className = ''
}

ladeBacktage()