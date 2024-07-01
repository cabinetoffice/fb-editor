RSpec.describe EmailSettings do
  subject(:email_settings) do
    described_class.new(
      params.merge(service:)
    )
  end
  let(:params) { {} }
  let(:default_subject) { email_settings.default_value('service_email_subject') }
  let(:default_body) { email_settings.default_value('service_email_body') }
  let(:default_pdf_heading) { email_settings.default_value('service_email_pdf_heading') }

  describe '#valid?' do
    context 'when send by email is ticked' do
      before do
        allow(email_settings).to receive(:send_by_email).and_return('1')
      end

      it 'does not allow non-whitelisted email domains' do
        should_not allow_values(
          'frodo@shire.org'
        ).for(:service_email_output)
      end

      it 'allows whitelisted email domains' do
        should allow_values(
          'frodo@digital.cabinet-office.gov.uk'
        ).for(:service_email_output)
      end

      it 'allows domains case insensitive' do
        should allow_values(
                 'frodo@digital.CABINET-OFFICE.gov.uk'
               ).for(:service_email_output)
      end

      it 'do not allow malformed emails' do
        should_not allow_values(
          'organa', 'leia'
        ).for(:service_email_output)
      end

      it 'do not allow blanks' do
        should_not allow_values(
          nil, ''
        ).for(:service_email_output)
      end
    end

    context 'when send by email is unticked' do
      before do
        allow(email_settings).to receive(:send_by_email).and_return('0')
      end

      it 'allows non-whitelisted email domains' do
        should allow_values(
          'frodo@shire.org'
        ).for(:service_email_output)
      end

      it 'allows malformed emails' do
        should allow_values(
          'organa', 'leia'
        ).for(:service_email_output)
      end

      it 'allow blanks' do
        should allow_values(
          nil, ''
        ).for(:service_email_output)
      end
    end

    context 'deployment environment' do
      it 'allow dev and production' do
        should allow_values('dev', 'production').for(:deployment_environment)
      end

      it 'do not allow enything else' do
        should_not allow_values(
          nil, '', 'something-else', 'staging', 'live', 'test'
        ).for(:deployment_environment)
      end
    end
  end

  describe '#service_email_output' do
    context 'when email is empty' do
      it 'returns nil' do
        expect(email_settings.service_email_output).to eq('')
      end
    end

    context 'when user submits a value' do
      let(:params) do
        { deployment_environment: 'production',
          service_email_output: 'han.solo@milleniumfalcon.uk' }
      end

      it 'shows the submitted value' do
        expect(
          email_settings.service_email_output
        ).to eq('han.solo@milleniumfalcon.uk')
      end
    end

    context 'when a value already exists in the db' do
      let(:params) { { deployment_environment: 'production' } }
      let!(:service_configuration) do
        create(
          :service_configuration,
          :production,
          :service_email_output,
          service_id: service.service_id
        )
      end

      it 'shows the value in the db' do
        expect(
          email_settings.service_email_output
        ).to eq(service_configuration.decrypt_value)
      end
    end
  end

  describe '#service_email_subject' do
    RSpec.shared_examples 'service email subject' do
      let(:deployment_environment) { 'dev' }

      context 'when subject is empty' do
        it 'shows the default value' do
          expect(email_settings.service_email_subject).to eq(default_subject)
        end
      end

      context 'when user submits a value' do
        let(:params) do
          {
            deployment_environment:,
            service_email_subject: 'Never tell me the odds.'
          }
        end

        it 'shows the submitted value' do
          expect(
            email_settings.service_email_subject
          ).to eq('Never tell me the odds.')
        end
      end

      context 'when a value already exists in the db' do
        let(:params) { { deployment_environment: 'dev' } }

        let!(:service_configuration) do
          create(
            :service_configuration,
            :service_email_subject,
            deployment_environment:,
            service_id: service.service_id
          )
        end

        it 'shows the value in the db' do
          expect(
            email_settings.service_email_subject
          ).to eq(service_configuration.decrypt_value)
        end
      end
    end

    context 'in production environment' do
      let(:deployment_environment) { 'production' }
      it_behaves_like 'service email subject'
    end
  end

  describe '#service_email_body' do
    RSpec.shared_examples 'service email body' do
      let(:deployment_environment) { 'dev' }

      context 'when body is empty' do
        it 'shows the default value' do
          expect(email_settings.service_email_body).to eq(default_body)
        end
      end

      context 'when user submits a value' do
        let(:params) do
          {
            deployment_environment:,
            service_email_body: 'Please find attached the Death star plans'
          }
        end

        it 'shows the submitted value' do
          expect(
            email_settings.service_email_body
          ).to eq('Please find attached the Death star plans')
        end
      end

      context 'when a value already exists in the db' do
        let(:params) { { deployment_environment: 'dev' } }
        let!(:service_configuration) do
          create(
            :service_configuration,
            :service_email_body,
            deployment_environment:,
            service_id: service.service_id
          )
        end

        it 'shows the value in the db' do
          expect(
            email_settings.service_email_body
          ).to eq(service_configuration.decrypt_value)
        end
      end
    end

    context 'in production environment' do
      let(:deployment_environment) { 'production' }
      it_behaves_like 'service email body'
    end
  end

  describe '#service_email_pdf_heading' do
    RSpec.shared_examples 'service email pdf heading' do
      let(:deployment_environment) { 'dev' }

      context 'when body is empty' do
        it 'shows the default value' do
          expect(email_settings.service_email_pdf_heading).to eq(default_pdf_heading)
        end
      end

      context 'when user submits a value' do
        let(:params) do
          {
            deployment_environment:,
            service_email_pdf_heading: 'Death star plans'
          }
        end

        it 'shows the submitted value' do
          expect(
            email_settings.service_email_pdf_heading
          ).to eq('Death star plans')
        end
      end

      context 'when a value already exists in the db' do
        let(:params) { { deployment_environment: } }
        let!(:service_configuration) do
          create(
            :service_configuration,
            :service_email_pdf_heading,
            deployment_environment:,
            service_id: service.service_id
          )
        end

        it 'shows the value in the db' do
          expect(
            email_settings.service_email_pdf_heading
          ).to eq(service_configuration.decrypt_value)
        end
      end
    end

    context 'in production environment' do
      let(:deployment_environment) { 'production' }
      it_behaves_like 'service email pdf heading'
    end
  end

  describe '#service_email_pdf_subheading' do
    RSpec.shared_examples 'service email pdf subheading' do
      let(:deployment_environment) { 'dev' }

      context 'when body is empty' do
        it 'shows the default value' do
          expect(email_settings.service_email_pdf_subheading).to eq('')
        end
      end

      context 'when user submits a value' do
        let(:params) do
          {
            deployment_environment:,
            service_email_pdf_subheading: 'Rebellion ships'
          }
        end

        it 'shows the submitted value' do
          expect(
            email_settings.service_email_pdf_subheading
          ).to eq('Rebellion ships')
        end
      end

      context 'when a value already exists in the db' do
        let(:params) { { deployment_environment: } }
        let!(:service_configuration) do
          create(
            :service_configuration,
            :dev,
            :service_email_pdf_subheading,
            deployment_environment:,
            service_id: service.service_id
          )
        end

        it 'shows the value in the db' do
          expect(
            email_settings.service_email_pdf_subheading
          ).to eq(service_configuration.decrypt_value)
        end
      end
    end

    context 'in production environment' do
      let(:deployment_environment) { 'production' }
      it_behaves_like 'service email pdf subheading'
    end
  end

  describe '#service_csv_output?' do
    context 'when csv is not checked' do
      let(:params) { { service_csv_output: '0' } }

      it 'returns false' do
        expect(email_settings.service_csv_output?).to be_falsey
      end
    end

    context 'when csv is checked' do
      let(:params) { { service_csv_output: '1' } }

      it 'returns true' do
        expect(email_settings.service_csv_output?).to be_truthy
      end
    end
  end

  describe '#service_csv_output_checked?' do
    context 'when service_csv_output is saved in the db' do
      let(:params) do
        {
          deployment_environment: 'dev',
          service_csv_output: '0'
        }
      end

      before do
        create(:submission_setting, :dev, :service_csv_output, service_id: service.service_id)
      end

      it 'returns true' do
        expect(email_settings.service_csv_output_checked?).to be_truthy
      end
    end

    context 'when service_csv_output is checked' do
      let(:params) { { service_csv_output: '1' } }

      it 'returns true' do
        expect(email_settings.service_csv_output_checked?).to be_truthy
      end
    end

    context 'when service_csv_output is not checked nor in the db' do
      it 'returns false' do
        expect(email_settings.service_csv_output_checked?).to be_falsey
      end
    end
  end
end
