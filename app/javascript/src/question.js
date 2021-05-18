/**
 * Question
 * ----------------------------------------------------
 * Description:
 * Basic construct of a standard question
 *
 * Documentation:
 *
 *     - Requires jQuery & jQueryUI
 *       https://api.jquery.com/
 *       https://api.jqueryui.com/
 *
 *     - TODO:
 *       (steven.burnell@digital.justice.gov.uk to add).
 *
 **/


import { mergeObjects } from './utilities';


class Question {
  constructor($node, config) {
    var conf = mergeObjects({
      data: {}
    }, config);

    $node.addClass("Question");
    this.$node = $node;
    this._config = conf;
  }

  data() {
    return this._config.data;
  }
}



export { Question }