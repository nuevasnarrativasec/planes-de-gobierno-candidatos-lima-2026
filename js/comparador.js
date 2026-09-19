/* ============================================
   COMPARADOR DE PLANES DE GOBIERNO
   ============================================ */

// Variables globales
let comparisonDataList = [];
let selectedComparisons = [null, null, null];
let currentComparisonTheme = '';

/**
 * Cargar datos de comparación desde Google Sheets
 */
async function loadComparisonData() {
    try {
        const response = await fetch(addCacheBuster(CONFIG.COMPARISON_SPREADSHEET_URL));
        if (!response.ok) {
            throw new Error('Error al cargar datos de comparación');
        }
        const csvText = await response.text();
        comparisonDataList = parseCSV(csvText);
        console.log('Datos de comparación cargados:', comparisonDataList.length, 'registros');
        return comparisonDataList;
    } catch (error) {
        console.error('Error cargando datos de comparación:', error);
        return [];
    }
}

/**
 * Actualizar tema de comparación
 */
function updateComparisonTheme() {
    currentComparisonTheme = document.getElementById('themeSelector').value;
    renderComparisonCards();
}

/**
 * Renderizar tarjetas de comparación
 */
function renderComparisonCards() {
    const grid = document.getElementById('comparisonGrid');
    if (!grid) return;
    
    const partyOptions = window.allData ? window.allData.filter(d => d.tipo === 'partido').sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) : [];
    
    grid.innerHTML = selectedComparisons.map((item, index) => {
        if (!item) {
            return `
                <div class="comparison-card empty">
                    <div style="font-size: 48px; color: #ddd;">+</div>
                    <p>Selecciona un partido</p>
                    <div class="card-selector" style="width: 100%; max-width: 250px;">
                        <select onchange="addToComparison(${index}, this.value)">
                            <option value="">Partido</option>
                            ${partyOptions.map(d => `<option value="${d.id}">${d.nombre}</option>`).join('')}
                        </select>
                    </div>
                </div>
            `;
        }
        
        return renderComparisonCard(item, index);
    }).join('');
}

/**
 * Renderizar una tarjeta de comparación con datos
 */
function renderComparisonCard(item, index) {
    const compData = comparisonDataList.find(c => {
        return c.partidoid == item.id && c.tema === currentComparisonTheme;
    });
    
    if (!compData && currentComparisonTheme) {
        return `
            <div class="comparison-card">
                <button class="remove-card" onclick="removeFromComparison(${index})">X</button>
                <div class="card-profile">
                    <div class="card-avatar">
                        ${item.fotourl ? `<img src="${item.fotourl}" alt="${item.candidato}">` : '<div class="card-avatar-icon"></div><div class="card-avatar-body"></div>'}
                    </div>
                    <div class="card-name">${item.candidato}</div>
                    <div class="card-party">${item.nombre}</div>
                </div>
                <p style="text-align: center; color: #999; padding: 40px 20px;">
                    <b>Sin propuestas concretas:</b> Tema ausente o mencionado solo de manera transversal.
                </p>
            </div>
        `;
    }
    
    const avatarHTML = item.fotourl 
        ? `<img src="${item.fotourl}" alt="${item.candidato}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'card-avatar-icon\\'></div><div class=\\'card-avatar-body\\'></div>';">` 
        : '<div class="card-avatar-icon"></div><div class="card-avatar-body"></div>';
    
    if (!currentComparisonTheme) {
        const partyOptions = window.allData ? window.allData.filter(d => d.tipo === 'partido' && d.id != item.id).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) : [];
        
        return `
            <div class="comparison-card">
                <button class="remove-card" onclick="removeFromComparison(${index})">×</button>
                <div class="card-selector">
                    <select onchange="changeComparison(${index}, this.value)">
                        <option value="${item.id}" selected>${item.nombre}</option>
                        ${partyOptions.map(d => `<option value="${d.id}">${d.nombre}</option>`).join('')}
                    </select>
                </div>
                <div class="card-profile">
                    <div class="card-avatar">${avatarHTML}</div>
                    <div class="card-name">${item.candidato || item.nombre}</div>
                    <div class="card-party">${item.nombre}</div>
                </div>
                <p style="text-align: center; color: #999; padding: 40px 20px;">
                    Selecciona un tema arriba para ver las propuestas
                </p>
            </div>
        `;
    }
    
    const propuestasHTML = compData.propuestas ? 
        `<ul>${compData.propuestas.split('\n').filter(p => p.trim()).map(p => `<li>${p.replace(/^- /, '')}</li>`).join('')}</ul>` 
        : '<p>No hay propuestas disponibles</p>';
    
    const partyOptions = window.allData ? window.allData.filter(d => d.id != item.id && d.tipo === 'partido').sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) : [];
    
    return `
        <div class="comparison-card">
            <button class="remove-card" onclick="removeFromComparison(${index})">X</button>
            <div class="card-selector">
                <select onchange="changeComparison(${index}, this.value)">
                    <option value="${item.id}" selected>${item.nombre}</option>
                    ${partyOptions.map(d => `<option value="${d.id}">${d.nombre}</option>`).join('')}
                </select>
            </div>
            <div class="card-profile">
                <div class="card-avatar">${avatarHTML}</div>
                <div class="card-name">${item.candidato || item.nombre}</div>
                <div class="card-party">${item.nombre}</div>
            </div>
            <div class="card-content">
                ${compData.titulopropuesta ? `
                    <div class="proposal-title-label">titulo-propuesta</div>
                    <div class="proposal-title">${compData.titulopropuesta}</div>
                ` : ''}
                <div class="content-section">
                    ${propuestasHTML}
                </div>
                ${compData.tonodiscursivo || compData.coherencia ? `
                    <div class="discourse-tone no-bg">
                        <p><strong>ENFOQUE DISCURSIVO:</strong> ${compData.tonodiscursivo || 'N/A'}</p>
                        <p><strong>FORMULACIÓN DE PROPUESTA:</strong> ${compData.coherencia || 'N/A'}</p>
                        <span style="font-size: .8rem;">Estos indicadores clasifican la estructura lógica y el enfoque semántico del texto.</span>
                    </div>
                    <div class="discourse-tone ancla">
                        <p>Ver criterios de análisis</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Agregar partido a la comparación
 */
