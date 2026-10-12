import { NavLink } from 'react-router'
import logo from '../../assets/brand/logo-solia.png'
import {
  IconeCalendrier,
  IconeContacts,
  IconeMessages,
  IconeParametres,
  IconePipeline,
  IconeTableau,
  IconeTaches,
} from './Icones'

const LIENS = [
  { vers: '/', libelle: 'Tableau de bord', icone: <IconeTableau /> },
  { vers: '/contacts', libelle: 'Contacts', icone: <IconeContacts /> },
  { vers: '/pipeline', libelle: 'Pipeline', icone: <IconePipeline /> },
  { vers: '/planning', libelle: 'Planning', icone: <IconeCalendrier /> },
  { vers: '/taches', libelle: 'Tâches', icone: <IconeTaches /> },
  { vers: '/messages', libelle: 'Messages', icone: <IconeMessages /> },
  { vers: '/parametres', libelle: 'Paramètres', icone: <IconeParametres /> },
]

export function BarreLaterale() {
  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col bg-bordeaux text-beige">
      <div className="px-5 pb-6 pt-6">
        <img src={logo} alt="Solia, rayonner ensemble" className="w-36" />
        <p className="libelle mt-3 text-[10px] text-beige/70">CRM interne</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {LIENS.map((lien) => (
          <NavLink
            key={lien.vers}
            to={lien.vers}
            end={lien.vers === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive ? 'bg-rose text-white' : 'text-beige/85 hover:bg-bordeaux-clair/40'
              }`
            }
          >
            {lien.icone}
            {lien.libelle}
          </NavLink>
        ))}
      </nav>
      <p className="px-5 pb-5 text-[11px] leading-snug text-beige/60">
        Données fictives de démonstration. Aucun message n'est réellement envoyé.
      </p>
    </aside>
  )
}
