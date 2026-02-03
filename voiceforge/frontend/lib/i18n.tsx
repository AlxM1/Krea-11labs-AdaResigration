'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

// Supported locales
export const locales = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  ar: 'العربية'
} as const

export type Locale = keyof typeof locales

// Translation type
type TranslationKeys = {
  // Common
  'common.save': string
  'common.cancel': string
  'common.delete': string
  'common.edit': string
  'common.create': string
  'common.download': string
  'common.upload': string
  'common.loading': string
  'common.error': string
  'common.success': string
  'common.search': string
  'common.filter': string
  'common.settings': string

  // Navigation
  'nav.dashboard': string
  'nav.speechSynthesis': string
  'nav.voiceLibrary': string
  'nav.voiceCloning': string
  'nav.projects': string
  'nav.soundEffects': string
  'nav.speechToText': string
  'nav.voiceIsolation': string
  'nav.dubbing': string
  'nav.agents': string
  'nav.voiceDesign': string
  'nav.reader': string
  'nav.history': string
  'nav.apiKeys': string
  'nav.subscription': string
  'nav.settings': string

  // Dashboard
  'dashboard.welcome': string
  'dashboard.usage': string
  'dashboard.charactersUsed': string
  'dashboard.quickActions': string
  'dashboard.recentActivity': string

  // Speech Synthesis
  'tts.title': string
  'tts.subtitle': string
  'tts.enterText': string
  'tts.selectVoice': string
  'tts.generate': string
  'tts.generating': string

  // Voice Cloning
  'cloning.title': string
  'cloning.subtitle': string
  'cloning.instant': string
  'cloning.professional': string
  'cloning.uploadSamples': string
  'cloning.createVoice': string

  // Projects
  'projects.title': string
  'projects.newProject': string
  'projects.noProjects': string

  // Auth
  'auth.login': string
  'auth.signup': string
  'auth.logout': string
  'auth.forgotPassword': string
  'auth.email': string
  'auth.password': string
  'auth.name': string
}

// English translations (default)
const en: TranslationKeys = {
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.create': 'Create',
  'common.download': 'Download',
  'common.upload': 'Upload',
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.settings': 'Settings',

  'nav.dashboard': 'Dashboard',
  'nav.speechSynthesis': 'Speech Synthesis',
  'nav.voiceLibrary': 'Voice Library',
  'nav.voiceCloning': 'Voice Cloning',
  'nav.projects': 'Projects',
  'nav.soundEffects': 'Sound Effects',
  'nav.speechToText': 'Speech to Text',
  'nav.voiceIsolation': 'Voice Isolation',
  'nav.dubbing': 'Dubbing',
  'nav.agents': 'Conversational AI',
  'nav.voiceDesign': 'Voice Design',
  'nav.reader': 'Reader',
  'nav.history': 'History',
  'nav.apiKeys': 'API Keys',
  'nav.subscription': 'Subscription',
  'nav.settings': 'Settings',

  'dashboard.welcome': 'Welcome back',
  'dashboard.usage': 'Usage This Month',
  'dashboard.charactersUsed': 'Characters Used',
  'dashboard.quickActions': 'Quick Actions',
  'dashboard.recentActivity': 'Recent Activity',

  'tts.title': 'Speech Synthesis',
  'tts.subtitle': 'Convert text to natural speech',
  'tts.enterText': 'Enter your text here...',
  'tts.selectVoice': 'Select Voice',
  'tts.generate': 'Generate Speech',
  'tts.generating': 'Generating...',

  'cloning.title': 'Voice Cloning',
  'cloning.subtitle': 'Create a digital copy of any voice',
  'cloning.instant': 'Instant Cloning',
  'cloning.professional': 'Professional Cloning',
  'cloning.uploadSamples': 'Upload audio samples',
  'cloning.createVoice': 'Create Voice',

  'projects.title': 'Projects',
  'projects.newProject': 'New Project',
  'projects.noProjects': 'No projects yet',

  'auth.login': 'Sign In',
  'auth.signup': 'Sign Up',
  'auth.logout': 'Log Out',
  'auth.forgotPassword': 'Forgot Password?',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.name': 'Name'
}

