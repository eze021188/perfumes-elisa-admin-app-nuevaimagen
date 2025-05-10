// src/components/HomeCards.jsx
import React, { useEffect, useState } from 'react';
import './HomeCards.css'; // Importa el CSS de la card

// !!! API Key proporcionada por el usuario
const WEATHER_API_KEY = 'ef896e5bcb234001be924950251005'; // <-- Usando la clave proporcionada

// Helper function to format date (e.g., "Monday, 4th May") from "YYYY-MM-DD"
const formatForecastDate = (dateString) => {
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        // Month is 0-indexed in Date constructor
        const date = new Date(year, month - 1, day);
        // Use 'en-US' or your preferred locale that formats as "Weekday, Day Month"
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        return date.toLocaleDateString('en-US', options); // Ejemplo: "Monday, 5th May"
    } catch (e) {
        console.error("Error formatting forecast date:", dateString, e);
        return dateString; // Fallback to original string
    }
};

// Helper function to format the current date string from "YYYY-MM-DD HH:MM"
const formatCurrentDateTime = (localTime) => {
   try {
       const parts = localTime.split(' ');
       if (parts.length < 2) return localTime;

       const [datePart, timePart] = parts; // "YYYY-MM-DD", "HH:MM"
       const dateParts = datePart.split('-').map(Number);
       if (dateParts.length < 3) return localTime;

       const [year, month, day] = dateParts;
       // Month is 0-indexed in Date constructor
       const date = new Date(year, month - 1, day);

       const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' };
       return date.toLocaleDateString('en-US', dateOptions); // Format as "Monday, 4th May"
   } catch (e) {
       console.error("Error formatting current date/time:", localTime, e);
       return localTime; // Fallback
   }
};


