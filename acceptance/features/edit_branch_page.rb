require_relative '../spec_helper'

feature 'New branch page' do
  let(:editor) { EditorApp.new }
  let(:service_name) { generate_service_name }

  background do
    given_I_am_logged_in
    given_I_have_a_service
  end

  scenario 'when editing the branch page' do
    given_I_add_all_pages_for_a_form_with_branching
    and_I_return_to_flow_page
    and_I_want_to_add_branching(1)

    then_I_should_see_the_branch_title(index: 0, title: 'Branch 1')
    then_I_should_see_the_operator(I18n.t('branches.expression.if'))
    then_I_should_not_see_text(I18n.t('branches.condition_add'))
    then_I_should_not_see_text(I18n.t('branches.condition_remove'))

    and_I_select_the_destination_page_dropdown
    and_I_choose_an_option(
      'branch[conditionals_attributes][0][next]',
      'Favourite hiking destination'
    )

    and_I_select_the_condition_dropdown
    and_I_choose_an_option(
      'branch[conditionals_attributes][0][expressions_attributes][0][component]',
      'What is your favourite hobby?'
    )
    then_I_should_see_the_add_condition_link

    and_I_select_the_otherwise_dropdown
    and_I_choose_an_option(
      'branch[default_next]',
      'Which flavours of ice cream have you eaten?'
    )

    # uncomment once missing 'Add condition' on edit pages bug is fixed
    # when_I_save_my_changes
    # then_I_should_be_on_the_correct_branch_page('edit')

    then_I_can_add_and_delete_conditionals_and_expressions

    when_I_save_my_changes
    then_I_should_see_no_errors
  end
end