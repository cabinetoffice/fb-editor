const ConnectionMenu = require("../../../app/javascript/src/components/menus/connection_menu");
const GlobalHelpers = require("../../helpers.js");

const REMOTE_URL = "/dialog-api-request.html"
const constants = {
  ConnectionMenuClass: ConnectionMenu,

  CLASSNAME_ACTIVATOR: "connection-menu-activator-classname",
  CLASSNAME_COMPONENT: "ConnectionMenu",
  EVENT_SELECTION_NAME: "ConnetionMenuTestSelectionEventName",

  ID_CONTAINER_SUFFIX: "-container",
  ID_COMPONENT_SUFFIX: "-component",
  ID_RESPONSE_SUFFIX: "-response",
  ID_UUID_SUFFIX: "-uuid",
  ID_CONDITION_UUID_SUFFIX: "-condition-uuid",

  TEXT_ACTIVATOR: "activated menu activator",
  TEXT_TITLE: "component title",

  TEXT_ADD_PAGE_SINGLE: "Add single question page",
  TEXT_ADD_PAGE_MULTI: "Add multiple question page",
  TEXT_ADD_PAGE_CONTENT: "Add content page",
  TEXT_ADD_PAGE_EXIT: "Add exit page",

  TEXT_ADD_BRANCHING: "Add branching",
  TEXT_ADD_BRANCHING_URL: "/services/branches/new",

  TEXT_CHANGE_DESTINATION: "Change next page...",
  TEXT_CHANGE_DESTINATION_URL: "/services/destinations/new",

  TEXT_RECONNECT_CONFIRMATION: "Reconnect confirmation",
  TEXT_RECONNECT_CONFIRMATION_URL: "/services/reconnect/confirmation",

  TEXT_PAGE_TYPE_TEXT: "text",
  TEXT_PAGE_TYPE_TEXTAREA: "textarea",
  TEXT_PAGE_TYPE_EMAIL: "email",
  TEXT_PAGE_TYPE_NUMBER: "number",
  TEXT_PAGE_TYPE_DATE: "date",
  TEXT_PAGE_TYPE_RADIO: "radios",
  TEXT_PAGE_TYPE_CHECKBOX: "checkboxes",
  TEXT_PAGE_TYPE_AUTOCOMPLETE: "autocomplete",
  TEXT_PAGE_TYPE_UPLOAD: "upload",

  TEXT_PAGE_TYPE_MULTI: "multiplequestions",
  TEXT_PAGE_TYPE_CONTENT: "content",
  TEXT_PAGE_TYPE_REPEAT: "repeatablepage",
  TEXT_PAGE_TYPE_EXIT: "exit",

  TEXT_ACTION_NONE: "none",
  TEXT_ACTION_LINK: "link",
  TEXT_ACTION_DESTINATION: "destination",
  TEXT_ACTION_RECONNECT: "reconnect-confirmation"

}


/* Creates a new ConnectionMenu from only passing in an id.
 *
 * @id     (String) String used to assign unique ID value to test container.
 *
 * Returns the following object:
 *
 * {
 *   $node: <jQuery wrapped HTML element used for ConnectionMenu target>
 *   config: <mix of default config items and ID passed in>
 *   item: <ConnectionMenu instance created>
 *  }
 *
 **/
function createConnectionMenu(id, config) {
  var $container = $("#" + id + constants.ID_CONTAINER_SUFFIX);
  var $component = $("#" + id + constants.ID_COMPONENT_SUFFIX, $container);

  var response = `<div class="component component-dialog" id="` + id + constants.ID_RESPONSE_SUFFIX + `">
                    <h3>Heading content here</h3>
                    <p>Message content here</p>
                  </div>`;

  var conf = GlobalHelpers.mergeConfig({
    activator_text: constants.TEXT_ACTIVATOR,
    id: id,
    preventDefault: true,
    selection_event: constants.EVENT_SELECTION_NAME
  }, config);

  server = GlobalHelpers.createServer();
  server.respondWith("", [
    200,
    { "Content-Type": "text/html" },
    response,
  ]);

  return {
    $node: $component,
    config: conf,
    item: new ConnectionMenu($component, conf),
    response: response
  }
}


/* Set up the DOM to include template code for dialog
 * and anything else required.
 *
 * @id (String) Add an identifier to the container DIV to allow more than one at once.
 *
 **/
