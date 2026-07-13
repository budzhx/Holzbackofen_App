import './style.css'
import { supabase } from './supabase.js'

const app = document.querySelector('#app')

let aktuellerBenutzer = null
let aktuellesProfil = null
let alleBacktage = []
let initialisierungLaeuft = false

app.innerHTML = `
  <div class="ladebildschirm">
    <div class="lade-symbol">🔥</div>
    <p>App wird geladen …</p>
  </div>
`

starteApp()

supabase.auth.onAuthStateChange((ereignis, session) => {
  if (ereignis === 'SIGNED_OUT') {
    aktuellerBenutzer = null
    aktuellesProfil = null
    alleBacktage = []

    window.setTimeout(() => {
      starteGastAnsicht()
    }, 0)

    return
  }

  if (ereignis === 'SIGNED_IN' && session?.user) {
    window.setTimeout(() => {
      initialisiereAngemeldeteApp(session.user)
    }, 0)
  }
})

/*
 * =========================================================
 * APP STARTEN
 * =========================================================
 */

async function starteApp() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  if (error) {
    console.error(
      'Die Sitzung konnte nicht geprüft werden:',
      error
    )
  }

  if (session?.user) {
    await initialisiereAngemeldeteApp(session.user)
  } else {
    await starteGastAnsicht()
  }
}

/*
 * =========================================================
 * GASTANSICHT
 * =========================================================
 */

async function starteGastAnsicht() {
  aktuellerBenutzer = null
  aktuellesProfil = null

  baueGastOberflaeche()

  const { daten, fehler } =
    await ladeOeffentlicheBacktage()

  const container =
    document.querySelector('#oeffentliche-uebersicht')

  if (fehler) {
    if (container) {
      container.innerHTML = `
        <p class="fehler">
          Die Übersicht konnte nicht geladen werden:
          ${maskiereHtml(fehler.message)}
        </p>
      `
    }

    return
  }

  alleBacktage = daten
  zeigeGastTagesansicht()
}

function baueGastOberflaeche() {
  app.innerHTML = `
    <header class="app-kopf">
      <div class="app-kopf-inhalt">
        <div>
          <p class="untertitel">Holzbackofenverein</p>
          <h1>🔥 Backtage</h1>
        </div>

        <button
          id="mitglieder-login-button"
          type="button"
          class="sekundaer"
        >
          Mitglieder-Login
        </button>
      </div>
    </header>

    <main class="container">
      <section class="bereich">
        <div class="listen-kopf">
          <div>
            <p class="untertitel">Öffentliche Übersicht</p>
            <h2>Geplante Backtage</h2>
          </div>

          <button
            id="gast-aktualisieren-button"
            type="button"
            class="sekundaer kompakt"
          >
            ↻ Aktualisieren
          </button>
        </div>

        <nav class="gast-navigation">
          <button
            id="gast-tag-button"
            type="button"
            class="aktiv"
          >
            📅 Tagesübersicht
          </button>

          <button
            id="gast-woche-button"
            type="button"
            class="sekundaer"
          >
            🗓️ Wochenübersicht
          </button>

          <button
            id="gast-monat-button"
            type="button"
            class="sekundaer"
          >
            📆 Monatsübersicht
          </button>
        </nav>

        <div id="gast-filter"></div>

        <div id="oeffentliche-uebersicht">
          <p class="ladehinweis">
            Übersicht wird geladen …
          </p>
        </div>
      </section>
    </main>
  `

  document
    .querySelector('#mitglieder-login-button')
    .addEventListener('click', zeigeLogin)

  document
    .querySelector('#gast-tag-button')
    .addEventListener('click', zeigeGastTagesansicht)

  document
    .querySelector('#gast-woche-button')
    .addEventListener('click', zeigeGastWochenansicht)

  document
    .querySelector('#gast-monat-button')
    .addEventListener('click', zeigeGastMonatsansicht)

  document
    .querySelector('#gast-aktualisieren-button')
    .addEventListener('click', starteGastAnsicht)
}

async function ladeOeffentlicheBacktage() {
  const { data, error } = await supabase
    .from('backtage')
    .select(`
      id,
      datum,
      heizer,
      bemerkung,
      anmeldungen (
        backtag_id,
        name,
        brote,
        pizzen,
        fleisch,
        bemerkung
      )
    `)
    .order('datum', { ascending: true })

  if (error) {
    console.error(
      'Öffentliche Backtage konnten nicht geladen werden:',
      error
    )

    return {
      daten: [],
      fehler: error
    }
  }

  return {
    daten: data || [],
    fehler: null
  }
}

/*
 * =========================================================
 * GAST: TAGESANSICHT
 * =========================================================
 */

function zeigeGastTagesansicht() {
  markiereGastNavigation('gast-tag-button')

  const naechsterBacktag =
    ermittleNaechstenBacktagDatum()

  const startDatum =
    naechsterBacktag || lokalesDatum(new Date())

  const filter = document.querySelector('#gast-filter')

  if (!filter) {
    return
  }

  filter.innerHTML = `
    <div class="filter-bereich">
      <div class="formular-feld">
        <label for="gast-tagesdatum">
          📅 Datum auswählen
        </label>

        <input
          id="gast-tagesdatum"
          type="date"
          value="${startDatum}"
        >
      </div>
    </div>
  `

  const datumEingabe =
    document.querySelector('#gast-tagesdatum')

  const aktualisieren = () => {
    zeigeOeffentlicheBacktage(
      filtereNachTag(
        alleBacktage,
        datumEingabe.value
      )
    )
  }

  datumEingabe.addEventListener(
    'change',
    aktualisieren
  )

  aktualisieren()
}

function filtereNachTag(backtage, datum) {
  return backtage.filter(
    (backtag) => backtag.datum === datum
  )
}

/*
 * =========================================================
 * GAST: WOCHENANSICHT
 * =========================================================
 */

