import pin from '../../assets/brand/pin-solia.svg'

/** Le PIN Solia, qui avance sur la frise du parcours client. */
export function PinSolia({ taille = 28, grise = false, className = '' }: { taille?: number; grise?: boolean; className?: string }) {
  return (
    <img
      src={pin}
      alt="PIN Solia"
      width={taille}
      height={taille * 1.22}
      className={`${grise ? 'opacity-60 grayscale' : ''} ${className}`}
    />
  )
}
