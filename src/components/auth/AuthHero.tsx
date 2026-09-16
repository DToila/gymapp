import Image from 'next/image';
import GBLogo from '@/components/GBLogo';

/**
 * Shared photo/hero block for the auth-flow pages (login, register, ...).
 * Keep this as the single source of truth for the hero's height, photo
 * crop, and logo/headline placement so every page that uses it renders
 * pixel-identical — do not re-implement this markup inline per page.
 */
export default function AuthHero() {
  return (
    <div className="relative flex min-h-[260px] flex-col justify-between overflow-hidden p-8 sm:p-10 lg:min-h-screen lg:p-14">
      <Image
        src="/Gracie%20Barra.jpg"
        alt="Gracie Barra"
        fill
        priority
        className="object-cover object-center"
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, rgba(200,29,37,0.12) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.92) 100%)' }}
      />

      <div className="relative z-10 flex items-center gap-3">
        <GBLogo size={44} />
        <div>
          <p className="text-sm font-bold tracking-[0.2em] text-white">GRACIE BARRA</p>
          <p className="text-xs tracking-[0.18em] text-white/45">CARNAXIDE &amp; QUEIJAS</p>
        </div>
      </div>

      <div className="relative z-10">
        <h1 className="text-4xl font-black leading-[1.05] text-white sm:text-5xl lg:text-6xl">
          JIU JITSU
          <br />
          <span className="text-[#c81d25]">PARA</span>
          <br />
          TODOS.
        </h1>
      </div>
    </div>
  );
}