function addToComparison(index, itemId) {
    if (!itemId) return;
    
    const item = window.allData ? window.allData.find(d => d.id == itemId && d.tipo === 'partido') : null;
    if (item) {
        selectedComparisons[index] = item;
        renderComparisonCards();
    }
}

/**
 * Cambiar partido en la comparación
 */
function changeComparison(index, itemId) {
    if (!itemId) return;
    
    const item = window.allData ? window.allData.find(d => d.id == itemId && d.tipo === 'partido') : null;
    if (item) {
        selectedComparisons[index] = item;
        renderComparisonCards();
    }
}

/**
 * Remover de la comparación
 */
function removeFromComparison(index) {
    selectedComparisons[index] = null;
    renderComparisonCards();
}

/**
 * Scroll suave a la sección de comparar
 */
function scrollToCompare() {
    const comparisonSection = document.getElementById('comparisonSection');
    if (comparisonSection) {
        comparisonSection.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Agregar al comparador desde el botón "Comparar" del detalle
 */
function addToCompare(item) {
    if (typeof item === 'string' || typeof item === 'number') {
        const resolved = window.allData ? window.allData.find(d => d.id == item && d.tipo === 'partido') : null;
        if (!resolved) {
            alert('Solo puedes comparar partidos.');
            return;
        }
        item = resolved;
    }
    
    if (item.tipo !== 'partido') {
        const partyName = item.nombrepartido || item.partido || item.nombre;
        const partido = window.allData ? window.allData.find(d => d.tipo === 'partido' && d.nombre === partyName) : null;
        
        if (partido) {
            item = partido;
        } else {
            alert('No es posible añadir candidatos al comparador. Sólo se permiten partidos.');
            return;
        }
    }
    
    const emptyIndex = selectedComparisons.findIndex(c => c === null);
    
    if (emptyIndex !== -1) {
        selectedComparisons[emptyIndex] = item;
    } else {
        selectedComparisons[2] = item;
    }
    
    renderComparisonCards();
    scrollToCompare();
}

// Exportar funciones
window.loadComparisonData = loadComparisonData;
window.updateComparisonTheme = updateComparisonTheme;
window.renderComparisonCards = renderComparisonCards;
window.addToComparison = addToComparison;
window.changeComparison = changeComparison;
window.removeFromComparison = removeFromComparison;
window.addToCompare = addToCompare;
window.scrollToCompare = scrollToCompare;