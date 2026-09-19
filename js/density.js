/* ============================================
   DENSIDAD DISCURSIVA
   Versión optimizada para iOS/Safari
   ============================================ */

// Variables globales
let selectedThemeIndex = 15; // Por defecto: TRANSPORTE
let densityFilteredParty = '';
let densityData = {};
let isSliderDragging = false;

// Cache de elementos DOM para evitar queries repetidas
let sliderElements = {
    slider: null,
    handle: null,
    segments: null,
    labels: null,
    container: null
};

/**
 * Cargar datos de densidad desde JSON
 */
async function loadDensityData() {
    try {
        const response = await fetch(CONFIG.DENSITY_DATA_URL);
        if (!response.ok) {
            throw new Error('Error al cargar datos de densidad');
        }
        const data = await response.json();
        
        densityData = {};
        data.partidos.forEach(partido => {
            densityData[partido.id] = {
                partido: partido.nombre,
                logoUrl: partido.logoUrl || '',
                temas: partido.densidad
            };
        });
        
        console.log('✅ Datos de densidad cargados:', Object.keys(densityData).length, 'partidos');
        return densityData;
    } catch (error) {
        console.error('❌ Error cargando datos de densidad:', error);
        // Datos de ejemplo si falla
        densityData = {
            "1": {
                partido: "Partido Ejemplo",
                logoUrl: "",
                temas: { educacion: 15, salud: 25, economia: 20 }
            }
        };
        return densityData;
    }
}

/**
 * Cachear elementos del DOM del slider
 */
function cacheSliderElements() {
    sliderElements = {
        slider: document.getElementById('themeSlider'),
        handle: document.getElementById('sliderHandle'),
        segments: document.getElementById('themeSegments'),
        labels: document.getElementById('themeLabels'),
        container: document.getElementById('partyDensityList')
    };
}

/**
 * Inicializar theme slider - OPTIMIZADO PARA iOS
 */
function initThemeSlider() {
    cacheSliderElements();
    
    const { slider, handle, segments: segmentsContainer, labels: labelsContainer } = sliderElements;
    
    if (!segmentsContainer || !labelsContainer || !slider || !handle) {
        console.error('❌ Elementos del slider no encontrados');
        return;
    }
    
    // Aplicar estilos críticos
    slider.style.position = 'relative';
    slider.style.touchAction = 'pan-y'; // Permitir scroll vertical, capturar horizontal
    
    handle.style.position = 'absolute';
    handle.style.cursor = 'grab';
    handle.style.touchAction = 'none';
    handle.style.userSelect = 'none';
    handle.style.webkitUserSelect = 'none';
    handle.style.zIndex = '100';
    
    // Crear segmentos
    segmentsContainer.innerHTML = THEMES.map((theme, index) => `
        <div class="theme-segment theme-${theme.id} ${index === selectedThemeIndex ? 'active' : ''}" 
            data-index="${index}">
        </div>
    `).join('');
    
    // Crear labels
    labelsContainer.innerHTML = THEMES.map((theme, index) => `
        <div class="theme-label-item ${index === selectedThemeIndex ? 'active' : ''}" 
            data-index="${index}">
            ${theme.name}
        </div>
    `).join('');

    // Posicionar labels
    const totalThemes = THEMES.length;
    const labelItems = labelsContainer.querySelectorAll('.theme-label-item');
    labelItems.forEach((label, index) => {
        const centerPosition = (100 / totalThemes) * (index + 0.1);
        label.style.left = `${centerPosition}%`;
    });
    
    setTimeout(() => updateSliderHandle(), 100);
    
    // Eventos de click en segmentos
    document.querySelectorAll('.theme-segment').forEach((segment, index) => {
        segment.addEventListener('click', (e) => {
            if (!isSliderDragging) {
                selectTheme(index);
            }
        }, { passive: true });
    });
    
    // ============================================
    // EVENTOS DE MOUSE (Desktop)
    // ============================================
    handle.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // ============================================
    // EVENTOS DE TOUCH (iOS/Mobile) - OPTIMIZADOS
    // ============================================
    
    // TouchStart en el handle - necesita preventDefault para capturar el gesto
    handle.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    // TouchMove en document - solo prevenir default si estamos arrastrando
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    // TouchEnd/Cancel - pueden ser passive
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    
    // Click en la barra del slider
    slider.addEventListener('click', handleSliderClick, { passive: true });
    
    console.log('✅ Theme slider inicializado (optimizado para iOS)');
}

