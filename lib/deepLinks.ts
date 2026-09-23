/**
 * Maps provider names to their mobile app deep-link scheme + web fallback.
 * On mobile: tries app:// first via a 1.5s timeout; falls back to web.
 * On desktop: always uses web.
 */
export const DEEP_LINKS: Record<string, { app?: string; web: string }> = {
  Netflix: { app: "nflx://", web: "https://www.netflix.com" },
  "Amazon Prime Video": { app: "aiv://", web: "https://www.primevideo.com" },
  "Amazon Prime": { app: "aiv://", web: "https://www.amazon.in" },
  "Amazon Music": { app: "amazonmusic://", web: "https://music.amazon.in" },
  "Amazon Kids+": { app: "aiv://", web: "https://www.amazon.in" },
  "Disney+ Hotstar": { app: "hotstar://", web: "https://www.hotstar.com" },
  "Disney+": { app: "disneyplus://", web: "https://www.disneyplus.com" },
  JioHotstar: { app: "hotstar://", web: "https://www.hotstar.com" },
  "SonyLIV": { app: "sonyliv://", web: "https://www.sonyliv.com" },
  ZEE5: { app: "zee5://", web: "https://www.zee5.com" },
  "Apple TV+": { app: "videos://", web: "https://tv.apple.com" },
  "YouTube Premium": { app: "youtube://", web: "https://www.youtube.com" },
  "YouTube Music": { app: "youtubemusic://", web: "https://music.youtube.com" },
  "YouTube Kids Premium": { app: "youtubekids://", web: "https://www.youtubekids.com" },
  Crunchyroll: { app: "crunchyroll://", web: "https://www.crunchyroll.com" },
  "MX Player": { app: "mxplayer://", web: "https://www.mxplayer.in" },
  Spotify: { app: "spotify://", web: "https://open.spotify.com" },
  "Apple Music": { app: "music://", web: "https://music.apple.com" },
  JioSaavn: { app: "jiosaavn://", web: "https://www.jiosaavn.com" },
  Gaana: { app: "gaana://", web: "https://gaana.com" },
  "Wynk Music": { app: "wynk://", web: "https://wynk.in" },
  Audible: { app: "audible://", web: "https://www.audible.in" },
  Storytel: { app: "storytel://", web: "https://www.storytel.com" },
  "Pocket FM": { app: "pocketfm://", web: "https://www.pocketfm.com" },
  "Google One": { web: "https://one.google.com" },
  "iCloud+": { web: "https://www.icloud.com" },
  "Microsoft OneDrive": { app: "ms-onedrive://", web: "https://onedrive.live.com" },
  Dropbox: { app: "dbapi-1://", web: "https://www.dropbox.com" },
  "Proton Drive": { app: "proton-drive://", web: "https://drive.proton.me" },
  MEGA: { app: "mega://", web: "https://mega.nz" },
  "Microsoft 365": { web: "https://www.office.com" },
  "Adobe Creative Cloud": { web: "https://www.adobe.com/creativecloud.html" },
  "Canva Pro": { app: "canva://", web: "https://www.canva.com" },
  Notion: { app: "notion://", web: "https://www.notion.so" },
  Grammarly: { web: "https://www.grammarly.com" },
  Slack: { app: "slack://", web: "https://slack.com" },
  Zoom: { app: "zoomus://", web: "https://zoom.us" },
  "ChatGPT Plus": { app: "openai://", web: "https://chat.openai.com" },
  "Claude Pro": { web: "https://claude.ai" },
  "Google Gemini": { web: "https://gemini.google.com" },
  "Perplexity Pro": { web: "https://www.perplexity.ai" },
  "GitHub Copilot": { app: "github://", web: "https://github.com" },
  Cursor: { web: "https://www.cursor.com" },
  Midjourney: { web: "https://www.midjourney.com" },
  ElevenLabs: { web: "https://elevenlabs.io" },
  "Xbox Game Pass": { app: "ms-xbox://", web: "https://www.xbox.com" },
  "PlayStation Plus": { web: "https://www.playstation.com" },
  "Nintendo Switch Online": { web: "https://www.nintendo.com" },
  "GeForce NOW": { app: "nvidia-shield://", web: "https://www.nvidia.com/geforce-now" },
  "Apple Arcade": { app: "applestore://", web: "https://www.apple.com/apple-arcade" },
  "Kindle Unlimited": { app: "kindle://", web: "https://www.amazon.in/kindleunlimited" },
  "The New York Times": { app: "nytimes://", web: "https://www.nytimes.com" },
  "The Economist": { app: "economist://", web: "https://www.economist.com" },
  Medium: { app: "medium://", web: "https://medium.com" },
  "Coursera Plus": { app: "coursera://", web: "https://www.coursera.org" },
  Udemy: { app: "udemy://", web: "https://www.udemy.com" },
  "LinkedIn Learning": { app: "linkedin://", web: "https://www.linkedin.com/learning" },
  Skillshare: { app: "skillshare://", web: "https://www.skillshare.com" },
  MasterClass: { app: "masterclass://", web: "https://www.masterclass.com" },
  Brilliant: { app: "brilliant://", web: "https://brilliant.org" },
  "Duolingo Super": { app: "duolingo://", web: "https://www.duolingo.com" },
  Duolingo: { app: "duolingo://", web: "https://www.duolingo.com" },
  "Swiggy One": { app: "swiggy://", web: "https://www.swiggy.com" },
  "Zomato Gold": { app: "zomato://", web: "https://www.zomato.com" },
  Blinkit: { app: "blinkit://", web: "https://blinkit.com" },
  "Zepto Pass": { app: "zepto://", web: "https://www.zeptonow.com" },
  BigBasket: { app: "bigbasket://", web: "https://www.bigbasket.com" },
  Flipkart: { app: "flipkart://", web: "https://www.flipkart.com" },
  "Flipkart VIP": { app: "flipkart://", web: "https://www.flipkart.com" },
  Myntra: { app: "myntra://", web: "https://www.myntra.com" },
  "Myntra Insider": { app: "myntra://", web: "https://www.myntra.com" },
  Nykaa: { app: "nykaa://", web: "https://www.nykaa.com" },
  "Nykaa Prive": { app: "nykaa://", web: "https://www.nykaa.com" },
  "Tata 1mg": { app: "tata1mg://", web: "https://www.1mg.com" },
  PharmEasy: { app: "pharmeasy://", web: "https://pharmeasy.in" },
  Apollo: { app: "apollo247://", web: "https://www.apollo247.com" },
  "Apollo 24|7": { app: "apollo247://", web: "https://www.apollo247.com" },
  Practo: { app: "practo://", web: "https://www.practo.com" },
  "Cult.fit": { app: "cultfit://", web: "https://www.cult.fit" },
  HealthifyMe: { app: "healthifyme://", web: "https://www.healthifyme.com" },
  Strava: { app: "strava://", web: "https://www.strava.com" },
  Headspace: { app: "headspace://", web: "https://www.headspace.com" },
  Calm: { app: "calm://", web: "https://www.calm.com" },
  MyFitnessPal: { app: "mfp://", web: "https://www.myfitnesspal.com" },
  MakeMyTrip: { app: "makemytrip://", web: "https://www.makemytrip.com" },
  Cleartrip: { app: "cleartrip://", web: "https://www.cleartrip.com" },
  EaseMyTrip: { app: "easemytrip://", web: "https://www.easemytrip.com" },
  "Booking.com": { app: "booking://", web: "https://www.booking.com" },
  Airbnb: { app: "airbnb://", web: "https://www.airbnb.co.in" },
  Agoda: { app: "agoda://", web: "https://www.agoda.com" },
  "Marriott Bonvoy": { app: "marriott://", web: "https://www.marriott.com" },
  "Accor ALL": { app: "accor://", web: "https://all.accor.com" },
  Uber: { app: "uber://", web: "https://www.uber.com" },
  "Uber One": { app: "uber://", web: "https://www.uber.com" },
  Rapido: { app: "rapido://", web: "https://www.rapido.bike" },
  Ola: { app: "ola://", web: "https://www.olacabs.com" },
  BookMyShow: { app: "bookmyshow://", web: "https://in.bookmyshow.com" },
  "PVR INOX": { app: "pvrcinemas://", web: "https://www.pvrcinemas.com" },
  NordVPN: { app: "nordvpn://", web: "https://nordvpn.com" },
  "1Password": { web: "https://1password.com" },
  Bitwarden: { web: "https://bitwarden.com" },
  Tinder: { app: "tinder://", web: "https://tinder.com" },
  "Bumble Premium": { app: "bumble://", web: "https://bumble.com" },
  "Hinge+": { app: "hinge://", web: "https://hinge.co" },
  "LinkedIn Premium": { app: "linkedin://", web: "https://www.linkedin.com" },
  "X Premium": { app: "twitter://", web: "https://x.com" },
  GitHub: { app: "github://", web: "https://github.com" },
  Photoshop: { web: "https://www.adobe.com/products/photoshop.html" },
  Lightroom: { web: "https://lightroom.adobe.com" },
  Figma: { web: "https://www.figma.com" },
  Shutterstock: { web: "https://www.shutterstock.com" },
  "Freepik Premium": { web: "https://www.freepik.com" },
  "CapCut Pro": { app: "capcut://", web: "https://www.capcut.com" },
  "Adobe Premiere Pro": { web: "https://www.adobe.com/products/premiere.html" },
  "DaVinci Resolve Studio": { web: "https://www.blackmagicdesign.com/products/davinciresolve" },
  "Epidemic Sound": { web: "https://www.epidemicsound.com" },
  TradingView: { app: "tradingview://", web: "https://www.tradingview.com" },
};

/**
 * Returns the deep link for a provider, or null if we don't know it.
 */
export function getDeepLink(provider: string | null | undefined) {
  if (!provider) return null;
  return DEEP_LINKS[provider] ?? null;
}

/**
 * Opens the app if on mobile, otherwise the web URL.
 * Uses a smart fallback: tries app scheme, waits 1.5s, opens web if nothing happened.
 */
export function openProvider(provider: string | null | undefined) {
  const link = getDeepLink(provider);
  if (!link) return false;

  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  if (isMobile && link.app) {
    const start = Date.now();
    // Attempt to open the app
    window.location.href = link.app;
    // If nothing happened after 1.5s, fall back to web
    setTimeout(() => {
      if (Date.now() - start < 2000) {
        window.open(link.web, "_blank");
      }
    }, 1500);
  } else {
    window.open(link.web, "_blank");
  }

  return true;
}
