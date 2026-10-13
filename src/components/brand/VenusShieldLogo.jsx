import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";

/** Official Venus Shield mark. Do not replace with generated artwork. */
export const VENUS_SHIELD_LOGO = "https://media.base44.com/images/public/6aa887ba2a0099296d229a29/20944dc4a_logo.png";

const MARK_SIZE = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-12 w-12" };
const WORD_SIZE = { sm: "text-[13px]", md: "text-[15px]", lg: "text-[19px]" };

export default function VenusShieldLogo({ size = "md", showWordmark = true, className }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <Image
        src={VENUS_SHIELD_LOGO}
        alt="Venus Shield"
        fittingType="fit"
        className={cn("shrink-0 object-contain", MARK_SIZE[size])}
      />
      {showWordmark && (
        <div className="min-w-0 leading-tight">
          <div className={cn("font-heading font-bold tracking-[0.02em] text-sidebar-foreground", WORD_SIZE[size])}>
            VENUS SHIELD
          </div>
          <div className="truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-primary/90">
            Control Before Action
          </div>
        </div>
      )}
    </div>
  );
}