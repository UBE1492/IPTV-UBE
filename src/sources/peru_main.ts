import { collectM3uSource } from "../utils"
import { converter, handle_m3u } from "./utils"
import type { ISource, TSources } from "./utils"

export const peru_main_filter: ISource["filter"] = (
    raw,
    caller,
    collectFn
): [string, number] => {
    // These are the keywords for main Peru channels to identify them in the server's playlist
    const mainKeywords = [
        "America TV HD",
        "Latina HD",
        "ATV HD WEB",
        "Panamericana",
        "WILLAX DECO",
        "GLOBAL HD DECO",
        "EXITOSA",
        "RPP",
        "NATIVA",
        "TV PERU HD  WEB",
        "TV PERU NOTICIAS WEB",
        "CANAL IPE WEB",
        "LA TELE HD DECO",
        "L1 MAX",
        "LIGA1 DECO"
    ];

    const rawArray = handle_m3u(raw)
    let sourced: string[] = []
    let result = [rawArray[0]]
    let count = 0

    for (let i = 1; i < rawArray.length; i += 2) {
        const line = rawArray[i]
        const url = rawArray[i + 1]
        
        if (line.startsWith("#EXTINF")) {
            const nameMatch = line.match(/,(.*)/)
            const name = nameMatch ? nameMatch[1].trim() : ""

            // Check if this channel matches any of our main keywords
            const isMain = mainKeywords.some(k => name === k);

            if (isMain) {
                if (caller === "normal" && collectFn) {
                    collectM3uSource(line, url, collectFn)
                }

                if (!sourced.includes(name)) {
                    sourced.push(name)
                    
                    // Assign proper group-title for main channels
                    let processedLine = line;
                    if (name.includes("L1 MAX") || name.includes("LIGA1")) {
                        processedLine = line.replace(/group-title="[^"]*"/, 'group-title="Deportes"');
                    } else if (name.includes("EXITOSA") || name.includes("RPP") || name.includes("NOTICIAS")) {
                        processedLine = line.replace(/group-title="[^"]*"/, 'group-title="Noticias"');
                    } else {
                        processedLine = line.replace(/group-title="[^"]*"/, 'group-title="Entretenimiento"');
                    }

                    // Remove existing tvg-logo if any from server to let our logic handle it
                    processedLine = processedLine.replace(/tvg-logo="[^"]*"/, "");
                    
                    result.push(processedLine)
                    result.push(url)
                    count++
                }
            }
        }
    }

    return [converter(result.join("\n")), count]
}

export const peru_main_sources: TSources = [
    {
        name: "Peru Canales Principales (Auto)",
        f_name: "pe_main",
        url: "http://38.224.73.146:8000/playlist.m3u8",
        filter: peru_main_filter,
    }
]
