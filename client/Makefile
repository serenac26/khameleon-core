# command: $make APP=appname
# 				 e.g $ make APP=mosaic

ifndef APP
override APP = testapp
endif

all:
	rm -rf main
	mkdir main
	cp -dr $(APP)/* main/
	yarn install
	yarn build
