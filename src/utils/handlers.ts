import * as process from "process"
import "dotenv/config"

interface IREADMEMirrorSite {
    protocol: "http" | "https"
    url: string
    frequence: string
    idc: string
    provider: string
}

type TREADMEMirrorSitesMatrix = IREADMEMirrorSite[]

export const sites_matrix: TREADMEMirrorSitesMatrix = [
    {
        protocol: "https",
        url: "https://iptv.b2og.com",
        frequence: "per 2h",
        idc: "腾讯云",
        provider: "[GrandDuke1106](https://github.com/GrandDuke1106)",
    },
    {
        protocol: "https",
        url: "https://iptv.helima.net",
        frequence: "per 2.5h",
        idc: "Oracle",
        provider: "[DobySAMA](https://github.com/DobySAMA)",
    },
    {
        protocol: "https",
        url: "https://m3u.002397.xyz",
        frequence: "per 2h",
        idc: "CloudFlare Tunnel",
        provider: "[Eternal-Future](https://github.com/Eternal-Future)",
    },
    {
        protocol: "https",
        url: "https://iptv.002397.xyz",
        frequence: "per 2h",
        idc: "Amazon",
        provider: "[Eternal-Future](https://github.com/Eternal-Future)",
    },
]
export const get_custom_url = () =>
    !!process.env.CUSTOM_URL ? process.env.CUSTOM_URL : "https://ube1492.github.io/IPTV-UBE"


export const get_rollback_urls = () => {
    const matrix_url = sites_matrix.map((m) => m.url)

    if (!process.env.ROLLBACK_URLS) {
        return ["https://m3u.ibert.me", ...matrix_url]
    }

    return process.env.ROLLBACK_URLS.split(",")
        .map((url: string) => url.trim())
        .concat(["https://m3u.ibert.me", ...matrix_url])
}

export const get_github_raw_proxy_url = () => {
    const custom = process.env.CUSTOM_GITHUB_RAW_SOURCE_PROXY_URL
    return !!custom ? custom : `https://ghfast.top`
}

export const replace_github_raw_proxy_url = (s: string) => {
    const proxy_url = get_github_raw_proxy_url()
    return s.replace(
        /tvg\-logo="https:\/\/raw\.githubusercontent\.com\//g,
        `tvg-logo="${proxy_url}/https://raw.githubusercontent.com/`
    )
}

export const is_filted_channels = (s: string) => {
    if (s.includes("ABN")) {
        return true
    }
    
    if (s.includes("NTD")) {
        return true
    }

    return false
}

export const check_signal = async (url: string, timeout = 10000): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        clearTimeout(timer);
        // Consider Protected (403), Partial (206) and OK (200, 201) as LIVE
        return [200, 201, 206, 403].includes(response.status);
    } catch (e) {
        return false;
    }
}

export const verify_m3u_signals = async (m3u: string, limit = 10): Promise<[string, number]> => {
    const lines = m3u.trim().split('\n');
    if (lines.length < 2) return [m3u, 0];
    const header = lines[0];

    const entries: { info: string[], url: string }[] = [];
    let currentInfo: string[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('#EXTINF')) {
            currentInfo = [line];
        } else if (line.startsWith('#EXTVLCOPT')) {
            currentInfo.push(line);
        } else if (!line.startsWith('#')) {
            if (currentInfo.length > 0) {
                entries.push({ info: [...currentInfo], url: line });
                currentInfo = [];
            }
        }
    }

    const filtered_entries: typeof entries = [];
    let processed = 0;

    // Worker pool pattern
    const pool = async (task_iterator: IterableIterator<{ info: string[], url: string }>) => {
        for (const entry of task_iterator) {
            const options: Record<string, string> = {};
            entry.info.forEach(opt => {
                if (opt.includes('http-user-agent=')) options['User-Agent'] = opt.split('http-user-agent=')[1];
                if (opt.includes('http-referrer=')) options['Referer'] = opt.split('http-referrer=')[1];
            });

            const is_live = await check_signal_with_headers(entry.url, options);
            if (is_live) {
                filtered_entries.push(entry);
            }
            processed++;
            if (processed % limit === 0 || processed === entries.length) {
                console.log(`[SIGNAL] Verified ${processed}/${entries.length} channels...`);
            }
        }
    };

    const task_iterator = entries[Symbol.iterator]();
    const workers = Array(Math.min(limit, entries.length)).fill(task_iterator).map(pool);
    await Promise.all(workers);

    const result_parts = [header];
    filtered_entries.forEach(e => {
        result_parts.push(...e.info);
        result_parts.push(e.url);
    });

    return [result_parts.join('\n'), filtered_entries.length];
}

async function check_signal_with_headers(url: string, customHeaders: Record<string, string>): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = 10000;
        const timer = setTimeout(() => controller.abort(), timeout);
        
        const headers: Record<string, string> = {
            'User-Agent': customHeaders['User-Agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
        };
        if (customHeaders['Referer']) headers['Referer'] = customHeaders['Referer'];

        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers
        });
        clearTimeout(timer);
        return [200, 201, 206, 403].includes(response.status);
    } catch (e) {
        return false;
    }
}
