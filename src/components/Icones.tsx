// Icônes de navigation dessinées à la main (trait simple).
// Charte Solia : jamais d'avion, de valise ni de mappemonde.
import type { ReactNode } from 'react'

function Icone({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const IconeTableau = () => (
  <Icone>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Icone>
)

export const IconeContacts = () => (
  <Icone>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M17 14.5c2.3 0 4 1.4 4.5 4" />
  </Icone>
)

export const IconePipeline = () => (
  <Icone>
    <rect x="3" y="4" width="5" height="16" rx="1.5" />
    <rect x="10" y="4" width="5" height="11" rx="1.5" />
    <rect x="17" y="4" width="4" height="7" rx="1.5" />
  </Icone>
)

export const IconeCalendrier = () => (
  <Icone>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icone>
)

export const IconeTaches = () => (
  <Icone>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </Icone>
)

export const IconeMessages = () => (
  <Icone>
    <path d="M4 5h16v11H9l-5 4z" />
    <path d="M8 9.5h8M8 12.5h5" />
  </Icone>
)

export const IconeParametres = () => (
  <Icone>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Icone>
)

export const IconeRecherche = () => (
  <Icone>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-4.5-4.5" />
  </Icone>
)

export const IconePlus = () => (
  <Icone>
    <path d="M12 5v14M5 12h14" />
  </Icone>
)
