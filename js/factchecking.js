/* ============================================
   FACTCHECKING
   Versión optimizada para iOS/Safari
   ============================================ */

// Variables globales
let factcheckingData = [];
let filteredFactcheckingData = [];
let currentFactcheckingFilter = 'partido';
let hasSearched = false;

// Paginación responsive
const ITEMS_DESKTOP = 8;
const ITEMS_MOBILE = 3;
const MOBILE_BREAKPOINT = 768;

function getItemsPerPage() {
    return window.innerWidth <= MOBILE_BREAKPOINT ? ITEMS_MOBILE : ITEMS_DESKTOP;
}

let visibleItems = getItemsPerPage();

// Actualizar al cambiar tamaño de ventana - CON DEBOUNCE
const handleFactcheckingResize = (function() {
    // Debounce interno si no está disponible globalmente
    let timeout;
    return function() {
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            const newItemsPerPage = getItemsPerPage();
            if ((visibleItems <= ITEMS_MOBILE && newItemsPerPage > ITEMS_MOBILE) ||
                (visibleItems > ITEMS_MOBILE && newItemsPerPage <= ITEMS_MOBILE)) {
                visibleItems = newItemsPerPage;
                if (hasSearched) {
                    renderFactcheckingCards();
                }
            }
        }, 200);
    };
})();

window.addEventListener('resize', handleFactcheckingResize, { passive: true });

/**
 * Cargar datos de factchecking
 */
async function loadFactcheckingData() {
    const loading = document.getElementById('factcheckingLoading');
    const grid = document.getElementById('factcheckingGrid');
    
    if (loading) loading.style.display = 'block';
    if (grid) grid.style.display = 'none';
    
    try {
        let url = CONFIG.FACTCHECKING_SPREADSHEET_URL;
        if (url.includes('docs.google.com')) {
            url = addCacheBuster(url);
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Error en la respuesta: ' + response.status);
        }
        
        const csvText = await response.text();
        factcheckingData = parseFactcheckingCSV(csvText);
        filteredFactcheckingData = [...factcheckingData];
        
        console.log('✅ Datos de factchecking cargados:', factcheckingData.length, 'items');
        
        if (loading) loading.style.display = 'none';
        if (grid) grid.style.display = 'grid';
        
        populateFactcheckingDropdowns();
        renderFactcheckingCards();
        
    } catch (error) {
        console.error('❌ Error cargando datos de factchecking:', error);
        loadExampleFactcheckingData();
    }
}

/**
 * Parsear CSV de factchecking
 */
function parseFactcheckingCSV(csvText) {
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
        
        if (row.partido || row.frase) {
            data.push(row);
        }
    }
    
    return data;
}

/**
 * Cargar datos de ejemplo
 */
function loadExampleFactcheckingData() {
    factcheckingData = [
        {
            partido: 'Ejemplo Partido',
            candidato: 'Candidato Ejemplo',
            frase: 'Propuesta de ejemplo para demostración.',
            veredicto: 'Requiere condiciones previas',
            justificacion: 'Esta es una justificación de ejemplo.',
            fuentes_consultadas: 'Fuente Ejemplo\nhttps://ejemplo.com'
        }
    ];
    
    filteredFactcheckingData = [...factcheckingData];
    
    document.getElementById('factcheckingLoading').style.display = 'none';
    document.getElementById('factcheckingGrid').style.display = 'grid';
    
    populateFactcheckingDropdowns();
    resetPagination();
    renderFactcheckingCards();
}

/**
 * Renderizar cards de factchecking - OPTIMIZADO
 */
function renderFactcheckingCards() {
    const grid = document.getElementById('factcheckingGrid');
    const noResults = document.getElementById('factcheckingNoResults');
    const loadMoreContainer = document.getElementById('factcheckingLoadMore');
    const loadMoreCount = document.getElementById('loadMoreCount');
    const initialState = document.getElementById('factcheckingInitial');
    
    if (!hasSearched) {
        if (grid) grid.style.display = 'none';
        if (noResults) noResults.style.display = 'none';
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        if (initialState) initialState.style.display = 'block';
        return;
    }
    
    if (initialState) initialState.style.display = 'none';
    
    if (filteredFactcheckingData.length === 0) {
        if (grid) grid.style.display = 'none';
        if (noResults) noResults.style.display = 'block';
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        return;
    }
    
    if (grid) grid.style.display = 'grid';
    if (noResults) noResults.style.display = 'none';
    
    const itemsToShow = filteredFactcheckingData.slice(0, visibleItems);
    
    // Usar requestAnimationFrame para mejor rendimiento
    requestAnimationFrame(() => {
        grid.innerHTML = itemsToShow.map(item => createFactcheckingCard(item)).join('');
        
        const remainingItems = filteredFactcheckingData.length - visibleItems;
        
        if (remainingItems > 0 && loadMoreContainer) {
            loadMoreContainer.style.display = 'flex';
            if (loadMoreCount) {
                loadMoreCount.textContent = `Mostrando ${visibleItems} de ${filteredFactcheckingData.length} resultados`;
            }
        } else if (loadMoreContainer) {
            loadMoreContainer.style.display = 'none';
        }
    });
}

