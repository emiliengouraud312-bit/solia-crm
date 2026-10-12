import { BrowserRouter, Route, Routes } from 'react-router'
import { MiseEnPage } from './components/MiseEnPage'
import { ToastProvider } from './components/Toast'
import { Accueil } from './pages/Accueil'
import { Contacts } from './pages/Contacts'
import { EcranAVenir } from './pages/EcranAVenir'
import { FicheContact } from './pages/FicheContact'
import { Parametres } from './pages/Parametres'
import { Pipeline } from './pages/Pipeline'
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
              <Route
                path="planning"
                element={<EcranAVenir titre="Planning" phase={3} contenu="Le calendrier des départs et des activités, source de tous les automatismes." />}
              />
              <Route
                path="taches"
                element={<EcranAVenir titre="Tâches" phase={3} contenu="Les tâches créées par les process, avec le message rendu avant validation." />}
              />
              <Route
                path="messages"
                element={<EcranAVenir titre="Messages" phase={3} contenu="La bibliothèque des 41 modèles de messages, avec aperçu sur un contact." />}
              />
              <Route path="parametres" element={<Parametres />} />
              <Route path="*" element={<EcranAVenir titre="Page introuvable" phase={0} contenu="Cette adresse ne correspond à aucun écran du CRM." />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </StoreProvider>
  )
}
