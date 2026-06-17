# VitalScore

PWA para navegador y movil que permite registrar ejercicio diario, tipos de ejercicio, peso y colesterol. La app esta preparada para GitHub Pages, pero los datos personales no se suben al repositorio: se importan desde Excel en el navegador y se guardan en el almacenamiento local del dispositivo.

## Uso

1. Abre la app.
2. Pulsa **Importar Excel** y selecciona un archivo con las hojas `Tipos de ejercicio`, `Ejercicio`, `Peso` y `Colesterol`.
3. Anade nuevas sesiones, tipos de ejercicio, pesos o analiticas desde los formularios.

## Desarrollo

```bash
npm install
npm run dev
```

## Despliegue

```bash
npm run build
npm run deploy
```
