describe AssertedIdentity do
  subject(:asserted_identity) { described_class }

  describe '#from_cognito_userinfo' do
    context 'no name in claims' do
      let(:user_info) do
        {
          'uid' => SecureRandom.uuid,
          'provider' => 'provider',
          'info' => {
            'email' => email_address
          }
        }
      end

      context 'two names in email address' do
        let(:email_address) { 'riri.williams@stark-industries.com' }

        it 'uses the email to create the name' do
          expect(subject.from_cognito_userinfo(user_info).name).to eq('Riri Williams')
        end
      end

      context 'more than two names in email address' do
        let(:email_address) { 'jean.luc.picard@ncc1701d.com' }

        it 'uses the email to create the name' do
          expect(subject.from_cognito_userinfo(user_info).name).to eq('Jean Luc Picard')
        end
      end
    end
  end
end
