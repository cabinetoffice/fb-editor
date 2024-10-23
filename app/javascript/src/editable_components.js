/**
 * Editable Components
 * ----------------------------------------------------
 * Description:
 * Enhance target elements (components) with editable update/save properties.
 *
 * Requires: jQuery
 * Documentation:
 *
 **/


const {
  mergeObjects,
  createElement,
  uniqueString,
  safelyActivateFunction,
  addHiddenInpuElementToForm,
  updateHiddenInputOnForm,
} = require('./utilities');

const showdown  = require('showdown');
const sanitizeHtml = require('sanitize-html');

const EditableCollectionItemMenu = require('./components/menus/editable_collection_item_menu');

/* Editable Base:
 * Shared code across the editable component types.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options, e.g.
 *                  {
 *                    editClassname: 'usedOnElementToShowEditing'
 *                    form: $formNodeToAddHiddenInputsForSaveSubmit,
 *                    id: 'identifierStringForUseInHiddenFormInputName',
 *                    type: 'editableContentType'
 *                  }
 **/
class EditableBase {
  constructor($node, config) {
    this._config = config || {};
    this.type = config.type;
    this.$node = $node;
    $node.data("instance", this);
  }

  get config() {
    return this._config;
  }

  get content() {
    return this.$node.text();
  }

  remove() {
    // 1. Remove any form element with target name.
    // 2. Add uuid of target component to delete_components array.
    var $input = $(this._config.form).find("[name='" + this._config.id + "']")
    if($input.length) {
      $input.remove();
    }
    addHiddenInpuElementToForm(this._config.form, "delete_components[]", this._config.data._uuid);
  }

  save() {
    updateHiddenInputOnForm(this._config.form, this._config.id, this.content);
  }

  emitSaveRequired() {
    $(document).trigger("SaveRequired");
  }
}


/* Editable Element:
 * Used for creating simple content control objects on HTML
 * elements such as <H1>, <P>, <LABEL>, <LI>, etc.
 * Switched into edit mode on focus and out again on blur.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options
 **/
class EditableElement extends EditableBase {
  constructor($node, config) {
    super($node, config);
    var originalContent = $node.text().trim(); // Trim removes whitespace from template.
    var defaultContent = config.attributeDefaultText ? $node.data(config.attributeDefaultText) : undefined ;
    var required = defaultContent === undefined;

    $node.on("blur.editablecomponent", this.update.bind(this));
    $node.on("focus.editablecomponent", this.edit.bind(this) );
    $node.on("paste.editablecomponent", e => pasteAsPlainText(e) );
    $node.on("keydown.editablecomponent", e => singleLineInputRestrictions(e) );

    $node.attr("contentEditable", true);
    $node.attr("role", "textbox"); // Accessibility helper.
    $node.addClass("EditableElement");

    this._content = $node.text().trim();
    this._originalContent = originalContent;
    this._defaultContent = defaultContent;
    this._required = required;
  }

  get content() {
    var content;
    if(this._required) {
      content = (this._content == "" ? this._originalContent : this._content);
    }
    else {
      content = (this._content == this._defaultContent ? "" : this._content);
    }
    return content;
  }

  set content(content) {
    var trimmedContent = content.trim();

    if(this._content != trimmedContent) {
      this._content = trimmedContent;

      // If something changed...
      if(this._content != this._defaultContent || this._content != this._originalContent) {
        this.emitSaveRequired();
      }
    }

    this.populate(content);
  }

  edit() {
    this.removePlaceholder();
    if(this.$node.text().trim() == this.config.defaultLabelValue || this.$node.text().trim() == this.config.defaultItemLabelValue) {
      this.selectContent();
    }
    this.$node.addClass(this._config.editClassname);
  }

  update() {
    const currentContent = this.$node.text();

    if(currentContent == '' ){
      this.content = (this._required ? this._originalContent : this._defaultContent);
    } else {
      this.content = currentContent
    }

    this.$node.removeClass(this._config.editClassname);
  }

  // Expects content or blank string to show content or default text in view.
  populate(content) {
    var defaultContent = this._defaultContent || this._originalContent;
    this.$node.text(content == "" ? defaultContent : content);
  }

  focus() {
    this.$node.focus();
  }

  removePlaceholder() {
    if(this.$node.text().trim() == this._defaultContent) {
      this.$node.text('')
    }
  }

  selectContent() {
    const selection = window.getSelection();
    selection.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(this.$node.get(0));
    selection.addRange(range);
  }

  moveCaretToEndOfContent() {
    const range = document.createRange();//Create a range (a range is a like the selection but invisible)
    const selection = window.getSelection();//get the selection object (allows you to change selection)

    range.selectNodeContents(this.$node.get(0));//Select the entire contents of the element with the range
    range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
    selection.removeAllRanges();//remove any selections already made
    selection.addRange(range);//make the range you have just created the visible selection
  }
}









