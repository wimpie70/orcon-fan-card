# Orcon Fan Card

A custom Lovelace card for controlling and monitoring Orcon ventilation systems with dynamic airflow visualization.

## Features

- Real-time display of indoor/outdoor temperatures, humidity, fan speed, and more
- Control fan modes (Away, Auto, Dehumidify), speeds (Low, Medium, High), and timers (15m, 30m, 60m)
- Bypass control (Auto, Close, Open) with visual airflow diagram that changes based on state
- Dehumidifier mode and comfort temperature display
- Manual refresh button for forcing entity updates
- Responsive design for various screen sizes

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

## Development

- Run `make install` to copy files to your HA instance.
- Edit files in `www/community/orcon-fan-card/`.
