require_relative '../spec_helper'

feature 'New branch page' do
  let(:editor) { EditorApp.new }
  let(:service_name) { generate_service_name }

  background do
    given_I_am_logged_in
    given_I_have_a_service
  end

  scenario 'when all required fields are filled in' do
    given_I_add_all_pages_for_a_form_with_branching
    and_I_return_to_flow_page
    and_I_want_to_add_branching(1)

    then_I_should_be_on_the_correct_branch_page('new')

    and_I_select_the_destination_page_dropdown
    then_I_should_see_the_correct_number_of_options(
      '#branch_conditionals_attributes_0_next',
      8
    )
    and_I_choose_an_option(
      'branch[conditionals_attributes][0][next]',
      'Favourite hiking destination'
    )

    and_I_select_the_condition_dropdown
    then_I_should_see_the_correct_number_of_options(
      '#branch_conditionals_attributes_0_expressions_attributes_0_component',
      5
    )
    and_I_choose_an_option(
      'branch[conditionals_attributes][0][expressions_attributes][0][component]',
      'What is your favourite hobby?'
    )
    then_I_should_see_statement_answers

    and_I_select_the_operator_dropdown
    and_I_choose_an_option(
      'branch[conditionals_attributes][0][expressions_attributes][0][operator]',
      'is answered'
    )

    and_I_select_the_field_dropdown
    then_I_should_see_the_correct_number_of_options(
      '#branch_conditionals_attributes_0_expressions_attributes_0_field',
      2
    )
    and_I_choose_an_option(
      'branch[conditionals_attributes][0][expressions_attributes][0][field]',
      'Hiking'
    )

    and_I_select_the_otherwise_dropdown
    then_I_should_see_the_correct_number_of_options(
      '#branch_default_next',
      8
    )
    and_I_choose_an_option(
      'branch[default_next]',
      'Which flavours of ice cream have you eaten?'
    )

    when_I_save_my_changes
    then_I_should_be_on_the_correct_branch_page('edit')
    then_I_should_see_previous_saved_choices(
      'branch[conditionals_attributes][0][expressions_attributes][0][operator]',
      'is answered'
    )
    then_I_should_see_previous_saved_choices(
      'branch[conditionals_attributes][0][expressions_attributes][0][field]',
      'Hiking'
    )
    then_I_should_see_no_errors
  end

  def then_I_should_be_on_the_correct_branch_page(path)
    expect(URI(current_url).path.split('/').last).to eq(path)
  end

  def then_I_should_see_previous_saved_choices(attribute, selected)
    expect(page).to have_select(attribute, selected: selected)
  end

  def then_I_should_see_no_errors
    expect(page).not_to have_selector('.govuk-error-summary')
  end
end