/* Editable Content:
 * Used for creating complex content control objects on HTML areas such as a <DIV>,
 * or <article>. The content will, when in edit mode, convert to Markdown and expect
 * user input in as Markdown. On exit of edit mode visible content will be translated
 * back into HTML for non-edit view and to save.
 * (Edit mode controlled by focus and blur events).
 *
 * Note; Using a textarea for input because it is more predictable than using a div
 *       with contentEditable attribute.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options.
 *                  {
 *                    htmlAdjustment: function(input) // Last minute adjustments before output HTML
 *                  }
 **/
class EditableContent extends EditableElement {
  #markdown;
  #converter;

  constructor($node, config) {
    super($node, config);
    var $input = $("<textarea class=\"input\"></textarea>");
    var $output = $("<div class=\"output\"></div>");
    var $span = $("<span>measure</span>");
    var html = $node.html().trim(); // Stored Markdown is originally converted at template level
    var lineHeight;

    // Use temporary hidden <span> for obtaining lineHeight measurement
    $span.css({
      font: "inherit",
      visibility: "hidden"
    });

    $node.append($span);
    lineHeight = $span.height();

    // Empty everything in $node because we're moving things around.
    $node.empty();
    $node.append($input);
    $node.append($output);

    // Clear inherited events
    $node.off("blur.editablecomponent");
    $node.off("focus.editablecomponent");
    $node.off("paste.editablecomponent");
    $node.off("keydown.editablecomponent");
    $node.attr("contentEditable", false);

    // Add event to required element
    $output.on("click.editablecontent, focus.editablecontent", this.edit.bind(this) );
    $input.on("blur.editablecontent", this.update.bind(this) );
    // TODO: Experimental and not quite working properly auto-resizing effort.
    //       Disabled for MVP unless there is time to get it right.
    //$input.on("keydown.editablecontent, paste.editablecontent", EditableContent.inputResizer.bind(this) );

    // Correct the class:
    $node.removeClass("EditableElement");
    $node.addClass("EditableContent");

    this.#converter = new showdown.Converter({
                    noHeaderId: true,
                    strikethrough: true,
                    omitExtraWLInCodeBlocks: true,
                    simplifiedAutoLink: false,
                    tables: true,
                    disableForced4SpacesIndentedSublists: true
                  });
    this.#converter.setFlavor('github');

    this._editing = false;
    this._lineHeight = lineHeight;
    this.$input = $input;
    this.$output = $output;
    this.content = this.#convertToMarkdown(html);

    if(config.text.default_content) {
      this._defaultContent = config.text.default_content;
    }

    // Set initial html in output area.
    this.#output(html);
  }

  // Get content must always return Markdown because that's what we save.
  get content() {
    var content = this.#markdown;
    var contentWithoutWhitespace = content.replace(/\s/mig, "");
    var defaultWithoutWhitespace = this._defaultContent.replace(/\s/mig, "");

    // Remove whitespace for better comparison
    content = (contentWithoutWhitespace == defaultWithoutWhitespace ? "" : content);

    // Bit hacky but we handle one type of content value as a string (see above),
    // and the other (component) content as a JSON string for all the component data.
    if(this._config.data) {
      this._config.data.content = content;
      content = JSON.stringify(this._config.data);
    }

    return content;
  }

  set content(markdown) {
    // Check if configuration requires external adjustment to markdown
    if(this._config.markdownAdjustment) {
      markdown = safelyActivateFunction(this._config.markdownAdjustment, markdown);
    }
    this.#markdown = markdown;
    this.emitSaveRequired();
  }

  get markdown() {
    return this.#markdown;
  }

  edit() {
    this.$node.addClass(this._config.editClassname);
    this.$input.val(this.#markdown); // Adds latest stored content to input area
    this.$input.focus();
    this.$input.select();
  }

  focus() {
    this.edit();
  }

  update() {
    // Figure out what content to show in output area.
    const currentInput = this.$input.val().trim();
    const defaultContent = this._defaultContent || this._originalContent;
    const markdown = (currentInput == "" ? defaultContent : currentInput);
    const html = this.#convertToHtml(markdown);

    // Assign the cleaned markup to be saved
    this.content = this.#cleanInput(markdown);

    // Add latest content to output area
    this.#output(html);

    this.$node.removeClass(this._config.editClassname);
  }

  // Adds the passed content to output area.
  #output(content) {
    // Check if configuration requires external adjustment to html
    if(this._config.htmlAdjustment) {
      content = safelyActivateFunction(this._config.htmlAdjustment, content);
    }

    this.$output.html(content);
  }

    /* Convert HTML to Markdown by tapping into third-party code.
   * Includes clean up of HTML by stripping attributes and unwanted trailing spaces.
   **/
  #convertToMarkdown(html) {
    var markdown = this.#converter.makeMarkdown(html);

    // As of 30-03-23 the currently published version of showdown does not parse <br> tags
    // into 2 spaces and a newline. See this issue: https://github.com/showdownjs/showdown/issues/974
    // A partial fix exists in develop and master branch of the project.
    // Use a simple regex to fix the problem. N.B. Trailing space is included in
    // regex because showdown inserts a space between each node before conversion,
    // meaning the text nodes after a <br> have a leading space
    markdown = markdown.replace(/<br\s?\/?>\n\n /mig, "  \n");

    markdown = this.#cleanInput(markdown);
    return markdown;
  }


  /* Convert Markdown to HTML by tapping into third-party code.
   * Includes clean up of both Markdown and resulting HTML to fix noticed issues.
   **/
  #convertToHtml(markdown) {
    var html = this.#converter.makeHtml(markdown);
    return this.#cleanInput(html);
  }

  /* Opportunity safely strip out anything that we don't want here.
   *
   * 1. Something in makeMarkdown is adding <!-- --> markup to the result
   *    so we're trying to get rid of it. See https://github.com/showdownjs/showdown/issues/700
   *
   * 2. sanitize-html is altering automatic link syntax by removing
   *    everything in (including) angle brackets added by showdown
   *
   *    e.g. [link text](<http://some.url/here>)
   *
   *         results in this incorrect markdown (and output):
   *         [link text]()
   *
   *         so we're stripping out the angle brackets to leave this:
   *         [link text](http://some.url/here)
   *
   *         which give us the correct link element (url+text).
   *
   * 3. sanitize-html is removing <some@email.com> formatted markup that
   *    is the recommended syntax in some documentation. This bit will
   *    filter for that syntax and convert to $mailtosome@email.com$mailto
   *    which will help to bypass sanitize-html (see step 5).
   *
   * 4. Converts unwanted HTML from input (when passed HTML or Markdown).
   *     - we call this with HTML to strip out unwanted elements.
   *     - we call this with markdown, as any HTML is valid markdown, but
   *       we don't want to allow it, so this strips html from the markdown.
   *
   * 5. To follow step 3 (and this must happen after step 4), we now filter
   *    for $mailtosome@email.com$mailto and replace with the original
   *    angle brackets to reset to <some@email.com> markdown. It's worth
   *    noting that, after saving, the markdown of <some@email.com> gets
   *    converted to [some@email.com](mailto:some@email.com) anyway.
   *
   * 6. Fix markdown to blockquote element conversion (broken by the
   *    sanitize-html) script converting bracket > into &gt; entity.
   **/
  #cleanInput(input) {
    // 1.
    input = input.replace(/\n<!--.*?-->/mig, "");
    // 2.
    input = input.replace(/\]\(\<(.*?)\>\)/mig, "]($1)");
    // 3.
    input = input.replace(/\<([\w\-\.]+@{1}[\w\-\.]+)>/mig, "$mailto$1$mailto");
    // 4.
    input = sanitizeHtml(input);
    // 5.
    input = input.replace(/\$mailto([\w\-\.]+@{1}[\w\-\.]+)\$mailto/mig, "<$1>");
    // 6.
    input = input.replace(/\n&gt;(\s{1}.*?\n)/mig, "\n>$1");

    return input;
  }

}