/**
 * Crear card de factchecking
 */
function createFactcheckingCard(item) {
    const veredicto = normalizeVeredicto(item.veredicto);
    const veredictoClass = getVeredictoClass(veredicto);
    const veredictoDescripcion = getVeredictoDescripcion(veredictoClass);
    const fuentes = formatFuentes(item.fuentes_consultadas);
    
    return `
        <div class="factchecking-card">
            <div class="factchecking-card-header">
                <h3>${item.partido || 'Partido'}</h3>
                <p class="factchecking-card-intro">${item.candidato || 'Candidato'}</p>
            </div>
            <div class="factchecking-card-body">
                <div class="factchecking-frase">
                    "${item.frase || 'Frase no disponible'}"
                </div>
                
                <div class="factchecking-veredicto ${veredictoClass}">
                    <div class="factchecking-veredicto-label">
                        ${veredicto}
                        <span class="veredicto-descripcion">(${veredictoDescripcion})</span>
                    </div>
                    <div class="factchecking-veredicto-text">
                        ${item.justificacion || 'Justificación no disponible'}
                    </div>
                </div>
                
                <div class="factchecking-fuentes">
                    <strong>Fuente:</strong> ${fuentes}
                </div>
            </div>
        </div>
    `;
}

/**
 * Normalizar veredicto
 */
function normalizeVeredicto(veredicto) {
    if (!veredicto) return 'INDETERMINADO';
    const v = veredicto.toLowerCase().trim();
    if (v.includes('no puede') || v.includes('no se puede')) return 'NO PUEDE EJECUTARSE';
    if (v.includes('condiciones previas') || v.includes('requiere condiciones')) return 'REQUIERE CONDICIONES PREVIAS';
    if (v.includes('se puede ejecutar')) return 'SE PUEDE EJECUTAR';
    return 'INDETERMINADO';
}

/**
 * Obtener clase CSS del veredicto
 */
function getVeredictoClass(veredicto) {
    if (!veredicto) return 'indeterminado';
    const v = veredicto.toLowerCase().trim();
    if (v.includes('no puede') || v.includes('no se puede')) return 'no_puede_ejecutarse';
    if (v.includes('condiciones previas') || v.includes('requiere condiciones')) return 'requiere_condiciones_previas';
    if (v.includes('se puede ejecutar')) return 'se_puede_ejecutar';
    return 'indeterminado';
}

/**
 * Obtener descripción del veredicto
 */
function getVeredictoDescripcion(veredictoClass) {
    const descripciones = {
        'se_puede_ejecutar': 'La propuesta está dentro de las funciones de la MML y puede realizarse con el marco legal y los recursos disponibles.',
        'no_puede_ejecutarse': 'La propuesta enfrenta un impedimento legal o institucional que no permite realizarla en los términos ofrecidos.',
        'requiere_condiciones_previas': 'Puede realizarse, pero antes necesita una decisión o recurso adicional, como una modificación presupuestal, una ordenanza o un convenio.'
    };
    return descripciones[veredictoClass] || '';
}

/**
 * Formatear fuentes
 */
function formatFuentes(fuentes) {
    if (!fuentes) return 'No especificada';
    
    let normalizedFuentes = fuentes
        .replace(/\\n/g, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
    
    const lines = normalizedFuentes.split('\n');
    const formattedParts = [];
    let currentSource = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        if (line.startsWith('http')) {
            const domain = extractDomain(line);
            if (currentSource) {
                formattedParts.push(`<a href="${line}" target="_blank" rel="noopener">${currentSource}</a>`);
                currentSource = '';
            } else {
                formattedParts.push(`<a href="${line}" target="_blank" rel="noopener">${domain}</a>`);
            }
        } else {
            if (currentSource) {
                formattedParts.push(currentSource);
            }
            currentSource = line;
        }
    }
    
    if (currentSource) {
        formattedParts.push(currentSource);
    }
    
    return formattedParts.length > 0 ? formattedParts.join(' | ') : 'No especificada';
}

/**
 * Cambiar tab de factchecking
 */
