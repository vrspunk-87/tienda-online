/*
  Funciones del navegador que complementan las páginas generadas:
  - Menú en móvil: se cierra al pulsar un enlace.
  - Botones de compartir: copiar enlace y menú nativo de compartir del móvil.
  El build añade este script a todas las páginas.
*/
(function () {
  /* ---------- Menú en móvil ---------- */
  const menu = document.getElementById('menu');
  if (menu && window.bootstrap) {
    menu.querySelectorAll('.nav-link:not(.dropdown-toggle), .dropdown-item').forEach(a =>
      a.addEventListener('click', () => {
        if (menu.classList.contains('offcanvas')) {
          bootstrap.Offcanvas.getInstance(menu)?.hide();
        } else if (menu.classList.contains('show')) {
          bootstrap.Collapse.getOrCreateInstance(menu).hide();
        }
      }));
  }

  /* ---------- Compartir ---------- */
  document.querySelectorAll('[data-copiar]').forEach(boton => {
    boton.addEventListener('click', async () => {
      const url = boton.closest('[data-url]').dataset.url;
      const texto = boton.querySelector('span');
      const original = texto.textContent;
      try {
        await navigator.clipboard.writeText(url);
        texto.textContent = 'Enlace copiado';
      } catch {
        window.prompt('Copia el enlace:', url);
      }
      setTimeout(() => { texto.textContent = original; }, 2500);
    });
  });

  if (navigator.share) {
    document.querySelectorAll('[data-compartir-nativo]').forEach(boton => {
      boton.classList.remove('d-none');
      boton.addEventListener('click', () => {
        const c = boton.closest('[data-url]');
        navigator.share({ title: c.dataset.titulo, url: c.dataset.url }).catch(() => {});
      });
    });
  }

})();
