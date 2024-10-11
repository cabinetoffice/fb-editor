UID ?= $(shell id -u)
DOCKER_COMPOSE = env UID=$(UID) docker compose -f docker-compose.yml -f docker-compose.development.yml

.PHONY: build
build:
	$(DOCKER_COMPOSE) build --parallel
	$(DOCKER_COMPOSE) up -d

.PHONY: seed-public-key
seed-public-key:
	$(DOCKER_COMPOSE) exec editor-service-token-cache-redis redis-cli set 'encoded-public-key-editor' 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUErT3RxdVZxNGlTS1Y2eFRpYk8zcwpuVzcwQUswL0lMRy92RHQ4S05DUU5mLzQxMUQ3aCtGM0twdyt2TkFOZkhkSlRmSlVWNC9kWXo1SEhzQXhBYUc4CnF5SGlOeWN5OWNOc0hvUkNvbGQ1WnA4aUVCa1NjWE9TaDMycUtENmUwYnJ3SnZweXYwUWNIV2ZLWno0NlBCbTYKVFV4ckM2ejlud2llUFFYL3NyeUZocHpYOHNMN0QwOVF3YzFjLzQyUEhoTGt4dmNDaW9IaGozM3pUK1lPQ052SQo1UnlZUEc2bEt2bjFRU0t2U0orem9BbndQN1I3TDdjL1FpeEFEemxlQXE3SE5FaEU4cDBUME9WZWdXYTg1T3g3CmZLOWovdlp3OWJGWU9LMUNWTlFjZitWR2gyRmFncy83RDlUMG5yaFEzeEt4cEt2bmZ6Vm9xZ2EzOFY3Z1daeXQKOFFJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg=='

.PHONY: copy-env-vars-local
copy-env-vars-local:
	cp .env.acceptance_tests.local .env.acceptance_tests

.PHONY: setup
setup: build seed-public-key copy-env-vars-local

.PHONY: restart
restart:
	$(DOCKER_COMPOSE) restart

.PHONY: logs
logs:
	$(DOCKER_COMPOSE) logs editor-app

.PHONY: acceptance-specs
acceptance: setup
	bundle exec rspec acceptance

.PHONY: copy-env-vars-ci
copy-env-vars-ci:
	cp .env.acceptance_tests.ci .env.acceptance_tests

.PHONY: copy-testable-branch-env-vars-ci
copy-testable-branch-env-vars-ci:
	cp .env.acceptance_tests.testable_branch .env.acceptance_tests

.PHONY: add-env-vars-ci
add-env-vars-ci:
	echo "ACCEPTANCE_TESTS_USER=${ACCEPTANCE_TESTS_USER}" >> .env.acceptance_tests
	echo "ACCEPTANCE_TESTS_PASSWORD=${ACCEPTANCE_TESTS_PASSWORD}" >> .env.acceptance_tests

.PHONY: setup-ci
setup-ci:
	docker-compose -f docker-compose.ci.yml up -d --build editor_ci

.PHONY: acceptance-ci
acceptance-ci: copy-env-vars-ci add-env-vars-ci setup-ci
	docker-compose -f docker-compose.ci.yml run --rm editor_ci bundle exec rspec -f doc acceptance

.PHONY: assets
assets:
	yarn install
	bundle exec rails assets:precompile
	./bin/webpack