export default function HomeCards() {
  // Estado para guardar todos los datos del clima y pronóstico
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Función asíncrona para obtener la ubicación y los datos del clima/pronóstico
    const fetchWeatherAndForecast = async () => {
      // 1. Verificar si el navegador soporta Geolocation
      if (!navigator.geolocation) {
        setError('La Geolocation no es soportada por tu navegador.');
        setLoading(false);
        return;
      }

      // 2. Obtener la ubicación actual del usuario
      // Añadimos un timeout para que no espere infinitamente
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // 3. Usar WeatherAPI.com (endpoint de pronóstico)
          try {
            // Solicita el pronóstico para 4 días (el día actual + 3 días futuros)
            const response = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&days=4`);

            if (!response.ok) {
               // Intentar leer el cuerpo del error de la API si está disponible
               const errorBody = await response.json();
               const apiErrorMessage = errorBody.error ? `: ${errorBody.error.message}` : '';
               throw new Error(`Error de la API WeatherAPI ${response.status}${apiErrorMessage}. Verifica tu clave API o el servicio.`);
            }

            const data = await response.json();

             // --- Validar que los datos esenciales están en la respuesta ---
             if (!data.location || !data.current || !data.forecast || !data.forecast.forecastday) {
                 throw new Error("Respuesta de la API incompleta o inesperada.");
             }


            // --- Extraer Datos Actuales ---
            const current = data.current;
            const location = data.location;
            const currentConditionText = current.condition.text;
            // La API proporciona la URL relativa del icono
            const currentConditionIcon = current.condition.icon;
            const currentTemp = data.temp_c; // <-- CORREGIDO: data.current.temp_c

            // --- Validar datos extraídos ---
            if (!location || !current || !current.condition || !currentTemp === undefined || !location.localtime) {
                 throw new Error("Faltan datos esenciales en la respuesta de la API (ubicación, clima, temperatura, hora local).");
            }

            const locationName = location.name; // Nombre de la ciudad
            const country = location.country; // Nombre del país
            const localTime = location.localtime; // "YYYY-MM-DD HH:MM"


             // --- Extraer Datos del Pronóstico ---
             // 'forecastday' es un array. El primer elemento (índice 0) es el día actual.
             // Los elementos siguientes (índice 1 en adelante) son los días futuros.
             // Queremos los 3 días futuros para la sección inferior, así que tomamos slice(1, 4)
             const forecastDaysRaw = data.forecast.forecastday;
             // Validar forecastDaysRaw es un array antes de usar slice/map
             if (!Array.isArray(forecastDaysRaw) || forecastDaysRaw.length < 4) {
                  // Si no hay suficientes días de pronóstico, simplemente no mostramos el pronóstico inferior
                  console.warn("No se pudieron obtener 3 días futuros de pronóstico o la estructura es incorrecta.");
                  // Procedemos sin datos de pronóstico, o mostramos un mensaje específico
                  // En este caso, setWeatherData se hará abajo con forecastDays como array vacío o parcial
             }

             const forecastDays = (Array.isArray(forecastDaysRaw) && forecastDaysRaw.length >= 4)
                ? forecastDaysRaw.slice(1, 4).map(dayData => ({
                    date: dayData.date, //YYYY-MM-DD
                    avgTemp: dayData.day.avgtemp_c, // Temperatura promedio
                    conditionText: dayData.day.condition.text, // Condición del clima
                    conditionIcon: dayData.day.condition.icon, // URL del icono
                }))
                : []; // Si falla, usamos un array vacío


            // Actualizar el estado con todos los datos obtenidos
            setWeatherData({
              locationName,
              country,
              localTime, // Guardamos el string raw de localTime
              currentConditionText,
              currentConditionIcon, // Guardamos la URL relativa del icono actual
              currentTemp: current.temp_c, // <-- CORREGIDO: usar current.temp_c
              forecastDays, // Guardamos el array de pronósticos
            });

          } catch (err) {
            // Manejar errores al hacer fetch a la API o validar datos
            console.error("Error en la obtención o procesamiento de datos:", err);
            setError(`Error en los datos: ${err.message}`); // Mostrar el mensaje de error específico
          } finally {
            // Finalizar el estado de carga independientemente del resultado
            setLoading(false);
          }
        },
        (geoError) => {
          // Manejar errores de Geolocation (ej: usuario deniega permiso)
          console.error("Geolocation Error:", geoError);
          let errorMessage = 'Geolocation falló: ';
          switch(geoError.code) {
            case geoError.PERMISSION_DENIED: errorMessage += 'El usuario denegó la solicitud.'; break;
            case geoError.POSITION_UNAVAILABLE: errorMessage += 'La ubicación no está disponible.'; break;
            case geoError.TIMEOUT: errorMessage += 'Tiempo de espera agotado.'; break;
            case geoError.UNKNOWN_ERROR: errorMessage += 'Error desconocido.'; break;
             default: errorMessage += `Error desconocido (Código: ${geoError.code}).`;
          }
          setError(errorMessage); // Mostrar el mensaje de error de Geolocation
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Aumentar timeout a 10s
      );
    };

    // Ejecutar la función de obtención de datos cuando el componente se monte
    fetchWeatherAndForecast();

     // Limpieza: Si el componente se desmonta antes de que termine la promesa,
     // se podría cancelar la tarea si fuera necesario, pero para fetch y geo, no es crítico aquí.

  }, []); // Este effect se ejecuta solo una vez al montar el componente

  // --- Renderizado basado en el estado ---

  // Mostrar mensaje de carga mientras se obtienen los datos
  if (loading) {
    return (
       // Estilo básico para centrar el mensaje de carga en la card
       // Asegúrate de que la clase 'card' tenga un fondo visible si está cargando
       <div className="card flex justify-center items-center text-gray-700">
         <p>Cargando clima y pronóstico...</p>
       </div>
    );
  }

  // Mostrar mensaje de error si ocurrió un problema (tanto de Geolocation como de la API)
  if (error) {
     return (
       // Estilo básico para mostrar errores
       // Asegúrate de que la clase 'card' tenga un fondo visible si hay error
       <div className="card flex flex-col justify-center items-center text-red-600 text-center p-4">
         <p>Error:</p>
         <p className="mt-1 text-sm">{error}</p> {/* Mostrar el mensaje de error */}
         {error.includes('denegó la solicitud') && <p className="mt-2 text-sm">Por favor, permite el acceso a la ubicación en la configuración del navegador.</p>}
       </div>
     );
  }

  // Si no está cargando y no hay error, Y TENEMOS DATOS: renderizar la card con la info
  // Añadimos la verificación de weatherData antes de intentar acceder a sus propiedades
  if (!weatherData) {
       // Esto podría pasar si loading es false, error es null, pero setWeatherData nunca se llamó
       // O si setWeatherData se llamó con null/undefined por algún motivo no detectado
       return (
           <div className="card flex justify-center items-center text-gray-700">
              <p>No se pudieron cargar los datos.</p>
           </div>
       );
  }


  const { locationName, country, localTime, currentConditionText, currentConditionIcon, currentTemp, forecastDays } = weatherData;

  // Formatear la fecha/hora actual para mostrarla en la parte superior
  const formattedCurrentDateTime = formatCurrentDateTime(localTime);


  return (
    // Tu estructura HTML, convertida a JSX y con datos dinámicos
    <div className="card">
      {/* Sección del paisaje (70%) - Elementos visuales de fondo */}
      {/* Colocar todos los elementos ABSOLUTOS como hijos directos de landscape-section */}
      <section className="landscape-section">
        <div className="sky"></div>
        {/* Mantén el div del sun si su estilo CSS crea el sol visualmente (usando ::before/::after) */}
        <div className="sun">{/* El CSS .sun::before/::after crea el efecto */}</div>

        {/* Colinas y sus sombras (asumiendo que las sombras también son elementos absolutos) */}
        <div className="hill-1"></div>
        <div className="shadow-hill-1"></div>
        <div className="hill-2"></div>
        <div className="shadow-hill-2"></div>

        {/* Ocean y sus reflejos - los reflejos van dentro del ocean si son relativos a él */}
        <div className="ocean">
          <div className="reflection"></div>
          <div className="reflection"></div>
          <div className="reflection"></div>
          <div className="reflection"></div>
          <div className="reflection"></div>
           {/* Nota: Las sombras en tu HTML original estaban dentro del océano,
                pero el CSS suele posicionar elementos absolutos respecto al primer padre posicionado (landscape-section aquí).
                Las he puesto como hijos directos de landscape-section para que el CSS de posición funcione. */}
        </div>

        {/* Otras colinas */}
        <div className="hill-3"></div>
        <div className="hill-4"></div>

        {/* Árboles con SVG incrustado desde tu HTML original */}
        <div className="tree-1">
            {/* Pega el código SVG del árbol 1 aquí */}
            <svg stroke-width="0.00064" stroke="#b77873" fill="#b77873" xml:space="preserve" viewBox="0 0 64.00 64.00" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" id="Layer_1" version="1.0" ><g stroke-width="0" id="SVGRepo_bgCarrier"></g><g stroke-linejoin="round" stroke-linecap="round" id="SVGRepo_tracerCarrier"></g><g id="SVGRepo_iconCarrier"><path d="M32,0C18.148,0,12,23.188,12,32c0,9.656,6.883,17.734,16,19.594V60c0,2.211,1.789,4,4,4s4-1.789,4-4v-8.406 C45.117,49.734,52,41.656,52,32C52,22.891,46.051,0,32,0z" fill="#b77873" ></path></g></svg>
        </div>
         <div className="tree-2">
             {/* Pega el código SVG del árbol 2 aquí */}
            <svg stroke-width="0.00064" stroke="#b77873" fill="#b77873" xml:space="preserve" viewBox="0 0 64.00 64.00" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" id="Layer_1" version="1.0" ><g stroke-width="0" id="SVGRepo_bgCarrier"></g><g stroke-linejoin="round" stroke-linecap="round" id="SVGRepo_tracerCarrier"></g><g id="SVGRepo_iconCarrier"><path d="M32,0C18.148,0,12,23.188,12,32c0,9.656,6.883,17.734,16,19.594V60c0,2.211,1.789,4,4,4s4-1.789,4-4v-8.406 C45.117,49.734,52,41.656,52,32C52,22.891,46.051,0,32,0z" fill="#b77873" ></path></g></svg>
        </div>
         <div className="tree-3">
             {/* Pega el código SVG del árbol 3 aquí */}
             <svg version="1.0" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64.00 64.00" xml:space="preserve" fill="#a16773" stroke="#a16773" stroke-width="0.00064" ><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" ></g><g id="SVGRepo_iconCarrier"> <path fill="#a16773" d="M32,0C18.148,0,12,23.188,12,32c0,9.656,6.883,17.734,16,19.594V60c0,2.211,1.789,4,4,4s4-1.789,4-4v-8.406 C45.117,49.734,52,41.656,52,32C52,22.891,46.051,0,32,0z" ></path> </g></svg>
        </div>

        <div className="filter"></div> {/* Mantén el filtro si su CSS le da un efecto visual */}

        {/* weather-info block - CON DATOS DINÁMICOS Y POSICIONADO SOBRE EL PAISAJE */}
        {/* Este bloque se posiciona sobre el paisaje según el CSS .weather-info */}
        <div className="weather-info">
           {/* Left side: Weather Icon and Text */}
           <div className="left-side">
              <div className="icon">
                  {/* Icono del clima de la API (usando <img> con la URL relativa) */}
                  {/* WeatherAPI icon URL example: //cdn.weatherapi.com/weather/64x64/day/116.png */}
                  {currentConditionIcon && (
                       // Asegúrate de que la URL sea absoluta si es necesaria (la API da //cdn...)
                       <img src={`https:${currentConditionIcon}`} alt={currentConditionText} className="icon" />
                  )}
                 {/* Si prefieres usar SVG locales, necesitarías lógica para seleccionar el SVG correcto */}
              </div>
             <span>{currentConditionText}</span> {/* Texto de la condición (ej: Cloudy) */}
           </div>
           {/* Right side: Location, Date/Time, Temperature */}
           <div className="right-side">
              <div className="location">
                 {/* Icono de ubicación (SVG desde tu HTML original) */}
                 <svg version="1.0" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="64px" height="64px" viewBox="0 0 64 64" xml:space="preserve" fill="#ffffff" stroke="#ffffff" ><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" ></g><g id="SVGRepo_iconCarrier"> <path fill="#ffffff" d="M32,0C18.746,0,8,10.746,8,24c0,5.219,1.711,10.008,4.555,13.93c0.051,0.094,0.059,0.199,0.117,0.289l16,24 C29.414,63.332,30.664,64,32,64s2.586-0.668,3.328-1.781l16-24c0.059-0.09,0.066-0.195,0.117-0.289C54.289,34.008,56,29.219,56,24 C56,10.746,45.254,0,32,0z M32,32c-4.418,0-8-3.582-8-8s3.582-8,8-8s8,3.582,8,8S36.418,32,32,32z" ></path> </g></svg>
                 <span>{country ? country.toUpperCase() : '---'}</span> {/* Nombre del país en mayúsculas */}
                  {/* Si prefieres Ciudad, País: <span>{locationName}, {country}</span> */}
              </div>
              {/* Fecha/Hora actual (formateada) usando la clase datetime */}
              <div className="datetime">{formattedCurrentDateTime || '---'}</div>
              {/* Temperatura actual usando la clase temperature */}
              <div className="temperature">{currentTemp !== undefined ? `${currentTemp}°C` : '---°C'}</div> {/* Mostrar --- si temp es undefined */}
           </div>
        </div>

      </section>

      {/* Content section - Contiene la lista de pronósticos */}
      <section className="content-section">
        <div className="forecast">
          {/* Mapea sobre el array de días de pronóstico para mostrar cada ítem */}
          {forecastDays && forecastDays.length > 0 ? (
             forecastDays.map((day, index) => (
               // Usa React.Fragment para agrupar elementos sin añadir un div extra, y usa la key
               <React.Fragment key={day.date}>
                 <div>
                   <span>{formatForecastDate(day.date)}</span> {/* Fecha del pronóstico (formateada) */}
                   <span>{day.avgTemp !== undefined ? `${day.avgTemp}°C` : '---°C'}</span> {/* Temperatura promedio */}
                 </div>
                 {/* Agrega un separador después de cada ítem, excepto el último */}
                  {index < forecastDays.length - 1 && <div className="separator"></div>}
               </React.Fragment>
             ))
          ) : (
             // Mostrar este mensaje si no hay datos de pronóstico (ej. API devolvió array vacío o falla)
             !loading && !error && <div><span>No hay datos de pronóstico disponibles.</span></div>
          )}
        </div>
      </section>
    </div>
  );
}