/* ============================================
   HANDLERS DE EVENTOS - MOUSE
   ============================================ */

function handleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    startSliderDrag();
    updateSliderFromPosition(e.clientX);
}

function handleMouseMove(e) {
    if (!isSliderDragging) return;
    e.preventDefault();
    updateSliderFromPosition(e.clientX);
}

function handleMouseUp() {
    if (isSliderDragging) stopSliderDrag();
}

/* ============================================
   HANDLERS DE EVENTOS - TOUCH (iOS Optimizado)
   ============================================ */

function handleTouchStart(e) {
    // Prevenir el comportamiento por defecto solo en el handle
    e.preventDefault();
    e.stopPropagation();
    
    startSliderDrag();
    
    const touch = e.touches[0];
    updateSliderFromPosition(touch.clientX);
}

function handleTouchMove(e) {
    // Solo prevenir si estamos arrastrando el slider
    if (!isSliderDragging) return;
    
    // Prevenir scroll mientras arrastramos
    e.preventDefault();
    
    const touch = e.touches[0];
    
    // Usar requestAnimationFrame para mejor rendimiento
    if (window.rafUpdate) {
        window.rafUpdate(() => {
            updateSliderFromPosition(touch.clientX);
        });
    } else {
        updateSliderFromPosition(touch.clientX);
    }
}

function handleTouchEnd() {
    if (isSliderDragging) {
        stopSliderDrag();
    }
}

function handleSliderClick(e) {
    const handle = sliderElements.handle;
    if (e.target === handle || e.target.closest('#sliderHandle') || isSliderDragging) {
        return;
    }
    updateSliderFromPosition(e.clientX);
}

/* ============================================
   FUNCIONES DE DRAG
   ============================================ */

/**
 * Iniciar drag del slider
 */
function startSliderDrag() {
    isSliderDragging = true;
    const handle = sliderElements.handle;
    if (handle) {
        handle.classList.add('dragging');
        handle.style.transition = 'none';
        handle.style.cursor = 'grabbing';
    }
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    
    // Prevenir scroll en iOS mientras se arrastra
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
}

/**
 * Detener drag del slider
 */
function stopSliderDrag() {
    isSliderDragging = false;
    const handle = sliderElements.handle;
    if (handle) {
        handle.classList.remove('dragging');
        handle.style.transition = 'left 0.2s ease-out';
        handle.style.cursor = 'grab';
        handle.style.removeProperty('transform');
    }
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    
    // Restaurar scroll
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    
    updateSliderHandle();
}

/**
 * Actualizar slider desde posición - OPTIMIZADO
 */
function updateSliderFromPosition(clientX) {
    const { slider, handle } = sliderElements;
    if (!slider || !handle) return;
    
    const sliderRect = slider.getBoundingClientRect();
    const handleWidth = 40; // Valor fijo para evitar getBoundingClientRect adicional
    
    const x = clientX - sliderRect.left;
    const clampedX = Math.max(0, Math.min(x, sliderRect.width));
    
    if (isSliderDragging) {
        handle.style.transition = 'none';
        const leftPos = clampedX - (handleWidth / 2);
        handle.style.setProperty('left', `${leftPos}px`, 'important');
        handle.style.setProperty('transform', 'none', 'important');
    }
    
    const percentage = clampedX / sliderRect.width;
    const newIndex = Math.round(percentage * (THEMES.length - 1));
    
    if (newIndex !== selectedThemeIndex && newIndex >= 0 && newIndex < THEMES.length) {
        selectedThemeIndex = newIndex;
        
        // Batch DOM updates
        requestAnimationFrame(() => {
            document.querySelectorAll('.theme-segment').forEach((seg, i) => {
                seg.classList.toggle('active', i === newIndex);
                seg.classList.toggle('dimmed', i !== newIndex);
            });
            
            document.querySelectorAll('.theme-label-item').forEach((label, i) => {
                label.classList.toggle('active', i === newIndex);
            });
        });
        
        // Debounce renderDensityBars para mejor rendimiento
        if (window.debounce && !window._debouncedRenderBars) {
            window._debouncedRenderBars = window.debounce(renderDensityBars, 50);
        }
        
        if (window._debouncedRenderBars) {
            window._debouncedRenderBars();
        } else {
            renderDensityBars();
        }
    }
}

