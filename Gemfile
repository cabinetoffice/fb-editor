source 'https://rubygems.org'
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

ruby '3.1.3'

# Metadata presenter - if you need to be on development you can uncomment
# one of these lines:
gem 'metadata_presenter',
    github: 'cabinetoffice/fb-metadata-presenter',
    branch: 'fs-branch'
# gem 'metadata_presenter', path: '/Users/arul/arul/workspace/co/ruby/fb-metadata-presenter'
# gem 'metadata_presenter', '3.4.5'
# gem 'metadata_presenter', '3.3.5'

gem 'activerecord-session_store'
gem 'administrate'
gem 'aws-sdk-s3'
gem 'aws-sdk-sesv2'
gem 'bootsnap', '>= 1.4.2', require: false
gem 'daemons'
gem 'delayed_job_active_record'
gem 'faraday'
gem 'faraday_middleware'
gem 'fb-jwt-auth', '0.10.0'
gem 'govspeak', '~> 7.1'
gem 'govuk-components'
gem 'govuk_design_system_formbuilder'
gem 'hashie'
gem 'omniauth-cognito-idp', '0.1.1'
gem 'omniauth-rails_csrf_protection', '~> 1.0.1'
gem 'pg', '>= 0.18', '< 2.0'
gem 'puma', '~> 6.4'
gem 'rails', '~> 7.0', '< 7.1'
# Use Redis for Action Cable
gem 'redis', '~> 4.0'
gem 'sass-rails', '>= 6'
gem 'sentry-delayed_job', '~> 5.14'
gem 'sentry-rails', '~> 5.14'
gem 'sentry-ruby', '~> 5.14'
gem 'turbo-rails', '~> 1.4'
gem 'tzinfo-data'
gem 'webpacker', '~> 5.4'

group :development, :test do
  gem 'brakeman'
  gem 'byebug', platforms: %i[mri mingw x64_mingw]
  gem 'capybara'
  gem 'dotenv-rails', groups: %i[development test]
  gem 'factory_bot_rails'
  gem 'rspec_junit_formatter'
  gem 'rspec-rails'
  gem 'selenium-webdriver', '4.15.0'
  gem 'shoulda-matchers'
  gem 'site_prism'
  gem 'webmock'
end

group :development do
  gem 'better_errors'
  gem 'binding_of_caller'
  gem 'listen', '~> 3.8'
  gem 'rubocop'
  gem 'rubocop-govuk'
  gem 'ruby-lsp'
  gem 'spring'
  gem 'spring-watcher-listen', '~> 2.1.0'
  gem 'web-console', '>= 3.3.0'
end
