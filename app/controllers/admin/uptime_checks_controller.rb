require Rails.root.join('app', 'services', 'uptime', 'adapters', 'pingdom')

module Admin
  class UptimeChecksController < Admin::ApplicationController
    def index
      @without_checks = services_without_uptime_checks
      @with_checks = with_uptime_checks
      @legacy_checks = non_editor_service_checks
    end

    def create
      service_id = params[:id]
      latest_metadata = MetadataApiClient::Service.latest_version(service_id)
      service = MetadataPresenter::Service.new(latest_metadata, editor: true)
      Uptime.new(
        service_id: service.service_id,
        service_name: service.service_name,
        host: "#{service.service_slug}.#{url_root}",
        adapter: adapter
      ).create

      redirect_to admin_uptime_checks_path
    end

    def destroy
      Uptime.new(check_id: params[:id], adapter: adapter).destroy

      redirect_to admin_uptime_checks_path
    end

    def services_without_uptime_checks
      without_uptime_checks.map do |uuid|
        latest_metadata = MetadataApiClient::Service.latest_version(uuid)
        MetadataPresenter::Service.new(latest_metadata, editor: true)
      end
    end

    def without_uptime_checks
      @without_uptime_checks ||=
        published_services_uuids.reject { |uuid| uuid.in?(uptime_check_tag_uuids) }.uniq
    end

    def with_uptime_checks
      @with_uptime_checks ||= uptime_checks.select do |check|
        check['tags'].any? do |tag|
          tag['name'].in?(published_services_uuids)
        end
      end
    end

    def uptime_check_tag_uuids
      @uptime_check_tag_uuids ||=
        with_uptime_checks.map { |c| c['tags'].map { |t| t['name'] } }.flatten
    end

    def uptime_checks
      @uptime_checks ||= Uptime::Adapters::Pingdom.new.checks
    end

    def published_services_uuids
      @published_services_uuids ||=
        PublishService.production
                      .completed
                      .select('distinct(service_id)')
                      .pluck(:service_id)
    end

    def non_editor_service_checks
      existing_check_ids = with_uptime_checks.map { |c| c['id'] }
      checks = uptime_checks.reject do |check|
        check['id'].in?(existing_check_ids) ||
          check['tags'].any? do |tag|
            tag.in?(with_uptime_checks) || tag.in?(without_uptime_checks)
          end
      end

      checks.sort_by { |check| check['name'] }
    end

    def url_root
      Rails.application.config.platform_environments[ENV['PLATFORM_ENV']][:url_root]
    end

    def adapter
      Uptime::Adapters::Pingdom
    end
  end
end