function zeigeGastWochenansicht() {
  markiereGastNavigation('gast-woche-button')

  const naechsterBacktag =
    ermittleNaechstenBacktagDatum()

  const startDatum =
    naechsterBacktag || lokalesDatum(new Date())

  const filter = document.querySelector('#gast-filter')

  if (!filter) {
    return
  }

  filter.innerHTML = `
    <div class="filter-bereich">
      <div class="formular-feld">
        <label for="gast-wochendatum">
          🗓️ Woche anhand eines Datums auswählen
        </label>

        <input
          id="gast-wochendatum"
          type="date"
          value="${startDatum}"
        >
      </div>
    </div>

    <p
      id="wochenzeitraum"
      class="anzahl-anzeige"
    ></p>
  `

  const datumEingabe =
    document.querySelector('#gast-wochendatum')

  function aktualisiereWoche() {
    const bereich =
      ermittleWochenbereich(datumEingabe.value)

    document.querySelector(
      '#wochenzeitraum'
    ).textContent =
      `${formatiereDatum(bereich.montag)} bis ` +
      `${formatiereDatum(bereich.sonntag)}`

    zeigeOeffentlicheBacktage(
      filtereNachWoche(
        alleBacktage,
        datumEingabe.value
      )
    )
  }

  datumEingabe.addEventListener(
    'change',
    aktualisiereWoche
  )

  aktualisiereWoche()
}

function ermittleWochenbereich(datumswert) {
  const datum = new Date(`${datumswert}T12:00:00`)
  const wochentag = datum.getDay()

  const abstandZumMontag =
    wochentag === 0 ? -6 : 1 - wochentag

  const montag = new Date(datum)

  montag.setDate(
    datum.getDate() + abstandZumMontag
  )

  const sonntag = new Date(montag)

  sonntag.setDate(
    montag.getDate() + 6
  )

  return {
    montag: lokalesDatum(montag),
    sonntag: lokalesDatum(sonntag)
  }
}

function filtereNachWoche(backtage, datumswert) {
  const { montag, sonntag } =
    ermittleWochenbereich(datumswert)

  return backtage.filter(
    (backtag) =>
      backtag.datum >= montag &&
      backtag.datum <= sonntag
  )
}

/*
 * =========================================================
 * GAST: MONATSANSICHT
 * =========================================================
 */

function zeigeGastMonatsansicht() {
  markiereGastNavigation('gast-monat-button')

  const naechsterBacktag =
    ermittleNaechstenBacktagDatum()

  let aktuellerMonat

  if (naechsterBacktag) {
    aktuellerMonat =
      String(naechsterBacktag).slice(0, 7)
  } else {
    const heute = new Date()

    aktuellerMonat =
      `${heute.getFullYear()}-` +
      `${String(
        heute.getMonth() + 1
      ).padStart(2, '0')}`
  }

  const filter = document.querySelector('#gast-filter')

  if (!filter) {
    return
  }

  filter.innerHTML = `
    <div class="filter-bereich">
      <div class="formular-feld">
        <label for="gast-monat">
          📆 Monat auswählen
        </label>

        <input
          id="gast-monat"
          type="month"
          value="${aktuellerMonat}"
        >
      </div>
    </div>
  `

  const monatsEingabe =
    document.querySelector('#gast-monat')

  const aktualisieren = () => {
    zeigeOeffentlicheBacktage(
      filtereNachMonat(
        alleBacktage,
        monatsEingabe.value
      )
    )
  }

  monatsEingabe.addEventListener(
    'change',
    aktualisieren
  )

  aktualisieren()
}

function filtereNachMonat(backtage, monat) {
  return backtage.filter(
    (backtag) =>
      String(backtag.datum).startsWith(monat)
  )
}

/*
 * =========================================================
 * ÖFFENTLICHE ÜBERSICHT ANZEIGEN
 * =========================================================
 */

function zeigeOeffentlicheBacktage(backtage) {
  const container =
    document.querySelector('#oeffentliche-uebersicht')

  if (!container) {
    return
  }

  if (backtage.length === 0) {
    container.innerHTML = `
      <div class="leerzustand">
        <div class="leer-symbol">📅</div>

        <p>
          In diesem Zeitraum ist kein Backtag geplant.
        </p>
      </div>
    `

    return
  }

  container.innerHTML = backtage
    .map((backtag) => {
      return erstelleTageskarteHtml(
        backtag,
        false
      )
    })
    .join('')
}

/*
 * =========================================================
 * LOGIN
 * =========================================================
 */



function zeigeLogin(fehlertext = '') {
  app.innerHTML = `
    <main class="login-seite">
      <section class="login-karte">
        <div class="login-symbol">🔥</div>

        <p class="untertitel">Holzbackofenverein</p>
        <h1 id="auth-titel">Mitglieder-Login</h1>

        <p id="auth-beschreibung" class="login-text">
          Melde dich an, um deine Brote, Pizzen und
          Fleischplanung einzutragen.
        </p>

        <div class="auth-register">
          <button
            id="login-ansicht-button"
            type="button"
            class="auth-register-button aktiv"
          >
            Anmelden
          </button>

          <button
            id="registrierung-ansicht-button"
            type="button"
            class="auth-register-button sekundaer"
          >
            Registrieren
          </button>
        </div>

        <form id="login-formular">
          <div class="formular-feld">
            <label for="login-email">
              E-Mail-Adresse
            </label>

            <input
              id="login-email"
              type="email"
              autocomplete="email"
              placeholder="name@beispiel.de"
              required
            >
          </div>

          <div class="formular-feld">
            <label for="login-passwort">
              Passwort
            </label>

            <input
              id="login-passwort"
              type="password"
              autocomplete="current-password"
              minlength="8"
              required
            >
          </div>

          <button id="login-button" type="submit">
            Anmelden
          </button>
        </form>

        <form
          id="registrierungs-formular"
          class="versteckt"
        >
          <div class="formular-feld">
            <label for="registrierung-name">
              Name
            </label>

            <input
              id="registrierung-name"
              type="text"
              autocomplete="name"
              maxlength="100"
              placeholder="Vor- und Nachname"
              required
            >
          </div>

          <div class="formular-feld">
            <label for="registrierung-email">
              E-Mail-Adresse
            </label>

            <input
              id="registrierung-email"
              type="email"
              autocomplete="email"
              placeholder="name@beispiel.de"
              required
            >
          </div>

          <div class="formular-feld">
            <label for="registrierung-passwort">
              Passwort
            </label>

            <input
              id="registrierung-passwort"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
            >

            <small>
              Das Passwort muss mindestens 8 Zeichen haben.
            </small>
          </div>

          <div class="formular-feld">
            <label for="registrierung-passwort-wiederholen">
              Passwort wiederholen
            </label>

            <input
              id="registrierung-passwort-wiederholen"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
            >
          </div>

          <button
            id="registrierung-button"
            type="submit"
          >
            Konto erstellen
          </button>
        </form>

        <button
          id="zurueck-zur-uebersicht"
          type="button"
          class="sekundaer zurueck-button"
        >
          Ohne Anmeldung zur Übersicht
        </button>

        <p
          id="login-meldung"
          class="${fehlertext ? 'fehler' : ''}"
          role="status"
        >
          ${maskiereHtml(fehlertext)}
        </p>
      </section>
    </main>
  `

  document
    .querySelector('#login-formular')
    .addEventListener('submit', anmelden)

  document
    .querySelector('#registrierungs-formular')
    .addEventListener('submit', registrieren)

  document
    .querySelector('#login-ansicht-button')
    .addEventListener('click', zeigeLoginFormular)

  document
    .querySelector('#registrierung-ansicht-button')
    .addEventListener(
      'click',
      zeigeRegistrierungsFormular
    )

  document
    .querySelector('#zurueck-zur-uebersicht')
    .addEventListener('click', starteGastAnsicht)
}

