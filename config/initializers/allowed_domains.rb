ALLOWED_DOMAINS = ENV['ALLOWED_DOMAINS'].strip.split(",").freeze
Rails.application.config.allowed_domains = ALLOWED_DOMAINS
