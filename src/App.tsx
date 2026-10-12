import { BrowserRouter, Route, Routes } from 'react-router'
import { MiseEnPage } from './components/MiseEnPage'
import { ToastProvider } from './components/Toast'
import { Accueil } from './pages/Accueil'
import { Contacts } from './pages/Contacts'
import { EcranAVenir } from './pages/EcranAVenir'
import { FicheActivite } from './pages/FicheActivite'
import { FicheContact } from './pages/FicheContact'
import { FicheDepart } from './pages/FicheDepart'
import { Messages } from './pages/Messages'
import { Parametres } from './pages/Parametres'
import { Pipeline } from './pages/Pipeline'
import { Planning } from './pages/Planning'
import { Taches } from './pages/Taches'
import { creerStore } from './store/creerStore'
import { StoreProvider } from './store/StoreContext'

const store = creerStore()

export function App() {
  return (
    <StoreProvider store={store}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MiseEnPage />}>
              <Route index element={<Accueil />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="contacts/:id" element={<FicheContact />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="planning" element={<Planning />} />
              <Route path="planning/departs/:id" element={<FicheDepart />} />
              <Route path="planning/activites/:id" element={<FicheActivite />} />
              <Route path="taches" element={<Taches />} />
              <Route path="messages" element={<Messages />} />
              <Route path="parametres" element={<Parametres />} />
              <Route path="*" element={<EcranAVenir titre="Page introuvable" phase={0} contenu="Cette adresse ne correspond à aucun écran du CRM." />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </StoreProvider>
  )
}
