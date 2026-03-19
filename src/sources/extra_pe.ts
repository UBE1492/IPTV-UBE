import { collectM3uSource } from "../utils"
import { converter, handle_m3u } from "./utils"
import type { ISource, TSources } from "./utils"

export const extra_pe_filter: ISource["filter"] = (
    raw,
    caller,
    collectFn
): [string, number] => {
    const rawArray = handle_m3u(raw)
    const extinfRegExp = /#EXTINF:-1([^,]*),(.*)/
    const extvlcoptRegExp = /#EXTVLCOPT:(.*)/

    let i = 1
    let sourced: string[] = []
    let result = [rawArray[0]]
    let count = 0

    while (i < rawArray.length) {
        const line = rawArray[i]
        const reg = extinfRegExp.exec(line)

        if (!!reg) {
            const name = reg[2].trim()
            
            // Collect all option lines after the #EXTINF
            let j = i + 1
            while (j < rawArray.length && extvlcoptRegExp.test(rawArray[j])) {
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

                if (url.includes("bitel.com.pe")) {
                    result.push(`#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36`)
                    result.push(`#EXTVLCOPT:http-referrer=https://bitel.com.pe/`)
                }
                
                result.push(url)
                count++
            }
            i = j + 1  // Skip to after the URL
        } else {
            i++
        }
    }

    return [converter(result.join("\n")), count]
}

export const extra_pe_sources: TSources = [
    {
        name: "Premium Peru (elrandom84)",
        f_name: "pe_premium",
        url: "https://raw.githubusercontent.com/elrandom84/peru.m3u/main/randomlistaxd.m3u",
        filter: extra_pe_filter,
    },
    {
        name: "Peru Regionales (PlanixPlus)",
        f_name: "pe_regionales",
        url: "https://raw.githubusercontent.com/PlanixPlus15/peruregionales.m3u8/main/peruregionales.m3u8",
        filter: extra_pe_filter,
    },
    {
        name: "IPTV-Org Specialized Peru",
        f_name: "pe_org_spec",
        url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/pe.m3u",
        filter: extra_pe_filter,
    }
]
