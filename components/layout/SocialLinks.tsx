import { InstagramIcon, SnapchatIcon, TikTokIcon } from "@/components/brand/SocialIcons";
import { site } from "@/data/site";

/** Liens vers les réseaux renseignés dans data/site.ts (les vides sont masqués) */
export function SocialLinks({ className = "" }: { className?: string }) {
  const { instagram, snapchat, tiktok } = site.socials;
  const links = [
    instagram && { href: `https://www.instagram.com/${instagram}/`, label: `Instagram @${instagram}`, Icon: InstagramIcon },
    tiktok && { href: `https://www.tiktok.com/@${tiktok}`, label: `TikTok @${tiktok}`, Icon: TikTokIcon },
    snapchat && { href: `https://www.snapchat.com/add/${snapchat}`, label: `Snapchat ${snapchat}`, Icon: SnapchatIcon },
  ].filter(Boolean) as { href: string; label: string; Icon: typeof InstagramIcon }[];

  if (links.length === 0) return null;

  return (
    <ul className={`flex gap-2 ${className}`}>
      {links.map(({ href, label, Icon }) => (
        <li key={href}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="grid size-11 place-items-center rounded-full border border-current/25 transition-colors hover:border-current"
          >
            <Icon className="size-5" />
          </a>
        </li>
      ))}
    </ul>
  );
}
