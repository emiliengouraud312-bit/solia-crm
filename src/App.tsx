import { BrowserRouter, Route, Routes } from 'react-router'
import { MiseEnPage } from './components/MiseEnPage'
import { Accueil } from './pages/Accueil'
import { EcranAVenir } from './pages/EcranAVenir'
import { Parametres } from './pages/Parametres'
import { creerStore } from './store/creerStore'
import { StoreProvider } from './store/StoreContext'

const store = creerStore()

export function App() {
  return (
    <StoreProvider store={store}>
      <BrowserRouter>
        <Routes>
          <Route element={<MiseEnPage />}>
            <Route index element={<Accueil />} />
            <Route
              path="contacts"
              element={<EcranAVenir titre="Contacts" phase={1} contenu="La liste des contacts avec leurs scores et paliers." />}
            />
            <Route
              path="pipeline"
              element={<EcranAVenir titre="Pipeline" phase={2} contenu="Les colonnes par statut, avec des cartes déplaçables et le contrôle des champs obligatoires." />}
            />
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
    </StoreProvider>
  )
}
