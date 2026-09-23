/* ============================================
   CONFIGURACION GLOBAL
   Candidatos Lima 2026 - buscador + comparador
   ============================================ */

// URLs de Google Spreadsheets
// >>> REEMPLAZAR con las hojas nuevas de Lima 2026 (publicadas como CSV) <<<
const CONFIG = {
    // Hoja 1: Datos generales de partidos y candidatos
    SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRbRQRPiqxMJXKiKJyzwH1UROJh7JGC207cYkG2uaoVzAcsS02sK8HhJy39xYZB9zWIXoYZ4kTGUM3k/pub?output=csv',

    // Hoja 2: Datos de comparacion por temas
    COMPARISON_SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQpCcYTHdbCr77N5drH--fPo7ysN1RvbyMnyk9PgmOcmoKRV4FsIJMJdTPzDNsN8FiTLOEDntsvZiaE/pub?output=csv',

    // Datos de densidad discursiva (JSON local; reemplazar con la data de Lima 2026)
    DENSITY_DATA_URL: './data/densidad-data.json'
};

// Temas para densidad discursiva (seccion "Peso de los temas")
const THEMES = [
    { id: 'agua_saneamiento', name: 'AGUA Y SANEAMIENTO', color: '#3B82F6' },
    { id: 'bienestar_animal', name: 'BIENESTAR ANIMAL', color: '#EF4444' },
    { id: 'cultura_patrimonio_turismo_deporte', name: 'CULTURA', color: '#10B981' },
    { id: 'desarrollo_economico_comercio', name: 'DESARROLLO ECONÓMICO', color: '#F59E0B' },
    { id: 'educacion', name: 'EDUCACIÓN', color: '#8B5CF6' },
    { id: 'espacio_publico_areas_verdes', name: 'AREAS VERDES', color: '#06B6D4' },
    { id: 'gestion_municipal', name: 'GESTIÓN', color: '#06B6D4' },
    { id: 'gestion_riesgos_cambio_climatico_el_nino', name: 'CAMBIO CLIMÁTICO', color: '#06B6D4' },
    { id: 'gobernanza_digital', name: 'GOBERNANZA DIGITAL', color: '#06B6D4' },
    { id: 'infraestructura_vial', name: 'INFRAESTRUCTURA VIAL', color: '#06B6D4' },
    { id: 'medio_ambiente_residuos', name: 'MEDIO AMBIENTE', color: '#06B6D4' },
    { id: 'participacion_transparencia', name: 'PARTICIPACIÓN CIUDADANA', color: '#06B6D4' },
    { id: 'proteccion_social_cuidados', name: 'PROTECCIÓN SOCIAL', color: '#06B6D4' },
    { id: 'salud', name: 'SALUD', color: '#06B6D4' },
    { id: 'seguridad_ciudadana', name: 'SEGURIDAD', color: '#06B6D4' },
    { id: 'transporte_movilidad', name: 'TRANSPORTE', color: '#06B6D4' },
    { id: 'urbanismo_ordenamiento', name: 'URBANISMO', color: '#06B6D4' },
    { id: 'vivienda_mejoramiento_barrial', name: 'VIVIENDA', color: '#06d409ff' }
];

/* ============================================
   UTILIDADES
   ============================================ */

/**
 * Agrega timestamp para evitar cache
 */
function addCacheBuster(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_=${Date.now()}`;
}

/**
 * Parsea CSV completo (maneja saltos de linea dentro de celdas con comillas)
 */
function parseCSV(csvText) {
    const rows = parseCSVComplete(csvText);

    if (rows.length === 0) return [];

    const headers = rows[0].map(h => h.trim().toLowerCase());
    const data = [];

    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        const row = {};

        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
        });

        // Procesar temas y descripciones (solo para la hoja principal)
        if (row.temas && row.descripcionestemas) {
            const temasArray = row.temas.split(',').map(t => t.trim());
            const descripcionesArray = row.descripcionestemas.split(',').map(d => d.trim());

            row.temas = temasArray.map((nombre, index) => ({
                nombre: nombre,
                descripcion: descripcionesArray[index] || ''
            }));
        }

        data.push(row);
    }

    return data;
}

/**
 * Parser CSV completo que maneja saltos de linea dentro de celdas con comillas
 */
function parseCSVComplete(csvText) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell);
            currentCell = '';
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            currentRow.push(currentCell);
            if (currentRow.some(cell => cell.trim() !== '')) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
            if (char === '\r') i++;
        } else if (char === '\r' && !inQuotes) {
            currentRow.push(currentCell);
            if (currentRow.some(cell => cell.trim() !== '')) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }

    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        if (currentRow.some(cell => cell.trim() !== '')) {
            rows.push(currentRow);
        }
    }

    return rows;
}

/**
 * Parsea una linea CSV individual
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}

/**
 * Fetch con retry automatico
 */
async function fetchWithRetry(url, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return response;
            }
            throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            console.warn(`Intento ${i + 1}/${retries} fallo:`, error.message);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

// Exportar para uso global
window.CONFIG = CONFIG;
window.THEMES = THEMES;
window.addCacheBuster = addCacheBuster;
window.parseCSV = parseCSV;
window.parseCSVComplete = parseCSVComplete;
window.parseCSVLine = parseCSVLine;
window.fetchWithRetry = fetchWithRetry;
