import Image from "next/image";

/**
 * The "MF" mark, cropped and keyed to transparency from the brand's reveal
 * animation. It was rendered once against a black stage and once against a
 * white one, so each theme gets the version with real contrast rather than
 * one image faded to grey for both — see the .logo-mark-* rules in
 * globals.css, which show/hide these with the same selectors the theme
 * toggle's sun/moon icons use, so the correct one is already showing in
 * server-rendered HTML before hydration runs.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-block ${className}`} aria-hidden="true">
      {/* Exactly one of these is ever visible — CSS toggles `display`, never
          both to `block` at once — so there's no need to stack them with
          absolute positioning; the hidden one simply takes no space. */}
      <Image
        src="/logo/mf-mark-light.png"
        alt=""
        width={520}
        height={301}
        priority
        className="logo-mark-light h-full w-auto object-contain"
      />
      <Image
        src="/logo/mf-mark-dark.png"
        alt=""
        width={535}
        height={308}
        priority
        className="logo-mark-dark h-full w-auto object-contain"
      />
    </span>
  );
}
