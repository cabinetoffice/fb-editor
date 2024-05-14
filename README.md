# Fb Editor

New editor for MoJ Forms.

## Prerequisites
* Docker
* Node (version 16.20.1 LTS)
* Ruby (look at the `.ruby-version`)
* Postgresql
* Yarn

## Setup
Ensure you are running Node version 16.20.1 LTS. Easiest is to install [NVM](https://github.com/nvm-sh/nvm#installing-and-updating) and then:
`nvm install 16.20.1`
`nvm use 16.20.1`

Install gems:
`bundle`

Create and migrate the test database:
`bundle exec rails db:create db:migrate`

You might need to install postgres
`brew install postgres`
and start the database daemon
`brew services start postgres`

Copy the environment variables into your own .env file:
`cp .env.development .env`

Compile the necessary assets and run webpack (requires yarn):
`make assets`

Start the Rails server:
`bundle exec rails s`

This application talks to the [fb-metadata-api](https://github.com/ministryofjustice/fb-metadata-api) project.

You will need to run the following in the **fb-editor**:

```
docker-compose down
make setup
```
This will spin down any past Docker containers and then spin up new ones.

You should now be able to access the Editor on `localhost:3000`

## Unit tests

There are two types for ruby and JS.

Ruby rspec tests:

`bundle exec rspec`

JS tests:

`yarn run jstest`

## Acceptance tests

You need to install the Chromium web driver:

`brew install --cask chromedriver`

There are two ways to run the acceptance tests:

1. Pointing to a local editor
2. Pointing to a remote editor (a test environment for example)

Basically the acceptance tests depends to have a `.env.acceptance_tests` with
the editor url.

These use a acceptance tests specific Dockerfile found in the `acceptance` directory instead of the root level Dockerfile.

### Pointing to a local editor

There is the docker compose with all containers needed for the editor.

There are two ways of doing this locally.

1. Run `make setup`. This will spin up the necessary databases and metadata api
   app that the Editor needs. It also copies the .env.acceptance_tests.local file
   to .env.acceptance_tests. At this point you should make a decision:

ONE OF THE FOLLOWING

2. The docker-compose used by the `make setup` command will create and Editor app
   available at http://localhost:9090. By default running `bundle exec rspec acceptance`
   will target this container. This container does not run the webpack-dev-server
   command therefore you will need to run `./bin/webpack-dev-server` on your local
   machine and then any changes to the JS and assets will be reflected in the Editor
   container running on port 9090.

OR

3. You can also change the ACCEPTANCE_TESTS_EDITOR_APP variable in the
   .env.acceptance_tests file to point to http://localhost:3000 and then spin up
   the rails server locally using `bundle exec rails s` and then running
   `bundle exec rspec acceptance` will point those acceptance tests at the server
   running on port 3000. Making changes locally to the JS or assets will require
   you to run webpack-dev-server similarly to the step above: `./bin/webpack-dev-server`

OR

4. May the Force be with you. Always.

### Pointing to a remote editor

The editor has a basic authentication so it needs a user and a password.
This is already added on CircleCI but in case you want to run on your local
machine to point to the test environment you need to run:

```
  export ACCEPTANCE_TESTS_USER='my-user'
  export ACCEPTANCE_TESTS_PASSWORD='my-password'
  make acceptance-ci -s
```

### Docker Compose

For local development, run:

    make setup

which will spin up the services in the correct order.


Docker compose setup is made up of these three files:

#### docker-compose.yml

This spins up all the required apps necessary including the service token cache and a redis container.

#### docker-compose.unit-tests.yml

This is for the unit tests. It only spins up the database and the editor app.

#### docker-compose.ci.yml

This makes use of the Dockerfile in the `acceptance` directory and is used only in the deployment pipeline.


### Session duration rake task

There is a rake task that removes any sessions that have been inactive for more than 90 minutes.
This rake task is found in `lib/tasks/database.rake`.

We could not use the [built in rails session trim task](https://github.com/rails/activerecord-session_store/blob/master/lib/tasks/database.rake) as this could only be modified in days.

### Remove services script

This is for removing all services and their configuration in a given namespace.

`ruby ./lib/scripts/remove_services.rb <namespace> <target>`

For example, if the pod name for a service is `awesome-form-78b47fc858-cxgfl` and you wanted to remove it from `formbuilder-services-test-dev`:

`ruby ./lib/scripts/remove_services.rb formbuilder-services-test-dev awesome-form`

If target is not provided it will attempt to remove all services within the supplied namespace. This is temporary for now until we have a proper mechanism for removing a service and its configuration. It will not work in production namespaces, developers will need to do those by hand if required.

## API Documentation
The Editor API docs are found in the `docs` folder.

To run locally:
#### Install
1. Install [Node JS](https://nodejs.org/en/).
2. `cd` into the `docs` folder
2. Run `npm install`
#### Usage
`npm start`
Starts the reference docs preview server.

`npm run build`
Bundles the definition to the dist folder.

`npm test`
Validates the definition.

Navigate to `localhost:8080`
