# All Administrate controllers inherit from this
# `Administrate::ApplicationController`, making it the ideal place to put
# authentication logic or other before_actions.
#
# If you want to add pagination or other controller-level concerns,
# you're free to overwrite the RESTful controller actions.
module Admin
  class AdminMetadataVersion
    include ActiveModel::Model
    include MetadataVersion
    attr_accessor :service, :metadata
  end

  class ApplicationController < Administrate::ApplicationController
    include SetCurrentRequestDetails
    include ApplicationHelper
    include CognitoHelper

    before_action :require_user!
    before_action :authenticate_admin

    def authenticate_admin
      redirect_to unauthorised_path unless moj_forms_dev? || moj_forms_admin?
    end

    def published(environment)
      PublishService.where(deployment_environment: environment)
                    .group_by(&:service_id)
                    .map { |p| p.last.last }
                    .select(&:published?)
    end

    def ever_published(environment)
      PublishService.where(deployment_environment: environment)
                    .group_by(&:service_id)
                    .map(&:last)
                    .map { |p| p.select(&:published?) }
                    .map(&:last)
                    .compact
    end

    # Override this value to specify the number of elements to display at a time
    # on index pages. Defaults to 20.
    # def records_per_page
    #   params[:per_page] || 20
    # end
    #
  end
end
