/**
 * Icônes des réseaux (lucide-react n'inclut plus les logos de marques).
 * Tracés simplifiés, uniquement pour les liens vers les comptes de la boutique.
 */
type IconProps = { className?: string };

export function WhatsAppIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.2-1.4A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.9 2.3 1 2.5c.1.2 1.7 2.6 4.1 3.6 1.5.7 2.1.7 2.9.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.3-.2Z" />
    </svg>
  );
}

export function InstagramIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTokIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M16.6 2h-3.3v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.2a6.3 6.3 0 1 0 5.3 6.2V8.6a8 8 0 0 0 4.4 1.4V6.7a4.6 4.6 0 0 1-4.4-4.7Z" />
    </svg>
  );
}

export function SnapchatIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 2.8c3 0 5 2.2 5 5.2v2.3l1.6-.5c.6-.1 1 .5.6 1-.5.5-1.4.9-2.2 1.1.6 1.8 2 3.2 3.8 3.7-.3.7-1.4 1-2.6 1.2l-.4 1.3c-1-.2-2-.2-2.8.3-.9.5-1.7 1.3-3 1.3s-2.1-.8-3-1.3c-.8-.5-1.8-.5-2.8-.3l-.4-1.3c-1.2-.2-2.3-.5-2.6-1.2 1.8-.5 3.2-1.9 3.8-3.7-.8-.2-1.7-.6-2.2-1.1-.4-.5 0-1.1.6-1L7 10.3V8c0-3 2-5.2 5-5.2Z" />
    </svg>
  );
}
