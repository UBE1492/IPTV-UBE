export * from "./utils"
import { vivemastv_sources as vivemastv_sources_list } from "./vivemastv"
import { extra_pe_sources as extra_pe_sources_list } from "./extra_pe"
import { deporte_pe_sources as deporte_pe_sources_list } from "./deporte_pe"
import { peru_main_sources as peru_main_sources_list } from "./peru_main"
import { peru_premium_iptv_sources as peru_premium_iptv_sources_list } from "./peru_premium_iptv"
import { latam_premium_iptv_sources as latam_premium_iptv_sources_list } from "./latam_premium_iptv"
import { country_sources } from "./countries"

const vivemastv_sources = vivemastv_sources_list || []
const extra_pe_sources = extra_pe_sources_list || []
const deporte_pe_sources = deporte_pe_sources_list || []
const peru_main_sources = peru_main_sources_list || []
const peru_premium_iptv_sources = peru_premium_iptv_sources_list || []
const latam_premium_iptv_sources = latam_premium_iptv_sources_list || []

export const sources = [
    ...peru_main_sources,
    ...peru_premium_iptv_sources,
    ...deporte_pe_sources,
    ...extra_pe_sources,
    ...vivemastv_sources,
    ...latam_premium_iptv_sources,
    ...country_sources
]