function zeigeLoginFormular() {
  const loginFormular =
    document.querySelector('#login-formular')

  const registrierungsFormular =
    document.querySelector('#registrierungs-formular')

  loginFormular.classList.remove('versteckt')
  registrierungsFormular.classList.add('versteckt')

  document.querySelector(
    '#auth-titel'
  ).textContent = 'Mitglieder-Login'

  document.querySelector(
    '#auth-beschreibung'
  ).textContent =
    'Melde dich an, um deine Brote, Pizzen und Fleischplanung einzutragen.'

  document
    .querySelector('#login-ansicht-button')
    .classList.add('aktiv')

  document
    .querySelector('#login-ansicht-button')
    .classList.remove('sekundaer')

  document
    .querySelector('#registrierung-ansicht-button')
    .classList.remove('aktiv')

  document
    .querySelector('#registrierung-ansicht-button')
    .classList.add('sekundaer')

  leereAuthMeldung()
}

function zeigeRegistrierungsFormular() {
  const loginFormular =
    document.querySelector('#login-formular')

  const registrierungsFormular =
    document.querySelector('#registrierungs-formular')

  loginFormular.classList.add('versteckt')
  registrierungsFormular.classList.remove('versteckt')

  document.querySelector(
    '#auth-titel'
  ).textContent = 'Mitglied registrieren'

  document.querySelector(
    '#auth-beschreibung'
  ).textContent =
    'Erstelle ein Konto mit deinem Namen, deiner E-Mail-Adresse und einem Passwort.'

  document
    .querySelector('#registrierung-ansicht-button')
    .classList.add('aktiv')

  document
    .querySelector('#registrierung-ansicht-button')
    .classList.remove('sekundaer')

  document
    .querySelector('#login-ansicht-button')
    .classList.remove('aktiv')

  document
    .querySelector('#login-ansicht-button')
    .classList.add('sekundaer')

  leereAuthMeldung()
}

function leereAuthMeldung() {
  const meldung =
    document.querySelector('#login-meldung')

  if (!meldung) {
    return
  }

  meldung.textContent = ''
  meldung.className = ''
}

async function anmelden(ereignis) {
  ereignis.preventDefault()

  const email =
    document.querySelector('#login-email').value.trim()

  const passwort =
    document.querySelector('#login-passwort').value

  const loginButton =
    document.querySelector('#login-button')

  const loginMeldung =
    document.querySelector('#login-meldung')

  loginMeldung.textContent = ''
  loginMeldung.className = ''

  loginButton.disabled = true
  loginButton.textContent = 'Anmeldung läuft …'

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password: passwort
    })

  loginButton.disabled = false
  loginButton.textContent = 'Anmelden'

  if (error) {
    console.error('Anmeldefehler:', error)

    loginMeldung.textContent =
      'Anmeldung fehlgeschlagen. Bitte E-Mail-Adresse und Passwort prüfen.'

    loginMeldung.className = 'fehler'
    return
  }

  if (!data.user) {
    loginMeldung.textContent =
      'Es konnte kein Benutzer geladen werden.'

    loginMeldung.className = 'fehler'
  }
}

async function registrieren(ereignis) {
  ereignis.preventDefault()

  const name =
    document
      .querySelector('#registrierung-name')
      .value
      .trim()

  const email =
    document
      .querySelector('#registrierung-email')
      .value
      .trim()

  const passwort =
    document
      .querySelector('#registrierung-passwort')
      .value

  const passwortWiederholung =
    document
      .querySelector(
        '#registrierung-passwort-wiederholen'
      )
      .value

  const button =
    document.querySelector('#registrierung-button')

  const meldung =
    document.querySelector('#login-meldung')

  meldung.textContent = ''
  meldung.className = ''

  if (!name) {
    meldung.textContent =
      'Bitte gib deinen Namen ein.'

    meldung.className = 'fehler'
    return
  }

  if (!email) {
    meldung.textContent =
      'Bitte gib deine E-Mail-Adresse ein.'

    meldung.className = 'fehler'
    return
  }

  if (passwort.length < 8) {
    meldung.textContent =
      'Das Passwort muss mindestens 8 Zeichen haben.'

    meldung.className = 'fehler'
    return
  }

  if (passwort !== passwortWiederholung) {
    meldung.textContent =
      'Die beiden Passwörter stimmen nicht überein.'

    meldung.className = 'fehler'
    return
  }

  button.disabled = true
  button.textContent = 'Konto wird erstellt …'

  const redirectUrl =
    window.location.hostname === 'localhost'
      ? 'http://localhost:5173/'
      : 'https://budzhx.github.io/Holzbackofen_App/'

  const { data, error } =
    await supabase.auth.signUp({
      email,
      password: passwort,

      options: {
        data: {
          name
        },

        emailRedirectTo: redirectUrl
      }
    })

  button.disabled = false
  button.textContent = 'Konto erstellen'

  if (error) {
    console.error(
      'Fehler bei der Registrierung:',
      error
    )

    meldung.textContent =
      `Registrierung fehlgeschlagen: ${error.message}`

    meldung.className = 'fehler'
    return
  }

  document
    .querySelector('#registrierungs-formular')
    .reset()

  if (data.session) {
    meldung.textContent =
      'Dein Konto wurde erstellt. Du wirst angemeldet.'

    meldung.className = 'erfolg'
    return
  }

  meldung.textContent =
    'Dein Konto wurde erstellt. Bitte öffne jetzt die Bestätigungs-E-Mail und bestätige deine E-Mail-Adresse.'

  meldung.className = 'erfolg'
}


