/* ============================================
   MAIN.JS - INICIALIZACION
   Candidatos Lima 2026 - buscador + comparador
   ============================================ */

/* ============================================
   UTILIDADES DE PERFORMANCE
   ============================================ */

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function rafUpdate(callback) {
    if (window.requestAnimationFrame) {
        window.requestAnimationFrame(callback);
    } else {
        callback();
    }
}

window.throttle = throttle;
window.debounce = debounce;
window.rafUpdate = rafUpdate;

/* ============================================
   LAZY LOAD DE EMBEDS FLOURISH
   ============================================ */

function initFlourishLazyLoad() {
    if (!('IntersectionObserver' in window)) return;

    const flourishEmbeds = document.querySelectorAll('.flourish-embed');
    if (flourishEmbeds.length === 0) return;

    const flourishObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const embed = entry.target;
                if (embed.dataset.loaded === 'true') { observer.unobserve(embed); return; }
                embed.dataset.loaded = 'true';
                if (window.Flourish && window.Flourish.loadEmbed) {
                    window.Flourish.loadEmbed(embed);
                }
                observer.unobserve(embed);
            }
        });
    }, { root: null, rootMargin: '200px 0px', threshold: 0.01 });

    flourishEmbeds.forEach(embed => flourishObserver.observe(embed));
}

window.initFlourishLazyLoad = initFlourishLazyLoad;

/* ============================================
   INICIALIZACION PRINCIPAL
   ============================================ */

async function init() {
    console.log('Iniciando aplicacion (buscador + comparador)...');

    try {
        // Cargar datos principales (partidos y candidatos)
        await loadDataFromGoogleSheets();

        // Cargar datos del comparador
        await loadComparisonData();
        renderComparisonCards();

        // Cargar datos de factchecking
        await loadFactcheckingData();

        // Densidad discursiva ("Peso de los temas")
        await loadDensityData();
        initThemeSlider();
        populateDensityPartySelector();
        renderDensityBars();

        // Reposicionar slider/barras al redimensionar (throttle iOS)
        const throttledResize = throttle(() => {
            rafUpdate(() => {
                updateSliderHandle();
                renderDensityBars();
            });
        }, 150);
        window.addEventListener('resize', throttledResize, { passive: true });

        // Lazy-load de los embeds de Flourish
        initFlourishLazyLoad();

        console.log('Aplicacion inicializada correctamente');
    } catch (error) {
        console.error('Error al inicializar la aplicacion:', error);
    }
}

async function refreshAllData() {
    try {
        console.log('Refrescando todos los datos...');
        await loadDataFromGoogleSheets();
        await loadComparisonData();
        renderComparisonCards();

        await loadDensityData();
        populateDensityPartySelector();
        renderDensityBars();

        console.log('Datos actualizados correctamente');
    } catch (error) {
        console.error('Error al refrescar datos:', error);
    }
}

/* ============================================
   ACORDEON DE CONCEPTOS
   ============================================ */

function toggleConceptosAccordion(accordionId) {
    const accordion = document.getElementById(accordionId);
    if (!accordion) return;

    if (accordion.classList.contains('open')) {
        accordion.classList.remove('open');
    } else {
        accordion.classList.add('open');
    }
}

window.toggleConceptosAccordion = toggleConceptosAccordion;

/* ============================================
   METODOLOGIA
   ============================================ */

function initMetodologia() {
    const botonLeerMas = document.querySelector('.mas-metodologia');
    const contenidoOculto = document.getElementById('detalle-oculto');

    if (botonLeerMas && contenidoOculto) {
        botonLeerMas.addEventListener('click', function() {
            if (contenidoOculto.style.display === 'none') {
                contenidoOculto.style.display = 'block';
                botonLeerMas.innerText = 'Ocultar detalle del método';
            } else {
                contenidoOculto.style.display = 'none';
                botonLeerMas.innerText = 'Conoce el detalle del método de análisis aquí';
            }
        }, { passive: true });
    }

    // Enlace "Ver criterios de analisis" desde las tarjetas del comparador
    document.addEventListener('click', function(e) {
        if (e.target.closest('.discourse-tone.ancla')) {
            e.preventDefault();

            if (contenidoOculto && contenidoOculto.style.display === 'none') {
                contenidoOculto.style.display = 'block';
                if (botonLeerMas) botonLeerMas.innerText = 'Ocultar detalle del método';
            }

            const boxMetodologia = document.querySelector('.box-metodologia');
            if (boxMetodologia) {
                boxMetodologia.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });
}

/* ============================================
   SCROLL CONTAINER (TARJETAS)
   ============================================ */

/**
 * Inicializar scroll container horizontal (tarjetas "Prioridades y olvidos")
 * Optimizado para iOS con passive events
 */
function initScrollContainer() {
    const slider = document.querySelector('.scroll-container');
    if (!slider) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    // Mouse events
    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.classList.add('active');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    }, { passive: true });

    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('active');
    }, { passive: true });

    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('active');
    }, { passive: true });

    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2;
        slider.scrollLeft = scrollLeft - walk;
    });

    // Touch events optimizados para iOS
    slider.addEventListener('touchstart', (e) => {
        isDown = true;
        slider.classList.add('active');
        startX = e.touches[0].pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    }, { passive: true });

    slider.addEventListener('touchend', () => {
        isDown = false;
        slider.classList.remove('active');
    }, { passive: true });

    slider.addEventListener('touchcancel', () => {
        isDown = false;
        slider.classList.remove('active');
    }, { passive: true });
}

/* ============================================
   DOM CONTENT LOADED
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    initMetodologia();
    initScrollContainer();
});

/* ============================================
   WINDOW ONLOAD
   ============================================ */

window.onload = init;

window.refreshAllData = refreshAllData;
