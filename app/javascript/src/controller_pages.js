/**
 * Pages Controller
 * ----------------------------------------------------
 * Description:
 * Adds functionality required to enhance FB Editor form pages with editable components.
 *
 * Documentation:
 *
 *     - Requires jQuery & jQueryUI
 *       https://api.jquery.com/
 *       https://api.jqueryui.com/
 *
 **/


const {
  updateHiddenInputOnForm,
  stringInject,
} = require('./utilities');

const {
  htmlAdjustment,
  markdownAdjustment
} = require('./shared/content');

const ActivatedMenu = require('./components/menus/activated_menu');
const ContentMenu = require('./components/menus/content_menu');
const editable_components = require('./editable_components');
const EditableElement = editable_components.EditableElement;
const Content = require('./content');
const SubmitHandler = require('./submit_handler');

const CheckboxesQuestion = require('./question_checkboxes');
const RadiosQuestion = require('./question_radios');
const DateQuestion = require('./question_date');
const TextQuestion = require('./question_text');
const TextareaQuestion = require('./question_textarea');
const AutocompleteQuestion = require('./question_autocomplete');

const Dialog = require('./component_dialog');
const DialogApiRequest = require('./component_dialog_api_request');
const DialogForm = require('./component_dialog_form');
const DefaultController = require('./controller_default');
const ServicesController = require('./controller_services');
const Expander = require('./component_expander');

const ATTRIBUTE_DEFAULT_TEXT = "fb-default-text";


class PagesController extends DefaultController {
  constructor(app) {
    super(app);

    switch (app.page.action) {
      case "edit":
        PagesController.edit.call(this);
        break;
      case "create":
        PagesController.create.call(this);
        break;
    }
  }

  updateComponents() {
    $(".fb-editable").each(function() {
      $(this).data("instance") ? $(this).data("instance").save() : $(this).get(0).save();
    });
  }
}

/* ------------------------------
 * Setup for the Edit action view
 * ------------------------------ */
PagesController.edit = function() {
  var view = this;
  var $form = $("#editContentForm");


  this.$editable = $(".fb-editable");
  this.saveButton = document.querySelector('button[is="save-button"]')
  this.dialogConfiguration = createDialogConfiguration.call(this);


  workaroundForDefaultText(view);
  enhanceContent(view);
  enhanceQuestions(view);

  // Handle page-specific view customisations here.
  switch (view.type) {
    case "page.multiplequestions":
      editPageMultipleQuestionsViewCustomisations.call(view);
      break;

    case "page.repeatablepage":
      editPageContentViewCustomisations.call(view);
      break;
    
    case "page.singlequestion":
      editPageSingleQuestionViewCustomisations.call(view);
      break;

    case "page.content":
      editPageContentViewCustomisations.call(view);
      break;

    case "page.confirmation":
      // No customisations required for this view.
      editPageConfirmationViewCustomisations(view);
      break;

    case "page.checkanswers":
      editPageCheckAnswersViewCustomisations.call(view);
      break;
  }

  // Enhance any Add Content buttons
  $("[data-component=add-content]").each(function() {
    var $node = $(this);
    new AddContent($node, { form: view.saveButton.$form, view: view });
  });

  // Enhance any Add Component buttons.
  view.$document.on("AddComponentMenuSelection", AddComponent.MenuSelection.bind(view));
  $("[data-component=add-component]").each(function() {
    var $node = $(this);
    new AddComponent($node, { form: view.saveButton.$form });
  });

  // Setting focus for editing.
  focusOnEditableComponent.call(view);


  // Bind listeners
  // --------------

  addQuestionMenuListeners(view);
  addContentMenuListeners(view);
  addEditableComponentItemMenuListeners(view);

  this.$document.on("SaveRequired", () => this.saveButton.saveRequired = true);
  this.$document.on("MaxFilesSave", () => this.saveButton.save());
  this.saveButton.$form.on("submit", () => this.updateComponents());

  // Bit hacky: Cookies page is going through this controller but content is static.
  // The static content is wrapped in [fb-content-type=static] to help identify it.
  // We need to identify it to run same HTML adjustments that we do in the Runner
  // and presenter to support some GovUK styles in content. Doing that here.
  supportGovUkStaticContent();

}