async function abmelden() {
  const bestaetigt = window.confirm(
    'Möchtest du dich wirklich abmelden?'
  )

  if (!bestaetigt) {
    return
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    zeigeMeldung(
      `Abmelden fehlgeschlagen: ${error.message}`,
      'fehler'
    )
  }
}

/*
 * =========================================================
 * ANGEMELDETE APP INITIALISIEREN
 * =========================================================
 */

async function initialisiereAngemeldeteApp(benutzer) {
  if (initialisierungLaeuft) {
    return
  }

  initialisierungLaeuft = true
  aktuellerBenutzer = benutzer

  app.innerHTML = `
    <div class="ladebildschirm">
      <div class="lade-symbol">🔥</div>
      <p>Benutzerprofil wird geladen …</p>
    </div>
  `

  const profilErfolgreich = await ladeProfil()

  if (!profilErfolgreich) {
    initialisierungLaeuft = false
    return
  }

  if (!aktuellesProfil.aktiv) {
    initialisierungLaeuft = false

    await supabase.auth.signOut()

    zeigeLogin(
      'Dieses Benutzerkonto wurde deaktiviert.'
    )

    return
  }

  baueAngemeldeteOberflaeche()
  await ladeAngemeldeteBacktage()

  initialisierungLaeuft = false
}

async function ladeProfil() {
  const { data, error } = await supabase
    .from('mitglieder')
    .select('id,name,rolle,aktiv,erstellt_am')
    .eq('id', aktuellerBenutzer.id)
    .maybeSingle()

  if (error) {
    console.error('Profilfehler:', error)

    app.innerHTML = `
      <main class="container">
        <section class="bereich">
          <h1>Profil konnte nicht geladen werden</h1>

          <p class="fehler">
            ${maskiereHtml(error.message)}
          </p>

          <button id="notfall-abmelden" type="button">
            Abmelden
          </button>
        </section>
      </main>
    `

    document
      .querySelector('#notfall-abmelden')
      .addEventListener('click', abmelden)

    return false
  }

  if (!data) {
    app.innerHTML = `
      <main class="container">
        <section class="bereich">
          <h1>Kein Mitgliedsprofil vorhanden</h1>

          <p class="fehler">
            Für dieses Benutzerkonto existiert kein
            Eintrag in der Tabelle „mitglieder“.
          </p>

          <button id="notfall-abmelden" type="button">
            Abmelden
          </button>
        </section>
      </main>
    `

    document
      .querySelector('#notfall-abmelden')
      .addEventListener('click', abmelden)

    return false
  }

  aktuellesProfil = data
  return true
}

function istAdmin() {
  return aktuellesProfil?.rolle === 'admin'
}

/*
 * =========================================================
 * ANGEMELDETE OBERFLÄCHE
 * =========================================================
 */

function baueAngemeldeteOberflaeche() {
  app.innerHTML = `
    <header class="app-kopf">
      <div class="app-kopf-inhalt">
        <div>
          <p class="untertitel">Holzbackofenverein</p>
          <h1>🔥 Backtage</h1>
        </div>

        <div class="benutzer-bereich">
          <div class="benutzer-information">
            <strong>
              ${maskiereHtml(
                aktuellesProfil.name ||
                aktuellerBenutzer.email ||
                'Mitglied'
              )}
            </strong>

            <span class="rollen-anzeige">
              ${
                istAdmin()
                  ? '👑 Admin'
                  : '👤 Mitglied'
              }
            </span>
          </div>

          <button
            id="abmelden-button"
            type="button"
            class="sekundaer kompakt"
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>

    <main class="container">
      <p id="globale-meldung" role="status"></p>

      ${
        istAdmin()
          ? erstelleAdminFormular()
          : ''
      }

      <section class="bereich">
        <div class="listen-kopf">
          <div>
            <p class="untertitel">Mitgliederbereich</p>
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

        <nav class="gast-navigation">
          <button
            id="mitglied-tag-button"
            type="button"
            class="aktiv"
          >
            📅 Tagesübersicht
          </button>

          <button
            id="mitglied-woche-button"
            type="button"
            class="sekundaer"
          >
            🗓️ Wochenübersicht
          </button>

          <button
            id="mitglied-monat-button"
            type="button"
            class="sekundaer"
          >
            📆 Monatsübersicht
          </button>
        </nav>

        <div id="mitglied-filter"></div>

        <div id="tagesuebersicht">
          <p class="ladehinweis">
            Backtage werden geladen …
          </p>
        </div>
      </section>
    </main>
  `

  document
    .querySelector('#abmelden-button')
    .addEventListener('click', abmelden)

  document
    .querySelector('#aktualisieren-button')
    .addEventListener('click', ladeAngemeldeteBacktage)

  document
    .querySelector('#mitglied-tag-button')
    .addEventListener(
      'click',
      zeigeMitgliedTagesansicht
    )

  document
    .querySelector('#mitglied-woche-button')
    .addEventListener(
      'click',
      zeigeMitgliedWochenansicht
    )

  document
    .querySelector('#mitglied-monat-button')
    .addEventListener(
      'click',
      zeigeMitgliedMonatsansicht
    )

  if (istAdmin()) {
    registriereAdminFormular()
  }
}

/*
 * =========================================================
 * ADMIN: BACKTAG ANLEGEN UND BEARBEITEN
 * =========================================================
 */

function erstelleAdminFormular() {
  return `
    <section class="bereich">
      <h2 id="backtag-formular-titel">
        Neuen Backtag anlegen
      </h2>

      <form id="backtag-formular">
        <input id="backtag-id" type="hidden">

        <div class="formular-raster">
          <div class="formular-feld">
            <label for="backtag-datum">
              📅 Datum
            </label>

            <input
              id="backtag-datum"
              type="date"
              required
            >
          </div>

          <div class="formular-feld">
            <label for="backtag-heizer">
              🔥 Wer heizt den Ofen an?
            </label>

            <input
              id="backtag-heizer"
              type="text"
              maxlength="100"
              placeholder="Name des Heizers"
              required
            >
          </div>

          <div class="formular-feld volle-breite">
            <label for="backtag-bemerkung">
              📝 Allgemeine Bemerkung
            </label>

            <textarea
              id="backtag-bemerkung"
              maxlength="2000"
              placeholder="Optionale Bemerkung zum Backtag"
            ></textarea>
          </div>
        </div>

        <div class="formular-aktionen">
          <button id="backtag-speichern" type="submit">
            Backtag speichern
          </button>

          <button
            id="backtag-abbrechen"
            type="button"
            class="sekundaer versteckt"
          >
            Bearbeitung abbrechen
          </button>
        </div>

        <p
          id="backtag-formular-meldung"
          role="status"
        ></p>
      </form>
    </section>
  `
}