/* Experimental effort to auto-resize input area.
 * Currently not used as not working 100%.
 **/
EditableContent.inputResizer = function(e) {
  if(e.which == 13) {
    this.$input.height(this.$input.height() + this._lineHeight);
  }
}


/* Editable Component Base:
 * Share code across the editable component types.
 * Those types are comprised of one or more elements and
 * produce a JSON string as content from internal data object.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options.
 * @elements (Object) Collection of EditableElement instances found in the component.
 *
 **/
class EditableComponentBase extends EditableBase {
  constructor($node, config, elements) {
    super($node, config);
    this.data = config.data;
    $node.data("instance", this);

    // e.g. elements = {
    //        something: new EditableElement($node.find("something"), config)
    //        and any others...
    //      }
    this._elements = arguments.length > 2 && elements || {
      label: new EditableElement($node.find(config.selectorElementLabel), config),
      hint: new EditableElement($node.find(config.selectorElementHint), config)
    };

    $node.find(config.selectorDisabled).attr("disabled", true); // Prevent input in editor mode.
  }

  get content() {
    return JSON.stringify(this.data);
  }

  set content(elements) {
    // Expect this function to be overridden for each different type inheriting it.
    // e.g.
    // this.data.something = elements.something.content
    this.data.label = elements.label.content;
    this.data.hint = elements.hint.content;
  }

  save() {
    // e.g.
    // this.data.something = this._elements.something.content;
    this.content = this._elements;
    EditableBase.prototype.save.call(this);
  }

  // Focus on first editable element.
  focus() {
    for(var i in this._elements) {
      if(this._elements.hasOwnProperty(i)) {
        this._elements[i].focus();
        break;
      }
    }
  }
}