/* --------------------------------
 * Setup for the Create action view
 * -------------------------------- */
PagesController.create = function() {
  // Actually uses the Services controller due to view redirect on server.
  ServicesController.edit.call(this);
}




/* Gives add component buttons functionality to select a component type
 * from a drop menu, and update the 'save' form by activation of a
 * global document event.
 * (see addComponentMenuSelection function)
 **/
class AddComponent {
  constructor($node) {
    var $list = $node.find("> ul");
    var $button = $node.find("> a");

    this.$list = $list;
    this.$button = $button;
    this.menu = new ActivatedMenu($list, {
      selection_event: "AddComponentMenuSelection",
      preventDefault: true, // Stops the default action of triggering element.
      activator: $button,
      menu: {
        position: { at: "left top" }
      }
    });

    $node.addClass("AddComponent");
  }
}


/* Handle item selections on the AddComponent context menu elements.
 **/
AddComponent.MenuSelection = function(event, data) {
  var action = data.activator.data("action");
  if (action != "none") {
    updateHiddenInputOnForm(this.saveButton.$form, "page[add_component]", action);
    this.saveButton.save();
  }
}


/* Gives add content buttons functionality to update the 'save' form.
 **/
class AddContent {
  constructor($node, config) {
    var $button = $node.find("> a");
    var fieldname = $node.data("fb-field-name") || "page[add_component]";
    this.$button = $button;
    this.$node = $node;
    this.saveButton = config.view.saveButton;

    $button.on("click.AddContent", () => {
      updateHiddenInputOnForm(config.form, fieldname, "content");
      this.saveButton.save();
    });



    $node.addClass("AddContent");
  }
}


/* Question Menu needs to interact with Dialog components before
 * running any action, so we need to work with listeners to coordinate
 * between different component/widgets/functionality, etc.
 **/