function switchFactcheckingTab(filter) {
    document.querySelectorAll('.factchecking-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filter === filter) {
            tab.classList.add('active');
        }
    });
    
    currentFactcheckingFilter = filter;
    
    const partidoContainer = document.getElementById('factcheckingPartidoContainer');
    const candidatoContainer = document.getElementById('factcheckingCandidatoContainer');
    const veredictoContainer = document.getElementById('factcheckingVeredictoContainer');
    
    if (partidoContainer) partidoContainer.style.display = 'none';
    if (candidatoContainer) candidatoContainer.style.display = 'none';
    if (veredictoContainer) veredictoContainer.style.display = 'none';
    
    if (filter === 'partido' && partidoContainer) {
        partidoContainer.style.display = 'block';
        document.getElementById('factcheckingPartidoDropdown').value = '';
    } else if (filter === 'candidato' && candidatoContainer) {
        candidatoContainer.style.display = 'block';
        document.getElementById('factcheckingCandidatoDropdown').value = '';
    } else if (filter === 'veredicto' && veredictoContainer) {
        veredictoContainer.style.display = 'block';
        document.getElementById('factcheckingVeredictoDropdown').value = '';
    }
    
    filteredFactcheckingData = [...factcheckingData];
    hasSearched = false;
    renderFactcheckingCards();
}

/**
 * Poblar dropdowns de factchecking
 */
function populateFactcheckingDropdowns() {
    const partidos = [...new Set(factcheckingData.map(item => item.partido).filter(p => p))].sort();
    const partidoDropdown = document.getElementById('factcheckingPartidoDropdown');
    if (partidoDropdown) {
        partidoDropdown.innerHTML = '<option value="">Seleccionar partido...</option>' + 
            partidos.map(p => `<option value="${p}">${p}</option>`).join('');
    }
    
    const candidatos = [...new Set(factcheckingData.map(item => item.candidato).filter(c => c))].sort();
    const candidatoDropdown = document.getElementById('factcheckingCandidatoDropdown');
    if (candidatoDropdown) {
        candidatoDropdown.innerHTML = '<option value="">Seleccionar candidato...</option>' + 
            candidatos.map(c => `<option value="${c}">${c}</option>`).join('');
    }
}

/**
 * Handlers para los dropdowns
 */
function handlePartidoChange() {
    const dropdown = document.getElementById('factcheckingPartidoDropdown');
    const selectedValue = dropdown.value;
    
    hasSearched = true;
    
    if (!selectedValue) {
        filteredFactcheckingData = [...factcheckingData];
    } else {
        filteredFactcheckingData = factcheckingData.filter(item => 
            (item.partido || '').toLowerCase() === selectedValue.toLowerCase()
        );
    }
    
    resetPagination();
    renderFactcheckingCards();
}

function handleCandidatoChange() {
    const dropdown = document.getElementById('factcheckingCandidatoDropdown');
    const selectedValue = dropdown.value;
    
    hasSearched = true;
    
    if (!selectedValue) {
        filteredFactcheckingData = [...factcheckingData];
    } else {
        filteredFactcheckingData = factcheckingData.filter(item => 
            (item.candidato || '').toLowerCase() === selectedValue.toLowerCase()
        );
    }
    
    resetPagination();
    renderFactcheckingCards();
}

function handleVeredictoChange() {
    const dropdown = document.getElementById('factcheckingVeredictoDropdown');
    const selectedValue = dropdown.value;
    
    hasSearched = true;
    
    if (!selectedValue) {
        filteredFactcheckingData = [...factcheckingData];
    } else {
        filteredFactcheckingData = factcheckingData.filter(item => {
            const veredictoClass = getVeredictoClass(item.veredicto);
            return veredictoClass === selectedValue;
        });
    }
    
    resetPagination();
    renderFactcheckingCards();
}

/**
 * Cargar más items
 */
function loadMoreFactchecking() {
    visibleItems += getItemsPerPage();
    renderFactcheckingCards();
    
    // Scroll suave al nuevo contenido
    requestAnimationFrame(() => {
        const grid = document.getElementById('factcheckingGrid');
        const cards = grid.querySelectorAll('.factchecking-card');
        const itemsPerPage = getItemsPerPage();
        if (cards.length > visibleItems - itemsPerPage) {
            const targetCard = cards[visibleItems - itemsPerPage];
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

/**
 * Resetear paginación
 */
function resetPagination() {
    visibleItems = getItemsPerPage();
}

/**
 * Ocultar autocomplete de factchecking (función placeholder)
 */
function hideFactcheckingAutocomplete() {
    // Función placeholder para compatibilidad
}

// Exportar funciones
window.loadFactcheckingData = loadFactcheckingData;
window.switchFactcheckingTab = switchFactcheckingTab;
window.handlePartidoChange = handlePartidoChange;
window.handleCandidatoChange = handleCandidatoChange;
window.handleVeredictoChange = handleVeredictoChange;
window.loadMoreFactchecking = loadMoreFactchecking;
window.hideFactcheckingAutocomplete = hideFactcheckingAutocomplete;