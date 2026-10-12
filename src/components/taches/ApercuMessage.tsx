// Message rendu à partir d'un modèle (objet, corps, canal, expéditeur), tel qu'il partirait. Aucun envoi réel.
import { Link } from 'react-router'
import type { MessageRendu } from '../../domain/messages'
import type { Contact } from '../../domain/types'

export function ApercuMessage({ rendu, destinataires }: { rendu: MessageRendu; destinataires?: Contact[] }) {
  return (
    <div className="rounded-xl border border-beige-fonce bg-beige/50 p-4">
      <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
        <dt className="libelle pt-0.5 text-[10px] text-bordeaux/70">Modèle</dt>
        <dd className="text-neutral-800">
          {rendu.code} · {rendu.nom}
        </dd>
        <dt className="libelle pt-0.5 text-[10px] text-bordeaux/70">Canal</dt>
        <dd className="text-neutral-800">{rendu.canal}</dd>
        <dt className="libelle pt-0.5 text-[10px] text-bordeaux/70">De</dt>
        <dd className="text-neutral-800">{rendu.expediteur}</dd>
        {destinataires && (
          <>
            <dt className="libelle pt-0.5 text-[10px] text-bordeaux/70">À</dt>
            <dd className="text-neutral-800">
              {destinataires.slice(0, 6).map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ', '}
                  <Link to={`/contacts/${c.id}`} className="hover:text-rose">
                    {c.prenom} {c.nom}
                  </Link>
                </span>
              ))}
              {destinataires.length > 6 && ` et ${destinataires.length - 6} autres`}
            </dd>
          </>
        )}
        {rendu.objet && (
          <>
            <dt className="libelle pt-0.5 text-[10px] text-bordeaux/70">Objet</dt>
            <dd className="font-medium text-bordeaux">{rendu.objet}</dd>
          </>
        )}
      </dl>
      <p className="whitespace-pre-line rounded-lg bg-white p-3 text-[13px] leading-relaxed text-neutral-800">{rendu.corps}</p>
      <p className="mt-2 text-xs text-neutral-500">
        Simulation : aucun message n'est réellement envoyé.
        {rendu.manquantes.length > 0 && ` Entre crochets, les éléments que l'équipe complète au moment de l'envoi (${rendu.manquantes.join(', ')}).`}
      </p>
    </div>
  )
}