function addQuestionMenuListeners(view) {
  var templateContent = $("[data-component-template=QuestionPropertyFields]").html();

  // QuestionMenuSelectionRemove
  view.$document.on("QuestionMenuSelectionRemove", function(event, question) {
    var questionUuid = question.data._uuid;
    var apiUrl = question.menu.selectedItem.data('apiPath').replace('question_uuid', questionUuid);

    new DialogApiRequest(apiUrl, {
      activator: question.menu.selectedItem,
      closeOnClickSelector: ".govuk-button",

      onLoad: function(dialog) {
        // Find and correct (make work!) any method:delete links
        dialog.$node.find("[data-method=delete]").on("click", function(e) {
          e.preventDefault();
          // Workaround solution that doesn't require extra backend work
          // 1. First remove component from view
          question.$node.hide();
          // 2. Update form (in case anything else has changed)
          view.updateComponents();
          // 3. Remove corresponding component from form
          question.remove();
          // 4. Trigger save required (to enable Save button)
          view.saveButton.saveRequired = true;
        });
      }
    });
  });

  // QuestionMenuSelectionRequired
  view.$document.on("QuestionMenuSelectionRequired", function(event, question) {
    var html = $(templateContent).filter("[data-node=required]").get(0).outerHTML;
    var required = question.data.validation.required;
    var regex = new RegExp("(input.*name=\"required\".*value=\"" + required + "\")", "mig");
    html = html.replace(regex, "$1 checked=\"true\"");
    view.dialogConfiguration.onConfirm = (dialog) => { question.required = dialog.content.content };
    view.dialogConfiguration.open({
      content: html
    });
  });

  view.$document.on("QuestionMenuSelectionValidation", function(event, details) {
    const { question, validation } = details;
    var apiUrl = question.menu.selectedItem.data('apiPath');

    new DialogForm(apiUrl, {
      activator: question.menu.selectedItem,
      remote: true,
      autoOpen: true,
      /*
                   * Function runs after the modal content has been returned by the api
                   * as it is possible to open and edit the validations multiple times
                   * before saving.  We need to load the current validation state from the
                   * question data and apply it to the form.  As the values from the api
                   * could be out of date
                   */
      onLoad: function(dialog) {
        // Find fields that may be in the dialog
        var $statusField = dialog.$node.find('input[name="component_validation[status]"]');
        var $valueField = dialog.$node.find('input[name="component_validation[value]"]');
        var $dayField = dialog.$node.find('input[name="component_validation[day]"]');
        var $monthField = dialog.$node.find('input[name="component_validation[month]"]');
        var $yearField = dialog.$node.find('input[name="component_validation[year]"]');
        var $charsRadio = dialog.$node.find('input[id="component_validation_characters"]');
        var $wordsRadio = dialog.$node.find('input[id="component_validation_words"]');

        switch (validation) {
          case 'date_before':
          case 'date_after':
            // Destructure date value and use to populate or clear date fields in modal
            var currentValue = question.data.validation[validation];
            if (currentValue) {
              let [currentYear, currentMonth, currentDay] = currentValue.split('-');
              $dayField.val(currentDay);
              $monthField.val(currentMonth);
              $yearField.val(currentYear);
            } else {
              $dayField.val('');
              $monthField.val('');
              $yearField.val('');
            }
            break;
          case 'min_string_length':
            // Check the appropriate radio in the modal based on the validation type
            var currentValue = question.data.validation['min_length'] || question.data.validation['min_word'];
            if (question.data.validation.hasOwnProperty('min_length')) {
              $charsRadio.prop('checked', true);
            }
            if (question.data.validation.hasOwnProperty('min_word')) {
              $wordsRadio.prop('checked', true);
            }
            break;
          case 'max_string_length':
            // Check the appropriate radio in the modal based on the validation type
            var currentValue = question.data.validation['max_length'] || question.data.validation['max_word'];
            if (question.data.validation.hasOwnProperty('max_length')) {
              $charsRadio.prop('checked', true);
            }
            if (question.data.validation.hasOwnProperty('max_word')) {
              $wordsRadio.prop('checked', true);
            }
            break;
          default:
            var currentValue = question.data.validation[validation];
            break;
        }

        // If its a standard validationl just set the value filed to the current value
        if ($valueField) {
          $valueField.val(currentValue ?? '');
        }

        // Presence of current value indicates whether the validation is enabled/disabled
        if (currentValue) {
          $statusField.prop('checked', true);
        } else {
          $statusField.prop('checked', false);
        }
      },

      onReady: function(dialog) {
        var $revealedInputs = dialog.$node.find('[data-component="Expander"]');
        $revealedInputs.each(function() {
          var $activator = $(this).parent().find('input[type="checkbox"]');
          new Expander($(this), {
            activator_source: $activator,
            auto_open: $activator.prop('checked'),
            wrap_content: false,
          });
        });

        var $statusInput = dialog.$node.find('input[name="component_validation[status]"]');
        var $resettableInputs = dialog.$node.find('.Expander input').not('input[name*="string_length"]');
        $statusInput.on('change', () => {
          if (!$statusInput.prop('checked')) {
            $resettableInputs.each(function() {
              $(this).value = '';
            })
          }
        });
      },

      onSuccess: function(data) {
        question.validation = data;
      },

      onError: function(data, dialog) {
        var responseHtml = $.parseHTML(data.responseText);
        var $newHtml = $(responseHtml[0]).html();
        dialog.$node.html($newHtml);
        dialog.refresh();
      },
    });
  });

  view.$document.on("QuestionMenuSelectionUpload", function(event, question) {
    var apiUrl = question.menu.selectedItem.data('apiPath');
    new DialogForm(apiUrl, {
      activator: question.menu.selectedItem,
      remote: true,
      autoOpen: true,
      submitOnClickSelector: 'button[type="submit"]',
      disableOnSubmit: view.text.dialogs.autocomplete.button_disabled,
      onSuccess: function() {
        var $success = question.$node.find('[data-fb-status="autocomplete-success"]');
        var $warning = question.$node.find('[data-fb-status="autocomplete-warning"]');
        var $successMessage = question.$node.find('[data-fb-template="autocomplete-success-message"]').first().html();
        $success.html($successMessage);
        $warning.remove();
      },
      onError: function(data, dialog) {
        var responseHtml = $.parseHTML(data.responseText);
        var $newHtml = $(responseHtml[0]).html();
        dialog.$node.html($newHtml);
        dialog.refresh();
      },
    });
  });

  view.$document.on("QuestionMenuSelectionMultiUpload", function(event, question) {
    var apiUrl = question.menu.selectedItem.data('apiPath');
    var maxFilesVal = question.data.max_files
    new DialogForm(apiUrl, {
      activator: question.menu.selectedItem,
      remote: true,
      autoOpen: true,
    });
  });
}

