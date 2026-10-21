import Image from "next/image";
import { clubBrand } from "@/lib/club-brand";

export function ClubIdentity({
  name = clubBrand.name,
  logo,
}: {
  name?: string;
  logo?: string | null;
}) {
  return (
    <span className="club-identity" translate="no">
      <Image
        className="club-logo"
        src={logo || clubBrand.logo}
        width={145}
        height={200}
        alt=""
        unoptimized
        referrerPolicy="no-referrer"
      />
      <span className="club-identity-name">
        {name === clubBrand.name ? (
          <>
            <span>ŠŠK Gymnázium </span>
            <strong>Bilíkova</strong>
            <span> Bratislava</span>
          </>
        ) : (
          <strong>{name}</strong>
        )}
      </span>
    </span>
  );
}
