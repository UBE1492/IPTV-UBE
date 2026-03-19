import fs from "fs"
import path from "path"

const LOGO_DIR = path.resolve("m3u", "logos");
const GITHUB_REPO_BASE = "https://raw.githubusercontent.com/UBE1492/IPTV-UBE/main/m3u/logos";
const IPTV_ORG_LOGOS_URL = "https://iptv-org.github.io/api/logos.json";

interface IIptvLogo {
    channel: string;
    url: string;
}

let logosDatabase: IIptvLogo[] | null = null;
let fetchingLogos: Promise<IIptvLogo[]> | null = null;

const fetchLogosDatabase = async () => {
    if (logosDatabase) return logosDatabase;
    if (fetchingLogos) return fetchingLogos;

    fetchingLogos = (async () => {
        try {
            const res = await fetch(IPTV_ORG_LOGOS_URL);
            if (res.ok) {
                logosDatabase = await res.json();
                console.log(`[LOGOS] Cargada base de datos de iptv-org con ${logosDatabase?.length} logos.`);
                return logosDatabase!;
            }
        } catch (e) {
            console.error("[LOGOS] Error cargando base de datos de logos:", e);
            logosDatabase = [];
            return [];
        }
        return [];
    })();
    
    return fetchingLogos;
}

export const ensureLogoDir = () => {
    if (!fs.existsSync(LOGO_DIR)) {
        fs.mkdirSync(LOGO_DIR, { recursive: true });
    }
}

const safeFilename = (name: string): string => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "") + ".png";
};

const downloadLogo = async (url: string, filename: string): Promise<string | null> => {
    const dest = path.join(LOGO_DIR, filename);
    if (fs.existsSync(dest)) {
        return filename;
    }

    try {
        const res = await fetch(url.trim());
        if (!res.ok) {
            console.log(`[LOGOS-DEBUG] Falló descarga de ${filename} desde ${url}: ${res.status}`);
            return null;
        }
        
        const arrayBuffer = await res.arrayBuffer();
        fs.writeFileSync(dest, new Uint8Array(arrayBuffer));
        console.log(`[LOGOS-DEBUG] Descargado: ${filename}`);
        return filename;
    } catch (e) {
        console.error(`[LOGOS-DEBUG] Error descargando ${filename}:`, e);
        return null;
    }
}

const findFallbackLogo = (name: string, tvgId?: string): string | null => {
    if (!logosDatabase) return null;

    // 0. Manual fallbacks for known variations (IDs from iptv-org)
    const manualFallbacks: Record<string, string> = {
        "america tv hd": "AmericaTelevision.pe",
        "america tv": "AmericaTelevision.pe",
        "red america tv": "AmericaTelevision.pe",
        "latina hd": "Latina.pe",
        "latina deco": "Latina.pe",
        "atv": "ATV.pe",
        "atv hd web": "ATV.pe",
        "atv hd deco": "ATV.pe",
        "panamericana": "PanamericanaTV.pe",
        "willax deco": "WillaxTelevision.pe",
        "global hd deco": "GlobalTV.pe",
        "exitosa": "ExitosaTV.pe",
        "rpp": "RPPTV.pe",
        "nativa": "NativaTV.pe",
        "tv peru hd  web": "TVPeru.pe",
        "tv peru noticias web": "TVPeruNoticias.pe",
        "canal ipe web": "CanalIPe.pe",
        "la tele hd deco": "LaTele.pe",
        "l1 max": "L1MAX.pe",
        "liga1 deco": "Liga1.pe"
    };

    // Direct stable URLs for critical channels to ensure they always work
    const directStableUrls: Record<string, string> = {
        "america tv hd": "https://upload.wikimedia.org/wikipedia/commons/a/ab/Am%C3%A9rica_Televisi%C3%B3n_logo_2016.png",
        "willax deco": "https://i.imgur.com/bZnDDPH.png",
        "tv peru noticias web": "https://static.wikia.nocookie.net/logopedia/images/c/c8/TV_Per%C3%BA_Noticias_2019.svg/revision/latest/scale-to-width-down/1024?cb=20210426133045",
        "liga1 deco": "https://seeklogo.com/images/L/liga-1-peru-logo-3654942FB4-seeklogo.com.png",
        "l1 max": "https://static.wikia.nocookie.net/logopedia/images/f/f2/Liga1Max.png/revision/latest?cb=20230808222009&path-prefix=es"
    };

    const normName = name.toLowerCase().trim();
    
    // 1. Check direct stable URLs first
    if (directStableUrls[normName]) {
        return directStableUrls[normName];
    }

    const searchId = manualFallbacks[normName] || tvgId;
    
    // 2. Intentar por ID exacto si existe
    if (searchId) {
        const byId = logosDatabase.find(l => l.channel.toLowerCase() === searchId.toLowerCase());
        if (byId) return byId.url;
    }
    
    // 3. Intentar por nombre normalizado
    const normSearchName = normName.replace(/[^a-z0-9]/g, "");
    const byName = logosDatabase.find(l => {
        const dbName = l.channel.toLowerCase().replace(/[^a-z0-9]/g, "");
        return dbName === normSearchName || dbName.includes(normSearchName) || normSearchName.includes(dbName);
    });
    
    return byName ? byName.url : null;
}

export const processLogosInM3u = async (m3u: string): Promise<string> => {
    ensureLogoDir();
    await fetchLogosDatabase();
    
    const lines = m3u.split("\n");
    const tasks: (() => Promise<void>)[] = [];
    
    for (let i = 0; i < lines.length; i++) {
        const ln = lines[i];
        if (ln.startsWith("#EXTINF")) {
            const logoMatch = ln.match(/tvg-logo="([^"]+)"/);
            const nameMatch = ln.match(/tvg-name="([^"]+)"/);
            const idMatch = ln.match(/tvg-id="([^"]+)"/);
            const fallbackNameStr = ln.split(",").pop()?.trim() || "unknown";
            
            let url = logoMatch ? logoMatch[1].trim() : "";
            const nameStr = (nameMatch ? nameMatch[1] : fallbackNameStr).trim();
            const tvgId = idMatch ? idMatch[1] : undefined;

            // FALLBACK: Si no hay logo, buscamos uno
            if (!url) {
                const fallbackUrl = findFallbackLogo(nameStr, tvgId);
                if (fallbackUrl) {
                    url = fallbackUrl;
                }
            }
            
            if (url && !url.includes(GITHUB_REPO_BASE)) {
                let filename = safeFilename(nameStr);
                tasks.push(async () => {
                    const dl = await downloadLogo(url, filename);
                    if (dl) {
                        const newUrl = `${GITHUB_REPO_BASE}/${dl}`;
                        if (ln.includes(`tvg-logo="`)) {
                            lines[i] = ln.replace(ln.match(/tvg-logo="([^"]+)"/)?.[0] || "", `tvg-logo="${newUrl}"`);
                        } else {
                            // Inyectar el logo después del -1
                            lines[i] = ln.replace("#EXTINF:-1", `#EXTINF:-1 tvg-logo="${newUrl}"`);
                        }
                    } else {
                        console.log(`[LOGOS-DEBUG] No se pudo descargar logo para: ${nameStr} (${url})`);
                    }
                });
            } else if (!url) {
                console.log(`[LOGOS-DEBUG] No se encontró logo ni fallback para: ${nameStr}`);
            }
        }
    }
    
    const batchSize = 2;
    for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize).map(fn => fn());
        await Promise.allSettled(batch);
        // Pequeño retraso para evitar rate-limits (429)
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return lines.join("\n");
}