/**
 * Seleccionar tema
 */
function selectTheme(index) {
    if (index < 0 || index >= THEMES.length) return;
    
    selectedThemeIndex = index;
    
    requestAnimationFrame(() => {
        document.querySelectorAll('.theme-segment').forEach((seg, i) => {
            seg.classList.toggle('active', i === index);
            seg.classList.toggle('dimmed', i !== index);
        });
        
        document.querySelectorAll('.theme-label-item').forEach((label, i) => {
            label.classList.toggle('active', i === index);
        });
    });
    
    const handle = sliderElements.handle;
    if (handle) {
        handle.style.transition = 'left 0.2s ease-out';
    }
    
    updateSliderHandle();
    renderDensityBars();
}

/**
 * Actualizar posición del handle
 */
function updateSliderHandle() {
    const { slider, handle } = sliderElements;
    const segments = document.querySelectorAll('.theme-segment');
    
    if (!slider || !handle || segments.length === 0) return;
    
    const activeSegment = segments[selectedThemeIndex];
    if (!activeSegment) return;
    
    const segmentRect = activeSegment.getBoundingClientRect();
    const sliderRect = slider.getBoundingClientRect();
    const handleWidth = 40; // Valor fijo
    
    const segmentCenter = segmentRect.left - sliderRect.left + (segmentRect.width / 2);
    const leftPos = segmentCenter - (handleWidth / 2);
    
    if (!isSliderDragging) {
        handle.style.transition = 'left 0.2s ease-out';
    }
    
    handle.style.removeProperty('transform');
    handle.style.setProperty('left', `${leftPos}px`, 'important');
}

/**
 * Renderizar barras de densidad - OPTIMIZADO
 */
