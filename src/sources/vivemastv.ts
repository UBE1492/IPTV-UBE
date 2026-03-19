import { collectM3uSource } from "../utils"
import { converter, handle_m3u } from "./utils"
import type { ISource, TSources } from "./utils"

export const vivemastv_filter: ISource["filter"] = (
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
            const name = reg[2].split("|")[0].trim().toLowerCase()

            // Collect all option lines after #EXTINF
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
                
                if (url.includes("bitel.com.pe") || url.includes("reporteperuano.com")) {
                    result.push(`#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36`)
                    result.push(`#EXTVLCOPT:http-referrer=https://bitel.com.pe/`)
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

export const vivemastv_sources: TSources = [
    {
        name: "vivemastv Peru",
        f_name: "v_pe",
        url: "https://raw.githubusercontent.com/vivemastv/IPTV/master/MUNDO/PERU",
        filter: vivemastv_filter,
    },
]