/* Editable Text Field Component:
 * Structured editable component comprising of one or more elements.
 * Produces a JSON string as content from internal data object.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options.
 *
 *
 * Expected backend structure  (passed as JSON)
 * --------------------------------------------
 *  _id: single-question_text_1
 *  hint: Component hint
 *  name: single-question_text_1
 *  _type: text
 *  label: Component label
 *  errors: {}
 *  validation:
 *    required: true
 *
 * Expected (minimum) frontend struture
 * ------------------------------------
 * <div class="fb-editable" data-fb-content-id="foo" data-fb-content-type="text" data-fb-conent-data=" ...JSON... ">
 *   <label>Component label</label>
 *   <span>Component hint</span>
 *   <input name="answers[single-question_text_1]" type="text">
 * </div>
 **/
class EditableTextFieldComponent extends EditableComponentBase {
  constructor($node, config) {
    // TODO: Potential future addition...
    //       Maybe make this EditableAttribute instance when class is
    //       ready so we can edit attribute values, such as placeholder.
    //  {input: new EditableAttribute($node.find("input"), config)}
    super($node, mergeObjects({
      selectorElementLabel: config.selectorLabel,
      selectorElementHint: config.selectorHint
    }, config));
    $node.addClass("EditableTextFieldComponent");
  }
}


/* Editable Textarea Field Component:
 * Structured editable component comprising of one or more elements.
 * Produces a JSON string as content from internal data object.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options.
 *
 *
 * Expected backend structure  (passed as JSON)
 * --------------------------------------------
 *  _id: single-question_textarea_1
 *  hint: Component hint
 *  name: single-question_textarea_1
 *  _type: text
 *  label: Component label
 *  errors: {}
 *  validation:
 *    required: true
 *
 * Expected (minimum) frontend struture
 * ------------------------------------
 * <div class="fb-editable" data-fb-content-id="foo" data-fb-content-type="text" data-fb-conent-data=" ...JSON... ">
 *   <label>Component label</label>
 *   <span>Component hint</span>
 *   <textarea name="answers[single-question_textarea_1]"></textarea>
 * </div>
 **/
class EditableTextareaFieldComponent extends EditableComponentBase {
  constructor($node, config) {
    super($node, mergeObjects({
      selectorElementLabel: config.selectorLabel,
      selectorElementHint: config.selectorHint
    }, config));
    $node.addClass("EditableTextareaFieldComponent");
  }
}


/* Editable Group Field Component:
 * Structured editable component comprising of one or more fields wrapped in fieldset.
 * Produces a JSON string as content from internal data object.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options.
 *
 *
 * Example expected backend structure  (passed as JSON - using a Date component)
 * -----------------------------------------------------------------------------
 *  _id: Date_date_1
 *  hint: Component hint
 *  name: Date_date_1
 *  _type: date
 *  label: Component label
 *  errors: {}
 *  validation:
 *    required: true
 *
 * Expected (minimum) frontend struture
 * ------------------------------------
 * <div class="fb-editable" data-fb-content-id="foo" data-fb-content-type="date" data-fb-conent-data=" ...JSON... ">
 *   <fieldset>
 *     <legend>Question text</legend>
 *
 *     <label>Day</label>
 *     <input name="answers[date_1]" type="text" />
 *
 *     <label>Month</label>
 *     <input name="answers[date_2]" type="text" />
 *
 *     <label>Year</label>
 *     <input name="answers[date_3]" type="text" />
 *   </fieldset>
 * </div>
 **/
class EditableGroupFieldComponent extends EditableComponentBase {
  constructor($node, config) {
    super($node, mergeObjects({
      selectorElementLabel: config.selectorLabel,
      selectorElementHint: config.selectorHint
    }, config));
    $node.addClass("EditableGroupFieldComponent");
  }

  // Override get/set content only because we need to use data.legend instead of data.label
  get content() {
    return JSON.stringify(this.data);
  }

  set content(elements) {
    this.data.legend = elements.label.content;
    this.data.hint = elements.hint.content;
  }
}


