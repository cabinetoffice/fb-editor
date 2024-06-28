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

    context 'when google connection' do
      let(:user_info) do
        {
          'info' => {
            'uuid' => "google-oauth2|#{SecureRandom.uuid}",
            'provider' => 'auth0',
            'name' => 'Vanya Hargreeves',
            'nickname' => 'vanya.hargreeves',
            'email' => 'vanya.hargreeves@umbrella-academy.com'
          }
        }
      end

      it 'it correctly formats the name' do
        expect(subject.from_auth0_userinfo(user_info).name).to eq('Vanya Hargreeves')
      end
    end

    context 'when azure connection' do
      let(:user_info) do
        {
          'info' => {
            'uuid' => "waad|#{SecureRandom.uuid}",
            'provider' => 'auth0',
            'name' => 'Hargreeves, Fei',
            'nickname' => 'Fei.Hargreeves',
            'email' => 'Fei.Hargreeves@sparrow-academy.com'
          }
        }
      end

      it 'correctly formats the name' do
        expect(subject.from_auth0_userinfo(user_info).name).to eq('Fei Hargreeves')
      end
    end

    context 'when there is a number in the name' do
      let(:user_info) do
        {
          'info' => {
            'uuid' => "google-oauth2|#{SecureRandom.uuid}",
            'provider' => 'auth0',
            'email' => 'Rey.Mysterio619@hurricanrana.com'
          }
        }
      end

      it 'removes numbers from the name' do
        expect(subject.from_auth0_userinfo(user_info).name).to eq('Rey Mysterio')
      end
    end
  end
end
