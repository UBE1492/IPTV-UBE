import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { get_custom_url } from "./utils"

/**
 * Enriched channel DTO with category, logo, and player options.
 */
export interface IChannelDto {
    name: string
    url: string
    logo?: string
    category?: string
    options?: {
        "http-user-agent"?: string
        "http-referrer"?: string
    }
}

export interface IEnrichedSource {
    name: string
    updated_at: number
    m3u: string
    channels: IChannelDto[]
    categories: Record<string, IChannelDto[]>
}

/**
 * Parses an M3U content string and returns an enriched source object with categories and player options.
 */
export function enrichM3u(sourceName: string, m3uContent: string): IEnrichedSource {
    const channels: IChannelDto[] = []
    const categories: Record<string, IChannelDto[]> = {}

    const lines = m3uContent.split("\n")
    const extinfRegExp = /#EXTINF:-1([^,]*),(.*)/
    const groupRegExp = /group-title="([^"]*)"/
    const logoRegExp = /tvg-logo="([^"]*)"/
    const extvlcoptRegExp = /#EXTVLCOPT:(.*)/

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.startsWith("#EXTINF")) {
            const match = extinfRegExp.exec(line)
            if (match) {
                const info = match[1]
                const name = match[2].trim()
                
                const groupMatch = groupRegExp.exec(info)
                const logoMatch = logoRegExp.exec(info)
                
                const category = groupMatch ? groupMatch[1].trim() : "Otros"
                const logo = logoMatch ? logoMatch[1].trim() : ""

                const options: Record<string, string> = {}
                let j = i + 1
                // Collect all #EXTVLCOPT lines before the URL
                while (j < lines.length && extvlcoptRegExp.test(lines[j])) {
                    const optMatch = extvlcoptRegExp.exec(lines[j])
                    if (optMatch) {
                        const opt = optMatch[1].trim()
                        if (opt.startsWith("http-user-agent=")) {
                            options["http-user-agent"] = opt.split("http-user-agent=")[1]
                        }
                        if (opt.startsWith("http-referrer=")) {
                            options["http-referrer"] = opt.split("http-referrer=")[1]
                        }
                    }
                    j++
                }
                const url = lines[j] ? lines[j].trim() : ""

                const channel: IChannelDto = {
                    name,
                    url,
                    logo,
                    category,
                    options: Object.keys(options).length > 0 ? options : undefined
                }

                channels.push(channel)

                if (!categories[category]) {
                    categories[category] = []
                }
                categories[category].push(channel)
                
                // Move index to the URL line (loop will increment to the next line)
                i = j
            }
        }
    }

    return {
        name: sourceName,
        updated_at: Date.now(),
        m3u: `${get_custom_url()}/${sourceName}.m3u`,
        channels,
        categories
    }
}

/**
 * Parses an M3U content string and writes an enriched JSON file.
 */
export async function writeEnrichedSourceJson(sourceName: string, m3uContent: string): Promise<void> {
    try {
        const data = enrichM3u(sourceName, m3uContent)
        const dir = path.join(process.cwd(), "m3u", "enriched")
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        const filePath = path.join(dir, `${sourceName}.json`)
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    } catch (e) {
        console.error(`[ERROR] Failed to enrich source ${sourceName}:`, e)
    }
}