/* Editable Collection (Radios/Checkboxes) Field Component:
 * Structured editable component comprising of one or more elements.
 * Produces a JSON string as content from internal data object.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options.
 *
 *
 * Expected backend structure  (passed as JSON)
 * --------------------------------------------
 *  _id: collections_1,
 *  hint: Hint text,
 *  name: collections_1,
 *  _type : [radios|checkboxes],
 *  items: [
 *    {
 *      _id: component_item_1,
 *      hint: Hint text,
 *      _type: [radio|checkbox],
 *      label: Label Text,
 *      value: value-1
 *    },{
 *     _id: component_item_2,
 *      hint: Hint text,
 *      _type: [radio|checkbox],
 *      label: Label text,
 *      value: value-2
 *    }
 *  ],
 *  errors: {},
 *  legend: Question,
 *  validation: {
 *    required: true
 *  }
 *
 *
 * Expected (minimum) frontend structure
 * -------------------------------------
 * <div class="fb-editable" data-fb-content-id="foo" data-fb-content-type="radios" data-fb-conent-data=" ...JSON... ">
 *   <fieldset>
 *     <legend>Question</legend>
 *
 *     <input name="answers[single-question_radio_1]" type="radio" />
 *     <label>Component label</label>
 *     <span>Component hint</span>
 *
 *     <input name="answers[single-question_radio_1]" type="radio" />
 *     <label>Component label</label>
 *     <span>Component hint</span>
 *
 * </div>
 **/
class EditableCollectionFieldComponent extends EditableComponentBase {
  constructor($node, config) {
    super($node, mergeObjects({
      selectorElementLabel: config.selectorLabel,
      selectorElementHint: config.selectorHint
    }, config));

    this.items = [];
    // TODO: this should be refactored - preservedItemCount should just be a
    // config key not dependent on type
    this._preservedItemCount = (this.type == "radios" ? 2 : 1); // Either minimum 2 radios or 1 checkbox.

    this.#createCollectionItemTemplate(config);
    this.#createEditableCollectionItems(config);

    new EditableCollectionItemInjector(this, config);

    $node.addClass("EditableCollectionFieldComponent");
    $node.find(config.selectorDisabled).removeAttr("disabled");

  }

  // If we override the set content, we obliterate relationship with the inherited get content.
  // This will retain the inherit functionality by explicitly calling it.
  get content() {
    return super.content;
  }

  set content(elements) {
    this.data.legend = elements.label.content;
    this.data.hint = elements.hint.content;

    // Set data from items.
    this.data.items = [];
    for(var i=0; i< this.items.length; ++i) {
      this.data.items.push(this.items[i].data);
    }
  }

 /*
 * Create an item template which can be cloned in component.addItem()
 * config (Object) key/value pairs for extra information.
 *
 * Note: Initial index elements of Array/Collection is called directly
 * without any checking for existence. This is because they should always
 * exist and, if they do not, we want the script to throw an error
 * because it would alert us to something very wrong.
 **/
  #createCollectionItemTemplate(config) {
    var $clone = this.$node.find(config.selectorCollectionItem).eq(0).clone();
    var data = mergeObjects({}, config.data, ["items", "_uuid"]); // pt.1 Copy without items and component uuid.
    var itemConfig = mergeObjects({}, config, ["data"]); // pt.2 Copy without data.
    itemConfig.data = mergeObjects(data, config.data.items[0], "_uuid"); // Bug fix response to JS reference handling.

    // Filters could be changing the blah_1 values to blah_0, depending on filters in play.
    itemConfig.data = this.#applyFilters(config.filters, 0, itemConfig.data);

    // In case we need some custom actions on element.
    safelyActivateFunction(config.onCollectionItemClone, $clone);

    $clone.data("config", itemConfig);

    // Note: If we need to strip out some attributes or alter the template
    //       in some way, do that here.

    this.$itemTemplate = $clone;
  }

   /*
   * Find radio or checkbox items and enhance with editable functionality.
   * Creates the initialising values for this.items
   * config (Object) key/value pairs for extra information.
   **/
    #createEditableCollectionItems(config) {
    var component = this;
    component.$node.find(config.selectorCollectionItem).each(function(i) {
      // WARNING! DO NOT MOVE data or itemConfig OUTSIDE OF THIS LOOP
      // Due to JS reference handling of objects we need to make sure data and itemConfig are
      // inside the loop to instantiate two completely different variables. JS will not pass
      // by value so the alternative is creating EditableCollectionItems that share these objects.
      var data = mergeObjects({}, config.data, ["items", "_uuid"]); // pt.1 Copy without items and component uuid.
      var itemConfig = mergeObjects({ preserveItem: (i < component._preservedItemCount) }, config, ["data"]); // pt.2 Without data
      itemConfig.data = mergeObjects(data, config.data.items[i]); // Bug fix response to JS reference handling.

      // Only wrap in EditableComponentCollectionItem functionality if doesn't look like it has it.
      if(this.className.indexOf("EditableComponentCollectionItem") < 0) {
        var item = new EditableComponentCollectionItem(component, $(this), itemConfig);
        component.items.push(item);
      }
    });
  }

  /*
   * Run through the collection items to make sure data is sync'd when we've
   * either added a new item or removed one (e.g. makes sure to avoid clash
   * of data _id values.
   **/
  #updateItems() {
    var filters = this._config.filters;
    for(var i=0; i < this.items.length; ++i) {
      this.items[i].data = this.#applyFilters(filters, i+1, this.items[i].data);
    }
  }


  /*
   * Applies config.filters to the data passed in, with an index number, since this should
   * be called within a loop of the items. It has been expracted out to counter complications
   * running into closure issues due to manipulating data within a loop.
   * @unique (Integer|String) Should be current loop number, or at least something unique.
   * @data   (Object) Collection item data.
   **/
  #applyFilters(filters, unique, data) {
    var filtered_data = {};
    for(var prop in data) {
      if(filters && filters.hasOwnProperty(prop)) {
        filtered_data[prop] = filters[prop].call(data[prop], unique);
      }
      else {
        filtered_data[prop] = data[prop];
      }
    }
    return filtered_data;
  }

  canHaveItemsRemoved() {
    return this.items.length > this._preservedItemCount;
  }

  // Dynamically adds an item to the components collection
  addItem() {
    // Component should always have at least one item, otherwise something is very wrong.
    var $lastItem = this.items[this.items.length - 1].$node;
    var $clone = this.$itemTemplate.clone();
    $lastItem.after($clone);
    var item = new EditableComponentCollectionItem(this, $clone, this.$itemTemplate.data("config"));
    this.items.push(item);
    this.#updateItems();

    safelyActivateFunction(this._config.onItemAdd, $clone);
    this.emitSaveRequired();
  }

  // Dynamically removes an item to the components collection
  removeItem(item) {
    if(this.canHaveItemsRemoved()) {
      var index = this.items.indexOf(item);
      safelyActivateFunction(this._config.onItemRemove, item);
      this.items.splice(index, 1);
      item.$node.remove();
      this.#updateItems();
      this.emitSaveRequired();
    }
  }

  save() {
    // Trigger the save action on items before calling it's own.
    for(var i=0; i<this.items.length; ++i) {
      this.items[i].save();
    }
    super.save();
  }
}

