import { collectM3uSource } from "../utils"
import { converter, handle_m3u } from "./utils"
import type { ISource, TSources } from "./utils"

const EXTINFO_REGEXP = /#EXTINF:-1([^,]*),(.*)/
const EXTVLCOPT_REGEXP = /#EXTVLCOPT:(.*)/

export const deporte_pe_filter: ISource["filter"] = (
    raw,
    caller,
    collectFn
): [string, number] => {
    const rawArray = handle_m3u(raw)

    let i = 1
    let sourced: string[] = []
    let result = [rawArray[0]]
    let count = 0

    while (i < rawArray.length) {
        const line = rawArray[i]
        const reg = EXTINFO_REGEXP.exec(line)

        if (!!reg) {
            const name = reg[2].trim()

            // Skip past any #EXTVLCOPT lines
            let j = i + 1
            while (j < rawArray.length && EXTVLCOPT_REGEXP.test(rawArray[j])) {
                j++
            }
            const url = rawArray[j] ?? ""

            if (caller === "normal" && collectFn) {
                collectM3uSource(line, url, collectFn)
            }

            if (!sourced.includes(name) && url) {
                sourced.push(name)
                result.push(
                    line
                        .replace(/\@\@[0-9]*/g, "")
                        .replace(/\[geo\-blocked\]/, "")
                        .replace(/\[Geo\-blocked\]/, "")
                        .trim()
                )
                // RE-ADD EXTVLCOPT LINES
                for (let k = i + 1; k < j; k++) {
                    result.push(rawArray[k])
                }
                result.push(url)
                count++
            }
            i = j + 1
        } else {
            i++
        }
    }

    return [converter(result.join("\n")), count]
}

