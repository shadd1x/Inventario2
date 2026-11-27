# Inventario de Juegos (PWA)

Aplicación web progresiva (PWA) para consultar y editar el inventario de juegos de **PS5, PS4, Nintendo Switch / Switch 2, Xbox y Consolas**.

## Características

- ✅ Lista por plataforma (PS5, PS4, Switch 2, Switch, Xbox, Consolas)
- ✅ Cantidad, nombre y precio unitario (USD → Bs)
- ✅ **Editar** al tocar un producto: nombre, unidades y precio
- ✅ Búsqueda solo por **inicio del nombre** (primera letra o prefijo), no por letras intermedias
- ✅ **Ajuste + Bs**: suma un monto fijo en bolivianos al precio mostrado
- ✅ **Exportar / Importar Excel** (xlsx)
  - Exporta una hoja general + una por plataforma
  - Importar **actualiza** coincidencias por nombre+plataforma y **agrega** lo nuevo
- ✅ Tasa USD/BOB configurable (se guarda en el dispositivo)
- ✅ Cambios se guardan en el navegador (localStorage)
- ✅ Offline (PWA) e instalable

## Cómo usarlo

### Local

```bash
python -m http.server 8080
# o: npx serve .
```

Abre `http://localhost:8080`.

### GitHub Pages

1. Sube la carpeta a un repositorio.
2. Settings → Pages → rama `main` / root.
3. Abre la URL y "Añadir a pantalla de inicio".

## Excel

**Columnas reconocidas al importar:**

| Columna        | Alternativas                          |
|----------------|---------------------------------------|
| Nombre         | Name, Juego, Producto                 |
| Unidades       | Cantidad, Stock, Qty                  |
| Precio_USD     | Precio, USD, precio_unitario          |
| Plataforma     | Plataforma_Key, Platform              |

Si no hay plataforma, usa la pestaña actual (o PS5).

## Notas

- Los cambios se guardan en el navegador. Si borras datos del sitio, se pierde la edición local y vuelve el `inventory.json` original.
- Para actualizar el base de datos del servidor, exporta Excel y regenera `inventory.json`, o pega el JSON exportado.
- La librería Excel (SheetJS) se carga desde CDN; hace falta internet la primera vez para importar/exportar.

---

Hecho para uso personal / negocio de videojuegos.