/* Editable Select Field Component:
 * Structured editable component comprising of one or more elements.
 * Produces a JSON string as content from internal data object.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options.
 *
 *
 * Expected backend structure  (passed as JSON)
 * --------------------------------------------
 *  _id: collections_1,
 *  hint: Hint text,
 *  name: collections_1,
 *  _type : select,
 *  items: [
 *    {
 *      _id: component_item_1,
 *      hint: Hint text,
 *      _type: [radio|checkbox],
 *      label: Label Text,
 *      value: value-1
 *    },{
 *     _id: component_item_2,
 *      hint: Hint text,
 *      _type: [radio|checkbox],
 *      label: Label text,
 *      value: value-2
 *    }
 *  ],
 *  errors: {},
 *  legend: Question,
 *  validation: {
 *    required: true
 *  }
 *
 *
 * Expected (minimum) frontend structure
 * -------------------------------------
 * <div class="fb-editable" data-fb-content-id="foo" data-fb-content-type="radios" data-fb-conent-data=" ...JSON... ">
 *
 * </div>
 **/
class EditableSelectFieldComponent extends EditableComponentBase {
  constructor($node, config) {
    super($node, mergeObjects({
      selectorElementLabel: config.selectorLabel,
      selectorElementHint: config.selectorHint
    }, config));

    this.items = [];
    // config key not dependent on type
    this._preservedItemCount = 2; // Either minimum 2 options otherwise this should be a checkbox component in the view.

    this.#createCollectionItemTemplate(config);
    this.#createEditableCollectionItems(config);

    new EditableCollectionItemInjector(this, config);

    $node.addClass("EditableCollectionFieldComponent");
    $node.find(config.selectorDisabled).removeAttr("disabled");

  }

  // If we override the set content, we obliterate relationship with the inherited get content.
  // This will retain the inherit functionality by explicitly calling it.
  get content() {
    return super.content;
  }

  set content(elements) {
    this.data.hint = elements.hint.content;

    // Set data from items.
    this.data.items = [];
    for(var i=0; i< this.items.length; ++i) {
      this.data.items.push(this.items[i].data);
    }
  }

 /*
 * Create an item template which can be cloned in component.addItem()
 * config (Object) key/value pairs for extra information.
 *
 * Note: Initial index elements of Array/Collection is called directly
 * without any checking for existence. This is because they should always
 * exist and, if they do not, we want the script to throw an error
 * because it would alert us to something very wrong.
 **/
  #createCollectionItemTemplate(config) {
    var $clone = this.$node.find(config.selectorCollectionItem).eq(0).clone();
    var data = mergeObjects({}, config.data, ["items", "_uuid"]); // pt.1 Copy without items and component uuid.
    var itemConfig = mergeObjects({}, config, ["data"]); // pt.2 Copy without data.
    itemConfig.data = mergeObjects(data, config.data.items[0], "_uuid"); // Bug fix response to JS reference handling.

    // Filters could be changing the blah_1 values to blah_0, depending on filters in play.
    itemConfig.data = this.#applyFilters(config.filters, 0, itemConfig.data);