export const deporte_pe_sources: TSources = [
    {
        // Canales deportivos de Latinoamérica incluyendo ESPN, Fox Sports, etc.
        name: "Peru Deportes",
        f_name: "pe_deporte",
        url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/pe.m3u",
        filter: (raw, caller, collectFn) => {
            const manualM3u = `#EXTINF:-1 tvg-id="L1MAX.pe" tvg-name="L1 MAX Opción 1" tvg-logo="https://raw.githubusercontent.com/iptv-org/api/master/logos/L1MAX.pe.png" group-title="Deportes",L1 MAX HD (Op 1)
http://38.224.73.146:8000/play/a0vx/index.m3u8
#EXTINF:-1 tvg-id="L1MAX.pe" tvg-name="L1 MAX DECO" tvg-logo="https://raw.githubusercontent.com/iptv-org/api/master/logos/L1MAX.pe.png" group-title="Deportes",LIGA 1 MAX DECO (1080p)
http://38.224.73.146:8000/play/a0vu/index.m3u8
#EXTINF:-1 tvg-id="L1MAX.pe" tvg-name="L1 MAX (Premium)" tvg-logo="https://raw.githubusercontent.com/iptv-org/api/master/logos/L1MAX.pe.png" group-title="Deportes",LIGA 1 MAX (Premium)
http://38.224.73.146:8000/play/a1h7/index.m3u8
#EXTINF:-1 tvg-id="L1MAX.pe" tvg-name="L1 MAX" tvg-logo="https://raw.githubusercontent.com/iptv-org/api/master/logos/L1MAX.pe.png" group-title="Deportes",LIGA 1 MAX (Op 4)
http://38.210.3.64:8090/play/a0nn/index.m3u8
#EXTINF:-1 tvg-id="ESPN2.latin" tvg-name="ESPN 2" tvg-logo="https://raw.githubusercontent.com/iptv-org/api/master/logos/ESPN2.ar.png" group-title="Deportes",ESPN 2
http://179.1.87.75:8098/play/a0ew/index.m3u8
#EXTINF:-1 tvg-id="ESPN3.latin" tvg-name="ESPN 3" tvg-logo="https://raw.githubusercontent.com/iptv-org/api/master/logos/ESPN3.ar.png" group-title="Deportes",ESPN 3
http://179.1.87.75:8098/play/a0hn/index.m3u8
#EXTINF:-1 tvg-id="ESPN4.latin" tvg-name="ESPN 4" tvg-logo="https://raw.githubusercontent.com/iptv-org/api/master/logos/ESPN4.ar.png" group-title="Deportes",ESPN 4
http://179.1.87.75:8098/play/a0fu/index.m3u8
#EXTINF:-1 tvg-id="FoxSports2.latin" tvg-name="Fox Sports 2" tvg-logo="https://raw.githubusercontent.com/iptv-org/api/master/logos/FoxSports2.ar.png" group-title="Deportes",Fox Sports 2
http://179.1.87.75:8098/play/a0fg/index.m3u8
#EXTINF:-1 tvg-id="FoxSports3.latin" tvg-name="Fox Sports 3" tvg-logo="https://raw.githubusercontent.com/iptv-org/api/master/logos/FoxSports3.ar.png" group-title="Deportes",Fox Sports 3
http://179.1.87.75:8098/play/a0fh/index.m3u8
#EXTINF:-1 tvg-id="Liga1.pe" tvg-name="LIGA 1 DECO" tvg-logo="https://raw.githubusercontent.com/iptv-org/api/master/logos/Liga1.pe.png" group-title="Deportes",LIGA 1 DECO
http://38.224.73.146:8000/play/a0vt/index.m3u8
#EXTINF:-1 tvg-id="MovistarDeportes.pe" tvg-name="Movistar Deportes" tvg-logo="https://raw.githubusercontent.com/iptv-org/api/master/logos/MovistarDeportes.pe.png" group-title="Deportes",Movistar Deportes
http://38.224.73.146:8000/play/a1gl/index.m3u8
#EXTINF:-1 tvg-id="GolPeru.pe" tvg-name="GOLPERU" tvg-logo="https://raw.githubusercontent.com/iptv-org/api/master/logos/GolPerú.pe.png" group-title="Deportes",GOLPERU
http://38.224.73.146:8000/play/a1fs/index.m3u8
`
            // Only keep Sports category channels from iptv-org
            const lines = raw.split("\n")
            const sportLines: string[] = ["#EXTM3U", manualM3u]
            let inSports = false

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]
                if (line.startsWith("#EXTM3U")) continue
                
                if (line.startsWith("#EXTINF")) {
                    inSports = /group-title="[^"]*([Ss]port|[Dd]eport)[^"]*"/i.test(line) ||
                                /ESPN|Fox Sports|BeIN|DAZN|L1 MAX|LIGA\s*1|Movistar Deportes|DirecTV|GOLPERU|Liga1/i.test(line)
                    if (inSports) {
                        sportLines.push(line)
                    }
                } else if (inSports && !line.startsWith("#")) {
                    sportLines.push(line)
                    inSports = false
                } else if (inSports && line.startsWith("#")) {
                    sportLines.push(line)
                }
            }

            return deporte_pe_filter(sportLines.join("\n"), caller, collectFn)
        },
    },
    {
        // Canales deportivos de Latinos - ESPN Latino, Fox Sports, BeIN Sports, etc.
        name: "LatAm Deportes",
        f_name: "latam_deporte",
        url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/us.m3u",
        filter: (raw, caller, collectFn) => {
            const lines = raw.split("\n")
            const sportLines: string[] = []
            let inSports = false

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]
                if (line.startsWith("#EXTM3U")) { sportLines.push(line); continue }
                if (line.startsWith("#EXTINF")) {
                    inSports = /ESPN|Fox Sports|BeIN|DAZN|L1 MAX|LIGA\s*1|Movistar Deportes|DirecTV|GOLPERU|Liga1/i.test(line) ||
                               /group-title="[^"]*([Ss]port|[Dd]eport)[^"]*"/i.test(line)
                    if (inSports) sportLines.push(line)
                } else if (inSports && !line.startsWith("#")) {
                    sportLines.push(line)
                    inSports = false
                } else if (inSports) {
                    sportLines.push(line)
                }
            }

            return deporte_pe_filter(sportLines.join("\n"), caller, collectFn)
        },
    },
]
