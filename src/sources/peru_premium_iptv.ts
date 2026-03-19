import { collectM3uSource } from "../utils"
import { converter, handle_m3u } from "./utils"
import type { ISource, TSources } from "./utils"

export const peru_premium_iptv_filter: ISource["filter"] = (
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
                // Add group-title if missing or "-"
                let processedLine = line
                if (line.includes('group-title="-"')) {
                    processedLine = line.replace('group-title="-"', 'group-title="Peru Premium"')
                } else if (!line.includes('group-title=')) {
                    processedLine = line.replace('#EXTINF:-1', '#EXTINF:-1 group-title="Peru Premium"')
                }
                
                result.push(processedLine)
                result.push(url)
                count++
            }
        }
    }

    return [converter(result.join("\n")), count]
}

export const peru_premium_iptv_sources: TSources = [
    {
        name: "Peru Premium IPTV (38.224.73.146)",
        f_name: "pe_premium_iptv",
        url: "http://38.224.73.146:8000/playlist.m3u8",
        filter: peru_premium_iptv_filter,
    }
]