    // In case we need some custom actions on element.
    safelyActivateFunction(config.onCollectionItemClone, $clone);

    $clone.data("config", itemConfig);

    // Note: If we need to strip out some attributes or alter the template
    //       in some way, do that here.

    this.$itemTemplate = $clone;
  }

   /*
   * Find radio or checkbox items and enhance with editable functionality.
   * Creates the initialising values for this.items
   * config (Object) key/value pairs for extra information.
   **/
    #createEditableCollectionItems(config) {
    var component = this;
    component.$node.find(config.selectorCollectionItem).each(function(i) {
      // WARNING! DO NOT MOVE data or itemConfig OUTSIDE OF THIS LOOP
      // Due to JS reference handling of objects we need to make sure data and itemConfig are
      // inside the loop to instantiate two completely different variables. JS will not pass
      // by value so the alternative is creating EditableCollectionItems that share these objects.
      var data = mergeObjects({}, config.data, ["items", "_uuid"]); // pt.1 Copy without items and component uuid.
      var itemConfig = mergeObjects({ preserveItem: (i < component._preservedItemCount) }, config, ["data"]); // pt.2 Without data
      itemConfig.data = mergeObjects(data, config.data.items[i]); // Bug fix response to JS reference handling.

      // Only wrap in EditableComponentCollectionItem functionality if doesn't look like it has it.
      if(this.className.indexOf("EditableComponentCollectionItem") < 0) {
        var item = new EditableComponentCollectionItem(component, $(this), itemConfig);
        component.items.push(item);
      }
    });
  }

  /*
   * Run through the collection items to make sure data is sync'd when we've
   * either added a new item or removed one (e.g. makes sure to avoid clash
   * of data _id values.
   **/
  #updateItems() {
    var filters = this._config.filters;
    for(var i=0; i < this.items.length; ++i) {
      this.items[i].data = this.#applyFilters(filters, i+1, this.items[i].data);
    }
  }


  /*
   * Applies config.filters to the data passed in, with an index number, since this should
   * be called within a loop of the items. It has been extracted out to counter complications
   * running into closure issues due to manipulating data within a loop.
   * @unique (Integer|String) Should be current loop number, or at least something unique.
   * @data   (Object) Collection item data.
   **/
  #applyFilters(filters, unique, data) {
    var filtered_data = {};
    for(var prop in data) {
      if(filters && filters.hasOwnProperty(prop)) {
        filtered_data[prop] = filters[prop].call(data[prop], unique);
      }
      else {
        filtered_data[prop] = data[prop];
      }
    }
    return filtered_data;
  }

  canHaveItemsRemoved() {
    return this.items.length > this._preservedItemCount;
  }

  // Dynamically adds an item to the components collection
  addItem() {
    // Component should always have at least one item, otherwise something is very wrong.
    var $lastItem = this.items[this.items.length - 1].$node;
    var $clone = this.$itemTemplate.clone();
    $lastItem.after($clone);
    var item = new EditableComponentCollectionItem(this, $clone, this.$itemTemplate.data("config"));
    this.items.push(item);
    this.#updateItems();

    safelyActivateFunction(this._config.onItemAdd, $clone);
    this.emitSaveRequired();
  }

  // Dynamically removes an item to the components collection
  removeItem(item) {
    if(this.canHaveItemsRemoved()) {
      var index = this.items.indexOf(item);
      safelyActivateFunction(this._config.onItemRemove, item);
      this.items.splice(index, 1);
      item.$node.remove();
      this.#updateItems();
      this.emitSaveRequired();
    }
  }

  save() {
    // Trigger the save action on items before calling it's own.
    for(var i=0; i<this.items.length; ++i) {
      this.items[i].save();
    }
    super.save();
  }
}





/* Editable Component Collection Item:
 * Used for things like Radio Options/Checkboxes that have a label and hint element
 * but are owned by a parent Editable Component, so does not need to save their
 * own content by writing a hidden element (like other types). Not considered
 * a standalone 'type' to be used in the editableComponent() initialisation
 * function.
 *
 * Save function will produce a JSON string as content from internal data object
 * but do nothing else with it. A parent component will read and use the
 * generated 'saved' content.
 *
 * config.onItemRemoveConfirmation (Function) An action passed the item.
 *
 **/
class EditableComponentCollectionItem extends EditableComponentBase {
  constructor(editableCollectionFieldComponent, $node, config) {
    super($node, mergeObjects({
      selectorElementLabel: config.selectorComponentCollectionItemLabel,
      selectorElementHint: config.selectorComponentCollectionItemHint
    }, config));

    this.menu = createEditableCollectionItemMenu(this, config);

    $node.on("focus.EditableComponentCollectionItem", "*", function() {
      $node.addClass(config.editClassname);
    });

    $node.on("blur.EditableComponentCollectionItem", "*", function() {
      $node.removeClass(config.editClassname);
    });

    this.component = editableCollectionFieldComponent;
    $node.addClass("EditableComponentCollectionItem");
  }

