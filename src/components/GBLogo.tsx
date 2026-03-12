import Image from 'next/image'

interface GBLogoProps {
  size?: number
}

export default function GBLogo({ size = 40 }: GBLogoProps) {
  return (
    <Image
      src="/Gracie Barra.png"
      alt="Gracie Barra Carnaxide e Queijas"
      width={size}
      height={size}
      style={{ objectFit: 'contain' }}
    />
  )
}
