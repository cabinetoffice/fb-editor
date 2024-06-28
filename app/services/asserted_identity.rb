class AssertedIdentity
  include ActiveModel

  attr_accessor :uid, :provider, :name, :email

  def initialize(params = {})
    self.uid = params[:uid]
    self.provider = params[:provider]
    self.name = params[:name]
    self.email = params[:email]
  end

  def self.from_cognito_userinfo(userinfo = {})
    new(
      uid: userinfo['uid'],
      provider: userinfo['provider'],
      name: humanised_name(userinfo),
      email: userinfo['info'].try(:[], 'email')
    )
  end

  def self.humanised_name(userinfo)
    name = extract_name(userinfo)
    name.split('.').map(&:capitalize).join(' ').tr('0-9', '') if name
  end

  def self.extract_name(userinfo)
    userinfo['info'].try(:[], 'nickname') || from_email(userinfo)
  end

  def self.from_email(userinfo)
    email = userinfo['info'].try(:[], 'email')
    email[/[^@]+/] if email
  end

  def to_identity
    Identity.new(
      uid:,
      provider:,
      name:,
      email:
    )
  end
end
