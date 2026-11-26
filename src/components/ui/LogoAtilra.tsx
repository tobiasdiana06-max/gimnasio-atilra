import Image from "next/image";
import type { ImageProps } from "next/image";

export function LogoAtilra(props: Omit<ImageProps, "alt" | "height" | "src" | "width">) {
  return (
    <Image
      src="/icons/atilra-192.png"
      width={192}
      height={192}
      alt=""
      aria-hidden="true"
      {...props}
    />
  );
}