function registriereAdminFormular() {
  document
    .querySelector('#backtag-formular')
    ?.addEventListener('submit', speichereBacktag)

  document
    .querySelector('#backtag-abbrechen')
    ?.addEventListener(
      'click',
      setzeBacktagFormularZurueck
    )
}

async function speichereBacktag(ereignis) {
  ereignis.preventDefault()

  const id =
    document.querySelector('#backtag-id').value

  const datum =
    document.querySelector('#backtag-datum').value

  const heizer =
    document
      .querySelector('#backtag-heizer')
      .value
      .trim()

  const bemerkung =
    document
      .querySelector('#backtag-bemerkung')
      .value
      .trim() || null

  const button =
    document.querySelector('#backtag-speichern')

  if (!datum) {
    zeigeBacktagFormularMeldung(
      'Bitte wähle ein Datum aus.',
      'fehler'
    )

    return
  }

  if (!heizer) {
    zeigeBacktagFormularMeldung(
      'Bitte gib an, wer den Ofen anheizt.',
      'fehler'
    )

    return
  }

  button.disabled = true
  button.textContent = id
    ? 'Änderungen werden gespeichert …'
    : 'Backtag wird gespeichert …'

  let error

  if (id) {
    const ergebnis = await supabase
      .from('backtage')
      .update({
        datum,
        heizer,
        bemerkung
      })
      .eq('id', id)

    error = ergebnis.error
  } else {
    const ergebnis = await supabase
      .from('backtage')
      .insert({
        datum,
        heizer,
        bemerkung,
        erstellt_von: aktuellerBenutzer.id
      })

    error = ergebnis.error
  }

  button.disabled = false
  button.textContent = id
    ? 'Änderungen speichern'
    : 'Backtag speichern'

  if (error) {
    console.error('Backtag speichern:', error)

    zeigeBacktagFormularMeldung(
      `Fehler beim Speichern: ${error.message}`,
      'fehler'
    )

    return
  }

  zeigeMeldung(
    id
      ? 'Der Backtag wurde aktualisiert.'
      : 'Der Backtag wurde angelegt.',
    'erfolg'
  )

  setzeBacktagFormularZurueck()
  await ladeAngemeldeteBacktage()
}

function bearbeiteBacktag(id) {
  if (!istAdmin()) {
    return
  }

  const backtag = alleBacktage.find(
    (eintrag) => String(eintrag.id) === String(id)
  )

  if (!backtag) {
    return
  }

  document.querySelector('#backtag-id').value =
    backtag.id

  document.querySelector('#backtag-datum').value =
    backtag.datum || ''

  document.querySelector('#backtag-heizer').value =
    backtag.heizer || ''

  document.querySelector('#backtag-bemerkung').value =
    backtag.bemerkung || ''

  document.querySelector(
    '#backtag-formular-titel'
  ).textContent = 'Backtag bearbeiten'

  document.querySelector(
    '#backtag-speichern'
  ).textContent = 'Änderungen speichern'

  document.querySelector(
    '#backtag-abbrechen'
  ).classList.remove('versteckt')

  document
    .querySelector('#backtag-formular')
    .scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
}

function setzeBacktagFormularZurueck() {
  const formular =
    document.querySelector('#backtag-formular')

  if (!formular) {
    return
  }

  formular.reset()

  document.querySelector('#backtag-id').value = ''

  document.querySelector(
    '#backtag-formular-titel'
  ).textContent = 'Neuen Backtag anlegen'

  document.querySelector(
    '#backtag-speichern'
  ).textContent = 'Backtag speichern'

  document.querySelector(
    '#backtag-abbrechen'
  ).classList.add('versteckt')

  document.querySelector(
    '#backtag-formular-meldung'
  ).textContent = ''
}

async function loescheBacktag(id) {
  if (!istAdmin()) {
    return
  }

  const backtag = alleBacktage.find(
    (eintrag) => String(eintrag.id) === String(id)
  )

  if (!backtag) {
    return
  }

  const bestaetigt = window.confirm(
    `Soll der Backtag am ` +
    `${formatiereDatum(backtag.datum)} ` +
    `wirklich gelöscht werden? Alle Anmeldungen ` +
    `für diesen Backtag werden ebenfalls gelöscht.`
  )

  if (!bestaetigt) {
    return
  }

  const { error } = await supabase
    .from('backtage')
    .delete()
    .eq('id', id)

  if (error) {
    zeigeMeldung(
      `Fehler beim Löschen: ${error.message}`,
      'fehler'
    )

    return
  }

  zeigeMeldung(
    'Der Backtag wurde gelöscht.',
    'erfolg'
  )

  await ladeAngemeldeteBacktage()
}

/*
 * =========================================================
 * ANGEMELDETE BACKTAGE LADEN
 * =========================================================
 */

async function ladeAngemeldeteBacktage() {
  const container =
    document.querySelector('#tagesuebersicht')

  if (container) {
    container.innerHTML = `
      <p class="ladehinweis">
        Backtage werden geladen …
      </p>
    `
  }

  const { data, error } = await supabase
    .from('backtage')
    .select(`
      id,
      datum,
      heizer,
      bemerkung,
      erstellt_von,
      anmeldungen (
        id,
        backtag_id,
        mitglied_id,
        name,
        brote,
        pizzen,
        fleisch,
        bemerkung
      )
    `)
    .order('datum', { ascending: true })

  if (error) {
    console.error('Backtage laden:', error)

    if (container) {
      container.innerHTML = `
        <p class="fehler">
          Fehler beim Laden:
          ${maskiereHtml(error.message)}
        </p>
      `
    }

    return
  }

  alleBacktage = data || []
  zeigeMitgliedTagesansicht()
}

/*
 * =========================================================
 * MITGLIED: TAGES-, WOCHEN- UND MONATSANSICHT
 * =========================================================
 */

