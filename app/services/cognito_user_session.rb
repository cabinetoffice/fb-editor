# convenience wrapper around the info we get back from Cognito
class CognitoUserSession
  include ActiveModel
  include ActiveModel::Validations

  attr_accessor :user_info, :user_id, :created_at, :new_user

  validate :email_domain_is_valid

  def initialize(params = {})
    self.user_info = params[:user_info]
    self.user_id = params[:user_id]
    self.created_at = params[:created_at]
    self.new_user = params[:new_user]
  end

  def save_to!(actual_session)
    if valid?
      save_to(actual_session)
      self
    else
      raise SignupNotAllowedError
    end
  end

  def save_to(actual_session)
    actual_session[:user_info] = user_info
    actual_session[:user_id] = user_id
    actual_session[:created_at] = Time.now.to_i
  end

  def email
    user_info.try(:[], 'info').try(:[], 'email')
  end

  def name
    user_info.try(:[], 'info').try(:[], 'name')
  end

  def new_user?
    new_user
  end

  private

  def email_domain_is_valid
    user_email = email.to_s.downcase
    errors.add(:user_info, "email must end with one of #{Rails.application.config.allowed_domains}") \
      unless Rails.application.config.allowed_domains.any? do |domain|
        URI::MailTo::EMAIL_REGEXP.match(user_email) &&
          user_email.ends_with?(domain)
      end
  end
end
