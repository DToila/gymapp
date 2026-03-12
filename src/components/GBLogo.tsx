interface GBLogoProps {
  size?: number
}

export default function GBLogo({ size = 40 }: GBLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/gb-logo.png"
      alt="Gracie Barra Carnaxide e Queijas"
      width={size}
      height={size}
      style={{ objectFit: 'contain' }}
    />
  )
}