function zeigeMitgliedTagesansicht() {
  markiereMitgliedNavigation(
    'mitglied-tag-button'
  )

  const naechsterBacktag =
    ermittleNaechstenBacktagDatum()

  const startDatum =
    naechsterBacktag || lokalesDatum(new Date())

  document.querySelector('#mitglied-filter').innerHTML = `
    <div class="filter-bereich">
      <div class="formular-feld">
        <label for="mitglied-tagesdatum">
          📅 Datum auswählen
        </label>

        <input
          id="mitglied-tagesdatum"
          type="date"
          value="${startDatum}"
        >
      </div>
    </div>
  `

  const eingabe =
    document.querySelector('#mitglied-tagesdatum')

  const aktualisieren = () => {
    zeigeAngemeldeteBacktage(
      filtereNachTag(
        alleBacktage,
        eingabe.value
      )
    )
  }

  eingabe.addEventListener('change', aktualisieren)
  aktualisieren()
}

function zeigeMitgliedWochenansicht() {
  markiereMitgliedNavigation(
    'mitglied-woche-button'
  )

  const naechsterBacktag =
    ermittleNaechstenBacktagDatum()

  const startDatum =
    naechsterBacktag || lokalesDatum(new Date())

  document.querySelector('#mitglied-filter').innerHTML = `
    <div class="filter-bereich">
      <div class="formular-feld">
        <label for="mitglied-wochendatum">
          🗓️ Woche anhand eines Datums auswählen
        </label>

        <input
          id="mitglied-wochendatum"
          type="date"
          value="${startDatum}"
        >
      </div>
    </div>

    <p
      id="mitglied-wochenzeitraum"
      class="anzahl-anzeige"
    ></p>
  `

  const eingabe =
    document.querySelector('#mitglied-wochendatum')

  function aktualisieren() {
    const bereich =
      ermittleWochenbereich(eingabe.value)

    document.querySelector(
      '#mitglied-wochenzeitraum'
    ).textContent =
      `${formatiereDatum(bereich.montag)} bis ` +
      `${formatiereDatum(bereich.sonntag)}`

    zeigeAngemeldeteBacktage(
      filtereNachWoche(
        alleBacktage,
        eingabe.value
      )
    )
  }

  eingabe.addEventListener('change', aktualisieren)
  aktualisieren()
}

function zeigeMitgliedMonatsansicht() {
  markiereMitgliedNavigation(
    'mitglied-monat-button'
  )

  const naechsterBacktag =
    ermittleNaechstenBacktagDatum()

  let aktuellerMonat

  if (naechsterBacktag) {
    aktuellerMonat =
      String(naechsterBacktag).slice(0, 7)
  } else {
    const heute = new Date()

    aktuellerMonat =
      `${heute.getFullYear()}-` +
      `${String(
        heute.getMonth() + 1
      ).padStart(2, '0')}`
  }

  document.querySelector('#mitglied-filter').innerHTML = `
    <div class="filter-bereich">
      <div class="formular-feld">
        <label for="mitglied-monat">
          📆 Monat auswählen
        </label>

        <input
          id="mitglied-monat"
          type="month"
          value="${aktuellerMonat}"
        >
      </div>
    </div>
  `

  const eingabe =
    document.querySelector('#mitglied-monat')

  const aktualisieren = () => {
    zeigeAngemeldeteBacktage(
      filtereNachMonat(
        alleBacktage,
        eingabe.value
      )
    )
  }

  eingabe.addEventListener('change', aktualisieren)
  aktualisieren()
}

/*
 * =========================================================
 * ANGEMELDETE TAGESKARTEN
 * =========================================================
 */

function zeigeAngemeldeteBacktage(backtage) {
  const container =
    document.querySelector('#tagesuebersicht')

  if (!container) {
    return
  }

  if (backtage.length === 0) {
    container.innerHTML = `
      <div class="leerzustand">
        <div class="leer-symbol">📅</div>

        <p>
          In diesem Zeitraum ist kein Backtag geplant.
        </p>
      </div>
    `

    return
  }

  container.innerHTML = ''

  backtage.forEach((backtag) => {
    const karte = document.createElement('article')

    karte.className = 'tageskarte'

    karte.innerHTML =
      erstelleTageskarteHtml(backtag, true)

    registriereTageskartenEreignisse(
      karte,
      backtag
    )

    container.appendChild(karte)
  })
}

function erstelleTageskarteHtml(
  backtag,
  angemeldet
) {
  const anmeldungen = backtag.anmeldungen || []

  const brotAnmeldungen = anmeldungen.filter(
    (anmeldung) => Number(anmeldung.brote) > 0
  )

  const pizzaAnmeldungen = anmeldungen.filter(
    (anmeldung) => Number(anmeldung.pizzen) > 0
  )

  const fleischAnmeldungen = anmeldungen.filter(
    (anmeldung) => anmeldung.fleisch
  )

  const eigeneAnmeldung = angemeldet
    ? anmeldungen.find(
      (anmeldung) =>
        String(anmeldung.mitglied_id) ===
        String(aktuellerBenutzer.id)
    )
    : null

  return `
    <div class="tageskarte-kopf">
      <div>
        <p class="tageskarte-wochentag">
          ${formatiereWochentag(backtag.datum)}
        </p>

        <h2>
          📅 ${formatiereDatum(backtag.datum)}
        </h2>
      </div>

      ${
        angemeldet && istAdmin()
          ? `
            <div class="kopf-aktionen">
              <button
                type="button"
                class="sekundaer kompakt backtag-bearbeiten"
                data-id="${backtag.id}"
              >
                ✏️ Bearbeiten
              </button>

              <button
                type="button"
                class="gefahr kompakt backtag-loeschen"
                data-id="${backtag.id}"
              >
                🗑️ Löschen
              </button>
            </div>
          `
          : ''
      }
    </div>

    <div class="heizer-box">
      <span class="uebersicht-symbol">🔥</span>

      <div>
        <span class="uebersicht-bezeichnung">
          Ofen wird angeheizt von
        </span>

        <strong>
          ${maskiereHtml(backtag.heizer)}
        </strong>
      </div>
    </div>

    <div class="essens-raster">
      ${erstelleBrotUebersicht(brotAnmeldungen)}
      ${erstellePizzaUebersicht(pizzaAnmeldungen)}
      ${erstelleFleischUebersicht(fleischAnmeldungen)}
    </div>

    ${
      backtag.bemerkung
        ? `
          <div class="backtag-bemerkung">
            <span>📝 Bemerkung zum Backtag</span>

            <p>
              ${maskiereHtml(backtag.bemerkung)}
            </p>
          </div>
        `
        : ''
    }

    ${
      angemeldet
        ? erstelleAnmeldeFormularHtml(
          backtag,
          eigeneAnmeldung
        )
        : ''
    }
  `
}

