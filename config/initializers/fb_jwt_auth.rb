
encoded_private_key = ENV['ENCODED_PRIVATE_KEY']

Fb::Jwt::Auth.configure do |config|
  config.issuer = 'form-builder-editor'
  config.namespace = 'form-builder'
  config.encoded_private_key = encoded_private_key.gsub('\\n', "\n") unless encoded_private_key.nil?
end
