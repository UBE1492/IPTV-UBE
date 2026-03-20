import { collectM3uSource } from "../utils"
import { converter, handle_m3u } from "./utils"
import type { ISource, TSources } from "./utils"

const EXTINFO_REGEXP = /#EXTINF:-1([^,]*),(.*)/
const EXTVLCOPT_REGEXP = /#EXTVLCOPT:(.*)/

/**
 * Generic radio filter: passes all stations, deduplicates by name,
 * and forces group-title="Música" (radio category).
 */
export const radio_pe_filter: ISource["filter"] = (
    raw,
    caller,
    collectFn
): [string, number] => {
    const rawArray = handle_m3u(raw)

    let i = 1
    const sourced = new Set<string>()
    const result = [rawArray[0] ?? "#EXTM3U"]
    let count = 0

    while (i < rawArray.length) {
        const line = rawArray[i]
        const reg = EXTINFO_REGEXP.exec(line)

        if (reg) {
            const name = reg[2].trim()

            // Skip past any #EXTVLCOPT lines to find the URL
            let j = i + 1
            while (j < rawArray.length && EXTVLCOPT_REGEXP.test(rawArray[j])) {
                j++
            }
            const url = rawArray[j] ?? ""

            if (caller === "normal" && collectFn) {
                collectM3uSource(line, url, collectFn)
            }

            if (!sourced.has(name) && url) {
                sourced.add(name)

                // Ensure group-title is set to "Música" for all radio entries
                let processedLine = line
                if (/group-title="[^"]*"/.test(processedLine)) {
                    processedLine = processedLine.replace(/group-title="[^"]*"/, 'group-title="Música"')
                } else {
                    processedLine = processedLine.replace(/#EXTINF:-1/, '#EXTINF:-1 group-title="Música"')
                }

                result.push(processedLine.trim())

                // Re-add EXTVLCOPT lines if any
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

export const radio_pe_sources: TSources = [
    {
        /**
         * Junguler M3U Radio - Peru
         * Massive curated list of Peruvian radio stations: FM/AM, music genres,
         * news, religious, regional stations, etc.
         * Source: https://github.com/junguler/m3u-radio-music-playlists
         */
        name: "Peru Radios",
        f_name: "pe_radio",
        url: "https://raw.githubusercontent.com/junguler/m3u-radio-music-playlists/main/%2Bchecked%2B/p/peru.m3u",
        filter: (raw, caller, collectFn) => {
            const EXTINF_RE = /#EXTINF:-1([^,]*),(.*)/

            /**
             * The source file is already peru.m3u so entries are mostly Peruvian.
             * We only EXCLUDE entries that show clear non-Peruvian signals.
             * Foreign stations sneak in mainly with "Listen live" suffix and specific
             * well-known foreign brand names.
             */
            const isNonPeru = (name: string): boolean => {
                // Exclude entries from mixed aggregators (have "Listen live" suffix)
                if (/\blisten live\b/i.test(name)) return true

                // Exclude known foreign station patterns
                if (/\b(bbc radio|bbc world|bbc 1|bbc 2|bbc 3|bbc 4|bbc 5|bbc 6)\b/i.test(name)) return true
                if (/\b(cork's|mouv'fm|mouv fm|rte radio|rfi |france inter|france info|france culture|europe 1|radio france|radio classique)\b/i.test(name)) return true
                if (/\b(magic fm|heart fm|smooth fm|kiss fm uk|absolute radio|talkSPORT|virgin radio|greatest hits)\b/i.test(name)) return true
                if (/\b(rock fm uk|rock fm ireland|starter fm|citybeat|positively 1950)\b/i.test(name)) return true

                return false
            }

            const lines = raw.split("\n")
            const peLines: string[] = []

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]

                if (line.startsWith("#EXTM3U")) {
                    peLines.push(line)
                    continue
                }

                if (line.startsWith("#EXTINF")) {
                    const m = EXTINF_RE.exec(line)
                    const name = m ? m[2].trim() : ""

                    if (!isNonPeru(name)) {
                        // Find the URL (skip EXTVLCOPT)
                        let j = i + 1
                        while (j < lines.length && lines[j].startsWith("#EXTVLCOPT")) j++
                        const url = (j < lines.length && !lines[j].startsWith("#")) ? lines[j].trim() : ""

                        peLines.push(line)
                        for (let k = i + 1; k < j; k++) peLines.push(lines[k])
                        if (url) peLines.push(url)
                        i = j
                    }
                }
            }

            return radio_pe_filter(peLines.join("\n"), caller, collectFn)
        },
    },
    {
        /**
         * TDTChannels Radio - includes Peruvian and international stations
         * Filter: keep only entries tagged with PE country code or
         * known Peruvian station name keywords.
         * Source: https://www.tdtchannels.com/lists/radio.m3u8
         */
        name: "Peru Radios (TDT)",
        f_name: "pe_radio_tdt",
        url: "https://www.tdtchannels.com/lists/radio.m3u8",
        filter: (raw, caller, collectFn) => {
            const lines = raw.split("\n")
            const peLines: string[] = []

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]
                if (line.startsWith("#EXTM3U")) {
                    peLines.push(line)
                    continue
                }
                if (line.startsWith("#EXTINF")) {
                    // Check if it's a Peruvian station by country code or keyword
                    const isPeruStation =
                        /tvg-country="PE"/i.test(line) ||
                        /\bperu\b/i.test(line) ||
                        /\bperuana?\b/i.test(line) ||
                        /RPP|Radio Programas|Radio Maria Peru|Studio 92|Oxigeno|Nueva Q|Capital FM/i.test(line)

                    if (isPeruStation) {
                        peLines.push(line)
                        // Add the URL line that follows
                        if (i + 1 < lines.length && !lines[i + 1].startsWith("#")) {
                            peLines.push(lines[i + 1])
                            i++
                        }
                    }
                }
            }

            return radio_pe_filter(peLines.join("\n"), caller, collectFn)
        },
    },
    {
        /**
         * IPTV-org Peru radio streams
         * The iptv-org peru playlist includes some radio stations with group-title="Radio"
         * Source: https://github.com/iptv-org/iptv
         */
        name: "Peru Radios (org)",
        f_name: "pe_radio_org",
        url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/pe.m3u",
        filter: (raw, caller, collectFn) => {
            // Only keep entries with group-title="Radio" or "radio" in the name/group
            const lines = raw.split("\n")
            const radioLines: string[] = []
            let inRadio = false

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]
                if (line.startsWith("#EXTM3U")) { radioLines.push(line); continue }

                if (line.startsWith("#EXTINF")) {
                    inRadio = /group-title="[^"]*([Rr]adio|[Mm][úu]sica)[^"]*"/i.test(line) ||
                              /\bradio\b/i.test(line)
                    if (inRadio) radioLines.push(line)
                } else if (inRadio && !line.startsWith("#")) {
                    radioLines.push(line)
                    inRadio = false
                } else if (inRadio && line.startsWith("#")) {
                    radioLines.push(line)
                }
            }

            return radio_pe_filter(radioLines.join("\n"), caller, collectFn)
        },
    },
]
