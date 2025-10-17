import { NORMAL_SVG, BYPASS_OPEN_SVG } from './airflow-diagrams.js';
import { CARD_STYLE } from './card-styles.js';

class OrconFanCard extends HTMLElement {
  // All fan commands in one simple object
  static get FAN_COMMANDS() {
    return {
      'request10D0': {
        code: '10D0',
        verb: 'RQ',
        payload: '00'  // Request 10D0
      },

      'away': {
        code: '22F1',
        verb: ' I',
        payload: '000007'  // Away mode
      },
      'low': {
        code: '22F1',
        verb: ' I',
        payload: '000107'  // Low speed
      },
      'medium': {
        code: '22F1',
        verb: ' I',
        payload: '000207'  // Medium speed
      },
      'high': {
        code: '22F1',
        verb: ' I',
        payload: '000307'  // High speed
      },
      'active': {
        code: '22F1',
        verb: ' I',
        payload: '000807'  // Active mode
      },
      'auto2': {
        code: '22F1',
        verb: ' I',
        payload: '000507'  // Auto mode
      },
      'boost': {
        code: '22F1',
        verb: ' I',
        payload: '000607'  // Boost mode
      },
      'disable': {
        code: '22F1',
        verb: ' I',
        payload: '000707'  // Disable mode
      },

      'filter_reset': {
        code: '10D0',
        verb: ' W',
        payload: '00FF'  // Filter reset
      },

      'high_15': {
        code: '22F3',
        verb: ' I',
        payload: '00120F03040404'  // 15 minutes timer
      },
      'high_30': {
        code: '22F3',
        verb: ' I',
        payload: '00121E03040404'  // 30 minutes timer
      },
      'high_60': {
        code: '22F3',
        verb: ' I',
        payload: '00123C03040404'  // 60 minutes timer
      },

      'bypass_close': {
        code: '22F7',
        verb: ' W',
        payload: '0000EF'  // Bypass close
      },
      'bypass_open': {
        code: '22F7',
        verb: ' W',
        payload: '00C8EF'  // Bypass open
      },
      'bypass_auto': {
        code: '22F7',
        verb: ' W',
        payload: '00FFEF'  // Bypass auto
      },

      'request31DA': {
        code: '31DA',
        verb: 'RQ',
        payload: '00'
      },
    };
  }

      // // 2411 commands (sorted by payload)
      // 'req_2411_supply_away': {
      //   code: '2411',
      //   payload: '00003D'  // Request supply away
      // },
      // 'req_2411_exhaust_away': {
      //   code: '2411',
      //   payload: '00003E'  // Request exhaust away
      // },
      // 'req_2411_filtertime': {
      //   code: '2411',
      //   payload: '000031'  // Request filter time
      // },
      // 'req_2411_moist_pos': {
      //   code: '2411',
      //   payload: '00004E'  // Request moisture position
      // },
      // 'req_2411_moist_sens': {
      //   code: '2411',
      //   payload: '000052'  // Request moisture sensitivity
      // },
      // 'req_2411_moist_overrun': {
      //   code: '2411',
      //   payload: '000058'  // Request moisture overrun
      // },
      // 'req_2411_comfort': {
      //   code: '2411',
      //   payload: '000075'  // Request comfort
      // },


