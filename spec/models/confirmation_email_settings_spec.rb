RSpec.describe ConfirmationEmailSettings do
  subject(:confirmation_email_settings) do
    described_class.new(
      params.merge(service:)
    )
  end
  let(:params) { {} }
  let(:confirmation_email_subject) { confirmation_email_settings.default_value('confirmation_email_subject') }
  let(:confirmation_email_body) { confirmation_email_settings.default_value('confirmation_email_body') }

  describe '#valid?' do
    context 'when send by confirmation email is ticked' do
      before do
        allow(confirmation_email_settings).to receive(:send_by_confirmation_email).and_return('1')
      end

      it 'allow email questions' do
        should allow_values(
          'email_question_1', 'email_question_2'
        ).for(:confirmation_email_component_id)
      end

      it 'allow emails' do
        should allow_values(
                 'frodo@cabinetoffice.gov.uk'
               ).for(:confirmation_email_reply_to)
      end

      it 'do not allow malformed emails' do
        should_not allow_values(
          'organa', 'leia'
        ).for(:confirmation_email_reply_to)
      end

      it 'do not allow blanks' do
        should_not allow_values(
          nil, ''
        ).for(:confirmation_email_reply_to)
      end
    end

    context 'when send by confirmation email is unticked' do
      before do
        allow(confirmation_email_settings).to receive(:send_by_confirmation_email).and_return('0')
      end

      it 'allow any questions' do
        should allow_values(
          'email_question_any', 'question_other'
        ).for(:confirmation_email_component_id)
      end

      it 'allows non-whitelisted email domains' do
        should allow_values(
          'frodo@shire.org'
        ).for(:confirmation_email_reply_to)
      end

      it 'allow malformed emails' do
        should allow_values(
          'organa', 'leia'
        ).for(:confirmation_email_reply_to)
      end

      it 'allow blanks' do
        should allow_values(
          nil, ''
        ).for(:confirmation_email_reply_to)
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

  describe '#confirmation_email_subject' do
    RSpec.shared_examples 'confirmation email subject' do
      let(:deployment_environment) { 'dev' }

      context 'when subject is empty' do
        it 'shows the default value' do
          expect(confirmation_email_settings.confirmation_email_subject).to eq(confirmation_email_subject)
        end
      end

      context 'when user submits a value' do
        let(:params) do
          {
            deployment_environment:,
            confirmation_email_subject: 'Never tell me the odds.'
          }
        end

        it 'shows the submitted value' do
          expect(
            confirmation_email_settings.confirmation_email_subject
          ).to eq('Never tell me the odds.')
        end
      end

      context 'when a value already exists in the db' do
        let(:params) { { deployment_environment: } }
        let!(:service_configuration) do
          create(
            :service_configuration,
            :dev,
            :confirmation_email_subject,
            service_id: service.service_id
          )
        end

        it 'shows the value in the db' do
          expect(
            confirmation_email_settings.confirmation_email_subject
          ).to eq(service_configuration.decrypt_value)
        end
      end
    end

    context 'in production environment' do
      let(:deployment_environment) { 'production' }
      it_behaves_like 'confirmation email subject'
    end
  end

  describe '#confirmation_email_body' do
    RSpec.shared_examples 'confirmation email body' do
      let(:deployment_environment) { 'dev' }

      context 'when body is empty' do
        it 'shows the default value' do
          expect(confirmation_email_settings.confirmation_email_body).to eq(confirmation_email_body)
        end
      end

      context 'when user submits a value' do
        let(:params) do
          {
            deployment_environment:,
            confirmation_email_body: 'Ogres are like onions.'
          }
        end

        it 'shows the submitted value' do
          expect(
            confirmation_email_settings.confirmation_email_body
          ).to eq('Ogres are like onions.')
        end
      end

      context 'when a value already exists in the db' do
        let(:params) { { deployment_environment: } }
        let!(:service_configuration) do
          create(
            :service_configuration,
            :dev,
            :confirmation_email_body,
            service_id: service.service_id
          )
        end

        it 'shows the value in the db' do
          expect(
            confirmation_email_settings.confirmation_email_body
          ).to eq(service_configuration.decrypt_value)
        end
      end
    end

    context 'in production environment' do
      let(:deployment_environment) { 'production' }
      it_behaves_like 'confirmation email body'
    end
  end

  describe '#email_component_ids' do
    context 'when there are no email components' do
      let(:service) { MetadataPresenter::Service.new(metadata_fixture(:exit_only_service)) }
      it 'should return an empty array' do
        expect(confirmation_email_settings.email_component_ids).to eq([])
      end
    end

    context 'when there are an email components' do
      let(:service) { MetadataPresenter::Service.new(metadata_fixture(:branching_12)) }
      it 'returns the component ids' do
        expect(confirmation_email_settings.email_component_ids).to eq(%w[email_email_1 multi2_email_1])
      end
    end
  end
end
