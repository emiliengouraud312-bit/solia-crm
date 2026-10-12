import { EnTeteEcran } from '../components/EnTeteEcran'
import { PinSolia } from '../components/PinSolia'

/** Écran prévu dans une phase suivante du plan (docs/04-plan.md). */
export function EcranAVenir({ titre, phase, contenu }: { titre: string; phase: number; contenu: string }) {
  return (
    <>
      <EnTeteEcran titre={titre} sousTitre={`Prévu en phase ${phase}`} />
      <div className="carte flex items-center gap-4 p-6">
        <PinSolia taille={36} />
        <p className="max-w-xl text-neutral-700">{contenu}</p>
      </div>
    </>
  )
}
