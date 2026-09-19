/* ============================================
   PORTADA / CABECERA - Interaccion
   - Caras clicables -> muestra el .candidate-profile
     correspondiente con scroll suave al .container
   - Botones ancla (Candidato/partido, Compara planes)
   - Flecha de scroll
   ============================================ */

/**
 * Normaliza un texto a slug (sin acentos, minusculas, con guiones)
 */
function portadaSlugify(str) {
    return (str || '')
        .toString()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Busca en window.allData el candidato cuyo nombre coincide con el slug de la cara.
 * Estrategia tolerante: exacto -> prefijo -> coincidencia por apellido + otro token.
 */
function portadaFindCandidato(slug) {
    if (!window.allData || !window.allData.length) return null;
    const cands = window.allData.filter(d => d.tipo === 'candidato');

    // 1) Coincidencia exacta
    let match = cands.find(d => portadaSlugify(d.candidato) === slug);
    if (match) return match;

    // 2) Uno empieza con el otro
    match = cands.find(d => {
        const s = portadaSlugify(d.candidato);
        return s && (s.startsWith(slug) || slug.startsWith(s));
    });
    if (match) return match;

    // 3) Mismo apellido (ultimo token) + al menos otro token en comun
    const tokens = slug.split('-').filter(w => w.length > 2);
    if (tokens.length) {
        const apellido = tokens[tokens.length - 1];
        match = cands.find(d => {
            const st = portadaSlugify(d.candidato).split('-').filter(w => w.length > 2);
            if (!st.length) return false;
            return st[st.length - 1] === apellido && st.some(w => w !== apellido && tokens.includes(w));
        });
        if (match) return match;
    }

    return null;
}

/**
 * Scroll suave a un elemento (por selector)
 */
function portadaScrollTo(selector) {
    const el = document.querySelector(selector);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Al hacer clic en una cara: cambia a la pestana de candidatos,
 * selecciona el candidato y hace scroll suave al .container.
 */
function portadaHandleFaceClick(face) {
    const slug = face.getAttribute('data-slug');

    // Asegura estar en la pestana "Candidatos" (dispara switchTab con un evento real)
    const tabs = document.querySelectorAll('#box-main-candidatos .tab');
    if (tabs && tabs[1] && !tabs[1].classList.contains('active')) {
        tabs[1].click();
    }

    const item = portadaFindCandidato(slug);

    if (item && typeof selectItem === 'function') {
        // Intenta resaltar tambien su item en el listado lateral
        const el = document.querySelector(`#itemList .party-item[data-id="${item.id}"]`);
        selectItem(item.id, el || null);
    } else {
        console.warn('[portada] No se encontro candidato para:', slug,
            '- revisa que el nombre en la hoja coincida.');
    }

    // Scroll suave al contenedor del buscador/detalle
    portadaScrollTo('.container');
}

/**
 * Inicializa toda la interaccion de la portada
 */
function initPortada() {
    // Caras clicables (delegacion de eventos)
    const facesWrap = document.querySelector('.portada-faces');
    if (facesWrap) {
        facesWrap.addEventListener('click', function (e) {
            const face = e.target.closest('.portada-face');
            if (face) portadaHandleFaceClick(face);
        });
    }

    // Botones ancla (usan data-target con el selector destino)
    document.querySelectorAll('.portada-btn[data-target], .portada-scroll-arrow[data-target]').forEach(btn => {
        btn.addEventListener('click', function () {
            portadaScrollTo(this.getAttribute('data-target'));
        });
    });
}

document.addEventListener('DOMContentLoaded', initPortada);

// Exportar por si se necesita
window.portadaSlugify = portadaSlugify;
window.portadaFindCandidato = portadaFindCandidato;