function setupView(id) {
  var $container = $(`
        <div class="activated-menu-test-container" id="` + id + constants.ID_CONTAINER_SUFFIX + `">
          <ul id="` + id + constants.ID_COMPONENT_SUFFIX + `"
              data-activator-text="` + constants.TEXT_ACTIVATOR + `Actions"
              data-activator-classname="` + constants.CLASSNAME_ACTIVATOR + `"
              data-title="` + constants.TEXT_TITLE + `"
              data-uuid="` + id + constants.ID_UUID_SUFFIX + `"
              data-condition-uuid="` + id + constants.ID_CONDITION_UUID_SUFFIX + `">
            <li data-action="` + constants.TEXT_ACTION_NONE + `">
              <span>` + constants.TEXT_ADD_PAGE_SINGLE + `</span>
              <ul>
                <li data-component-type="` + constants.TEXT_PAGE_TYPE_TEXT + `"><span>` + constants.TEXT_PAGE_TYPE_TEXT + `</span></li>
                <li data-component-type="` + constants.TEXT_PAGE_TYPE_TEXTAREA + `"><span>` + constants.TEXT_PAGE_TYPE_TEXTAREA + `</span></li>
                <li data-component-type="` + constants.TEXT_PAGE_TYPE_EMAIL + `"><span>` + constants.TEXT_PAGE_TYPE_EMAIL + `</span></li>
                <li data-component-type="` + constants.TEXT_PAGE_TYPE_NUMBER + `"><span>` + constants.TEXT_PAGE_TYPE_NUMBER + `</span></li>
                <li data-component-type="` + constants.TEXT_PAGE_TYPE_DATE + `"><span>` + constants.TEXT_PAGE_TYPE_DATE + `</span></li>
                <li data-component-type="` + constants.TEXT_PAGE_TYPE_RADIO + `"><span>` + constants.TEXT_PAGE_TYPE_RADIO + `</span></li>
                <li data-component-type="` + constants.TEXT_PAGE_TYPE_CHECKBOX + `"><span>` + constants.TEXT_PAGE_TYPE_CHECKBOX + `</span></li>
                <li data-component-type="` + constants.TEXT_PAGE_TYPE_AUTOCOMPLETE + `"><span>` + constants.TEXT_PAGE_TYPE_AUTOCOMPLETE + `</span></li>
                <li data-component-type="` + constants.TEXT_PAGE_TYPE_UPLOAD + `"><span>` + constants.TEXT_PAGE_TYPE_UPLOAD + `</span></li>
              </ul>
            </li>
            <li data-page-type="` + constants.TEXT_PAGE_TYPE_MULTI + `"><span>` + constants.TEXT_ADD_PAGE_MULTI + `</span></li
            <li data-page-type="` + constants.TEXT_PAGE_TYPE_CONTENT + `"><span>` + constants.TEXT_ADD_PAGE_CONTENT + `</span></li>
            <li data-page-type="` + constants.TEXT_PAGE_TYPE_EXIT + `"><span>` + constants.TEXT_ADD_PAGE_EXIT + `</span></li>
            <li data-action="` + constants.TEXT_ACTION_LINK + `">
              <a href="` + constants.TEXT_ADD_BRANCHING_URL + `">` + constants.TEXT_ADD_BRANCHING + `</a>
            </li>
            <li data-action="` + constants.TEXT_ACTION_DESTINATION + `">
              <a href="` + constants.TEXT_CHANGE_DESTINATION_URL + `">` + constants.TEXT_CHANGE_DESTINATION + `</a>
            </li>
            <li data-action="` + constants.TEXT_ACTION_RECONNECT + `">
              <a href="` + constants.TEXT_RECONNECT_CONFIRMATION_URL + `">` + constants.TEXT_RECONNECT_CONFIRMATION + `</a>
            </li>
          </ul>
        </div>
      `);

  $(document.body).append($container);
}


/* Reset DOM to pre setupView() state
 **/
function teardownView(id) {
  $("#" + id + constants.ID_CONTAINER_SUFFIX).remove();
  $("#" + id + constants.ID_COMPONENT_SUFFIX).parent(".ConnectionMenu").remove();
  $("#" + id + constants.ID_RESPONSE_SUFFIX).parent("[role=dialog]").remove();
}


module.exports = {
  constants: constants,
  createConnectionMenu: createConnectionMenu,
  setupView: setupView,
  teardownView: teardownView
}


