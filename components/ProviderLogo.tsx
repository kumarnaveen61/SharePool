"use client";

import { useState } from "react";

/** Brand colours for known providers. bg = tile background, fg = logo colour.
 *  When a brand isn't listed, we derive a colour from the name. */
const BRAND_STYLES: Record<string, { bg: string; fg: string }> = {
  // OTT
  Netflix: { bg: "#000000", fg: "#E50914" },
  "Amazon Prime Video": { bg: "#0F171E", fg: "#00A8E1" },
  "Disney+ Hotstar": { bg: "#0C1B3A", fg: "#fff" },
  "Apple TV+": { bg: "#000000", fg: "#fff" },
  "YouTube Premium": { bg: "#000000", fg: "#FF0000" },
  Crunchyroll: { bg: "#F47521", fg: "#fff" },
  "Discovery+": { bg: "#0052CC", fg: "#fff" },
  SonyLIV: { bg: "#F8B400", fg: "#000" },
  ZEE5: { bg: "#8230C6", fg: "#fff" },
  JioHotstar: { bg: "#1A0E4E", fg: "#fff" },
  "Sun NXT": { bg: "#E23E27", fg: "#fff" },
  Aha: { bg: "#FFB800", fg: "#000" },
  Hoichoi: { bg: "#E21D26", fg: "#fff" },
  "Lionsgate Play": { bg: "#000000", fg: "#fff" },
  "MX Player": { bg: "#FF8A00", fg: "#fff" },

  // Music
  Spotify: { bg: "#1DB954", fg: "#fff" },
  "YouTube Music": { bg: "#FF0000", fg: "#fff" },
  "Apple Music": { bg: "#FA243C", fg: "#fff" },
  "Amazon Music": { bg: "#25D1DA", fg: "#000" },
  JioSaavn: { bg: "#2BC5B4", fg: "#fff" },
  Gaana: { bg: "#E7212A", fg: "#fff" },
  "Wynk Music": { bg: "#E32F38", fg: "#fff" },
  Audible: { bg: "#F7991C", fg: "#000" },
  Storytel: { bg: "#F15A24", fg: "#fff" },
  "Pocket FM": { bg: "#EE4042", fg: "#fff" },

  // Software
  "Microsoft 365": { bg: "#D83B01", fg: "#fff" },
  "Adobe Creative Cloud": { bg: "#FF0000", fg: "#fff" },
  "Canva Pro": { bg: "#00C4CC", fg: "#fff" },
  Notion: { bg: "#000000", fg: "#fff" },
  Evernote: { bg: "#00A82D", fg: "#fff" },
  Grammarly: { bg: "#15C39A", fg: "#fff" },
  Slack: { bg: "#4A154B", fg: "#fff" },
  Zoom: { bg: "#2D8CFF", fg: "#fff" },
  Dropbox: { bg: "#0061FF", fg: "#fff" },
  Todoist: { bg: "#E44332", fg: "#fff" },

  // Food
  "Amazon Prime": { bg: "#00A8E1", fg: "#fff" },
  "Swiggy One": { bg: "#FC8019", fg: "#fff" },
  "Zomato Gold": { bg: "#E23744", fg: "#fff" },
  Blinkit: { bg: "#F8CB46", fg: "#000" },
  "Zepto Pass": { bg: "#5B21B6", fg: "#fff" },
  BigBasket: { bg: "#84C225", fg: "#fff" },
  "Tata NeuPass": { bg: "#5D3FDC", fg: "#fff" },

  // Shopping
  "Flipkart VIP": { bg: "#2874F0", fg: "#fff" },
  "Myntra Insider": { bg: "#FF3F6C", fg: "#fff" },
  AJIO: { bg: "#2C4152", fg: "#fff" },
  "Tata CLiQ": { bg: "#DA1A5D", fg: "#fff" },
  "Nykaa Prive": { bg: "#FC2779", fg: "#fff" },
  FirstCry: { bg: "#FF6F61", fg: "#fff" },
  Pothys: { bg: "#C8102E", fg: "#fff" },

  // Pharmacy
  "Tata 1mg": { bg: "#DC2F2F", fg: "#fff" },
  PharmEasy: { bg: "#10847E", fg: "#fff" },
  Netmeds: { bg: "#5A2C85", fg: "#fff" },
  "Apollo 24|7": { bg: "#0055A5", fg: "#fff" },
  Practo: { bg: "#0E5AFA", fg: "#fff" },
  HealthKart: { bg: "#F12E45", fg: "#fff" },
  MediBuddy: { bg: "#00B5CE", fg: "#fff" },
  MedPlus: { bg: "#E52328", fg: "#fff" },

  // Fitness
  "Cult.fit": { bg: "#0A0A0A", fg: "#FF5A5F" },
  HealthifyMe: { bg: "#0B2A5B", fg: "#fff" },
  Fittr: { bg: "#00A99D", fg: "#fff" },
  "Nike Training Club": { bg: "#000000", fg: "#fff" },
  Strava: { bg: "#FC4C02", fg: "#fff" },
  Headspace: { bg: "#F47D31", fg: "#fff" },
  Calm: { bg: "#1B5EC0", fg: "#fff" },
  MyFitnessPal: { bg: "#004B91", fg: "#fff" },

  // Travel
  MakeMyTrip: { bg: "#EB2226", fg: "#fff" },
  Cleartrip: { bg: "#00A4E4", fg: "#fff" },
  EaseMyTrip: { bg: "#F47A20", fg: "#fff" },
  "Booking.com": { bg: "#003580", fg: "#fff" },
  Airbnb: { bg: "#FF5A5F", fg: "#fff" },
  Agoda: { bg: "#FF6B00", fg: "#fff" },
  "Marriott Bonvoy": { bg: "#1C1C1C", fg: "#fff" },
  "Accor ALL": { bg: "#1A2B49", fg: "#fff" },

  // Education
  "Coursera Plus": { bg: "#0056D2", fg: "#fff" },
  Udemy: { bg: "#A435F0", fg: "#fff" },
  "LinkedIn Learning": { bg: "#0A66C2", fg: "#fff" },
  Skillshare: { bg: "#00FF84", fg: "#000" },
  MasterClass: { bg: "#E32636", fg: "#fff" },
  Brilliant: { bg: "#22B8CF", fg: "#fff" },
  "Duolingo Super": { bg: "#58CC02", fg: "#fff" },
  DataCamp: { bg: "#03EF62", fg: "#000" },
  Pluralsight: { bg: "#F15B2A", fg: "#fff" },

  // Movies
  BookMyShow: { bg: "#C8102E", fg: "#fff" },
  "PVR INOX": { bg: "#E60028", fg: "#fff" },
  Cinepolis: { bg: "#0099D8", fg: "#fff" },
  PVR: { bg: "#E60028", fg: "#fff" },
  INOX: { bg: "#E60028", fg: "#fff" },

  // Lounge
  "Priority Pass": { bg: "#003A70", fg: "#fff" },
  DreamFolks: { bg: "#4A148C", fg: "#fff" },
  LoungeKey: { bg: "#1A1A1A", fg: "#fff" },
  "Plaza Premium": { bg: "#B79654", fg: "#fff" },
  "Amex Lounge": { bg: "#006FCF", fg: "#fff" },

  // Credit card benefits
  "HDFC Bank": { bg: "#004C8F", fg: "#fff" },
  "ICICI Bank": { bg: "#F58220", fg: "#fff" },
  "Axis Bank": { bg: "#97144D", fg: "#fff" },
  "SBI Card": { bg: "#005BAC", fg: "#fff" },
  Amex: { bg: "#006FCF", fg: "#fff" },
  Kotak: { bg: "#ED1C24", fg: "#fff" },

  // Hotel
  "Hilton Honors": { bg: "#00295B", fg: "#fff" },
  Taj: { bg: "#A41E34", fg: "#fff" },
  "ITC Hotels": { bg: "#1C3F3E", fg: "#fff" },
  IHG: { bg: "#C8102E", fg: "#fff" },
  Hyatt: { bg: "#1F3D6D", fg: "#fff" },
};