// Spanish translations
const es: TranslationKeys = {
  'common.save': 'Guardar',
  'common.cancel': 'Cancelar',
  'common.delete': 'Eliminar',
  'common.edit': 'Editar',
  'common.create': 'Crear',
  'common.download': 'Descargar',
  'common.upload': 'Subir',
  'common.loading': 'Cargando...',
  'common.error': 'Error',
  'common.success': 'Éxito',
  'common.search': 'Buscar',
  'common.filter': 'Filtrar',
  'common.settings': 'Configuración',

  'nav.dashboard': 'Panel',
  'nav.speechSynthesis': 'Síntesis de Voz',
  'nav.voiceLibrary': 'Biblioteca de Voces',
  'nav.voiceCloning': 'Clonación de Voz',
  'nav.projects': 'Proyectos',
  'nav.soundEffects': 'Efectos de Sonido',
  'nav.speechToText': 'Voz a Texto',
  'nav.voiceIsolation': 'Aislamiento de Voz',
  'nav.dubbing': 'Doblaje',
  'nav.agents': 'IA Conversacional',
  'nav.voiceDesign': 'Diseño de Voz',
  'nav.reader': 'Lector',
  'nav.history': 'Historial',
  'nav.apiKeys': 'Claves API',
  'nav.subscription': 'Suscripción',
  'nav.settings': 'Configuración',

  'dashboard.welcome': 'Bienvenido de nuevo',
  'dashboard.usage': 'Uso Este Mes',
  'dashboard.charactersUsed': 'Caracteres Usados',
  'dashboard.quickActions': 'Acciones Rápidas',
  'dashboard.recentActivity': 'Actividad Reciente',

  'tts.title': 'Síntesis de Voz',
  'tts.subtitle': 'Convierte texto en voz natural',
  'tts.enterText': 'Escribe tu texto aquí...',
  'tts.selectVoice': 'Seleccionar Voz',
  'tts.generate': 'Generar Voz',
  'tts.generating': 'Generando...',

  'cloning.title': 'Clonación de Voz',
  'cloning.subtitle': 'Crea una copia digital de cualquier voz',
  'cloning.instant': 'Clonación Instantánea',
  'cloning.professional': 'Clonación Profesional',
  'cloning.uploadSamples': 'Subir muestras de audio',
  'cloning.createVoice': 'Crear Voz',

  'projects.title': 'Proyectos',
  'projects.newProject': 'Nuevo Proyecto',
  'projects.noProjects': 'Aún no hay proyectos',

  'auth.login': 'Iniciar Sesión',
  'auth.signup': 'Registrarse',
  'auth.logout': 'Cerrar Sesión',
  'auth.forgotPassword': '¿Olvidaste tu contraseña?',
  'auth.email': 'Correo electrónico',
  'auth.password': 'Contraseña',
  'auth.name': 'Nombre'
}

// French translations
const fr: TranslationKeys = {
  'common.save': 'Enregistrer',
  'common.cancel': 'Annuler',
  'common.delete': 'Supprimer',
  'common.edit': 'Modifier',
  'common.create': 'Créer',
  'common.download': 'Télécharger',
  'common.upload': 'Importer',
  'common.loading': 'Chargement...',
  'common.error': 'Erreur',
  'common.success': 'Succès',
  'common.search': 'Rechercher',
  'common.filter': 'Filtrer',
  'common.settings': 'Paramètres',

  'nav.dashboard': 'Tableau de bord',
  'nav.speechSynthesis': 'Synthèse vocale',
  'nav.voiceLibrary': 'Bibliothèque de voix',
  'nav.voiceCloning': 'Clonage vocal',
  'nav.projects': 'Projets',
  'nav.soundEffects': 'Effets sonores',
  'nav.speechToText': 'Parole en texte',
  'nav.voiceIsolation': 'Isolation vocale',
  'nav.dubbing': 'Doublage',
  'nav.agents': 'IA conversationnelle',
  'nav.voiceDesign': 'Design vocal',
  'nav.reader': 'Lecteur',
  'nav.history': 'Historique',
  'nav.apiKeys': 'Clés API',
  'nav.subscription': 'Abonnement',
  'nav.settings': 'Paramètres',

  'dashboard.welcome': 'Bon retour',
  'dashboard.usage': 'Utilisation ce mois',
  'dashboard.charactersUsed': 'Caractères utilisés',
  'dashboard.quickActions': 'Actions rapides',
  'dashboard.recentActivity': 'Activité récente',

  'tts.title': 'Synthèse vocale',
  'tts.subtitle': 'Convertir le texte en parole naturelle',
  'tts.enterText': 'Entrez votre texte ici...',
  'tts.selectVoice': 'Sélectionner une voix',
  'tts.generate': 'Générer la parole',
  'tts.generating': 'Génération...',

  'cloning.title': 'Clonage vocal',
  'cloning.subtitle': 'Créez une copie numérique de n\'importe quelle voix',
  'cloning.instant': 'Clonage instantané',
  'cloning.professional': 'Clonage professionnel',
  'cloning.uploadSamples': 'Importer des échantillons audio',
  'cloning.createVoice': 'Créer une voix',

  'projects.title': 'Projets',
  'projects.newProject': 'Nouveau projet',
  'projects.noProjects': 'Pas encore de projets',

  'auth.login': 'Se connecter',
  'auth.signup': 'S\'inscrire',
  'auth.logout': 'Se déconnecter',
  'auth.forgotPassword': 'Mot de passe oublié ?',
  'auth.email': 'E-mail',
  'auth.password': 'Mot de passe',
  'auth.name': 'Nom'
}

