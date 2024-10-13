require('../setup');
const editable = require('../../app/javascript/src/editable_components');

describe('editableComponent', function() {
  const COMPONENT_ID = 'editableComponent'
  var config;

  beforeEach(function() {
    var html = `
      <form id="${COMPONENT_ID}-form"></form>
      <div id="${COMPONENT_ID}"></div>
    `;

    $(document.body).append(html);

    $node = $(document).find('#'+COMPONENT_ID);
    $form = $(document).find('#'+COMPONENT_ID+'-form');

    config = {
      editClassname: 'editable-class-name',
      form: $form,
      id: COMPONENT_ID,
      data: {
        _uuid: '1234567890',
        items: [],
      },
      text: {
        default_content: 'Default',
      },
    }
  });

  afterEach(function() {
    $("#" + COMPONENT_ID).remove();
    $("#" + COMPONENT_ID + "-form").remove();
  });

  const tests = [
    { type: 'element', name: 'EditableElement', expected: editable.EditableElement },
    { type: 'text', name: 'EditableTextFieldComponent', expected: editable.EditableTextFieldComponent },
    { type: 'email', name: 'EditableTextFieldComponent', expected: editable.EditableTextFieldComponent },
    { type: 'number', name: 'EditableTextFieldComponent', expected: editable.EditableTextFieldComponent },
    { type: 'upload', name: 'EditableTextFieldComponent', expected: editable.EditableTextFieldComponent },
    { type: 'autocomplete', name: 'EditableTextFieldComponent', expected: editable.EditableTextFieldComponent },
    { type: 'textarea', name: 'EditableTextareaFieldComponent', expected: editable.EditableTextareaFieldComponent },
    { type: 'date', name: 'EditableGroupFieldComponent', expected: editable.EditableGroupFieldComponent },
    { type: 'radios', name: 'EditableCollectionFieldComponent', expected: editable.EditableCollectionFieldComponent },
    { type: 'checkboxes', name: 'EditableCollectionFieldComponent', expected: editable.EditableCollectionFieldComponent },
    { type: 'dropdown', name: 'EditableCollectionFieldComponent', expected: editable.EditableCollectionFieldComponent },
  ]

  tests.forEach( ({type, name, expected}) => {
    it(`returns instance of ${name} according when type is ${type}`, function() {
      config.type = type;
      var component = editable.editableComponent($node, config);
      expect(component).to.be.instanceof(expected);
    });
  });

});
