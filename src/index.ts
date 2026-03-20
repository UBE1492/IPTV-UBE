import * as process from "process"
const { hrtime } = process

import { updateChannelsJson } from "./channels"
import {
    cleanFiles,
    getContent,
    mergeSources,
    mergeTxts,
    writeEpgXML,
    writeM3u,
    writeM3uToTxt,
    writeSources,
} from "./file"
import { updateChannelList, updateReadme } from "./readme"
import { sources } from "./sources"
import { updateByRollback, updateEPGByRollback } from "./rollback"
import { epgs_sources } from "./epgs"
import { writeTvBoxJson } from "./tvbox"
import { Collector, verify_m3u_signals } from "./utils"
import { runCustomTask } from "./task/custom"
import { writeEnrichedSourceJson } from "./enriched"
import { get_custom_url } from "./utils"

import type { ICountryGroup } from "./channels"

async function main() {
    cleanFiles()

    console.log(`[TASK] Starting M3U and EPG processing...`)

    // 1. Process M3U sources and EPG sources in parallel
    const [m3uResults, epgResults] = await Promise.all([
        processM3uSources(),
        processEpgSources()
    ])

    // 2. Finalize
    console.log(`[TASK] Write important files`)
    const sources_res = m3uResults.map((r) => (r.status === 'fulfilled' ? r.value?.[1] : undefined))
    const epgs_res = epgResults.map((r) => (r.status === 'fulfilled' ? r.value : undefined))
    
    // Extract country groups from fulfilled results
    const countryGroups: ICountryGroup[] = []
    m3uResults.forEach((r) => {
        if (r.status === 'fulfilled' && (r.value as any)[2]) {
            countryGroups.push((r.value as any)[2])
        }
    })

    mergeTxts()
    mergeSources()
    writeTvBoxJson("tvbox", sources, "Channels")
    updateChannelsJson(sources, sources_res as any, epgs_sources, countryGroups)
    updateReadme(sources, sources_res as any, epgs_sources, epgs_res as any)

    console.log(`[TASK] Make custom sources`)
    runCustomTask()
}

import { CATEGORIES, mapCategory } from "./utils/categories"

