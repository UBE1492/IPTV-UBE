import { converter, handle_m3u } from "./utils"
import type { ISource, TSources } from "./utils"
import { mapCategory } from "../utils/categories"

const createCountryFilter = (countryCode: string): ISource["filter"] => {
    return (raw, caller, collectFn) => {
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
                
                const groupMatch = line.match(/group-title="([^"]*)"/)
                const originalGroup = groupMatch ? groupMatch[1] : ""
                
                // For country specific lists, we usually take everything but classify it
                if (url && !sourced.includes(name)) {
                    sourced.push(name)
                    
                    // Re-classify the group-title based on our rules
                    const newCategory = mapCategory(name, originalGroup)
                    const processedLine = line.replace(/group-title="[^"]*"/, `group-title="${newCategory}"`)
                    
                    result.push(processedLine)
                    result.push(url)
                    count++
                }
            }
        }
        return [converter(result.join("\n")), count]
    }
}

export const country_sources: TSources = [
    { name: "PERU", f_name: "pe", url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/pe.m3u", filter: createCountryFilter("pe") },
    { name: "ARGENTINA", f_name: "ar", url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ar.m3u", filter: createCountryFilter("ar") },
    { name: "CHILE", f_name: "cl", url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cl.m3u", filter: createCountryFilter("cl") },
    { name: "ECUADOR", f_name: "ec", url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ec.m3u", filter: createCountryFilter("ec") },
    { name: "MEXICO", f_name: "mx", url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/mx.m3u", filter: createCountryFilter("mx") },
    { name: "ESPAÑA", f_name: "es", url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/es.m3u", filter: createCountryFilter("es") },
    { name: "EEUU", f_name: "us", url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/us.m3u", filter: createCountryFilter("us") },
    { name: "BOLIVIA", f_name: "bo", url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/bo.m3u", filter: createCountryFilter("bo") },
    { name: "COLOMBIA", f_name: "co", url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/co.m3u", filter: createCountryFilter("co") },
    { name: "VENEZUELA", f_name: "ve", url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ve.m3u", filter: createCountryFilter("ve") },
    { name: "PARAGUAY", f_name: "py", url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/py.m3u", filter: createCountryFilter("py") },
    { name: "URUGUAY", f_name: "uy", url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/uy.m3u", filter: createCountryFilter("uy") }
]
