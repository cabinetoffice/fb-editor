RSpec.describe 'GET create test service', type: :request do
  context 'when authorised user' do
    let(:request) { get "/admin/test-service/#{service_name}" }
    let(:service_name) { SecureRandom.uuid }
    let(:authorised_user) do
      double(id: SecureRandom.uuid, email: 'fb-acceptance-tests@digital.cabinet-office.gov.uk')
    end

    before do
      allow_any_instance_of(
        Admin::TestServicesController
      ).to receive(:require_user!).and_return(true)
      allow_any_instance_of(
        Admin::TestServicesController
      ).to receive(:authenticate_test_user!).and_return(true)
      allow_any_instance_of(Admin::TestServicesController).to receive(:current_user).and_return(authorised_user)
      allow(ENV).to receive(:[])
    end

    context 'when live environment' do
      before do
        allow(ENV).to receive(:[]).with('PLATFORM_ENV').and_return('live')
        request
      end

      it 'does not allow access' do
        expect(response.status).to eq(401)
      end
    end
  end

  context 'when unauthorised user' do
    let(:request) { get "/admin/test-service/#{service_name}" }
    let(:service_name) { SecureRandom.uuid }
    let(:unauthorised_user) do
      double(id: SecureRandom.uuid, email: 'steven.grant@khonshu.com')
    end

    before do
      allow_any_instance_of(
        Admin::TestServicesController
      ).to receive(:require_user!).and_return(true)
      allow_any_instance_of(Admin::TestServicesController).to receive(:current_user).and_return(unauthorised_user)
      request
    end

    it 'does not allow access' do
      expect(response.status).to eq(401)
    end
  end
end
