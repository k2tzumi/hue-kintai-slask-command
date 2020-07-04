.DEFAULT_GOAL := help

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.clasp.json:
	make login
	clasp create --title hue-kintai-bot --type webapp --rootDir ./src
	clasp setting fileExtension ts
	# clasp setting filePushOrder
	sed -i -e 's/}/,"filePushOrder":["src\/OAuth2Handler.ts","src\/HueClient.ts","src\/SlackBaseHandler.ts"]}/' .clasp.json

.PHONY: login
login: ## Google login
login:
	clasp login

.PHONY: push
push: ## Push Google apps scripts
push: .clasp.json
	clasp push

.PHONY: deploy
deploy: ## Deploy Google apps scripts
deploy: .clasp.json
	clasp deploy

.PHONY: open
open: ## Open Google apps scripts
open: .clasp.json
	clasp open

.PHONY: application
application: ## Open web application
application: .clasp.json
	clasp open --webapp

.PHONY: pull
pull: ## Pull Google apps scripts
pull: .clasp.json
	clasp pull

.PHONY: lint
lint: ## Run tslint
lint:
	tslint --fix src/*.ts

.PHONY: undeploy
undeploy: ## all undeploy Google apps scripts
undeploy:
	clasp undeploy --all
