.PHONY: install

install:
	rsync -av --exclude='Makefile' --exclude='hacs.json' www/community/orcon-fan-card/ /home/willem/docker_files/hass/config/www/community/orcon_fan_card/
