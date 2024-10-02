FROM ruby:3.1.3-alpine3.16

ARG UID=1001

RUN apk update
RUN apk add git yarn build-base postgresql-contrib postgresql-dev \
  bash libcurl curl

RUN apk add --no-cache --repository https://dl-cdn.alpinelinux.org/alpine/v3.16/main/ nodejs
RUN apk add clamav-daemon
RUN apk add --no-cache gcompat

RUN addgroup -g ${UID} -S appgroup && \
  adduser -u ${UID} -S appuser -G appgroup

WORKDIR /app

COPY fb-metadata-presenter ../fb-metadata-presenter

RUN chown appuser:appgroup /app

ADD --chown=appuser:appgroup https://s3.amazonaws.com/rds-downloads/rds-ca-2019-root.pem ./rds-ca-2019-root.pem
ADD --chown=appuser:appgroup https://s3.amazonaws.com/rds-downloads/rds-ca-2015-root.pem ./rds-ca-2015-root.pem
RUN cat ./rds-ca-2019-root.pem > ./rds-ca-bundle-root.crt
RUN cat ./rds-ca-2015-root.pem >> ./rds-ca-bundle-root.crt
RUN chown appuser:appgroup ./rds-ca-bundle-root.crt

COPY --chown=appuser:appgroup Gemfile Gemfile.lock .ruby-version ./


RUN gem install bundler

RUN bundle config set no-cache 'true'
RUN bundle config set without 'test development'
RUN bundle config set jobs '2'
RUN bundle install

COPY --chown=appuser:appgroup . .

ENV APP_PORT 3000
EXPOSE $APP_PORT

USER ${UID}

# Govuk Publishing Components gem requires these env vars to be set, however we
# do not actually need to use them.
ENV GOVUK_APP_DOMAIN ''
ENV GOVUK_WEBSITE_ROOT ''

ARG RAILS_ENV=production
RUN yarn install --production --check-files
RUN ./bin/webpack
RUN RAILS_ENV=${RAILS_ENV} SECRET_KEY_BASE=$(bin/rake secret) bundle exec rake assets:precompile --trace
CMD rm -f tmp/pids/server.pid && bundle exec rake db:migrate:ignore_concurrent && bundle exec rails s -e ${RAILS_ENV} -p ${APP_PORT} --binding=0.0.0.0