function registriereTageskartenEreignisse(
  karte,
  backtag
) {
  const eigeneAnmeldung =
    (backtag.anmeldungen || []).find(
      (anmeldung) =>
        String(anmeldung.mitglied_id) ===
        String(aktuellerBenutzer.id)
    )

  karte
    .querySelector('.anmeldung-formular')
    ?.addEventListener('submit', (ereignis) => {
      speichereAnmeldung(
        ereignis,
        backtag.id
      )
    })

  karte
    .querySelector('.anmeldung-entfernen')
    ?.addEventListener('click', () => {
      loescheEigeneAnmeldung(
        eigeneAnmeldung.id
      )
    })

  karte
    .querySelector('.backtag-bearbeiten')
    ?.addEventListener('click', () => {
      bearbeiteBacktag(backtag.id)
    })

  karte
    .querySelector('.backtag-loeschen')
    ?.addEventListener('click', () => {
      loescheBacktag(backtag.id)
    })
}

function erstelleAnmeldeFormularHtml(
  backtag,
  eigeneAnmeldung
) {
  return `
    <div class="anmeldung-bereich">
      <div class="anmeldung-kopf">
        <div>
          <h3>
            ${
              eigeneAnmeldung
                ? 'Meine Anmeldung bearbeiten'
                : 'Für diesen Backtag anmelden'
            }
          </h3>

          <p>
            Trage ein, wie viele Brote und Pizzen du
            mitbringst und ob du danach Fleisch machen
            möchtest.
          </p>
        </div>
      </div>

      <form
        class="anmeldung-formular"
        data-backtag-id="${backtag.id}"
      >
        <input
          type="hidden"
          class="anmeldung-id"
          value="${eigeneAnmeldung?.id || ''}"
        >

        <div class="anmeldung-raster">
          <div class="formular-feld">
            <label>🍞 Anzahl Brote</label>

            <input
              type="number"
              class="anmeldung-brote"
              min="0"
              max="1000"
              value="${Number(eigeneAnmeldung?.brote) || 0}"
              required
            >
          </div>

          <div class="formular-feld">
            <label>🍕 Anzahl Pizzen</label>

            <input
              type="number"
              class="anmeldung-pizzen"
              min="0"
              max="1000"
              value="${Number(eigeneAnmeldung?.pizzen) || 0}"
              required
            >
          </div>

          <div class="formular-feld">
            <label>🥩 Fleisch danach</label>

            <select class="anmeldung-fleisch">
              <option
                value="false"
                ${!eigeneAnmeldung?.fleisch ? 'selected' : ''}
              >
                Nein
              </option>

              <option
                value="true"
                ${eigeneAnmeldung?.fleisch ? 'selected' : ''}
              >
                Ja
              </option>
            </select>
          </div>

          <div class="formular-feld volle-breite">
            <label>📝 Persönliche Bemerkung</label>

            <textarea
              class="anmeldung-bemerkung"
              maxlength="1000"
              placeholder="Optionale Bemerkung"
            >${maskiereHtml(
              eigeneAnmeldung?.bemerkung || ''
            )}</textarea>
          </div>
        </div>

        <div class="formular-aktionen">
          <button type="submit">
            ${
              eigeneAnmeldung
                ? 'Anmeldung aktualisieren'
                : 'Anmeldung speichern'
            }
          </button>

          ${
            eigeneAnmeldung
              ? `
                <button
                  type="button"
                  class="sekundaer anmeldung-entfernen"
                  data-anmeldung-id="${eigeneAnmeldung.id}"
                >
                  Anmeldung entfernen
                </button>
              `
              : ''
          }
        </div>

        <p
          class="anmeldung-meldung"
          role="status"
        ></p>
      </form>
    </div>
  `
}

/*
 * =========================================================
 * ESSENSÜBERSICHT
 * =========================================================
 */

function erstelleBrotUebersicht(anmeldungen) {
  const gesamt = anmeldungen.reduce(
    (summe, anmeldung) =>
      summe + (Number(anmeldung.brote) || 0),
    0
  )

  return `
    <section class="essens-box">
      <div class="essens-box-kopf">
        <span class="essens-symbol">🍞</span>

        <div>
          <h3>Brote</h3>
          <span>${gesamt} insgesamt</span>
        </div>
      </div>

      <div class="personen-liste">
        ${
          anmeldungen.length > 0
            ? anmeldungen
              .map(
                (anmeldung) => `
                  <div class="personen-zeile">
                    <span>
                      ${maskiereHtml(anmeldung.name)}
                    </span>

                    <strong>
                      ${Number(anmeldung.brote)}
                    </strong>
                  </div>
                `
              )
              .join('')
            : `
              <p class="niemand-hinweis">
                Noch niemand eingetragen
              </p>
            `
        }
      </div>
    </section>
  `
}

function erstellePizzaUebersicht(anmeldungen) {
  const gesamt = anmeldungen.reduce(
    (summe, anmeldung) =>
      summe + (Number(anmeldung.pizzen) || 0),
    0
  )

  return `
    <section class="essens-box">
      <div class="essens-box-kopf">
        <span class="essens-symbol">🍕</span>

        <div>
          <h3>Pizzen</h3>
          <span>${gesamt} insgesamt</span>
        </div>
      </div>

      <div class="personen-liste">
        ${
          anmeldungen.length > 0
            ? anmeldungen
              .map(
                (anmeldung) => `
                  <div class="personen-zeile">
                    <span>
                      ${maskiereHtml(anmeldung.name)}
                    </span>

                    <strong>
                      ${Number(anmeldung.pizzen)}
                    </strong>
                  </div>
                `
              )
              .join('')
            : `
              <p class="niemand-hinweis">
                Noch niemand eingetragen
              </p>
            `
        }
      </div>
    </section>
  `
}

function erstelleFleischUebersicht(anmeldungen) {
  return `
    <section class="essens-box">
      <div class="essens-box-kopf">
        <span class="essens-symbol">🥩</span>

        <div>
          <h3>Fleisch danach</h3>

          <span>
            ${anmeldungen.length}
            ${
              anmeldungen.length === 1
                ? 'Person'
                : 'Personen'
            }
          </span>
        </div>
      </div>

      <div class="personen-liste">
        ${
          anmeldungen.length > 0
            ? anmeldungen
              .map(
                (anmeldung) => `
                  <div class="personen-zeile">
                    <span>
                      ${maskiereHtml(anmeldung.name)}
                    </span>

                    <strong>Ja</strong>
                  </div>
                `
              )
              .join('')
            : `
              <p class="niemand-hinweis">
                Niemand plant Fleisch
              </p>
            `
        }
      </div>
    </section>
  `
}

