class UserPolicy
  def self.process!(userinfo, session)
    cognito_user_session = build_user_session(userinfo)

    if cognito_user_session.new_user? && cognito_user_session.valid?
      create_user!(cognito_user_session)
    end

    # raises SignupNotAllowedError if not valid, else returns
    # the oauth_user_session object
    cognito_user_session.save_to!(session)
  end

  def self.build_user_session(userinfo)
    # do we have this user already in the system?
    asserted_identity = AssertedIdentity.from_cognito_userinfo(userinfo)
    existing_user = UserService.existing_user_with(asserted_identity)

    # edge-case: if we have a user with a matching email, but
    # not the oauth identity record
    # This can happen in testing (User.create!(...) then login_as!)
    # or if an existing user un-links their oauth account, and then
    # logs in with it again
    if existing_user && !existing_user.has_identity?(asserted_identity)
      # then add the oauth identity to this user
      UserService.add_identity!(existing_user, asserted_identity)
    end

    CognitoUserSession.new(
      new_user: existing_user.blank?,
      user_id: existing_user.try(:id),
      user_info: userinfo
    )
  end

  def self.create_user!(cognito_user_session)
    new_user = UserService.create!(
      AssertedIdentity.from_cognito_userinfo(cognito_user_session.user_info)
    )
    cognito_user_session.user_id = new_user.id
    cognito_user_session.new_user = true
  end
end