async function processM3uSources() {
    return Promise.allSettled(
        sources.map(async (sr) => {
            console.log(`[TASK] Fetch ${sr.name}`)
            try {
                let [ok, text, now] = await getContent(sr)
                let m3u = ""
                let count = 0
                let type: "normal" | "rollback" = "normal"
                let countryGroup: ICountryGroup | undefined

                if (ok && !!text) {
                    console.log(`Fetch m3u from ${sr.name} finished, cost ${(parseInt(hrtime.bigint().toString()) - parseInt(now.toString())) / 10e6} ms`)
                    const sourcesCollector = Collector(undefined, (v) => !/^([a-z]+)\:\/\//.test(v))
                    
                    const [filtered_m3u, raw_count] = sr.filter(
                        text as string,
                        ["o_all", "all"].includes(sr.f_name) ? "skip" : "normal",
                        sourcesCollector.collect
                    )
                    m3u = filtered_m3u
                    count = raw_count

                    // Category grouping logic
                    const lines = m3u.split("\n")
                    const categoryMap: Map<string, string[]> = new Map()
                    
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i]
                        if (line.startsWith("#EXTINF")) {
                            const nameMatch = line.match(/,(.*)/)
                            const name = nameMatch ? nameMatch[1].trim() : ""
                            const groupMatch = line.match(/group-title="([^"]*)"/)
                            const group = groupMatch ? groupMatch[1] : ""
                            
                            const category = mapCategory(name, group)
                            if (!categoryMap.has(category)) categoryMap.set(category, ["#EXTM3U"])
                            
                            categoryMap.get(category)?.push(line)
                            let j = i + 1
                            while (j < lines.length && !lines[j].startsWith("#EXTINF")) {
                                categoryMap.get(category)?.push(lines[j])
                                j++
                            }
                            i = j - 1
                        }
                    }

                    // Write category files
                    const categoriesForJson: any[] = []
                    const url = get_custom_url()

                    for (const cat of CATEGORIES) {
                        const catM3uLines = categoryMap.get(cat)
                        if (catM3uLines && catM3uLines.length > 1) {
                            const catM3u = catM3uLines.join("\n")
                            writeM3u(`${sr.name}/${cat}`, catM3u)
                            const catCount = Math.floor((catM3uLines.length - 1) / 2)
                            categoriesForJson.push({
                                name: cat,
                                m3u: `${url}/${sr.name}/${cat}.m3u`,
                                count: catCount
                            })
                        }
                    }

                    countryGroup = {
                        name: sr.name,
                        categories: categoriesForJson
                    }

                    const priority_countries = ["pe", "v_pe", "pe_premium", "pe_regionales", "pe_deporte", "pe_radio", "pe_radio_tdt", "pe_radio_org"]
                    if (priority_countries.includes(sr.f_name)) {
                        console.log(`[TASK] Verificando señales para ${sr.name}...`)
                        const [verified_m3u, live_count] = await verify_m3u_signals(m3u)
                        m3u = verified_m3u
                        count = live_count
                    }

                    writeSources(sr.name, sr.f_name, sourcesCollector.result())
                } else {
                    const res = await updateByRollback(sr, sr.filter)
                    if (res) {
                        [m3u, count] = res
                        type = "rollback"
                    } else {
                        console.log(`[WARNING] m3u ${sr.name} get failed!`)
                        return [undefined, undefined, undefined]
                    }
                }

                writeM3u(sr.f_name, m3u)
                writeM3uToTxt(sr.name, sr.f_name, m3u)
                await writeEnrichedSourceJson(sr.f_name, m3u)
                writeTvBoxJson(sr.f_name, [{ name: sr.name, f_name: sr.f_name }], sr.name)
                updateChannelList(sr.name, sr.f_name, m3u, type === "rollback")
                
                return [type, count, countryGroup]
            } catch (e) {
                console.error(`[ERROR] Processing ${sr.name}:`, e)
                const res = await updateByRollback(sr, sr.filter)
                if (res) {
                    const [m3u, count] = res
                    writeM3u(sr.f_name, m3u)
                    writeM3uToTxt(sr.name, sr.f_name, m3u)
                    writeTvBoxJson(sr.f_name, [{ name: sr.name, f_name: sr.f_name }], sr.name)
                    updateChannelList(sr.name, sr.f_name, m3u, true)
                    return ["rollback", count, undefined]
                }
                return [undefined, undefined, undefined]
            }
        })
    )
}

async function processEpgSources() {
    return Promise.allSettled(
        epgs_sources.map(async (epg_sr) => {
            console.log(`[TASK] Fetch EPG ${epg_sr.name}`)
            try {
                const [ok, text, now] = await getContent(epg_sr)
                if (ok && !!text) {
                    console.log(`Fetch EPG from ${epg_sr.name} finished, cost ${(parseInt(hrtime.bigint().toString()) - parseInt(now.toString())) / 10e6} ms`)
                    writeEpgXML(epg_sr.f_name, text as string)
                    return ["normal"]
                } else {
                    const rollbackText = await updateEPGByRollback(epg_sr)
                    if (rollbackText) {
                        writeEpgXML(epg_sr.f_name, rollbackText as string)
                        return ["rollback"]
                    }
                    console.log(`[WARNING] EPG ${epg_sr.name} get failed!`)
                    return [undefined]
                }
            } catch (e) {
                console.error(`[ERROR] Processing EPG ${epg_sr.name}:`, e)
                const rollbackText = await updateEPGByRollback(epg_sr)
                if (rollbackText) {
                    writeEpgXML(epg_sr.f_name, rollbackText as string)
                    return ["rollback"]
                }
                return [undefined]
            }
        })
    )
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
