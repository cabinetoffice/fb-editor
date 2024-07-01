require_relative '../support/data_content_id'
require_relative '../sections/conditional_content_modal_section'
require_relative '../sections/branches_section'

class EditorApp < SitePrism::Page
  extend DataContentId

  if ENV['ACCEPTANCE_TESTS_USER'] && ENV['ACCEPTANCE_TESTS_PASSWORD']
    set_url sprintf(ENV['ACCEPTANCE_TESTS_EDITOR_APP'], user: ENV['ACCEPTANCE_TESTS_USER'], password: ENV['ACCEPTANCE_TESTS_PASSWORD'])
  else
    set_url ENV['ACCEPTANCE_TESTS_EDITOR_APP']
  end

  # landing page
  element :sign_in_button, :button, 'Sign in'
  ########

  # localhost
  element :sign_in_email_field, :field, 'Email:'
  element :sign_in_submit, :button, 'Sign In'
  ########

  # Cognito
  # currently not used as we are interacting with the fields using JS
  # these will be used again in the future
  element :email_address_field, :field, 'Email'
  element :password_field, :field, 'Password'
  element :login_continue_button, :button, 'Log In'
  ########

  # Your forms
  element :service_name, '#form-navigation-heading'
  element :name_field, :field, I18n.t('activemodel.attributes.service_creation.service_name')
  element :create_service_button, :button, I18n.t('services.create')
  # End Your forms

  # Pages flow
  element :footer_pages_link, 'button', text: I18n.t('pages.footer')
  element :cookies_link, :link, 'Cookies', class: 'govuk-link'
  element :privacy_link, :link, 'Privacy', class: 'govuk-link'

  element :pages_link, :link, I18n.t('pages.name')
  element :publishing_link, :link, I18n.t('publish.name')
  element :settings_link, :link, I18n.t('settings.name')
  element :form_details_link, :link, I18n.t('settings.form_name.heading')
  element :save_button, :button, I18n.t('actions.save')
  element :preview_form_button, :link, I18n.t('actions.preview_form')
  element :edit_page_button, :link, I18n.t('actions.edit_page')

  element :submission_settings_link, :link, I18n.t('settings.submission.heading')
  element :send_data_by_email_link, :link, I18n.t('settings.collection_email.heading')
  element :send_confirmation_email_link, :link, I18n.t('settings.confirmation_email.heading')

  element :page_url_field, :field, I18n.t('activemodel.attributes.page_creation.page_url')
  element :new_page_form, '#new_page', visible: false

  element :add_page, :button, I18n.t('pages.create')
  element :add_single_question, 'span', text: I18n.t('actions.add_single_question'), visible: true
  element :add_multiple_question,
          :xpath,
          "//*[@role='menuitem' and contains(.,'#{I18n.t('actions.add_multi_question')}')]"
  element :add_check_answers,
          :xpath,
          "//*[@role='menuitem' and contains(.,'#{I18n.t('actions.add_check_answers')}')]"
  element :add_confirmation,
          :xpath,
          "//*[@role='menuitem' and contains(.,'#{I18n.t('actions.add_confirmation')}')]"
  element :add_content_page,
          :xpath,
          "//*[@role='menuitem' and contains(.,'#{I18n.t('actions.add_content')}')]"
  element :add_exit,
          :xpath,
          "//*[@role='menuitem' and contains(.,'#{I18n.t('actions.add_exit')}')]"

  element :add_a_component_button, :link, I18n.t('components.actions.add_component')
  element :question_component,
          :xpath,
          "//*[@role='menuitem' and contains(.,'Question')]"
  element :content_component,
          :xpath,
          "//*[@role='menuitem' and contains(.,'Content area')]"

  element :question_three_dots_button, '.ActivatedMenuActivator', visible: true
  element :required_question,
          :xpath,
          "//*[@role='menuitemcheckbox' and contains(.,'Required...')]"
  element :autocomplete_options,
          :xpath,
          "//*[@role='menuitem' and contains(.,'Autocomplete options...')]"

  elements :add_page_submit_button, :button, I18n.t('pages.create')
  elements :form_pages, '#flow-overview .flow-item'
  elements :form_urls, '#flow-overview .flow-item a.govuk-link'
  elements :flow_items, '#flow-overview .flow-item', visible: true
  elements :preview_page_images, '#flow-overview .flow-item .flow-thumbnail', visible: true

  def page_flow_items(html_class = '#flow-overview .flow-thumbnail')
    find('#main-content', visible: true)
    preview_page_images.map do |page_flow|
      page_flow.text.gsub("Edit:\n", '')
    end
  end

  element :three_dots_button, '.flow-menu-activator'
  element :preview_page_link, :link, I18n.t('actions.preview_page')
  element :add_page_here_link, :link, I18n.t('actions.add_page')
  element :move_page_link, :link, I18n.t('actions.move_page')
  element :delete_page_link, :link, I18n.t('actions.delete_page')
  element :delete_page_modal_button, :button, I18n.t('dialogs.button_delete'), visible: true
  element :branching_link, :link, I18n.t('actions.add_branch')
  element :change_destination_link, :link, I18n.t('actions.change_destination')
  element :change_next_page_button, :button, I18n.t('dialogs.destination.button_change')

  def main_flow_titles
    flow_titles(main_flow)
  end

  def unconnected_flow
    flow_titles(detached_flow)
  end

  def flow_titles(flow_items)
    find('#main-content', visible: true)
    flow = flow_items.map { |element| element.first('.text').text }
    flow.flatten.reject do |title|
      title == I18n.t('pages.create') || title == I18n.t('pages.actions')
    end
  end

  def flow_thumbnail(title)
    preview_page_images.find { |p| p.find('.title').text.include?(title) }
  end

  def flow_article(title)
    flow_items.find { |p| p.first('.text').text.include?(title) } 
  end

  def connection_menu(title)
    flow_article(title).find('.connection-menu-activator')
  end

  def add_component(type)
    add_single_question.hover
    find('[role="menuitem"]', exact_text: type, visible: true)
  end

  def click_branch(branch_title)
    page_flow_item('.flow-branch', branch_title).click
  end

  def hover_branch(branch_title)
    hover_page_flow('.flow-branch', content: branch_title)
  end

  def hover_page_flow(html_class, content:)
    page_flow_item(html_class, content).hover
  end

  def page_flow_item(html_class, content)
    page.all(html_class).find do |element|
      element.text.include?(content)
    end
  end

  def unconnected_expand_link
    page.all('Expander_Activator').find do |element|
      element.text == 'Unconnected'
    end
  end
  # End pages flow

  element :save_page_button,  '#fb-editor-save'

  elements :radio_options, :xpath, '//input[@type="radio"]', visible: false
  elements :checkboxes_options, :xpath, '//input[@type="checkbox"]', visible: false

  elements :question_heading, 'h1'
  elements :component_heading, 'h2'
  elements :all_hints, '.govuk-hint'
  elements :editable_options, '.EditableComponentCollectionItem label'
  element :question_hint, '.govuk-hint'
  element :section_heading_hint, '.fb-section_heading'
  data_content_id :section_heading, 'page[section_heading]'
  data_content_id :page_heading, 'page[heading]'
  data_content_id :page_lede, 'page[lede]'
  data_content_id :page_body, 'page[body]'
  data_content_id :page_before_you_start, 'page[before_you_start]'
  data_content_id :page_send_heading, 'page[send_heading]'
  data_content_id :page_send_body, 'page[send_body]'

  elements :add_content_area_buttons, :link, 'Add content area'
  data_content_id :first_component, 'page[components[0]]'
  data_content_id :second_component, 'page[components[1]]'
  data_content_id :first_extra_component, 'page[extra_components[0]]'
  elements :editable_content_areas, 'editable-content[data-config]'
  element :last_editable_content_area, 'editable-content[data-config]:last-of-type'

  def content_area(content)
    editable_content_areas.select { |a| a.text.include?(content) }
  end

  element :add_condition, :button, I18n.t('branches.condition_add')
  element :remove_condition_button, :button, I18n.t('dialogs.button_delete_condition') # dialog confirmation button
  element :add_another_branch, :button, I18n.t('branches.branch_add')
  element :conditional_three_dot, :button, '.ActivatedMenuActivator'
  element :remove_branch_button, :button, I18n.t('dialogs.button_delete_branch')

  element :destination_options, '#branch_conditionals_attributes_0_next'
  element :conditional_options, '#branch_conditionals_attributes_0_expressions_attributes_0_component'
  element :operator_options, '#branch_conditionals_attributes_0_expressions_attributes_0_operator'
  element :field_options, '#branch_conditionals_attributes_0_expressions_attributes_0_field'
  element :otherwise_options, '#branch_default_next'

  # There are times we need two branches in the same branching point
  element :second_destination_options, '#branch_conditionals_attributes_1_next'
  element :second_conditional_options, '#branch_conditionals_attributes_1_expressions_attributes_0_component'
  element :second_operator_options, '#branch_conditionals_attributes_1_expressions_attributes_0_operator'
  element :second_field_options, '#branch_conditionals_attributes_1_expressions_attributes_0_field'

  element :delete_branch_link, :link, I18n.t('actions.delete_branch')
  element :delete_branching_point_button, :button, I18n.t('branches.delete_modal.submit')
  element :delete_and_update_branching_link, :button, I18n.t('pages.delete_modal.delete_and_update_branching')

  elements :main_flow, '#flow-overview .flow-item'
  elements :detached_flow, '.flow-detached-group .flow-item'

  # publisher tabs
  element :dev_tab, :link, 'Publish to Test'
  element :production_tab, :link, 'Publish to Live', match: :first
  element :publish_for_review, :button, I18n.t('publish.publish_for_review.button')

  def edit_service_link(service_name)
    find("#service-#{service_name.parameterize} .edit")
  end

  def modal_create_service_button
    within('[data-component="FormCreateDialog"]') do
      all('button[type="submit"]').first
    end
  end

  def branch_title(index)
    find("section[data-conditional-index='#{index}'] h3")
  end

  # When two BranchConditions visible we have two BranchRemover (bin icons) available
  def last_condition_remover
    all('.expression__remover').last
  end

  section :branches, BranchesSection, '.branches'

  element :show_if_link, 'span', text: I18n.t('content.menu.show_if')
  element :show_if_button, :button, text: I18n.t('conditional_content.show_if_button_label')
  section :conditional_content_modal, ConditionalContentModalSection, '#conditional_content_dialog'

  element :conditional_content_notice, '.govuk-notification-banner', text: I18n.t('presenter.conditional_content.notification')

end