  remove() {
    if(this._config.onItemRemoveConfirmation) {
      // If we have confirgured a way to confirm first...
      safelyActivateFunction(this._config.onItemRemoveConfirmation, this);
    }
    else {
      // or just run the remove function.
      this.component.removeItem(this);
    }
  }

  save() {
    // Doesn't need super because we're not writing to hidden input.
    this.content = this._elements;
  }

}


class EditableCollectionItemInjector {
  constructor(editableCollectionFieldComponent, config) {
    var conf = mergeObjects({}, config);
    var text = mergeObjects({ itemAdd: 'add' }, config.text);
    var $node = $(createElement("button", text.itemAdd, conf.classes));
    editableCollectionFieldComponent.$node.append($node);
    $node.addClass("EditableCollectionItemInjector");
    $node.attr("type", "button");
    $node.data("instance", this);
    $node.on("click", function(e) {
      e.preventDefault();
      editableCollectionFieldComponent.addItem();
    });

    this.component = editableCollectionFieldComponent;
    this.$node = $node;
  }
}

function createEditableCollectionItemMenu(item, config) {
  var template = $("[data-component-template=EditableCollectionItemMenu]");
  var $ul = $(template.html());

  item.$node.append($ul);


  return new EditableCollectionItemMenu($ul, {
      activator_text: config.text.edit,
      container_id: uniqueString("activatedMenu-"),
      collectionItem: item,
      view: config.view,
      menu: {
        position: {
          my: "left top",
          at: "left top" }
      }
    });
}





/* Single Line Input Restrictions
 * Browser contentEditable mode means some pain in trying to prevent
 * HTML being inserted (rich text attempts by browser). We're only
 * editing as plain text and markdown for all elements so try to
 * prevent unwanted entry with this function.
 **/
function singleLineInputRestrictions(event) {

  // Prevent ENTER adding <div><br></div> nonsense.
  if(event.which == 13) {
    event.preventDefault();
  }
}

/* Function prevents rich text being pasted on paste event.
 * Used in the editing markdown area so we do not get crossed
 * formats.
 *
 * Use like: $('something').on('paste', e => pasteAsPlainText(e) )}
 **/
function pasteAsPlainText(event) {
  event.preventDefault();
  var content = "";
  if (event.clipboardData || event.originalEvent.clipboardData) {
    content = (event.originalEvent || event).clipboardData.getData('text/plain');
  }
  else {
    if (window.clipboardData) {
      content = window.clipboardData.getData('Text');
    }
  }

  if (document.queryCommandSupported("insertText")) {
    document.execCommand("insertText", false, content);
  }
  else {
    document.execCommand("paste", false, content);
  }
}

class EditableDropdown extends EditableBase {

  constructor($node, config) {
    super($node, mergeObjects({
      selectorElementLabel: config.selectorLabel,
      selectorElementHint: config.selectorHint
    }, config));
    $node.addClass("EditableDropdown");
    console.log('>>>>> EditableDropdown ');
  }

}

/* Determin what type of node is passed and create editable content type
 * to match.
 *
 * @$node ($jQuery node) REQUIRED - jQuery wrapped HTML element to become editable content.
 * @config (Object) Properties passed for any configuration.
 **/
function editableComponent($node, config) {
  var klass;
  switch(config.type) {
    // case "dropdown":
    //   klass = EditableDropdown;
    //   break;
    case "element":
      klass = EditableElement;
      break;
    case "content":
      // klass = EditableContent;
      break;
    case "text":
    case "email":
    case "number":
    case "upload":
    case "multiupload":
    case "conditional-content":
    case "autocomplete":
      klass = EditableTextFieldComponent;
      break;
    case "textarea":
      klass = EditableTextareaFieldComponent;
      break;
    case "date":
      klass = EditableGroupFieldComponent;
      break;
    case "radios":
    case "checkboxes":
      klass = EditableCollectionFieldComponent;
      break;
    case "dropdown":
      klass = EditableCollectionFieldComponent;
      break;
  }
  return new klass($node, config);
}


// Make available for importing.
module.exports =  {
  editableComponent: editableComponent,
  EditableComponentBase: EditableComponentBase,
  EditableBase: EditableBase,
  EditableElement: EditableElement,
  EditableDropdown:EditableDropdown,
   // EditableContent: EditableContent,
  EditableTextFieldComponent: EditableTextFieldComponent,
  EditableTextareaFieldComponent: EditableTextareaFieldComponent,
  EditableGroupFieldComponent: EditableGroupFieldComponent,
  EditableCollectionFieldComponent: EditableCollectionFieldComponent,
  EditableSelectFieldComponent: EditableSelectFieldComponent,
  EditableComponentCollectionItem: EditableComponentCollectionItem,
}
