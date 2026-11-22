"""Crea hoja.html y lineas.html (capturas de la hoja de Google para la guía de solicitudes) a partir del
Excel descargado de la hoja de pruebas (Drive → Archivo → Descargar → .xlsx).
Los nombres, teléfonos y correos se sustituyen por otros inventados; algunos estados y notas son de ejemplo.
Uso: python3 generar_hoja.py Pedidos.xlsx   (necesita openpyxl) y después: node foto.js"""
import sys, os, openpyxl
AQUI = os.path.dirname(os.path.abspath(__file__))
wb = openpyxl.load_workbook(sys.argv[1])
def eur(v):
    if isinstance(v, (int, float)):
        return f'{v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.') + '€'
    return v or ''
def fecha(d): return d.strftime('%d/%m/%Y, %H:%M:%S').lstrip('0') if hasattr(d, 'strftime') else (d or '')
FICTICIOS = [('María López', '600111222', 'maria@ejemplo.com'), ('Antonio Gil', '600333444', 'antonio@ejemplo.com'),
             ('Carmen Ruiz', '600555666', 'carmen@ejemplo.com'), ('Lucía Martín', '600777888', 'lucia@ejemplo.com'),
             ('José Pérez', '600999000', 'jose@ejemplo.com')]
ESTADOS = ['Aceptada', 'Contactado', 'Rechazada', 'En revisión', 'Nueva']
NOTAS = {'Aceptada': 'Vendida en tienda el 14/11', 'Contactado': 'Llamado el 11/11; viene el jueves', 'Rechazada': 'No le encaja el precio'}
ws = wb['Solicitudes']; cab = [c.value for c in ws[1]]; filas = []
for k, r in enumerate(ws.iter_rows(min_row=2, max_row=6, values_only=True)):
    r = list(r); n, t, c = FICTICIOS[k % 5]; r[3], r[4], r[5] = n, t, c; r[2] = ESTADOS[k % 5]
    r[1] = fecha(r[1]); r[9] = eur(r[9]); r[7] = (r[7] or '').split('\n')[0] + (' …' if '\n' in (r[7] or '') else '')
    for i in (8, 10):
        if isinstance(r[i], float): r[i] = int(r[i])
    r[15] = 'produccion'; r[16] = NOTAS.get(r[2], ''); r[17] = '2.050,00€' if r[2] == 'Aceptada' else ''
    filas.append(['' if v is None else v for v in r])
wl = wb['Líneas']; cabL = [c.value for c in wl[1]]; filL = []
for r in wl.iter_rows(min_row=2, max_row=9, values_only=True):
    r = list(r); r[1] = fecha(r[1]); r[8] = eur(r[8]); r[10] = eur(r[10])
    if isinstance(r[7], float): r[7] = int(r[7])
    r[13] = (r[13] or '').replace('https://maquinas-de-coser-zafra.pages.dev', 'https://www.maquinasdecoserzafra.es')
    filL.append(['' if v is None else v for v in r])
css = open(os.path.join(AQUI, 'estilo-hoja.html'), encoding='utf-8').read()
LETRAS = 'ABCDEFGHIJKLMNOPQR'
def tabla(cab, filas, anchos, activa, vacias=3):
    cols = ''.join(f'<th class="col" style="width:{w}px">{LETRAS[i]}</th>' for i, w in enumerate(anchos))
    f = '<tr class="cab"><td class="num">1</td>' + ''.join(f'<td>{c}</td>' for c in cab) + '</tr>'
    for k, fi in enumerate(filas):
        cel = ''
        for i, v in enumerate(fi):
            if cab[i] == 'Estado': v = f'<span class="estado {str(v).replace(" ", "")} flecha">{v}</span>'
            cel += f'<td>{v}</td>'
        f += f'<tr><td class="num">{k + 2}</td>{cel}</tr>'
    for k in range(len(filas) + 2, len(filas) + 2 + vacias): f += f'<tr><td class="num">{k}</td>' + '<td></td>' * len(cab) + '</tr>'
    pest = ''.join(f'<span class="{"act" if t == activa else ""}">{t}</span>' for t in ['Hoja 1', 'Solicitudes', 'Líneas'])
    return css + f'<div id="h1"><div class="barra"><b>Pedidos</b> <span class="marca">Solicitudes de prueba · nombres y teléfonos inventados</span></div><table><tr><th class="col"></th>{cols}</tr>{f}</table><div class="pest">{pest}</div></div></body></html>'
open(os.path.join(AQUI, 'hoja.html'), 'w', encoding='utf-8').write(tabla(cab, filas, [95, 150, 110, 110, 90, 150, 170, 330, 60, 90, 70, 190, 70, 70, 60, 80, 220, 85], 'Solicitudes'))
open(os.path.join(AQUI, 'lineas.html'), 'w', encoding='utf-8').write(tabla(cabL, filL, [95, 150, 300, 75, 80, 130, 130, 65, 95, 65, 90, 120, 170, 330], 'Líneas', 2))
print('hoja.html y lineas.html creados')
