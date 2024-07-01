class CognitoIdpController < ApplicationController
  skip_before_action :verify_authenticity_token, only: :developer_callback

  def callback
    UserPolicy.process!(user_info, session)

    redirect_to services_path,
                flash: {
                  success: I18n.t(:welcome_html, scope: %i[auth existing_user])
                }
  rescue SignupNotAllowedError
    # no new user or existing user, so they weren't allowed to sign up
    redirect_to signup_not_allowed_path
  end

  def developer_callback
    raise unless Rails.env.development?

    callback
  end

  def failure
    # show a failure page or redirect to an error page
    @error_type = request.params['error_type']
    @error_msg = request.params['message']
    flash[:error] = @error_msg
    redirect_to signup_error_path(error_type: @error_type)
  end

  def user_info
    # This stores all the user information that came from Cognito
    # and the IdP
    request.env['omniauth.auth']
  end
end
