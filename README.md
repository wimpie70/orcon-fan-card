# Orcon Fan Card

A custom Lovelace card for controlling and monitoring Orcon ventilation systems with dynamic airflow visualization.

## Features

- Real-time display of indoor/outdoor temperatures, humidity, fan speed, and more
- Controls<sup>(1)</sup> fan modes (Away, Auto, Dehumidify), speeds (Low, Medium, High), and timers (15m, 30m, 60m)
- Bypass control<sup>(1)</sup> (Auto, Close, Open) with visual airflow diagram that changes based on state
- Efficiency calculation based on temperature differences
- Absolute humidity calculation based on temperature and relative humidity
- Dehumidifier<sup>(2)</sup> control, and indicators
- Comfort temperature
- Configuration Settings (2411)

<sup>(1)</sup> Controls require a bound REM device defined for the FAN device. (config_flow)  
<sup>(2)</sup> Dehumidifier requires an automation and helpers to be installed (TODO: link)


TODO:
## Installation via HACS

1. Add this repository to HACS as a custom repository.
2. Search for "Orcon Fan Card" and install.
3. Add the card to your Lovelace dashboard.

## Manual Installation

1. Copy the files from `www/community/orcon-fan-card/` to `config/www/community/orcon-fan-card/`.
2. Add the card to your Lovelace dashboard.

## Configuration

Add to your Lovelace dashboard:

```yaml
type: custom:orcon-fan-card
device_id: "32:153289"  # Your Ramses CC device ID
bypass_entity: binary_sensor.32_153289_bypass_position  # Auto-detected
# Other optional entities...
```