const PALETTE = [
  "#E5484D", "#3E9CFF", "#30A46C", "#F5A623", "#8E4EC6",
  "#E93D82", "#12A594", "#F76B15", "#5B5BD6", "#DB2777",
];

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function initialsFor(name: string) {
  const words = name.replace(/[^\w+ ]/g, " ").split(" ").filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

type Step = "slug" | "domain" | "initials";

export function ProviderLogo({
  name,
  slug,
  domain,
  size = 72,
}: {
  name: string;
  slug?: string;
  domain?: string;
  size?: number;
}) {
  const [step, setStep] = useState<Step>(
    slug ? "slug" : domain ? "domain" : "initials"
  );

  const brand = BRAND_STYLES[name];
  const bg = brand?.bg ?? colorFor(name);
  const fg = brand?.fg ?? "#ffffff";

  const logoSize = Math.round(size * 0.55);

  let inner: React.ReactNode;
  if (step === "slug" && slug) {
    inner = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://cdn.simpleicons.org/${slug}/${fg.replace("#", "")}`}
        alt=""
        style={{ width: logoSize, height: logoSize }}
        className="object-contain"
        onError={() => setStep(domain ? "domain" : "initials")}
      />
    );
  } else if (step === "domain" && domain) {
    inner = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://logo.clearbit.com/${domain}`}
        alt=""
        style={{ width: logoSize, height: logoSize }}
        className="object-contain"
        onError={() => setStep("initials")}
      />
    );
  } else {
    inner = (
      <span
        className="font-extrabold"
        style={{ color: fg, fontSize: Math.round(size * 0.28) }}
      >
        {initialsFor(name)}
      </span>
    );
  }

  return (
    <div
      className="flex items-center justify-center shadow-md transition-transform group-hover:scale-105"
      style={{
        width: size,
        height: size,
        background: bg,
        borderRadius: Math.round(size * 0.24),
        boxShadow:
          "0 6px 16px -6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {inner}
    </div>
  );
}