function renderDensityBars() {
    const container = sliderElements.container || document.getElementById('partyDensityList');
    if (!container) return;
    
    const selectedTheme = THEMES[selectedThemeIndex].id;
    const isMobile = window.innerWidth <= 768;
    
    let partidosToShow = Object.keys(densityData);
    if (densityFilteredParty) {
        partidosToShow = partidosToShow.filter(id => id == densityFilteredParty);
    }
    
    // Usar documentFragment para mejor rendimiento
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
    if (isMobile) {
        container.className = 'party-list mobile-view';
        tempDiv.innerHTML = partidosToShow.map(partidoId => {
            const partido = densityData[partidoId];
            const highlightClass = densityFilteredParty == partidoId ? 'highlighted' : '';
            const selectedPercentage = partido.temas[selectedTheme] || 0;
            
            const logoHTML = partido.logoUrl 
                ? `<img src="${partido.logoUrl}" alt="${partido.partido}" loading="lazy" onerror="this.style.display='none';">` 
                : '🎈';
            
            const totalPercentage = THEMES.reduce((sum, theme) => {
                return sum + (partido.temas[theme.id] || 0);
            }, 0);
            
            const segmentsHTML = THEMES.map((theme, themeIndex) => {
                const originalPercentage = partido.temas[theme.id] || 0;
                const normalizedPercentage = totalPercentage > 0 
                    ? (originalPercentage / totalPercentage) * 100 
                    : 0;
                const isSelected = theme.id === selectedTheme;
                const dimmedClass = selectedTheme ? (isSelected ? 'highlighted' : 'dimmed') : '';
                
                return `
                    <div class="density-segment theme-${theme.id} ${dimmedClass}" 
                        style="width: ${normalizedPercentage}%"
                        data-theme="${theme.id}"
                        onclick="selectThemeFromBar(${themeIndex})">
                        <div class="density-tooltip">${theme.name}: ${originalPercentage}%</div>
                    </div>
                `;
            }).join('');
            
            return `
                <div class="party-complete-item ${highlightClass}">
                    <div class="party-complete-header">
                        <div class="party-density-icon">${logoHTML}</div>
                        <div class="party-density-name">${partido.partido}</div>
                    </div>
                    <div class="party-complete-bar">
                        <div class="party-density-bar-container">
                            <div class="party-density-bar">${segmentsHTML}</div>
                        </div>
                        <div class="selected-theme-badge">${THEMES[selectedThemeIndex].name}: ${selectedPercentage}%</div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        container.className = 'party-list';
        
        const namesHTML = partidosToShow.map(partidoId => {
            const partido = densityData[partidoId];
            const logoHTML = partido.logoUrl 
                ? `<img src="${partido.logoUrl}" alt="${partido.partido}" loading="lazy" onerror="this.style.display='none';">` 
                : '🎈';
            const highlightClass = densityFilteredParty == partidoId ? 'highlighted' : '';
            
            return `
                <div class="party-name-item ${highlightClass}">
                    <div class="party-density-item">
                        <div class="party-density-icon">${logoHTML}</div>
                        <div class="party-density-name">${partido.partido}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        const barsHTML = partidosToShow.map(partidoId => {
            const partido = densityData[partidoId];
            const highlightClass = densityFilteredParty == partidoId ? 'highlighted' : '';
            const selectedPercentage = partido.temas[selectedTheme] || 0;
            
            const totalPercentage = THEMES.reduce((sum, theme) => {
                return sum + (partido.temas[theme.id] || 0);
            }, 0);
            
            const segmentsHTML = THEMES.map((theme, themeIndex) => {
                const originalPercentage = partido.temas[theme.id] || 0;
                const normalizedPercentage = totalPercentage > 0 
                    ? (originalPercentage / totalPercentage) * 100 
                    : 0;
                const isSelected = theme.id === selectedTheme;
                const dimmedClass = selectedTheme ? (isSelected ? 'highlighted' : 'dimmed') : '';
                
                return `
                    <div class="density-segment theme-${theme.id} ${dimmedClass}" 
                        style="width: ${normalizedPercentage}%"
                        onclick="selectThemeFromBar(${themeIndex})">
                        <div class="density-tooltip">${theme.name}: ${originalPercentage}%</div>
                    </div>
                `;
            }).join('');
            
            return `
                <div class="party-bar-item ${highlightClass}">
                    <div class="party-density-bar-container">
                        <div class="party-density-bar">${segmentsHTML}</div>
                    </div>
                    <div class="selected-theme-badge">${THEMES[selectedThemeIndex].name}: ${selectedPercentage}%</div>
                </div>
            `;
        }).join('');
        
        tempDiv.innerHTML = `
            <div class="party-names-column">${namesHTML}</div>
            <div class="party-bars-column">${barsHTML}</div>
        `;
    }
    
    // Actualizar DOM de una sola vez
    container.innerHTML = tempDiv.innerHTML;
}

/**
 * Seleccionar tema desde la barra
 */
function selectThemeFromBar(themeIndex) {
    selectTheme(themeIndex);
    
    const slider = sliderElements.slider || document.getElementById('themeSlider');
    if (slider) {
        slider.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * Actualizar filtro de partido
 */
function updateDensityFilter() {
    densityFilteredParty = document.getElementById('densityPartyFilter').value;
    renderDensityBars();
}

/**
 * Poblar selector de partidos
 */
function populateDensityPartySelector() {
    const select = document.getElementById('densityPartyFilter');
    if (!select) return;
    
    const options = Object.keys(densityData).map(partidoId => {
        const partido = densityData[partidoId];
        return `<option value="${partidoId}">${partido.partido}</option>`;
    }).join('');
    
    select.innerHTML = '<option value="">Todos los partidos</option>' + options;
}

// Exportar funciones
window.loadDensityData = loadDensityData;
window.initThemeSlider = initThemeSlider;
window.selectTheme = selectTheme;
window.selectThemeFromBar = selectThemeFromBar;
window.updateDensityFilter = updateDensityFilter;
window.populateDensityPartySelector = populateDensityPartySelector;
window.renderDensityBars = renderDensityBars;