// German translations
const de: TranslationKeys = {
  'common.save': 'Speichern',
  'common.cancel': 'Abbrechen',
  'common.delete': 'Löschen',
  'common.edit': 'Bearbeiten',
  'common.create': 'Erstellen',
  'common.download': 'Herunterladen',
  'common.upload': 'Hochladen',
  'common.loading': 'Laden...',
  'common.error': 'Fehler',
  'common.success': 'Erfolg',
  'common.search': 'Suchen',
  'common.filter': 'Filtern',
  'common.settings': 'Einstellungen',

  'nav.dashboard': 'Dashboard',
  'nav.speechSynthesis': 'Sprachsynthese',
  'nav.voiceLibrary': 'Stimmbibliothek',
  'nav.voiceCloning': 'Stimmklonen',
  'nav.projects': 'Projekte',
  'nav.soundEffects': 'Soundeffekte',
  'nav.speechToText': 'Sprache zu Text',
  'nav.voiceIsolation': 'Stimmisolierung',
  'nav.dubbing': 'Synchronisation',
  'nav.agents': 'Konversations-KI',
  'nav.voiceDesign': 'Stimmdesign',
  'nav.reader': 'Vorleser',
  'nav.history': 'Verlauf',
  'nav.apiKeys': 'API-Schlüssel',
  'nav.subscription': 'Abonnement',
  'nav.settings': 'Einstellungen',

  'dashboard.welcome': 'Willkommen zurück',
  'dashboard.usage': 'Nutzung diesen Monat',
  'dashboard.charactersUsed': 'Verwendete Zeichen',
  'dashboard.quickActions': 'Schnellaktionen',
  'dashboard.recentActivity': 'Letzte Aktivität',

  'tts.title': 'Sprachsynthese',
  'tts.subtitle': 'Text in natürliche Sprache umwandeln',
  'tts.enterText': 'Text hier eingeben...',
  'tts.selectVoice': 'Stimme auswählen',
  'tts.generate': 'Sprache generieren',
  'tts.generating': 'Generiere...',

  'cloning.title': 'Stimmklonen',
  'cloning.subtitle': 'Erstellen Sie eine digitale Kopie jeder Stimme',
  'cloning.instant': 'Sofortklonen',
  'cloning.professional': 'Professionelles Klonen',
  'cloning.uploadSamples': 'Audiobeispiele hochladen',
  'cloning.createVoice': 'Stimme erstellen',

  'projects.title': 'Projekte',
  'projects.newProject': 'Neues Projekt',
  'projects.noProjects': 'Noch keine Projekte',

  'auth.login': 'Anmelden',
  'auth.signup': 'Registrieren',
  'auth.logout': 'Abmelden',
  'auth.forgotPassword': 'Passwort vergessen?',
  'auth.email': 'E-Mail',
  'auth.password': 'Passwort',
  'auth.name': 'Name'
}

// All translations
const translations: Record<Locale, TranslationKeys> = {
  en,
  es,
  fr,
  de,
  it: en, // Fallback to English
  pt: en,
  ja: en,
  ko: en,
  zh: en,
  ar: en
}

// Context
interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: keyof TranslationKeys) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    // Get saved locale or detect from browser
    const saved = localStorage.getItem('locale') as Locale
    if (saved && saved in locales) {
      setLocaleState(saved)
    } else {
      const browserLang = navigator.language.split('-')[0] as Locale
      if (browserLang in locales) {
        setLocaleState(browserLang)
      }
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
  }

  const t = (key: keyof TranslationKeys): string => {
    return translations[locale]?.[key] || translations.en[key] || key
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// Language selector component
export function LanguageSelector() {
  const { locale, setLocale } = useI18n()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-[#1f1f1f] hover:bg-[#2f2f2f] rounded-lg transition"
      >
        <span className="text-lg">{getFlag(locale)}</span>
        <span className="text-sm">{locales[locale]}</span>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl shadow-xl z-50 py-2 max-h-64 overflow-y-auto">
            {(Object.keys(locales) as Locale[]).map(code => (
              <button
                key={code}
                onClick={() => {
                  setLocale(code)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-[#2f2f2f] transition ${
                  locale === code ? 'text-[#7c3aed]' : ''
                }`}
              >
                <span className="text-lg">{getFlag(code)}</span>
                <span>{locales[code]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function getFlag(locale: Locale): string {
  const flags: Record<Locale, string> = {
    en: '🇺🇸',
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    it: '🇮🇹',
    pt: '🇵🇹',
    ja: '🇯🇵',
    ko: '🇰🇷',
    zh: '🇨🇳',
    ar: '🇸🇦'
  }
  return flags[locale]
}
