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
                botonLeerMas.innerText = 'Ocultar detalle del metodo';
            } else {
                contenidoOculto.style.display = 'none';
                botonLeerMas.innerText = 'Conoce el detalle del metodo de analisis aqui';
            }
        }, { passive: true });
    }

    // Enlace "Ver criterios de analisis" desde las tarjetas del comparador
    document.addEventListener('click', function(e) {
        if (e.target.closest('.discourse-tone.ancla')) {
            e.preventDefault();

            if (contenidoOculto && contenidoOculto.style.display === 'none') {
                contenidoOculto.style.display = 'block';
                if (botonLeerMas) botonLeerMas.innerText = 'Ocultar detalle del metodo';
            }

            const boxMetodologia = document.querySelector('.box-metodologia');
            if (boxMetodologia) {
                boxMetodologia.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });
}

/* ============================================
   DOM CONTENT LOADED
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    initMetodologia();
});

/* ============================================
   WINDOW ONLOAD
   ============================================ */

window.onload = init;

window.refreshAllData = refreshAllData;
