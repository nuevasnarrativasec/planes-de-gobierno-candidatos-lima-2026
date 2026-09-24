/* ============================================
   BUSCADOR DE CANDIDATOS Y PARTIDOS
   ============================================ */

// Variables globales
let currentTab = 'partido';
let allData = [];
let filteredData = [];
let selectedSuggestionIndex = -1;
let currentSuggestions = [];

/**
 * Cargar datos desde Google Sheets
 */
async function loadDataFromGoogleSheets() {
    const itemList = document.getElementById('itemList');
    const detailPanel = document.getElementById('detailPanel');
    
    if (itemList) {
        itemList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Cargando datos...</div>';
    }
    if (detailPanel) {
        detailPanel.innerHTML = '<div class="empty-state">Cargando...</div>';
    }

    try {
        const response = await fetch(addCacheBuster(CONFIG.SPREADSHEET_URL));
        
        if (!response.ok) {
            throw new Error('Error al cargar los datos');
        }
        
        const csvText = await response.text();
        allData = parseCSV(csvText);
        
        // Actualizar referencia global para que otros módulo puedan acceder
        window.allData = allData;
        
        filteredData = allData.filter(item => item.tipo === currentTab).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        
        console.log('Datos cargados:', allData.length, 'registros');
        
        if (allData.length === 0) {
            if (itemList) {
                itemList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No hay datos disponibles.</div>';
            }
        } else {
            renderItems();
            if (detailPanel) {
                detailPanel.innerHTML = '<div class="empty-state">Selecciona un partido o candidato para ver los detalles</div>';
            }
        }
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        if (itemList) {
            itemList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #e74c3c;">
                    <p style="font-weight: bold; margin-bottom: 10px;">Error al cargar los datos</p>
                    <p style="font-size: 13px; line-height: 1.6;">
                        Verifica que la URL del Google Sheet sea correcta y que estÃ© publicado como CSV.
                    </p>
                </div>
            `;
        }
    }
}

/**
 * Cambiar entre tabs (partido/candidato)
 */
function switchTab(tab) {
    currentTab = tab;
    
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim().length > 0) {
        hideAutocomplete();
        updateAutocomplete();
    }
    
    filterItems();
}

/**
 * Filtrar items por búsqueda
 */
function filterItems() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    filteredData = allData.filter(item => {
        const matchesTab = item.tipo === currentTab;
        const matchesSearch = item.nombre.toLowerCase().includes(searchTerm) || 
                            (item.candidato && item.candidato.toLowerCase().includes(searchTerm));
        return matchesTab && matchesSearch;
    }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    
    renderItems();
}

/**
 * Renderizar lista de items
 */
function renderItems() {
    const itemList = document.getElementById('itemList');
    if (!itemList) return;
    
    if (filteredData.length === 0) {
        itemList.innerHTML = '<div class="no-results">No se encontraron resultados</div>';
        return;
    }
    
    itemList.innerHTML = filteredData.map((item, index) => {
        let imageDisplay;
        
        if (item.tipo === 'candidato') {
            imageDisplay = item.fotourl 
                ? `<img src="${item.fotourl}" alt="${item.candidato || item.nombre}" 
                    style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;"
                    onerror="this.style.display='none'; this.parentElement.innerHTML='👤';">` 
                : '👤';
        } else {
            imageDisplay = item.logourl 
                ? `<img src="${item.logourl}" alt="${item.nombre}" 
                    style="width: 100%; height: 100%; object-fit: contain; border-radius: 6px;"
                    onerror="this.style.display='none'; this.parentElement.innerHTML='🎈';">` 
                : '🎈';
        }
        
        return `
            <div class="party-item" data-id="${item.id}" data-index="${index}">
                <div class="party-icon">${imageDisplay}</div>
                <div class="party-name">${item.nombre}</div>
            </div>
        `;
    }).join('');
    
    // Agregar event listeners
    document.querySelectorAll('.party-item').forEach(element => {
        element.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            selectItem(itemId, this);
        });
    });
}

/**
 * Seleccionar un item
 */
function selectItem(id, element) {
    const item = allData.find(i => i.id == id);
    
    if (!item) {
        console.error('Item no encontrado:', id);
        return;
    }
    
    document.querySelectorAll('.party-item').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }
    
    renderDetails(item);
}

/**
 * Renderizar panel de detalles
 */
function renderDetails(item) {
    const detailPanel = document.getElementById('detailPanel');
    if (!detailPanel) return;
    
    const temas = Array.isArray(item.temas) ? item.temas : [];
    
    const topicsHTML = temas.map(tema => `
        <div class="topic-tag">
            ${tema.nombre}
            <div class="info-icon">i</div>
            <div class="tooltip">${tema.descripcion}</div>
        </div>
    `).join('');
    
    const avatarHTML = item.fotourl 
        ? `<img src="${item.fotourl}" alt="${item.candidato}" 
            style="width: 100%; height: 100%;"
            onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'avatar-icon\\'></div><div class=\\'avatar-body\\'></div>';">` 
        : `<div class="avatar-icon"></div><div class="avatar-body"></div>`;
    
    const downloadButton = item.planurl 
        ? `<a href="${item.planurl}" target="_blank" class="btn btn-primary" style="text-decoration: none;">Descarga el plan</a>`
        : `<button class="btn btn-primary" disabled style="opacity: 0.5; cursor: not-allowed;">Plan no disponible</button>`;
    
    // Casos especiales: candidatos que postulan como primer regidor
    const CANDIDATOS_PRIMER_REGIDOR = ['lopez aliaga', 'romero castro'];
    const nombreNormalizado = (item.candidato || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const esPrimerRegidor = CANDIDATOS_PRIMER_REGIDOR.some(nombre => nombreNormalizado.includes(nombre));
    const asteriscoHTML = esPrimerRegidor ? '<span class="candidate-asterisk">*</span>' : '';
    const notaRegidorHTML = esPrimerRegidor ? '<div class="candidate-note-regidor">Postula como primer regidor</div>' : '';

    detailPanel.innerHTML = `
        <div class="candidate-profile">
            <div class="box-main-avatar">
                <div class="avatar">${avatarHTML}</div>
                <div class="candidate-name">${item.candidato || 'Sin información'}${asteriscoHTML}</div>
                <div class="party-label">${item.nombrepartido || 'Sin información'}</div>
                ${notaRegidorHTML}
            </div>   
            
            <div class="box-main-buttons">
                <div class="action-buttons">
                    ${downloadButton}
                    <button class="btn btn-secondary" onclick="addToCompare(${JSON.stringify(item).replace(/"/g, '&quot;')})">Comparar</button>
                </div>
            </div> 
            <div class="candidate-vices">
                <h6>Vicepresidentes:</h6>
                ${item.vicepresidentes || 'Sin información'}
            </div>
            <div class="candidate-info">
                <div class="box-edad">  
                    <h6>edad:</h6>                                           
                    ${item.edad || ''}
                </div>
                <div class="box-departamento">
                    <h6>departamento:</h6>         
                    ${item.ubicacion || ''}
                </div> 
            </div> 
            <div class="vision-section">
                <p class="vision-text">${item.vision || 'Sin información de visión disponible.'}</p>    
            </div>
            <div class="candidate-temas-mencionados">                        
                <h6>Temas más mencionados:</h6>
                <img src="img/icon-click-2.png" alt="" width="100%" class="icon-click-temas">
                <div class="topics">
                    ${topicsHTML || '<p style="color: #999;">No hay temas disponibles</p>'}
                </div>
            </div>
        </div>  
    `;
}

/* ============================================
   AUTOCOMPLETADO
   ============================================ */

/**
 * Manejar input de bÃºsqueda
 */
function handleSearchInput(event) {
    const key = event.key;
    
    if (key === 'ArrowDown') {
        event.preventDefault();
        navigateSuggestions(1);
        return;
    } else if (key === 'ArrowUp') {
        event.preventDefault();
        navigateSuggestions(-1);
        return;
    } else if (key === 'Enter') {
        event.preventDefault();
        if (selectedSuggestionIndex >= 0 && currentSuggestions[selectedSuggestionIndex]) {
            selectSuggestion(currentSuggestions[selectedSuggestionIndex]);
        }
        return;
    } else if (key === 'Escape') {
        hideAutocomplete();
        return;
    }
    
    updateAutocomplete();
}

/**
 * Actualizar lista de sugerencias
 */
function updateAutocomplete() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (searchTerm.length === 0) {
        hideAutocomplete();
        filterItems();
        return;
    }
    
    currentSuggestions = allData.filter(item => {
        const matchesTab = item.tipo === currentTab;
        const matchesSearch = item.nombre.toLowerCase().includes(searchTerm) || 
                            (item.candidato && item.candidato.toLowerCase().includes(searchTerm));
        return matchesTab && matchesSearch;
    });
    
    renderSuggestions(searchTerm);
    filterItems();
}

/**
 * Renderizar sugerencias en el dropdown
 */
function renderSuggestions(searchTerm) {
    const dropdown = document.getElementById('autocompleteDropdown');
    if (!dropdown) return;
    
    selectedSuggestionIndex = -1;
    
    if (currentSuggestions.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-no-results">No se encontraron resultados</div>';
        dropdown.classList.add('show');
        return;
    }
    
    const limitedSuggestions = currentSuggestions.slice(0, 8);
    
    dropdown.innerHTML = limitedSuggestions.map((item, index) => {
        let imageContent;
        if (item.tipo === 'candidato') {
            const photoUrl = item.fotourl || item.logourl;
            imageContent = photoUrl && photoUrl.trim() !== '' 
                ? `<img src="${photoUrl}" alt="${item.candidato || item.nombre}" onerror="this.parentElement.innerHTML='👤';">`
                : '👤';
        } else {
            imageContent = item.logourl && item.logourl.trim() !== ''
                ? `<img src="${item.logourl}" alt="${item.nombre}" onerror="this.parentElement.innerHTML='🎈';">`
                : '🎈';
        }
        
        const highlightText = (text, term) => {
            if (!text) return '';
            const regex = new RegExp(`(${term})`, 'gi');
            return text.replace(regex, '<span class="autocomplete-highlight">$1</span>');
        };
        
        const highlightedName = highlightText(item.nombre, searchTerm);
        const highlightedCandidate = item.candidato ? highlightText(item.candidato, searchTerm) : '';
        
        return `
            <div class="autocomplete-item" data-index="${index}" onclick="selectSuggestionByIndex(${index})">
                <div class="autocomplete-item-icon">${imageContent}</div>
                <div class="autocomplete-item-text">
                    <div class="autocomplete-item-name">${highlightedName}</div>
                    ${item.tipo === 'candidato' && item.candidato ? 
                        `<div class="autocomplete-item-party">${highlightedCandidate}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    dropdown.classList.add('show');
}

/**
 * Navegar entre sugerencias con teclado
 */
function navigateSuggestions(direction) {
    const dropdown = document.getElementById('autocompleteDropdown');
    if (!dropdown) return;
    
    const items = dropdown.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;
    
    if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < items.length) {
        items[selectedSuggestionIndex].classList.remove('active');
    }
    
    selectedSuggestionIndex += direction;
    
    if (selectedSuggestionIndex < 0) {
        selectedSuggestionIndex = items.length - 1;
    } else if (selectedSuggestionIndex >= items.length) {
        selectedSuggestionIndex = 0;
    }
    
    items[selectedSuggestionIndex].classList.add('active');
    items[selectedSuggestionIndex].scrollIntoView({ block: 'nearest' });
}

/**
 * Seleccionar sugerencia por Ã­ndice
 */
function selectSuggestionByIndex(index) {
    selectSuggestion(currentSuggestions[index]);
}

/**
 * Seleccionar una sugerencia
 */
function selectSuggestion(item) {
    if (!item) return;
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = item.nombre;
    }
    
    hideAutocomplete();
    selectItem(item.id);
    filterItems();
}

/**
 * Mostrar autocompletado
 */
function showAutocomplete() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim().length > 0) {
        updateAutocomplete();
    }
}

/**
 * Ocultar autocompletado
 */
function hideAutocomplete() {
    const dropdown = document.getElementById('autocompleteDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
    selectedSuggestionIndex = -1;
}

// Cerrar dropdown al hacer click fuera
document.addEventListener('click', function(event) {
    const searchBox = document.querySelector('.search-box');
    if (searchBox && !searchBox.contains(event.target)) {
        hideAutocomplete();
    }
});

// Exportar funciones
window.loadDataFromGoogleSheets = loadDataFromGoogleSheets;
window.switchTab = switchTab;
window.filterItems = filterItems;
window.renderItems = renderItems;
window.selectItem = selectItem;
window.renderDetails = renderDetails;
window.handleSearchInput = handleSearchInput;
window.showAutocomplete = showAutocomplete;
window.hideAutocomplete = hideAutocomplete;
window.selectSuggestionByIndex = selectSuggestionByIndex;
window.allData = allData;