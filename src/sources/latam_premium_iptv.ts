import { collectM3uSource } from "../utils"
import { converter, handle_m3u } from "./utils"
import type { ISource, TSources } from "./utils"

export const latam_premium_iptv_filter: ISource["filter"] = (
    raw,
    caller,
    collectFn
): [string, number] => {
    const rawArray = handle_m3u(raw)
    let sourced: string[] = []
    let result = [rawArray[0]]
    let count = 0

    for (let i = 1; i < rawArray.length; i += 2) {
        const line = rawArray[i]
        const url = rawArray[i + 1]
        
        if (line.startsWith("#EXTINF")) {
            const nameMatch = line.match(/,(.*)/)
            const name = nameMatch ? nameMatch[1].trim() : "Unknown"

            if (caller === "normal" && collectFn) {
                collectM3uSource(line, url, collectFn)
            }

            if (!sourced.includes(name)) {
                sourced.push(name)
                
                // Categorization logic based on name since group-title is missing or generic
                let category = "LatAm Premium"
                if (/RD|Rep\.? Dom\.?|Telecentro|Telesistema|CDN|Color Vision|Teleantillas/i.test(name)) category = "República Dominicana"
                else if (/ESPN|Fox Sports|Win Sport|TyC|DIRECTV|Gol|L1 MAX|LIGA\s*1|Liga1/i.test(name)) category = "Deportes"
                else if (/HBO|Cinemax|Star Channel|Sony|Space|Warner|Cinecanal|TNT|AXN|AMC/i.test(name)) category = "Cine & Series"
                else if (/Discovery|Animal Planet|History|Nat Geo|H2/i.test(name)) category = "Cultura"
                else if (/Disney|Nick|Cartoon|Baby|Tooncast/i.test(name)) category = "Infantil"

                let processedLine = line.replace('#EXTINF:-1', `#EXTINF:-1 group-title="${category}"`)
                if (processedLine.includes('group-title="-"')) {
                    processedLine = processedLine.replace('group-title="-"', `group-title="${category}"`)
                }
                
                result.push(processedLine)
                result.push(url)
                count++
            }
        }
    }

    return [converter(result.join("\n")), count]
}

export const latam_premium_iptv_sources: TSources = [
    {
        name: "LatAm Premium IPTV (179.1.87.75)",
        f_name: "latam_premium_iptv",
        url: "http://179.1.87.75:8098/playlist.m3u8",
        filter: latam_premium_iptv_filter,
    },
    {
        name: "LatAm & RD Premium (200.125.170.122)",
        f_name: "latam_rd_premium",
        url: "http://200.125.170.122:8000/playlist.m3u8",
        filter: latam_premium_iptv_filter,
    }
]
