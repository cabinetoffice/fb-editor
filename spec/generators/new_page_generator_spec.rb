RSpec.describe NewPageGenerator do
  subject(:generator) do
    described_class.new(
      page_type: page_type,
      page_url: page_url,
      component_type: component_type,
      latest_metadata: latest_metadata
    )
  end

  describe '#to_metadata' do
    let(:valid) { true }
    let(:page_type) { 'singlequestion' }
    let(:page_url) { 'home-one' }
    let(:component_type) { 'text' }

    before do
      allow(SecureRandom). to receive(:uuid).and_return('mandalorian-123')
    end

    context 'when only start page exists' do
      let(:latest_metadata) { metadata_fixture(:service) }

      it 'creates a valid page metadata' do
        expect(
          MetadataPresenter::ValidateSchema.validate(
            generator.page_metadata, "page.#{page_type}"
          )
        ).to be(valid)
      end

      it 'create valid update service metadata' do
        expect(
          MetadataPresenter::ValidateSchema.validate(
            generator.to_metadata, 'service.base'
          )
        ).to be(valid)
      end

      it 'generates page attributes' do
        expect(generator.to_metadata['pages']).to_not be_blank
        expect(generator.to_metadata['pages'].last).to include(
          'url' => page_url,
          '_uuid' => 'mandalorian-123'
        )
      end

      it 'generates the new component metadata' do
        generated_page = generator.to_metadata['pages'].last
        expect(generated_page['components']).to_not be_blank
        expect(generated_page['components'].last).to include(
          '_type' => component_type
        )
      end

      it 'adds the new page to the steps' do
        expect(generator.to_metadata['pages'][0]['steps']).to include("page.#{page_url}")
      end
    end

    context 'when existing pages exist' do
      let(:latest_metadata) { metadata_fixture(:version) }

      context 'generating valid metadata' do
        context 'pages with components' do
          %w(singlequestion).each do |page|
            context "when #{page} page" do
              let(:page_type) { page }
              let(:component_type) { 'text' }

              it 'creates a valid page metadata' do
                expect(
                  MetadataPresenter::ValidateSchema.validate(
                    generator.page_metadata, "page.#{page_type}"
                  )
                ).to be(valid)
              end
            end
          end
        end

        context 'pages without components' do
          %w(multiplequestions checkanswers confirmation).each do |page|
            context "when #{page} page" do
              let(:page_type) { page }
              let(:component_type) { nil }

              it 'creates a valid page metadata' do
                expect(
                  MetadataPresenter::ValidateSchema.validate(
                    generator.page_metadata, "page.#{page_type}"
                  )
                ).to be(valid)
              end
            end
          end
        end
      end

      it 'generates page attributes' do
        expect(generator.to_metadata['pages']).to_not be_blank
        expect(generator.to_metadata['pages'].last).to include(
          'url' => page_url,
          '_id' => 'page.home-one',
          '_type' => 'page.singlequestion',
          'heading' => 'Question',
          'lede' => 'This is the lede',
          'body' => 'Body section',
          'components' => [
            {
              '_id'    => "#{page_url}_#{component_type}_1",
              '_type'  => 'text',
              'errors' => {},
              'hint'   => '[Optional hint text]',
              'label'  => 'Question',
              'name'   => "#{page_url}_#{component_type}_1",
              'validation' => {
                'required' => true
              }
            }
          ]
        )
      end
    end
  end
end
