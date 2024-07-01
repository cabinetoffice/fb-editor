OmniAuth.config.on_failure = Proc.new { |env|
  message_key = env['omniauth.error.type']
  error_description = Rack::Utils.escape(env['omniauth.error']&.message)
  new_path = "#{env['SCRIPT_NAME']}#{OmniAuth.config.path_prefix}/failure?error_type=#{message_key}&error_msg=#{error_description}"
  Rack::Response.new(['302 Moved'], 302, 'Location' => new_path).finish
}

Rails.application.config.middleware.use OmniAuth::Builder do
  provider(
    :cognito_idp,
    ENV['COGNITO_CLIENT_ID'],
    ENV['COGNITO_CLIENT_SECRET'],

    client_options: {
      site: ENV['COGNITO_USER_POOL_SITE']
    },
    scope: 'email openid',
    user_pool_id: ENV['COGNITO_USER_POOL_ID'],
    aws_region: ENV['AWS_REGION']
  )

  unless Rails.env.production?
    provider(
      :developer,
      fields: [:email]
    )
  end
end
