class NewPageGenerator
  include ActiveModel::Model
  include ApplicationHelper
  attr_accessor :page_type,
                :page_url,
                :component_type,
                :latest_metadata,
                :add_page_after,
                :page_uuid,
                :conditional_uuid

  STANDALONE = 'standalone'.freeze

  def to_metadata
    return page_metadata if latest_metadata.blank?

    standalone_page? ? add_standalone_page : add_flow_page
  end

  def page_metadata
    @page_metadata ||= begin
      metadata = DefaultMetadata["page.#{page_type}"]

      metadata.tap do
        metadata['_id'] = page_name
        metadata['_uuid'] = page_uuid
        metadata['url'] = page_url
        if component_type.present?
          metadata['components'].push(component)
        end
      end
    end
  end

  private

  def standalone_page?
    page_type == STANDALONE
  end

  def add_flow_page
    next_flow_object = default_next

    latest_metadata.tap do
      if adding_after_branch? && conditional_to_be_updated.present?
        conditional_to_be_updated['next'] = page_uuid
      elsif adding_after_branch?
        previous_flow_object['next']['default'] = page_uuid
      else
        latest_metadata['flow'][previous_page_uuid]['next']['default'] = page_metadata['_uuid']
      end
      latest_metadata['flow'].merge!(new_flow_page_metadata(next_flow_object))
      latest_metadata['pages'].insert(pages_index, page_metadata)
    end
  end

  def new_flow_page_metadata(default_next)
    NewFlowPageGenerator.new(
      page_uuid: page_metadata['_uuid'],
      default_next:,
      latest_metadata:
    ).to_metadata
  end

  def previous_default_next
    flow_uuid = add_page_after.presence || previous_page_uuid
    return '' if flow_uuid.nil?

    if adding_after_branch? && conditional_to_be_updated.present?
      conditional_to_be_updated['next']
    elsif adding_after_branch?
      previous_flow_object['next']['default']
    else
      latest_metadata['flow'][flow_uuid]['next']['default']
    end
  rescue NoMethodError
    Sentry.capture_message(
      "Unable to set default next. #{flow_uuid} does not exist in service flow"
    )
    ''
  end

  def add_standalone_page
    latest_metadata.tap do
      latest_metadata['standalone_pages'].push(page_metadata)
    end
  end

  def page_name
    @page_name ||= "page.#{strip_url(page_url)}"
  end

  def component
    NewComponentGenerator.new(
      component_type:,
      page_url:
    ).to_metadata
  end

  INSERT_LAST = -1

  def pages_index
    @pages_index ||= begin
      if add_page_after.present?
        index = index_to_be_inserted_after

        return index + 1 if index
      end

      INSERT_LAST
    end
  end

  def index_to_be_inserted_after
    @index_to_be_inserted_after ||=
      latest_metadata['pages'].index(page_to_be_inserted_after)
  end

  def page_to_be_inserted_after
    @page_to_be_inserted_after ||=
      latest_metadata['pages'].find { |page| page['_uuid'] == add_page_after }
  end

  def previous_page_uuid
    if pages_index == INSERT_LAST
      latest_metadata['pages'].last['_uuid']
    else
      page_to_be_inserted_after['_uuid']
    end
  end

  def default_next
    if page_metadata['_type'] == 'page.exit'
      ''
    else
      previous_default_next
    end
  end

  def adding_after_branch?
    previous_flow_object && previous_flow_object['_type'] == 'flow.branch'
  end

  def previous_flow_object
    latest_metadata['flow'][add_page_after]
  end

  def conditional_to_be_updated
    conditionals = previous_flow_object['next']['conditionals']

    conditionals.find do |conditional|
      conditional['_uuid'] == conditional_uuid
    end
  end
end
