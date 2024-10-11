encoded_private_key = ENV['ENCODED_PRIVATE_KEY']

Fb::Jwt::Auth.configure do |config|
  config.issuer = 'editor'
  config.namespace = "formbuilder-saas-#{ENV['PLATFORM_ENV']}"
  config.encoded_private_key = encoded_private_key.gsub('\\n', "\n") unless encoded_private_key.nil?
end