  static get properties() {
    return {
      _config: {},
      _hass: {},
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (this._config && this.shouldUpdate()) {
      this.render();
    }
  }

  shouldUpdate() {
    if (!this._hass || !this._config) return false;

    // Check if any of our entities have changed
    const entities = this.getEntities();
    return entities.some(entity => {
      const oldState = this._prevStates ? this._prevStates[entity] : null;
      const newState = this._hass.states[entity];
      this._prevStates = this._prevStates || {};
      this._prevStates[entity] = newState;
      return oldState !== newState;
    });
  }

  // Debug function to validate entity existence
  validateEntities() {
    if (!this._hass || !this._config) return;

//    console.log('=== Entity Validation Debug ===');
//    console.log(`Fan entity: ${this._config.fan_entity}`);

    const entities = this.getEntities();
    const missing = [];
    const found = [];

    entities.forEach(entity => {
      if (this._hass.states[entity]) {
        found.push(`${entity}: ${this._hass.states[entity].state}`);
      } else {
        missing.push(entity);
      }
    });

//    console.log('Found entities:', found);
    if (missing.length > 0) {
      console.warn('Missing entities:', missing);
    } else {
      console.log('✅ All expected entities are available');
    }

    return { found, missing };
  }

  getEntities() {
    if (!this._config) return [];
    
    return [
      this._config.indoor_temp_entity,
      this._config.outdoor_temp_entity,
      this._config.indoor_humidity_entity,
      this._config.outdoor_humidity_entity,
      this._config.supply_temp_entity,
      this._config.exhaust_temp_entity,
      this._config.fan_speed_entity,
      this._config.fan_mode_entity,
      this._config.co2_entity,
      this._config.flow_entity,
      this._config.bypass_entity,
      this._config.dehum_mode_entity,
      this._config.dehum_active_entity,
      this._config.comfort_temp_entity,
    ].filter(Boolean); // Remove any undefined/null values
  }

    
  // Method to get bound REM device via WebSocket
  async getBoundRem(deviceId) {
    if (!this._hass) {
      throw new Error('Home Assistant instance not available');
    }
      
    let sensor_id = 'climate.' + deviceId.replace(/:/g, '_');
    try {
      console.log('bound_rem: ', this._hass.states[sensor_id].attributes.bound_rem);
      let bound_rem = this._hass.states[sensor_id].attributes.bound_rem;
      if (bound_rem) {
        return bound_rem;
      }
    } catch (error) {
      console.error('Error getting bound REM device:', error);
      throw error;
    }

    // try {
    //   const result = await this._hass.connection.sendMessagePromise({
    //     type: 'ramses_cc/get_bound_rem',
    //     device_id: deviceId
    //   });

    //   return result.rem_id;
    // } catch (error) {
    //   console.error('Error getting bound REM device:', error);
    //   throw error;
    // }
  }
  
  // Method to send packet via ramses_cc service
  async sendPacket(deviceId, fromId, verb, code, payload) {
    if (!this._hass) {
      throw new Error('Home Assistant instance not available');
    }

    try {
      await this._hass.callService('ramses_cc', 'send_packet', {
        device_id: deviceId,
        from_id: fromId,
        verb: verb,
        code: code,
        payload: payload
      });
      console.log(`Successfully sent packet: ${verb} ${code} ${payload}`);
    } catch (error) {
      console.error('Error sending packet:', error);
      throw error;
    }
  }
  
  async sendFanCommand(commandKey) {
    if (!this._hass || !this._config?.device_id) {
      console.error('Missing Home Assistant instance or device_id');
      return false;
    }

    const command = OrconFanCard.FAN_COMMANDS[commandKey];
    if (!command) {
      console.error(`No command defined for: ${commandKey}`);
      return false;
    }

    try {
      // Use the configured device ID
      const deviceId = this._config.device_id;

      console.log(`Using configured device ID for commands: ${deviceId}`);

      // Get the bound REM device first
      let remId;
      try {
        remId = await this.getBoundRem(deviceId);
        if (remId) {
          console.log(`Using bound REM as from_id: ${remId}`);
        } else {
          console.log('No bound REM found, using device_id as from_id');
          remId = deviceId;
        }
      } catch (error) {
//        console.warn(`WebSocket error getting bound REM: ${error.message}. Falling back to device_id.`);
        remId = null;
      }

      // Send the packet
      await this.sendPacket(deviceId, remId, command.verb, command.code, command.payload);

      console.log(`Successfully set fan mode to ${commandKey}`);
      // Update UI
      const fanModeElement = this.shadowRoot?.querySelector('#fanMode');
      if (fanModeElement) {
        fanModeElement.textContent = commandKey;
      }

      return true;
    } catch (error) {
      console.error(`Error sending ${commandKey} command:`, error);
      return false;
    }
  }

  setConfig(config) {
    // console.log('=== OrconFanCard setConfig Debug ===');
    // console.log('Config received:', config);
    // console.log('Config type:', typeof config);
    // console.log('Config keys:', config ? Object.keys(config) : 'null');

    if (!config.fan_entity && !config.device_id) {
      console.error('Missing required config: need fan_entity or device_id');
      throw new Error('You need to define either fan_entity or device_id');
    }

    if (!config.device_id) {
      console.warn('No device_id provided, will extract from fan_entity');
      throw new Error('You need to define device_id');
    }

    // Normalize device ID to colon format for consistency
    let deviceId = config.device_id;
    deviceId = deviceId.replace(/_/g, ':');

    this._config = {
      device_id: deviceId,
      // Generate all related entity IDs based on the device_id (use underscores like actual entities)
      indoor_temp_entity: 'sensor.' + deviceId.replace(/:/g, '_') + '_indoor_temp',
      outdoor_temp_entity: 'sensor.' + deviceId.replace(/:/g, '_') + '_outdoor_temp',
      indoor_humidity_entity: 'sensor.' + deviceId.replace(/:/g, '_') + '_indoor_humidity',
      outdoor_humidity_entity: 'sensor.' + deviceId.replace(/:/g, '_') + '_outdoor_humidity',
      supply_temp_entity: 'sensor.' + deviceId.replace(/:/g, '_') + '_supply_temp',
      exhaust_temp_entity: 'sensor.' + deviceId.replace(/:/g, '_') + '_exhaust_temp',
      fan_speed_entity: 'sensor.' + deviceId.replace(/:/g, '_') + '_fan_info',
      fan_mode_entity: 'sensor.' + deviceId.replace(/:/g, '_') + '_fan_mode',
      co2_entity: 'sensor.' + deviceId.replace(/:/g, '_') + '_co2_level',
      flow_entity: 'sensor.' + deviceId.replace(/:/g, '_') + '_supply_flow',
      bypass_entity: 'binary_sensor.' + deviceId.replace(/:/g, '_') + '_bypass_position',
      // Use configured entities if provided, otherwise auto-generate
      dehum_mode_entity: config.dehum_mode_entity || 'input_boolean.' + deviceId.replace(/:/g, '_') + '_dehumidifier_mode',
      dehum_active_entity: config.dehum_active_entity || 'input_boolean.' + deviceId.replace(/:/g, '_') + '_dehumidifier_active',
      comfort_temp_entity: config.comfort_temp_entity || 'number.' + deviceId.replace(/:/g, '_') + '_param_75',
      ...config
    };
  }

  render() {
    if (!this._hass || !this._config) {
      console.error('❌ Missing hass or config:', { hass: !!this._hass, config: !!this._config });
      return;
    }

    console.log('✅ Hass and config available, proceeding with render');

    // Debug: Validate entities are available
    this.validateEntities();

    const config = this._config;
    const hass = this._hass;

    const indoorTemp = hass.states[config.indoor_temp_entity]?.state || '?';
    const outdoorTemp = hass.states[config.outdoor_temp_entity]?.state || '?';
    const indoorHumidity = hass.states[config.indoor_humidity_entity]?.state || '?';
    const outdoorHumidity = hass.states[config.outdoor_humidity_entity]?.state || '?';
    const supplyTemp = hass.states[config.supply_temp_entity]?.state || '?';
    const exhaustTemp = hass.states[config.exhaust_temp_entity]?.state || '?';
    const fanSpeed = hass.states[config.fan_speed_entity]?.state || 'speed ?';
    const fanMode = hass.states[config.fan_mode_entity]?.state || 'auto';
    const co2Level = hass.states[config.co2_entity]?.state || '?';
    const flowRate = hass.states[config.flow_entity]?.state || '?';

    // Dehumidifier entities (will be available when created)
    const dehumMode = hass.states[config.dehum_mode_entity]?.state || 'off';
    const dehumActive = hass.states[config.dehum_active_entity]?.state || 'off';

    // Comfort temperature entity (will be available when created)
    const comfortTemp = hass.states[config.comfort_temp_entity]?.state || '?';

    // Calculate absolute humidity (g/m³)
    const calculateAbsoluteHumidity = (temp, humidity) => {
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
    };

    const indoorAbsHumidity = calculateAbsoluteHumidity(indoorTemp, indoorHumidity);
    const outdoorAbsHumidity = calculateAbsoluteHumidity(outdoorTemp, outdoorHumidity);

    console.log('🔧 Generating card HTML...');

    // Determine which SVG to use based on bypass position (imported from airflow-diagrams.js)
    const isBypassOpen = hass.states[config.bypass_entity]?.state === 'on';
    const selectedSvg = isBypassOpen ? BYPASS_OPEN_SVG : NORMAL_SVG;
    this.innerHTML = `
      <!DOCTYPE html>
      <html>
      <head>
      <style>${CARD_STYLE}</style>
      </head>
      <body>
        <script>
          // Store the card instance globally so it can be accessed from inline handlers
          if (!window.orconFanCardInstance) {
            window.orconFanCardInstance = this;
          }
        </script>
        <script>
          function forceRefresh() {
            console.log("forceRefresh (html)");
            if (window.orconFanCardInstance) {
              window.orconFanCardInstance.forceRefresh();
            }
          }
        </script>
      <div class="ventilation-card">
        <!-- Top Section with airflow -->
        <div class="top-section">
          <!-- Timer -->
          <div class="timer-display">
            <svg class="timer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
            <span id="timer">0 min</span>
          </div>

          <!-- Corner Values -->
          <div class="corner-value top-left">
            <div class="icon-circle blue">☁️</div>
            <div class="temp-value">
              <span id="outdoorTemp">${outdoorTemp} °C</span>
              <span>🌡️</span>
            </div>
            <div class="humidity-value">
              <span id="outdoorHumidity">${outdoorHumidity}%</span>
              <span>💧</span>
            </div>
            <div class="humidity-abs">
              <span id="outdoorAbsHumidity">${outdoorAbsHumidity} g/m³</span>
              <span>💨</span>
            </div>
          </div>

          <div class="corner-value top-right">
            <div class="icon-circle red">🏠</div>
            <div class="temp-value">
              <span id="indoorTemp">${indoorTemp} °C</span>
              <span>🌡️</span>
            </div>
            <div class="humidity-value">
              <span id="indoorHumidity">${indoorHumidity}%</span>
              <span>💧</span>
            </div>
            <div class="humidity-abs">
              <span id="indoorAbsHumidity">${indoorAbsHumidity} g/m³</span>
              <span>💨</span>
            </div>
            <div class="comfort-temp">
              <span id="comfortTemp">${comfortTemp} °C</span>
              <span>🌡️</span>
            </div>
            <!-- Dehumidifier Mode - Auto Moisture Sensing -->
            <div class="dehum-mode">
              <span id="dehumMode">${dehumMode}</span>
              <span>🖐️</span>
            </div>
            <div class="dehum-active">
              <span id="dehumActive">${dehumActive}</span>
              <span>💨</span>
            </div>
          </div>

          <div class="corner-value bottom-right">
            <div class="temp-value">
              <span id="supplyTemp">${supplyTemp} °C</span>
              <span>🌡️</span>
            </div>
          </div>

          <div class="corner-value bottom-left">
            <div class="temp-value">
              <span id="exhaustTemp">${exhaustTemp} °C</span>
              <span>🌡️</span>
            </div>
          </div>

          <div class="side-value mid-left">
            <!-- Refresh Button -->
            <button class="refresh-button" onclick="triggerRefresh()" title="Refresh all values">
              <svg width="40" height="40" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M36.75 21C36.75 29.69848 29.69848 36.75 21 36.75C16.966145 36.75 13.2864725 35.23345 10.5 32.739525L5.25 28M5.25 21C5.25 12.30152 12.30152 5.25 21 5.25C25.033925 5.25 28.713475 6.76648 31.5 9.26044L36.75 14M5.25 36.75V28M5.25 28H14M36.75 5.25V14M36.75 14H28" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>



          <!-- SVG Flow Direction Arrows -->
          <!-- Heat Recovery Ventilation Diagram -->
          <!-- Heat Recovery Ventilation Diagram -->
          <div class="airflow-diagram">
            ${selectedSvg}
          </div>

          <!-- centre -->
          <div class="centre-container">
            <div class="centre">
              <div class="centre-inner">
                <div class="speed-display" id="fanSpeed">${fanSpeed}</div>
                <div class="fanmode" id="fanMode">${fanMode}</div>
              </div>
            </div>
          </div>

          <!-- Bottom Stats -->
          <div style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 20px; font-size: 13px; color: #333; z-index: 2;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span>📊</span>
              <span id="efficiency">75 d</span>
            </div>
            <div>
              <span id="co2Level">${co2Level}%</span>
            </div>
            <div>
              <span id="flowRate">${flowRate} L/s</span>
            </div>
          </div>
        </div>

        <!-- Control Buttons - 4 rows -->
        <div class="controls-container">
          <!-- Row 1: Fan Modes -->
          <div class="control-row">
            <div class="control-button" data-mode="away">
              <div class="control-icon">🏠</div>
              <div class="control-label">Away</div>
            </div>
            <div class="control-button" data-mode="auto">
              <div class="control-icon">🌀</div>
              <div class="control-label">Auto</div>
            </div>
            <div class="control-button" data-mode="active">
              <div class="control-icon">⚡</div>
              <div class="control-label">Dehumidify</div>
            </div>
          </div>

          <!-- Row 2: Fan Speeds -->
          <div class="control-row">
            <div class="control-button" data-mode="low">
              <div class="control-icon">🌀</div>
              <div class="control-label">Low</div>
            </div>
            <div class="control-button" data-mode="medium">
              <div class="control-icon">🌀</div>
              <div class="control-label">Medium</div>
            </div>
            <div class="control-button" data-mode="high">
              <div class="control-icon">🌀</div>
              <div class="control-label">High</div>
            </div>
          </div>

          <!-- Row 3: Timer -->
          <div class="control-row">
            <div class="control-button" data-timer="15">
              <div class="control-icon">⏱️</div>
              <div class="control-label">15m</div>
            </div>
            <div class="control-button" data-timer="30">
              <div class="control-icon">⏰</div>
              <div class="control-label">30m</div>
            </div>
            <div class="control-button" data-timer="60">
              <div class="control-icon">⏳</div>
              <div class="control-label">60m</div>
            </div>
          </div>

          <!-- Row 4: Bypass -->
          <div class="control-row">
            <div class="control-button" onclick="setBypassMode('auto')">
              <div class="control-icon">🔄</div>
              <div class="control-label">Bypass Auto</div>
            </div>
            <div class="control-button" onclick="setBypassMode('close')">
              <div class="control-icon">⊞</div>
              <div class="control-label">Bypass Close</div>
            </div>
            <div class="control-button" onclick="setBypassMode('open')">
              <div class="control-icon">⊟</div>
              <div class="control-label">Bypass Open</div>
            </div>
          </div>
        </div>
      </div>

      <script>
        console.log('🔧 Card HTML generated, running inline scripts');

        // Update UI
        document.getElementById('fanMode').textContent = mode;

        // Update active state for all button types
        document.querySelectorAll('.control-button').forEach(btn => {
          const label = btn.querySelector('.control-label').textContent;

          // Handle mode buttons (away, auto, active)
          if (['Away', 'Auto', 'Active', 'Dehumidify'].includes(label)) {
            if (label.toLowerCase() === mode) {
              btn.classList.add('active');
            } else {
              btn.classList.remove('active');
            }
          }

          // Handle speed buttons (low, medium, high)
          else if (['Low', 'Medium', 'High'].includes(label)) {
            if (label.toLowerCase() === mode) {
              btn.classList.add('active');
            } else {
              btn.classList.remove('active');
            }
          }

          // Timer and bypass buttons are handled by their respective functions
        });
      }

      function updateTimerUI(minutes) {
        console.log('Updating timer UI to:', minutes, 'minutes');
        document.getElementById('timer').textContent = minutes + ' min';

        // Update active state
        document.querySelectorAll('.control-button').forEach(btn => {
          const label = btn.querySelector('.control-label').textContent;
          if (label === minutes + 'm') {
            btn.classList.add('active');
          } else if (['15m', '30m', '60m'].includes(label)) {
            btn.classList.remove('active');
          }
        });
      }

      function triggerRefresh() {
        console.log('🔄 Manual refresh requested by user (html)');

        // Get the card instance from the global reference
        if (window.orconFanCardInstance) {
          window.orconFanCardInstance.forceRefresh().then(success => {
            if (success) {
              console.log('✅ Manual refresh completed');
              // Show a brief success indicator (optional)
              const refreshBtn = document.querySelector('.refresh-button');
              if (refreshBtn) {
                refreshBtn.style.background = 'rgba(76, 175, 80, 0.3)';
                setTimeout(() => {
                  refreshBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                }, 500);
              }
            } else {
              console.error('❌ Manual refresh failed');
              // Show error indicator (optional)
              const refreshBtn = document.querySelector('.refresh-button');
              if (refreshBtn) {
                refreshBtn.style.background = 'rgba(244, 67, 54, 0.3)';
                setTimeout(() => {
                  refreshBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                }, 1000);
              }
            }
          });
        } else {
          console.error('Card instance not found for refresh');
        }
      }

  // Handle bypass button clicks with UI update and command sending
  async setBypassMode(mode) {
    console.log('Setting bypass to:', mode);
    try {
      // Update UI using the card instance
      if (window.orconFanCardInstance) {
        window.orconFanCardInstance.updateBypassUI(mode);
        // Send command to device
        await window.orconFanCardInstance.sendBypassCommand(mode);
      } else {
        console.error('Card instance not available for bypass mode');
      }
    } catch (error) {
      console.error('Error setting bypass mode to ' + mode + ':', error);
      // Optionally show user feedback
      console.warn('Bypass command may have failed - check Home Assistant logs');
    }
  }

  // Handle refresh button clicks
  async forceRefresh() {
    console.log('🔄 Manual refresh requested by user');
    if (window.orconFanCardInstance) {
      const success = await window.orconFanCardInstance.forceRefresh();
      if (success) {
        console.log('✅ Manual refresh completed');
        // Show a brief success indicator (optional)
        const refreshBtn = document.querySelector('.refresh-button');
        if (refreshBtn) {
          refreshBtn.style.background = 'rgba(76, 175, 80, 0.3)';
          setTimeout(() => {
            refreshBtn.style.background = 'rgba(255, 255, 255, 0.2)';
          }, 500);
        }
      } else {
        console.error('❌ Manual refresh failed');
        // Show error indicator (optional)
        const refreshBtn = document.querySelector('.refresh-button');
        if (refreshBtn) {
          refreshBtn.style.background = 'rgba(244, 67, 54, 0.3)';
          setTimeout(() => {
            refreshBtn.style.background = 'rgba(255, 255, 255, 0.2)';
          }, 1000);
        }
      }
    } else {
      console.error('Card instance not found for refresh');
    }
  }


      </script>
      </body>
      </html>
    `;

    console.log('✅ Card HTML generated successfully');
  }

  // Configuration schema for visual editor
  static getConfigElement() {
    try {
      // Ensure the editor is available before creating it
      if (typeof OrconFanCardEditor === 'undefined') {
        console.error('OrconFanCardEditor is not defined');
        return null;
      }
      return document.createElement("orcon-fan-card-editor");
    } catch (error) {
      console.error('Error creating config element:', error);
      return null;
    }
  }

  // Card size for Home Assistant
  getCardSize() {
    return 3;
  }

  // Handle fan mode changes (legacy function, now uses sendFanCommand)
  async setFanMode(mode) {
    console.log('Setting fan mode to:', mode);
    // Use the new sendFanCommand function
    await this.sendFanCommand(mode);
  }

  // Handle bypass button clicks
  async sendBypassCommand(mode) {
    console.log('Setting bypass to:', mode);
    // Use the new sendFanCommand function
    await this.sendFanCommand('bypass_' + mode);
  }

  // Handle timer button clicks
  async setTimer(minutes) {
    console.log('Setting timer for:', minutes, 'minutes');
    // Use the new sendFanCommand function
    await this.sendFanCommand(minutes);
  }

  // Force refresh of all monitored entities
  async forceRefresh() {
    if (!this._hass || !this._config) {
      console.error('Cannot refresh: Missing Home Assistant or config');
      return false;
    }

    try {
      console.log('🔄 Sending 31DA request to refresh device data...');

      // Send 31DA request to refresh device data
      await this.sendFanCommand('request31DA');

      // Update the renderer with current data
      this.render();

      console.log('✅ 31DA request sent and entities updated');
      return true;
    } catch (error) {
      console.error('Error sending 31DA request:', error);
      return false;
    }
  }

  // UI Update Functions (available globally for onclick handlers)
  updateTimerUI(minutes) {
    console.log('Updating timer UI to:', minutes, 'minutes');
    const timerElement = this.shadowRoot?.querySelector('#timer');
    if (timerElement) {
      timerElement.textContent = minutes + ' min';
    }

    // Update active state
    const buttons = this.shadowRoot?.querySelectorAll('.control-button');
    if (buttons) {
      buttons.forEach(btn => {
        const label = btn.querySelector('.control-label')?.textContent;
        if (label === minutes + 'm') {
          btn.classList.add('active');
        } else if (['15m', '30m', '60m'].includes(label)) {
          btn.classList.remove('active');
        }
      });
    }
  }

  updateBypassUI(mode) {
    console.log('Updating bypass UI to:', mode);

    // Update active state
    const buttons = this.shadowRoot?.querySelectorAll('.control-button');
    if (buttons) {
      buttons.forEach(btn => {
        const label = btn.querySelector('.control-label')?.textContent;
        if ((mode === 'auto' && label === 'Bypass Auto') ||
            (mode === 'close' && label === 'Bypass Close') ||
            (mode === 'open' && label === 'Bypass Open')) {
          btn.classList.add('active');
        } else if (label?.startsWith('Bypass')) {
          btn.classList.remove('active');
        }
      });
    }
  }

  triggerRefresh() {
    console.log('🔄 Manual refresh requested by user (js)');

    // Get the card instance from the global reference
    if (window.orconFanCardInstance) {
      window.orconFanCardInstance.forceRefresh().then(success => {
        if (success) {
          console.log('✅ Manual refresh completed');
          // Show a brief success indicator (optional)
          const refreshBtn = this.shadowRoot?.querySelector('.refresh-button');
          if (refreshBtn) {
            refreshBtn.style.background = 'rgba(76, 175, 80, 0.3)';
            setTimeout(() => {
              refreshBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            }, 500);
          }
        } else {
          console.error('❌ Manual refresh failed');
          // Show error indicator (optional)
          const refreshBtn = this.shadowRoot?.querySelector('.refresh-button');
          if (refreshBtn) {
            refreshBtn.style.background = 'rgba(244, 67, 54, 0.3)';
            setTimeout(() => {
              refreshBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            }, 1000);
          }
        }
      });
    } else {
      console.error('Card instance not found for refresh');
    }
  }
  
  // Add event listeners after the component is connected to the DOM
  connectedCallback() {
    console.log('=== OrconFanCard connectedCallback Debug ===');
    console.log('Card connected to DOM');
    console.log('Card instance:', this);
    console.log('Card shadowRoot:', this.shadowRoot);
    console.log('Card config at connect:', this._config);
    console.log('Card hass at connect:', this._hass);

    // No need to call super.connectedCallback() as HTMLElement doesn't have it

    // Set up a single click handler for the entire card
    this.addEventListener('click', (event) => {
      const button = event.target.closest('.control-button');
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      console.log('🔘 Button clicked:', button);
      console.log('Button dataset:', button.dataset);
      console.log('Button onclick:', button.getAttribute('onclick'));

      // Handle different button types
      if (button.hasAttribute('onclick')) {
        // For buttons with inline onclick handlers
        const onclick = button.getAttribute('onclick');
        if (onclick) {
          console.log('Executing onclick handler:', onclick);
          // Create a function in the global scope to execute the onclick
          const fn = new Function('event', `
            try {
              ${onclick}
            } catch(e) {
              console.error('Error in button handler:', e);
            }`);
          fn.call(button, event);
        }
      } else if (button.dataset.mode) {
        console.log('Calling setFanMode with mode:', button.dataset.mode);
        this.setFanMode(button.dataset.mode);
      } else if (button.dataset.timer) {
        console.log('Calling setTimer with minutes:', button.dataset.timer);
        this.setTimer(button.dataset.timer);
      }
    });

    console.log('✅ Event listeners attached');

    // Store the card instance globally
    window.orconFanCardInstance = this;

    // Make functions globally available for onclick handlers
    window.updateTimerUI = this.updateTimerUI;
    window.updateBypassUI = this.updateBypassUI;
    window.triggerRefresh = this.triggerRefresh.bind(this);
    window.setBypassMode = (mode) => this.sendBypassCommand(mode);
    window.forceRefresh = this.forceRefresh.bind(this);
  }
}

// Include the editor component
// This ensures the editor is loaded when the card is used

// orcon-fan-card-editor.js
class OrconFanCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
    this._initialized = false;
  }

  connectedCallback() {
    this._initialized = true;
    console.log('OrconFanCardEditor connected');
  }

  setConfig(config) {
    console.log('OrconFanCardEditor setConfig called with:', config);

    // Create a mutable copy of config to avoid frozen object issues
    if (config) {
      this._config = { ...config };
    } else {
      this._config = {};
    }

    this._updateContent();
  }

  set hass(hass) {
    console.log('OrconFanCardEditor hass set');
    this._hass = hass;
    if (this._config && this._initialized) {
      this._updateContent();
    }
  }

  _updateContent() {
    console.log('=== OrconFanCardEditor _updateContent Debug ===');
    console.log('HASS available:', !!this._hass);
    console.log('Config available:', !!this._config);

    if (!this._hass || !this._config) {
      console.log('Missing hass or config, showing loading message');
      this.innerHTML = '<div>Loading configuration...</div>';
      return;
    }

    console.log('✅ Both hass and config available, proceeding with render');

    // Get available Ramses CC devices
    const ramsesDevices = this._getRamsesDevices();
    console.log('Found Ramses devices:', ramsesDevices);

    // Debug entity detection (only for entities we need)
    const inputBooleanEntities = Object.keys(this._hass.states).filter(entity =>
      entity.startsWith('input_boolean.')
    );
    console.log('Found input_boolean entities:', inputBooleanEntities);

    console.log('🔧 Generating card editor HTML...');

    this.innerHTML = `
      <div class="card-config">
        <div class="form-group">
          <label for="device_id">Device ID *</label>
          <select id="device_id" class="config-input" required>
            <option value="">Select a Ramses CC device...</option>
            ${ramsesDevices.map(device => `<option value="${device.id}" ${this._config.device_id === device.id ? 'selected' : ''}>${device.id} (${device.name || 'Unknown'})</option>`).join('')}
            ${ramsesDevices.length === 0 ? '<option disabled>No Ramses CC devices found</option>' : ''}
          </select>
          <small class="form-help">Select the Ramses CC device ID that corresponds to your fan</small>
        </div>

        <div class="form-group">
          <label for="dehum_mode_entity">Dehumidifier Mode Entity</label>
          <select id="dehum_mode_entity" class="config-input">
            <option value="">Auto-detect (recommended)</option>
            ${Object.keys(this._hass ? this._hass.states : {})
              .filter(entity => entity.startsWith('input_boolean.'))
              .sort()
              .map(entity => `<option value="${entity}" ${this._config.dehum_mode_entity === entity ? 'selected' : ''}>${entity}</option>`)
              .join('')}
            ${!this._hass || Object.keys(this._hass.states).filter(entity => entity.startsWith('input_boolean.')).length === 0 ? '<option disabled>No input_boolean entities found - create them first</option>' : ''}
          </select>
          <small class="form-help">Input boolean entity for dehumidifier mode control</small>
        </div>

        <div class="form-group">
          <label for="comfort_temp_entity">Comfort Temperature Entity</label>
          <select id="comfort_temp_entity" class="config-input">
            <option value="">Auto-detect (recommended)</option>
            ${Object.keys(this._hass ? this._hass.states : {})
              .filter(entity => entity.startsWith('number.') || entity.startsWith('sensor.'))
              .sort()
              .map(entity => `<option value="${entity}" ${this._config.comfort_temp_entity === entity ? 'selected' : ''}>${entity}</option>`)
              .join('')}
            ${!this._hass || Object.keys(this._hass.states).filter(entity => entity.startsWith('number.') || entity.startsWith('sensor.')).length === 0 ? '<option disabled>No number/sensor entities found</option>' : ''}
          </select>
          <small class="form-help">Number entity for comfort temperature display (e.g., number.32_153289_param_75)</small>
        </div>
      </div>

      <style>
        .card-config {
          padding: 16px;
          background: var(--card-background-color, #fff);
          border-radius: 8px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--primary-text-color);
        }

        .config-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          background: var(--input-background-color, #fff);
          color: var(--primary-text-color);
          font-size: 14px;
        }

        .form-help {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          color: var(--secondary-text-color);
        }
      </style>
    `;

    console.log('✅ Card editor HTML generated successfully');
    console.log('📏 Editor dimensions:', this.offsetWidth, 'x', this.offsetHeight);

    // Add event listeners after content is set
    setTimeout(() => {
      const deviceIdSelect = this.querySelector('#device_id');
      const dehumModeSelect = this.querySelector('#dehum_mode_entity');
      const dehumActiveSelect = this.querySelector('#dehum_active_entity');
      const comfortTempSelect = this.querySelector('#comfort_temp_entity');

      if (deviceIdSelect) {
        deviceIdSelect.addEventListener('change', (e) => {
          this._config.device_id = e.target.value;
          this._dispatchConfigChange();
        });
      }

      if (dehumModeSelect) {
        dehumModeSelect.addEventListener('change', (e) => {
          this._config.dehum_mode_entity = e.target.value;
          this._dispatchConfigChange();
        });
      }

      if (dehumActiveSelect) {
        dehumActiveSelect.addEventListener('change', (e) => {
          this._config.dehum_active_entity = e.target.value;
          this._dispatchConfigChange();
        });
      }

      if (comfortTempSelect) {
        comfortTempSelect.addEventListener('change', (e) => {
          this._config.comfort_temp_entity = e.target.value;
          this._dispatchConfigChange();
        });
      }
    }, 0);
  }

  _getRamsesDevices() {
    console.log('=== _getRamsesDevices Debug ===');
    console.log('HASS available in _getRamsesDevices:', !!this._hass);

    if (!this._hass) {
      console.log('No HASS available, returning empty array');
      return [];
    }

    // Get all Ramses CC entities and extract device IDs
    const ramsesEntities = Object.keys(this._hass.states).filter(entity =>
      entity.startsWith('sensor.') && entity.includes('_fan')
    );
    console.log('Found Ramses entities:', ramsesEntities);

    const deviceIds = new Set();

    ramsesEntities.forEach(entity => {
      const entityBase = entity.replace('sensor.', '');
      let deviceId = '';

      if (entityBase.includes('_fan_info')) {
        deviceId = entityBase.replace('_fan_info', '');
      } else if (entityBase.includes('_fan_')) {
        deviceId = entityBase.split('_fan_')[0];
      } else if (entityBase.includes('_')) {
        const parts = entityBase.split('_');
        if (parts.length === 2 && parts.every(part => /^\d+$/.test(part))) {
          deviceId = entityBase;
        } else {
          deviceId = parts.slice(0, -1).join('_');
        }
      } else {
        deviceId = entityBase;
      }

      if (deviceId) {
        deviceIds.add(deviceId);
      }
    });

    const devices = Array.from(deviceIds).map(id => ({
      id: id.replace(/_/g, ':'), // Normalize to colon format
      name: `Device ${id.replace(/_/g, ':')}`
    }));

    console.log('Extracted devices:', devices);
    return devices;
  }

  _dispatchConfigChange() {
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config }
    });
    this.dispatchEvent(event);
  }
}

// Make editor globally available for Home Assistant (after class declaration)
window.OrconFanCardEditor = OrconFanCardEditor;

// Register the editor
customElements.define('orcon-fan-card-editor', OrconFanCardEditor);

// Register the web component
if (!customElements.get('orcon-fan-card')) {
  customElements.define('orcon-fan-card', OrconFanCard);
}