function addEditableComponentItemMenuListeners(view) {
  view.$document.on('EditableCollectionItemMenuSelectionRemove', function(event, details) {
    var { selectedItem, collectionItem } = details;

    var dialog = view.dialog;
    var path = selectedItem.data('api-path');

    var questionUuid = collectionItem.component.data._uuid;
    var optionUuid = collectionItem.data._uuid;

    var url = stringInject(path, {
      'question_uuid': questionUuid,
      'option_uuid': optionUuid ?? 'new',
    });

    if (!optionUuid) {
      url = url + '&label=' + encodeURIComponent(collectionItem.$node.find('label').text());
    }

    if (collectionItem.component.canHaveItemsRemoved()) {
      new DialogApiRequest(url, {
        activator: selectedItem,
        closeOnClickSelector: ".govuk-button",
        onLoad: function(dialog) {
          dialog.$node.find("[data-method=delete]").on("click", function(e) {
            e.preventDefault();
            collectionItem.component.removeItem(collectionItem)
          })
        }
      });
    } else {
      let dialogContent = '';
      if (collectionItem.type == 'radios') {
        dialogContent = view.text.dialogs.message_delete_radio_min;
      } else if (collectionItem.type == 'checkboxes') {
        dialogContent = view.text.dialogs.message_delete_checkbox_min;
      }
      dialog.open({
        heading: view.text.dialogs.heading_can_not_delete_option,
        content: dialogContent,
        confirm: view.text.dialogs.button_understood,
      });
    }
  });
}


/* Content Menu needs to interact with Dialog components before
 * running any action, so we need to work with listeners to coordinate
 * between different component/widgets/functionality, etc.
 **/
