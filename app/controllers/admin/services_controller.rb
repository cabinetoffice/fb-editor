module Admin
  class ServicesController < Admin::ApplicationController
    def index
      response = MetadataApiClient::Service.all_services(
        page: page,
        per_page: per_page
      )

      @services = Kaminari.paginate_array(
        response[:services],
        total_count: response[:total_services]
      ).page(page).per(per_page)
    end

    def show
      @latest_metadata = MetadataApiClient::Service.latest_version(params[:id])
      @service = MetadataPresenter::Service.new(@latest_metadata, editor: true)
      @service_creator = User.find(@service.created_by)
      @version_creator = version_creator(@service_creator, @latest_metadata)
      @published_to_live = published(@service.service_id, 'production')
      @published_to_test = published(@service.service_id, 'dev')
      @versions = MetadataApiClient::Version.all(@service.service_id)
    end

    def create
      original_metadata = latest_version(params[:service_id])
      duplicate_name =  "#{original_metadata['service_name']} - COPY"
      service_creation = ServiceCreation.new(
        service_name: duplicate_name,
        current_user: current_user
      )

      if service_creation.create
        duplicate_version = AdminMetadataVersion.new(
          service: OpenStruct.new(service_id: service_creation.service_id),
          metadata: original_metadata.merge(duplicate_attributes(service_creation))
        ).create_version

        if duplicate_version
          flash[:success] = "#{service_creation.service_name} duplicate successfully created"
        else
          flash[:error] = service_creation.errors.full_messages.join("\n")
        end
      else
        flash[:error] = if name_taken?(service_creation)
                          "'#{original_metadata['service_name']}' has already been duplicated"
                        else
                          service_creation.errors.full_messages.join("\n")
                        end
      end

      redirect_to admin_services_path
    end

    def search_term
      params[:search] || ''
    end
    helper_method :search_term

    private

    def version_creator(service_creator, latest_metadata)
      if service_creator.id == latest_metadata['created_by']
        service_creator
      else
        User.find(latest_metadata['created_by'])
      end
    end

    def published(service_id, environment)
      PublishService.where(
        service_id: service_id,
        deployment_environment: environment
      ).completed.desc.first
    end

    def latest_version(service_id)
      MetadataApiClient::Service.latest_version(service_id)
    end

    def duplicate_attributes(service_creation)
      {
        'service_name' => service_creation.service_name,
        'service_id' => service_creation.service_id,
        'created_by' => current_user.id
      }
    end

    def name_taken?(service_creation)
      service_creation.errors.first.type == :taken
    end

    def page
      @page ||= params[:page] || 1
    end

    def per_page
      params[:per_page] || 20
    end
  end
end