/*
 * =========================================================
 * ANMELDUNGEN SPEICHERN UND LÖSCHEN
 * =========================================================
 */

async function speichereAnmeldung(
  ereignis,
  backtagId
) {
  ereignis.preventDefault()

  const formular = ereignis.currentTarget

  const anmeldungId =
    formular.querySelector('.anmeldung-id').value

  const brote =
    Number(
      formular.querySelector('.anmeldung-brote').value
    ) || 0

  const pizzen =
    Number(
      formular.querySelector('.anmeldung-pizzen').value
    ) || 0

  const fleisch =
    formular.querySelector('.anmeldung-fleisch').value ===
    'true'

  const bemerkung =
    formular
      .querySelector('.anmeldung-bemerkung')
      .value
      .trim() || null

  const meldung =
    formular.querySelector('.anmeldung-meldung')

  const button =
    formular.querySelector('button[type="submit"]')

  meldung.textContent = ''
  meldung.className = 'anmeldung-meldung'

  if (brote === 0 && pizzen === 0 && !fleisch) {
    meldung.textContent =
      'Bitte trage mindestens Brot, Pizza oder Fleisch ein.'

    meldung.classList.add('fehler')
    return
  }

  const name =
    aktuellesProfil.name?.trim() ||
    aktuellerBenutzer.email ||
    'Mitglied'

  button.disabled = true
  button.textContent = 'Wird gespeichert …'

  let error

  if (anmeldungId) {
    const ergebnis = await supabase
      .from('anmeldungen')
      .update({
        name,
        brote,
        pizzen,
        fleisch,
        bemerkung
      })
      .eq('id', anmeldungId)

    error = ergebnis.error
  } else {
    const ergebnis = await supabase
      .from('anmeldungen')
      .insert({
        backtag_id: backtagId,
        mitglied_id: aktuellerBenutzer.id,
        name,
        brote,
        pizzen,
        fleisch,
        bemerkung
      })

    error = ergebnis.error
  }

  button.disabled = false
  button.textContent = anmeldungId
    ? 'Anmeldung aktualisieren'
    : 'Anmeldung speichern'

  if (error) {
    console.error('Anmeldung speichern:', error)

    meldung.textContent =
      `Fehler beim Speichern: ${error.message}`

    meldung.classList.add('fehler')
    return
  }

  zeigeMeldung(
    anmeldungId
      ? 'Deine Anmeldung wurde aktualisiert.'
      : 'Deine Anmeldung wurde gespeichert.',
    'erfolg'
  )

  await ladeAngemeldeteBacktage()
}

async function loescheEigeneAnmeldung(id) {
  const bestaetigt = window.confirm(
    'Möchtest du deine Anmeldung für diesen Backtag entfernen?'
  )

  if (!bestaetigt) {
    return
  }

  const { error } = await supabase
    .from('anmeldungen')
    .delete()
    .eq('id', id)

  if (error) {
    zeigeMeldung(
      `Anmeldung konnte nicht gelöscht werden: ` +
      `${error.message}`,
      'fehler'
    )

    return
  }

  zeigeMeldung(
    'Deine Anmeldung wurde entfernt.',
    'erfolg'
  )

  await ladeAngemeldeteBacktage()
}

/*
 * =========================================================
 * MELDUNGEN
 * =========================================================
 */

function zeigeBacktagFormularMeldung(text, typ) {
  const meldung =
    document.querySelector('#backtag-formular-meldung')

  if (!meldung) {
    return
  }

  meldung.textContent = text
  meldung.className = typ
}

function zeigeMeldung(text, typ) {
  const meldung =
    document.querySelector('#globale-meldung')

  if (!meldung) {
    return
  }

  meldung.textContent = text
  meldung.className = typ

  window.setTimeout(() => {
    if (meldung.textContent === text) {
      meldung.textContent = ''
      meldung.className = ''
    }
  }, 6000)
}

/*
 * =========================================================
 * NAVIGATION
 * =========================================================
 */

function markiereGastNavigation(aktiveId) {
  document
    .querySelectorAll('.gast-navigation button')
    .forEach((button) => {
      button.classList.remove('aktiv')
      button.classList.add('sekundaer')
    })

  const aktiverButton =
    document.querySelector(`#${aktiveId}`)

  aktiverButton?.classList.add('aktiv')
  aktiverButton?.classList.remove('sekundaer')
}

function markiereMitgliedNavigation(aktiveId) {
  document
    .querySelectorAll('.gast-navigation button')
    .forEach((button) => {
      button.classList.remove('aktiv')
      button.classList.add('sekundaer')
    })

  const aktiverButton =
    document.querySelector(`#${aktiveId}`)

  aktiverButton?.classList.add('aktiv')
  aktiverButton?.classList.remove('sekundaer')
}

/*
 * =========================================================
 * HILFSFUNKTIONEN
 * =========================================================
 */

function ermittleNaechstenBacktagDatum() {
  const heute = lokalesDatum(new Date())

  const zukuenftigeBacktage = alleBacktage
    .filter((backtag) => backtag.datum >= heute)
    .sort((a, b) =>
      String(a.datum).localeCompare(String(b.datum))
    )

  return zukuenftigeBacktage[0]?.datum || null
}

function lokalesDatum(datum) {
  const jahr = datum.getFullYear()

  const monat = String(
    datum.getMonth() + 1
  ).padStart(2, '0')

  const tag = String(
    datum.getDate()
  ).padStart(2, '0')

  return `${jahr}-${monat}-${tag}`
}

function formatiereDatum(datumswert) {
  if (!datumswert) {
    return 'Kein Datum'
  }

  const [jahr, monat, tag] =
    String(datumswert).split('-')

  if (!jahr || !monat || !tag) {
    return String(datumswert)
  }

  return `${tag}.${monat}.${jahr}`
}

function formatiereWochentag(datumswert) {
  if (!datumswert) {
    return ''
  }

  const [jahr, monat, tag] =
    String(datumswert)
      .split('-')
      .map(Number)

  const datum = new Date(
    jahr,
    monat - 1,
    tag
  )

  return new Intl.DateTimeFormat(
    'de-DE',
    {
      weekday: 'long'
    }
  ).format(datum)
}

function maskiereHtml(wert) {
  return String(wert ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}