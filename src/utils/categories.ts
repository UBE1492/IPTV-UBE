export const CATEGORIES = [
    "Noticias",
    "Deportes",
    "Películas",
    "Series",
    "Infantil",
    "Educativo",
    "Documentales",
    "Música",
    "Entretenimiento",
    "Cultura",
    "Religioso",
    "Cocina",
    "Viajes",
    "Tecnología",
    "Moda",
    "Compras",
    "Reality Shows",
    "Anime",
    "Adultos",
    "Otros"
] as const;

export type TCategory = typeof CATEGORIES[number];

export const mapCategory = (name: string, groupTitle?: string): TCategory => {
    const text = `${name} ${groupTitle || ""}`.toLowerCase();

    if (/(noticia|news|prensa|informativo)/i.test(text)) return "Noticias";
    if (/(deporte|sport|futbol|soccer|liga|espn|fox|bein|dazn|gol|atletismo|tenis|nba|nfl)/i.test(text)) return "Deportes";
    if (/(pelicula|movie|cine|hbo|star|cinema|accion|comedia|terror|cinecanal)/i.test(text)) return "Películas";
    if (/(serie|drama|novela|soap|sitcom)/i.test(text)) return "Series";
    if (/(infantil|niño|kid|cartoon|disney|nick|discovery kids|junior|toons)/i.test(text)) return "Infantil";
    if (/(educativo|educa|aprende|learn|escuela)/i.test(text)) return "Educativo";
    if (/(documental|history|natgeo|discovery|bio|ciencia|exploration|investigacion)/i.test(text)) return "Documentales";
    if (/(musica|music|mtv|vhr|concierto|radio|rock|pop|latino)/i.test(text)) return "Música";
    if (/(cultura|arte|museum|historia|tradicion)/i.test(text)) return "Cultura";
    if (/(religioso|iglesia|catolico|cristiano|biblia|fe|espiritu|enlace|ewtn)/i.test(text)) return "Religioso";
    if (/(cocina|food|gourmet|chef|receta|comer)/i.test(text)) return "Cocina";
    if (/(viaje|travel|mundo|world|turismo|aventura)/i.test(text)) return "Viajes";
    if (/(tecnologia|tech|digital|gadget|ciencia)/i.test(text)) return "Tecnología";
    if (/(moda|fashion|estilo|glamour)/i.test(text)) return "Moda";
    if (/(compra|televenta|shop|qvc|vender|oferta)/i.test(text)) return "Compras";
    if (/(reality|show|concurso|talento)/i.test(text)) return "Reality Shows";
    if (/(anime|otaku|animacion japonesa|crunchyroll)/i.test(text)) return "Anime";
    if (/(adulto|xxx|erotico|playboy|venus|hentai)/i.test(text)) return "Adultos";
    
    // Default to Entretenimiento if it's a general channel or contains entertainment keywords
    if (/(entretenimiento|entretenido|variedad|magazin|show|general|tv)/i.test(text)) return "Entretenimiento";

    return "Otros"; // fallback
};