function addContentMenuListeners(view) {
  var templateContent = $("[data-component-template=ContentPropertyFields]").html();

  // ContentMenuSelectionRemove
  view.$document.on("ContentMenuSelectionRemove", function(event, component) {
    var html = $(templateContent).filter("[data-node=remove]").text();
    view.dialogConfirmationDelete.onConfirm = function() {
      // Workaround solution that doesn't require extra backend work
      component.$node.hide(); // 1. First remove component from view
      view.updateComponents(); // 2. Update form (in case anything else has changed)
      component.destroy(); // 3. Remove corresponding component from form
      view.saveButton.saveRequired = true; // 4. Trigger save required (to enable Save button)
    };
    view.dialogConfirmationDelete.open({
      heading: html.replace(/#{label}/, ""),
      confirm: view.text.dialogs.button_delete_component
    });
  });

  view.$document.on("ContentMenuSelectionConditionalContent", function(event, details) {
    const { component, selectedItem } = details;
    openConditionalContentDialog(component, selectedItem, view)
  });
}

function openConditionalContentDialog(component, activator, view) {
  const url = component.dataset.conditionalApiPath;
  const data = {
    component: JSON.stringify(component.config || {})
  }
  if (url) {
    new DialogForm(url, {
      activator: activator,
      remote: true,
      requestMethod: 'POST',
      requestData: data,
      autoOpen: true,
      closeOnClickSelector: 'button[type="button"]:not(.prevent-modal-close)',
      onReady: (dialog) => {
      },
      onSuccess: (data, dialog) => {
        component.config = Object.assign(component.config, data)
        view.saveButton.saveRequired = true; // 4. Trigger save required (to enable Save button)
      },
      onError: (data, dialog) => {
        var responseHtml = $.parseHTML(data.responseText);
        var $newHtml = $(responseHtml[0]).html();
        dialog.$node.html($newHtml);
        dialog.refresh();
      }

    });
  }
}


/* Set focus on first editable component or, if a new component has been
 * added, the first element with that new component.
 **/
function focusOnEditableComponent() {
  const target = location.hash
  setTimeout(() => {
    if (target && target.match(/^[#\w\d_]+$/)) {
      console.log(target)
      // Newly added component with fragment identifier so find first
      // first editable item of last component.
      let $newComponent = $(target);
      if ($newComponent.length) {
        console.log($newComponent)
        if ($newComponent.prop('tagName').toLowerCase() == 'editable-content') {
          console.log('you added editable content');
          $newComponent.get(0).root.focus();
        } else {
          $newComponent.data("instance").focus();
        }
      }
    } else {
      const pageTitle = $('h1.EditableElement').get(0)
      if (pageTitle) {
        pageTitle.focus();
      } else {
        $(".fb-editable").eq(0).focus();
      }
    }
  })
}


/* Add edit functionality and component enhancements to content.
 * Affects simple elements (e.g. Headings) and full text blocks.
 **/
function enhanceContent(view) {
  view.$editable.filter("[data-fb-content-type=element]").each(function(i, node) {
    var $node = $(node);
    new EditableElement($node, {
      editClassname: "active",
      attributeDefaultText: ATTRIBUTE_DEFAULT_TEXT,
      form: view.saveButton.$form,
      id: $node.data("fb-content-id"),
      htmlAdjustment: htmlAdjustment,
      markdownAdjustment: markdownAdjustment,
      text: {
        default_content: view.text.defaults.content
      },
      defaultLabelValue: $node.data('fb-default-value'),
      type: $node.data("fb-content-type")
    });
  });

  const form = document.querySelector('#editContentForm');
  document.querySelectorAll('editable-content').forEach((element) => {
    element.form = form
    if (element.isComponent) {
      createContentMenu(element)
      createConditionalContentButton(view, {
        component: element,
        label: view.text.content_visibility.label_show_if,
        className: 'show-if-button'
      })
      createConditionalContentButton(view, {
        component: element,
        label: view.text.content_visibility.label_hidden,
        className: 'hidden-button'
      })
    }
  });
}

function createContentMenu(component) {
  var template = $("[data-component-template=ContentMenu]");
  var $ul = $(template.html());

  // Need to make sure $ul is added to body before we try to create a ContentMenu out of it.
  $(document.body).append($ul);

  return new ContentMenu(component, $ul, {
    activator_text: template.data("activator-text"),
    menu: {
      position: {
        my: "left top",
        at: "left top",
      }
    }
  });
}

function createConditionalContentButton(view, config) {
  const { component, className, label } = config

  const button = document.createElement('button')
  button.setAttribute('type', 'button')
  button.classList.add('fb-link-button', className)
  button.innerText = label
  component.insertAdjacentElement('beforeend', button)

  button.addEventListener('click', (event) => {
    event.preventDefault()
    openConditionalContentDialog(component, button, view)
  })
}

/* Add edit functionality and component enhancements to questions.
 **/
function enhanceQuestions(view) {
  view.$editable.filter("[data-fb-content-type=text], [data-fb-content-type=email], [data-fb-content-type=number], [data-fb-content-type=upload], [data-fb-content-type=multiupload]").each(function(i, node) {
    new TextQuestion($(this), {
      form: view.saveButton.$form,
      text: {
        default_content: view.text.defaults.content,
        optionalFlag: view.text.question_optional_flag
      }
    });
  });

  view.$editable.filter("[data-fb-content-type=autocomplete]").each(function(i, node) {
    new AutocompleteQuestion($(this), {
      form: view.saveButton.$form,
      text: {
        default_content: view.text.defaults.content,
        optionalFlag: view.text.question_optional_flag
      }
    });
  });


  view.$editable.filter("[data-fb-content-type=date]").each(function(i, node) {
    new DateQuestion($(this), {
      form: view.saveButton.$form,
      text: {
        optionalFlag: view.text.question_optional_flag
      }
    });
  });

  view.$editable.filter("[data-fb-content-type=textarea]").each(function(i, node) {
    new TextareaQuestion($(this), {
      form: view.saveButton.$form,
      text: {
        optionalFlag: view.text.question_optional_flag
      }
    });
  });

  view.$editable.filter("[data-fb-content-type=checkboxes]").each(function(i, node) {
    new CheckboxesQuestion($(this), {
      form: view.saveButton.$form,
      view: view,
      text: {
        edit: view.text.actions.edit,
        itemAdd: view.text.option_add,
        itemRemove: view.text.option_remove,
        option: view.text.defaults.option,
        optionHint: view.text.defaults.option_hint,
        optionalFlag: view.text.question_optional_flag,
        aria: {
          answers: view.text.aria.answers
        }
      },

      onItemRemoveConfirmation: function(item) {
        // @item (EditableComponentItem) Item to be deleted.
        // Runs before onItemRemove when removing an editable Collection item.
        // Currently not used but added for future option and consistency
        // with onItemAdd (provides an opportunity for clean up).
        view.dialogConfirmationDelete.onConfirm = () => { item.component.removeItem(item) };
        view.dialogConfirmationDelete.open({
          heading: view.text.dialogs.heading_delete_option.replace(/%{option label}/, item._elements.label.$node.text()),
          confirm: view.text.dialogs.button_delete_option
        });
      }
    });
  });

    view.$editable.filter("[data-fb-content-type=dropdown]").each(function(i, node) {
    new CheckboxesQuestion($(this), {
      form: view.saveButton.$form,
      view: view,
      text: {
        edit: view.text.actions.edit,
        itemAdd: view.text.option_add,
        itemRemove: view.text.option_remove,
        option: view.text.defaults.option,
        optionHint: view.text.defaults.option_hint,
        optionalFlag: view.text.question_optional_flag,
        aria: {
          answers: view.text.aria.answers
        }
      },

      onItemRemoveConfirmation: function(item) {
        // @item (EditableComponentItem) Item to be deleted.
        // Runs before onItemRemove when removing an editable Collection item.
        // Currently not used but added for future option and consistency
        // with onItemAdd (provides an opportunity for clean up).
        view.dialogConfirmationDelete.onConfirm = () => { item.component.removeItem(item) };
        view.dialogConfirmationDelete.open({
          heading: view.text.dialogs.heading_delete_option.replace(/%{option label}/, item._elements.label.$node.text()),
          confirm: view.text.dialogs.button_delete_option
        });
      }
    });
  });

  view.$editable.filter("[data-fb-content-type=radios]").each(function(i, node) {
    new RadiosQuestion($(this), {
      form: view.saveButton.$form,
      view: view,
      text: {
        edit: view.text.actions.edit,
        itemAdd: view.text.option_add,
        itemRemove: view.text.option_remove,
        option: view.text.defaults.option,
        optionHint: view.text.defaults.option_hint,
        optionalFlag: view.text.question_optional_flag,
        aria: {
          answers: view.text.aria.answers
        }
      },

      onItemRemoveConfirmation: function(item) {
        // @item (EditableComponentItem) Item to be deleted.
        // Runs before onItemRemove when removing an editable Collection item.
        // Currently not used but added for future option and consistency
        // with onItemAdd (provides an opportunity for clean up).
        view.dialogconfirmationDelete.onConfirm = () => { item.component.removeItem(item) };
        view.dialogConfirmationDelete.open({
          heading: view.text.dialogs.heading_delete_option.replace(/%{option label}/, item._elements.label.$node.text()),
          confirm: view.text.dialogs.button_delete_option
        });
      }


    });
  });
}


/* Create standard Dialog Confirmation component with 'ok' and 'cancel' type buttons.
 * Component allows passing a function to it's 'open()' function so that actions
 * can be played out on whether user clicks 'ok' or 'cancel'.
 **/
function createDialogConfiguration() {
  var $template = $("[data-component-template=DialogConfiguration]");
  var $node = $($template.text());
  return new Dialog($node, {
    autoOpen: false,
    cancelText: $template.data("text-cancel"),
    okText: $template.data("text-ok"),
    classes: {
      "ui-dialog": $template.data("classes")
    }
  });
}


/* Due to limitations in using the GDS templates, we cannot
 * add appropriate HTML attributes to relevant elements in
 * both radio and checkbox hints. This is a workaround to
 * add them, so fixes missing default text without affecting
 * the current method of finding them view fb-default-text
 * attribute.
 **/
function workaroundForDefaultText(view) {
  $(".govuk-radios__item, .govuk-checkboxes__item").each(function() {
    var $this = $(this);
    var $hint = $this.find(".govuk-hint");
    $hint.attr("data-" + ATTRIBUTE_DEFAULT_TEXT, view.text.defaults.option_hint);
  });
}


/**************************************************************/
/* View customisations for PageController.edit actions follow */
/**************************************************************/


function editPageContentViewCustomisations() {
  var $button1 = $("[data-component=add-content]");
  var $target = $("#new_answers");
  $target.append($button1);
}


function editPageCheckAnswersViewCustomisations() {
  var $button1 = $("[data-component=add-content]");
  var $target1 = $(".fb-editable").last();
  var $button2 = $button1.clone();
  var $target2 = $("#answers-form dl").first();
  $target1.after($button1);
  $target2.before($button2);
  $button2.attr("data-fb-field-name", "page[add_extra_component]");
}

function editPageConfirmationViewCustomisations() {
  var $payButton = $('[data-component="pay-button"]');
  var $addContentButton = $('[data-component="add-content"]');
  if ($payButton && $addContentButton) {
    $addContentButton.after($payButton);
    $payButton.attr('disabled', 'disabled');
    $payButton.attr('tabindex', '-1');
  }
};


function editPageMultipleQuestionsViewCustomisations() {
  var $button1 = $("[data-component=add-component]");
  var $target = $("#new_answers");
  $target.append($button1);
  accessibilityQuestionViewEnhancements(this);
}


function editPageSingleQuestionViewCustomisations() {
  accessibilityQuestionViewEnhancements(this);
}

/* Aria accessibility view inclusions.
 * These are being added using JS because the views are controlled by
 * Metadata Presenter making direct changes more difficult and able to
 * impact pre-approved accessibility results in the runner that already
 * has sufficient level of accessibility support.
 * The Editor already requires JS for correct functionality so we can
 * safely assume full JS availability.
 **/
function accessibilityQuestionViewEnhancements(view) {
  $(".fb-section_heading").attr("aria-label", view.text.aria.section_header);
  $(".Question h1, .Question h2").attr("aria-label", view.text.aria.question);
  $(".govuk-hint").attr("aria-label", view.text.aria.hint);
}


/* Enhances the static content should it require special formatting
 * or non-standard elements (same as we do with edited components).
 * e.g.
 *  - Adds GovUk classes to any <table> element
 *  - Changes supported GovSpeak markup to required HTML.
 **/
function supportGovUkStaticContent() {
  var content = document.querySelectorAll("[data-fb-content-type=static]");
  for (var c = 0; c < content.length; ++c) {
    content[c].innerHTML = htmlAdjustment(content[c].innerHTML);
  }
}



module.exports = PagesController;
