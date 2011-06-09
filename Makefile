
all:
	@coffee -bc updater.coffee

watch:
	@coffee -wbc updater.coffee

PHONY: all watch
