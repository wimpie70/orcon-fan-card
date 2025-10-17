/**
 * Template Helpers
 * Utility functions for data transformation and calculations
 */

/**
 * Calculate absolute humidity from temperature and relative humidity
 * @param {string|number} temp - Temperature in Celsius
 * @param {string|number} humidity - Relative humidity percentage
 * @returns {string} Absolute humidity in g/m³ or '?' if invalid
 */
export function calculateAbsoluteHumidity(temp, humidity) {
  if (temp === '?' || humidity === '?') return '?';
  const tempC = parseFloat(temp);
  const relHum = parseFloat(humidity);
  if (isNaN(tempC) || isNaN(relHum)) return '?';

  // Saturation vapor pressure (hPa)
  const es = 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
  // Actual vapor pressure (hPa)
  const e = (relHum / 100) * es;
  // Absolute humidity (g/m³) - divide by 10 to match expected scale
  const ah = (2.1674 * e) / (273.15 + tempC) * 100;

  return ah.toFixed(1);
}

/**
 * Create template data object from raw values
 * @param {Object} rawData - Raw sensor values
 * @returns {Object} Formatted template data
 */
export function createTemplateData(rawData) {
  const {
    indoorTemp, outdoorTemp, indoorHumidity, outdoorHumidity,
    supplyTemp, exhaustTemp, fanSpeed, fanMode, co2Level, flowRate,
    dehumMode, dehumActive, comfortTemp, timerMinutes = 0, efficiency = 75
  } = rawData;

  return {
    // Temperature and humidity values
    indoorTemp: indoorTemp || '?',
    outdoorTemp: outdoorTemp || '?',
    indoorHumidity: indoorHumidity || '?',
    outdoorHumidity: outdoorHumidity || '?',
    supplyTemp: supplyTemp || '?',
    exhaustTemp: exhaustTemp || '?',

    // Calculated absolute humidity values
    indoorAbsHumidity: calculateAbsoluteHumidity(indoorTemp, indoorHumidity),
    outdoorAbsHumidity: calculateAbsoluteHumidity(outdoorTemp, outdoorHumidity),

    // Fan and air quality data
    fanSpeed: fanSpeed || 'speed ?',
    fanMode: fanMode || 'auto',
    co2Level: co2Level || '?',
    flowRate: flowRate || '?',
    efficiency: efficiency,

    // Dehumidifier and comfort settings
    dehumMode: dehumMode || 'off',
    dehumActive: dehumActive || 'off',
    comfortTemp: comfortTemp || '?',

    // Timer and bypass state
    timerMinutes: timerMinutes,
    bypassState: 'auto' // This would come from actual bypass sensor
  };
}
