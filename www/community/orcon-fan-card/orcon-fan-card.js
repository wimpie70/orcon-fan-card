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

    console.log('=== Entity Validation Debug ===');
    console.log(`Fan entity: ${this._config.fan_entity}`);

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

    console.log('Found entities:', found);
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

    try {
      const result = await this._hass.connection.sendMessagePromise({
        type: 'ramses_cc/get_bound_rem',
        device_id: deviceId
      });

      return result.rem_id;
    } catch (error) {
      console.error('Error getting bound REM device:', error);
      throw error;
    }
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
        console.warn(`WebSocket error getting bound REM: ${error.message}. Falling back to device_id.`);
        remId = deviceId;
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
    console.log('=== OrconFanCard setConfig Debug ===');
    console.log('Config received:', config);
    console.log('Config type:', typeof config);
    console.log('Config keys:', config ? Object.keys(config) : 'null');

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
    console.log('Original device_id:', deviceId);

    deviceId = deviceId.replace(/_/g, ':');
    console.log('Normalized device_id:', deviceId);

    // console.log('🔧 Building config object...');

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

    // console.log('✅ Config object built:', this._config);
    // console.log('📋 Generated entity IDs:', {
    //   indoor_temp: this._config.indoor_temp_entity,
    //   outdoor_temp: this._config.outdoor_temp_entity,
    //   fan_speed: this._config.fan_speed_entity,
    //   fan_mode: this._config.fan_mode_entity,
    // });
  }

  render() {
    console.log('=== OrconFanCard Render Debug ===');
    console.log('Card instance:', this);
    console.log('Home Assistant object:', this._hass);
    console.log('Card config:', this._config);

    if (!this._hass || !this._config) {
      console.error('❌ Missing hass or config:', { hass: !!this._hass, config: !!this._config });
      return;
    }

    console.log('✅ Hass and config available, proceeding with render');

    // Debug: Validate entities are available
    this.validateEntities();

    const config = this._config;
    const hass = this._hass;

    console.log('📊 Entity values being used:');
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

      // console.log(`AH Debug - T:${tempC}°C, RH:${relHum}%, es:${es.toFixed(2)}hPa, e:${e.toFixed(2)}hPa, ah:${ah.toFixed(1)}g/m³`);

      return ah.toFixed(1);
    };

    const indoorAbsHumidity = calculateAbsoluteHumidity(indoorTemp, indoorHumidity);
    const outdoorAbsHumidity = calculateAbsoluteHumidity(outdoorTemp, outdoorHumidity);

    console.log({
      indoorTemp, outdoorTemp, indoorHumidity, outdoorHumidity,
      supplyTemp, exhaustTemp, fanSpeed, fanMode, co2Level, flowRate,
      indoorAbsHumidity, outdoorAbsHumidity
    });

    console.log('🔧 Generating card HTML...');

    // SVG content for normal heat recovery mode
    const normalSvg = `
      <svg viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="blueToRed" x1="212" y1="212" x2="588" y2="588" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="blue"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>

          <linearGradient id="redToBlue" x1="212" y1="212" x2="588" y2="588" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="red"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>

          <linearGradient id="silverToGray" x1="620" y1="340" x2="180" y2="340" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="silver"/>
            <stop offset="100%" stop-color="gray"/>
          </linearGradient>

          <marker markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" viewBox="0 0 5 5" orient="auto" id="marker1">
            <polygon points="0,5 1.6667,2.5 0,0 5,2.5" fill="red"></polygon>
          </marker>

          <marker markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" viewBox="0 0 5 5" orient="auto" id="marker2">
            <polygon points="0,5 1.6667,2.5 0,0 5,2.5" fill="blue"></polygon>
          </marker>
        </defs>

        <!-- Outer hexagon sides (scaled 1.35× around center 400,340) -->
        <g stroke="grey" stroke-width="1" fill="url(#silverToGray)">
          <polygon points="
            297,132
            503,132
            620,340
            503,548
            297,548
            180,340
          "></polygon>
        </g>

        <!-- Inner hexagon -->
        <g stroke="silver" stroke-width="1" fill="silver">
          <polygon points="
            337,176
            483,176
            573,330
            483,484
            337,484
            247,330
          "></polygon>
        </g>
        <!-- Connection lines hexagons -->
        <g>
          <line x1="337" y1="176" x2="297" y2="132" stroke="silver" stroke-width="4"></line>
          <line x1="483" y1="176" x2="503" y2="132" stroke="silver" stroke-width="4"></line>
          <line x1="573" y1="330" x2="620" y2="340" stroke="silver" stroke-width="4"></line>
          <line x1="483" y1="484" x2="503" y2="548" stroke="silver" stroke-width="4"></line>
          <line x1="337" y1="484" x2="297" y2="548" stroke="silver" stroke-width="4"></line>
          <line x1="247" y1="330" x2="180" y2="340" stroke="silver" stroke-width="4"></line>
        </g>

        <!-- Original arrows for heat recovery -->
        <g stroke-width="29" stroke="url(#blueToRed)" fill="none" stroke-linecap="round" stroke-linejoin="round"
          transform="translate(0,-70) translate(400,400) scale(1.3) translate(-400,-400)">
          <path d="M212 212 Q374 307 400 400 Q455 569 588 588" marker-end="url(#marker1)"></path>
        </g>

        <!-- Mirrored arrow shadow -->
        <g stroke-width="29" stroke="white" fill="none" stroke-linecap="round" stroke-linejoin="round"
          transform="translate(0,-70) scale(-1,1) translate(-800,0) translate(400,400) scale(1.35) translate(-400,-400)">
          <path d="M212 212 Q374 307 400 400 Q455 569 588 588"></path>
        </g>

        <!-- Mirrored arrow -->
        <g stroke-width="29" stroke="url(#redToBlue)" fill="none" stroke-linecap="round" stroke-linejoin="round"
          transform="translate(0,-70) scale(-1,1) translate(-800,0) translate(400,400) scale(1.3) translate(-400,-400)">
          <path d="M212 212 Q374 307 400 400 Q455 569 588 588" marker-end="url(#marker2)"></path>
        </g>

        <!-- Outer hexagon outline -->
        <g stroke="grey" stroke-width="20" fill="none">
          <polygon points="
            297,132
            503,132
            620,340
            503,548
            297,548
            180,340
          "></polygon>
        </g>
      </svg>
    `;

    // SVG content for bypass open mode
    const bypassOpenSvg = `
      <svg viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="blueToRed" x1="212" y1="212" x2="588" y2="588" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="blue"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>

          <linearGradient id="redToBlue" x1="212" y1="212" x2="588" y2="588" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="red"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>

          <linearGradient id="silverToGray" x1="620" y1="340" x2="180" y2="340" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="silver"/>
            <stop offset="100%" stop-color="gray"/>
          </linearGradient>

          <marker markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" viewBox="0 0 5 5" orient="auto" id="marker1">
            <polygon points="0,5 1.6667,2.5 0,0 5,2.5" fill="red"></polygon>
          </marker>

          <marker markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" viewBox="0 0 5 5" orient="auto" id="marker2">
            <polygon points="0,5 1.6667,2.5 0,0 5,2.5" fill="blue"></polygon>
          </marker>
        </defs>

        <!-- Outer hexagon sides (scaled 1.35× around center 400,340) -->
        <g stroke="grey" stroke-width="1" fill="url(#silverToGray)">
          <polygon points="
            297,132
            503,132
            620,340
            503,548
            297,548
            180,340
          "></polygon>
        </g>

        <!-- Inner hexagon -->
        <g stroke="silver" stroke-width="1" fill="silver">
          <polygon points="
            337,176
            483,176
            573,330
            483,484
            337,484
            247,330
          "></polygon>
        </g>
        <!-- Connection lines hexagons -->
        <g>
          <line x1="337" y1="176" x2="297" y2="132" stroke="silver" stroke-width="4"></line>
          <line x1="483" y1="176" x2="503" y2="132" stroke="silver" stroke-width="4"></line>
          <line x1="573" y1="330" x2="620" y2="340" stroke="silver" stroke-width="4"></line>
          <line x1="483" y1="484" x2="503" y2="548" stroke="silver" stroke-width="4"></line>
          <line x1="337" y1="484" x2="297" y2="548" stroke="silver" stroke-width="4"></line>
          <line x1="247" y1="330" x2="180" y2="340" stroke="silver" stroke-width="4"></line>
        </g>

        <!-- Horizontal arrows for bypass open (fresh air bypasses heat exchanger) -->
        <g stroke-width="29" stroke="url(#blueToRed)" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <!-- Horizontal arrow from left to right (fresh air in) -->
          <path d="M180 340 L620 340" marker-end="url(#marker1)"></path>
          <!-- Horizontal arrow from right to left (exhaust air out) -->
          <path d="M620 340 L180 340" marker-end="url(#marker2)"></path>
        </g>

        <!-- Outer hexagon outline -->
        <g stroke="grey" stroke-width="20" fill="none">
          <polygon points="
            297,132
            503,132
            620,340
            503,548
            297,548
            180,340
          "></polygon>
        </g>
      </svg>
    `;

    // Determine which SVG to use based on bypass position
    const isBypassOpen = hass.states[config.bypass_entity]?.state === 'on';
    const selectedSvg = isBypassOpen ? bypassOpenSvg : normalSvg;
    this.innerHTML = `
      <!DOCTYPE html>
      <html>
      <head>
      <style>
        .ventilation-card {
          background: #1c1c1c;
          border-radius: 12px;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #ffffff;
          max-width: 500px;
          width: 100%;
          height: auto;
          min-height: 400px;
          margin: 0 auto;
          box-sizing: border-box;
          display: block;
        }

        .top-section {
          background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
          position: relative;
          min-height: 280px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .centre-container {
          position: absolute;
          width: 150px;
          height: 150px;
          bottom: 70px;
          left: 50%;
          transform: translateX(-50%);
          flex-shrink: 0;
          z-index: 1;
        }

        .centre {
          width: 100px;
          height: 100px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }

        .centre-inner {
          text-align: center;
          color: black;
          font-weight: 600;
        }

        .speed-display {
          font-size: 14px;
          margin-bottom: 4px;
        }

        .fanmode {
          font-size: 12px;
          font-weight: 500;
        }

        .timer-display {
          position: absolute;
          top: 15px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 12px;
          color: #333;
          font-size: 14px;
          white-space: nowrap;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          min-width: 80px;
        }

        .timer-icon {
          width: 20px; /* 0.7 * 24px (24px is the viewBox size) */
          height: 20px; /* 0.7 * 24px (24px is the viewBox size) */
          flex-shrink: 0;
        }

        .refresh-button {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #333;
          transition: all 0.3s ease;
          margin-left: 8px;
        }

        .refresh-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .refresh-button:active {
          transform: scale(0.95);
        }

        .corner-value {
          position: absolute;
          display: flex;
          flex-direction: column;
          gap: 4px;
          color: #333;
        }

        .corner-value.top-left {
          top: 20px;
          left: 20px;
          align-items: flex-start;
          text-align: left;
        }

        .corner-value.top-right {
          top: 20px;
          right: 20px;
          align-items: flex-end;
          text-align: right;
        }

        .corner-value.bottom-left {
          bottom: 20px;
          left: 20px;
          align-items: flex-start;
          text-align: left;
        }

        .corner-value.bottom-right {
          bottom: 20px;
          right: 20px;
          align-items: flex-end;
          text-align: right;
        }

        .temp-value {
          font-size: 20px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .dehum-mode,
        .dehum-active {
          font-size: 20px;
          color: #ff9800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 28px;
          font-weight: 500;
        }

        .humidity-value {
          font-size: 16px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .humidity-abs {
          font-size: 16px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .comfort-temp {
          font-size: 16px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
          color: #ff9800;
        }

        .icon-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          font-size: 20px;
        }

        .icon-circle.blue {
          background: #4a90e2;
          color: white;
        }

        .icon-circle.red {
          background: #e74c3c;
          color: white;
        }

        .airflow-diagram {
          position: absolute;
          width: 200px;
          height: 160px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 0;
        }

        .controls-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .control-row {
          display: flex;
          gap: 12px;
          justify-content: space-around;
        }

        .control-button {
          background: #2a2a2a;
          border: 2px solid #3a3a3a;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          flex: 1;
        }

        .control-button:hover {
          background: #353535;
          border-color: #4a90e2;
        }

        .control-button.active {
          background: #3a3a3a;
          border-color: #4a90e2;
        }

        .control-icon {
          font-size: 32px;
          color: #4a90e2;
        }

        .control-label {
          color: #ffffff;
          font-size: 13px;
          text-align: center;
        }
      </style>
      </head>
      <body>
        <script>
          // Store the card instance globally so it can be accessed from inline handlers
          if (!window.orconFanCardInstance) {
            window.orconFanCardInstance = this;
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
            <button class="refresh-button" onclick="refreshCard()" title="Refresh all values">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <polyline points="23,4 23,10 17,10"></polyline>
                <polyline points="1,20 1,14 7,14"></polyline>
                <path d="m3.51 9A9 9 0 0 1 14,2.5"></path>
                <path d="m20.49 15A9 9 0 0 0 10,21.5"></path>
              </svg>
            </button>
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
        console.log('🔄 Manual refresh requested by user');

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
  async refreshCard() {
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
    console.log('📏 Card dimensions:', this.offsetWidth, 'x', this.offsetHeight);
    console.log('🎨 Card styles applied, render complete');
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
      console.log('🔄 Forcing refresh of all monitored entities...');

      // Get all entities we monitor
      const entities = this.getEntities();

      // Force update each entity through Home Assistant API
      for (const entityId of entities) {
        if (entityId && this._hass.states[entityId]) {
          try {
            // Trigger state update by calling the entity service
            await this._hass.callService('homeassistant', 'update_entity', {
              entity_id: entityId
            });
          } catch (error) {
            console.warn(`Failed to update entity ${entityId}:`, error);
          }
        }
      }

      console.log('✅ Force refresh completed');
      return true;
    } catch (error) {
      console.error('Error during force refresh:', error);
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
    console.log('🔄 Manual refresh requested by user');

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

    // Make functions globally available for onclick handlers
    window.updateTimerUI = this.updateTimerUI;
    window.updateBypassUI = this.updateBypassUI;
    window.triggerRefresh = this.triggerRefresh;
    window.setBypassMode = (mode) => this.sendBypassCommand(mode);
    window.refreshCard = this.refreshCard;
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
