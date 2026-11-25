import appIconUrl from "../../../../assets/sunbringer/logo_white_on_black.svg";
import { cn } from "~/lib/utils";

export function AppIcon(props: { readonly className?: string }) {
  return <img src={appIconUrl} alt="" className={props.className} />;
}

export function AppMark(props: { readonly className: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block bg-current mask-app-mark mask-contain mask-center mask-no-repeat",
        props.className,
      )}
    />
  );
}
