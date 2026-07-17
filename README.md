# VitalScore

PWA para navegador y movil que permite registrar ejercicio diario, tipos de ejercicio, peso y colesterol. La app esta preparada para GitHub Pages, pero los datos personales no se suben al repositorio publico: se importan desde Excel en el navegador y se guardan en el almacenamiento local del dispositivo.

## Uso

1. Abre la app.
2. Pulsa **Importar Excel** y selecciona un archivo con las hojas `Tipos de ejercicio`, `Ejercicio`, `Peso` y `Colesterol`.
3. Anade nuevas sesiones, tipos de ejercicio, pesos o analiticas desde los formularios.
4. Usa las paginas de detalle para revisar y eliminar actividades, analiticas o registros de peso.
5. En **Objetivos**, define peso, musculo, grasa y fecha objetivo para comparar automaticamente contra el ultimo registro.

## Sincronizacion entre dispositivos

La app puede sincronizar los datos con un repositorio privado de GitHub, separado del codigo publico:

1. Crea un repositorio privado, por ejemplo `vitalscore-data`.
2. Crea un fine-grained personal access token con permisos **Contents: Read and write** para ese repositorio.
3. En la app, introduce propietario, repositorio y token, y pulsa **Guardar**.
4. En el dispositivo que tiene los datos actualizados, pulsa **Subir a GitHub**.
5. En el otro dispositivo, configura el mismo repositorio/token y pulsa **Descargar de GitHub**.

El token se guarda solo en el almacenamiento local de cada navegador.

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
