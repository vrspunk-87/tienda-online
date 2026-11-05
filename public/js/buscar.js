// Buscador de /buscar/ (Pagefind). Va en un fichero aparte porque la política de
// seguridad de la web no permite scripts escritos dentro del HTML.
window.addEventListener('DOMContentLoaded', function () {
  if (!window.PagefindUI) return;
  var ui = new PagefindUI({
    element: '#buscador',
    showSubResults: true,
    showImages: false,
    resetStyles: false,
    translations: { placeholder: 'Escribe lo que buscas…' }
  });
  // Permite enlazar búsquedas: /buscar/?q=mesa
  var q = new URLSearchParams(location.search).get('q');
  if (q) ui.triggerSearch(q);
});
