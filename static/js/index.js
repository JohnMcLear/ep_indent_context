var underscore = require('ep_etherpad-lite/static/js/underscore');
var _ = underscore;
var padEditor;

/** *
*
* Once ace is initialized, we bind the functions to the context
*
***/
exports.aceInitialized = function (hook, context) {
  const editorInfo = context.editorInfo;
  editorInfo.ace_doGetLineNumber = underscore(exports.doGetLineNumber).bind(context); // What does underscore do here?
  editorInfo.ace_doSetLineNumber = underscore(exports.doSetLineNumber).bind(context); // What does underscore do here?
  editorInfo.ace_doRemoveLineNumber = underscore(exports.doRemoveLineNumber).bind(context); // What does underscore do here?
  padEditor = context.editorInfo.editor;
};


exports.postAceInit = function (name, context) {
  $('iframe[name="ace_outer"]').contents().find('#sidediv').append("<input id='inputsection' style='margin-top:3px;font-size:11px;line-height:14px;top:6px;position:absolute;width:20px;height:14px;display:none;'>");
  $('iframe[name="ace_outer"]').contents().find('#sidediv').append("<span id='inputsectionhidden' style='margin-top:3px;font-size:11px;line-height:14px;top:6px;position:absolute;height:14px;display:block;background-color:#000;font-family:arial;display:none;'></span>");

  $('.numbericon').on('click', (e) => {
    padEditor.callWithAce((ace) => { // call the function to apply the attribute inside ACE
      ace.ace_doRemoveLineNumber();
    }, 'number', true);
  });

  // Show the definition on a click event
  context.ace.callWithAce((ace) => {
    const doc = ace.ace_getDocument();
    const $inner = $(doc).find('#innerdocbody');
    // On click ensure all image controls are hidden
    $inner.on('click', 'div', function (e) {
      const topOffset = $(this).offset().top + 3; // Gets the offset from the top
      // this is used for putting an input in place

      // Get line number
      const lineNumber = $(this).prevAll().length;

      const clientX = e.clientX;
      const offset = 20;

      padEditor.callWithAce((ace) => { // call the function to apply the attribute inside ACE
        const content = ace.ace_doGetLineNumber(lineNumber); // Get the content of the line number section prefix

        // Write content to hidden span with same styling as parent.
        $('iframe[name="ace_outer"]').contents().find('#outerdocbody > #sidediv > #inputsectionhidden').text(content);

        // Get the width of the new contained with the content in
        let inputWidth = $('iframe[name="ace_outer"]').contents().find('#outerdocbody > #sidediv > #inputsectionhidden').width();
        // console.log("iW", inputWidth);
        if (inputWidth < 10) inputWidth = 10; // if its too small make it bigger
        inputWidth += 5;
        $('iframe[name="ace_outer"]').contents().find('#outerdocbody > #sidediv > #inputsection').css({width: `${inputWidth}px`});

        // Travel up the dom until we find the parent UL
        const ul = $(e.target).closest('ul'); // Gets the closest UL

        let elementLeft = $(ul).css('margin-left');
        if (elementLeft) {
          const clientX = e.clientX;
          elementLeft = elementLeft.replace('px', '');
          elementLeft = parseInt(elementLeft);

          const inputLeft = elementLeft + 33; // left of the input

          // This is a hack.  We can't get the actual width of a psuedo element so we only
          // check first 20 px ..
          const maxClient = elementLeft + inputWidth;

          // clientX = the left click location IE 150
          // elementLeft = Where the left Element starts
          // maxClient = The max X location a client can click before it's no longer used.
          const counterClicked = clientX < maxClient;

          // console.log("mC", maxClient);
          // console.log("cX", clientX);
          // console.log("cC", counterClicked);
          if (counterClicked) {
            $('iframe[name="ace_outer"]').contents().find('#outerdocbody > #sidediv > #inputsection').css({left: `${inputLeft}px`});
            // I need to get line number..
            changeSection(lineNumber, topOffset);
          }
        }
      }, 'number', true);
      /*
      // Click offset was < 20px so must be wanting to change line number
      // This happens on none nested items which we hope to avoid when we switch to OL
      if(clientX <= offset){
        $('iframe[name="ace_outer"]').contents().find('#outerdocbody > #sidediv > #inputsection').css({"left":"26px"});
        changeSection(lineNumber, topOffset);
        return;
      }
*/
    });
  });
};

function changeSection(lineNumber, topOffset) {
  const input = $('iframe[name="ace_outer"]').contents().find('#inputsection').css({top: `${topOffset}px`, display: 'block'});
  input.off('keydown'); // Remove the event binding
  input.val('');
  input.focus();
  input.on('keydown', (e) => {
    if (e.keyCode === 13) { // On enter key
      padEditor.callWithAce((ace) => { // call the function to apply the attribute inside ACE
        ace.ace_doSetLineNumber(lineNumber, input.val());
      }, 'number', true);
      input.hide(); // Remove the input box
      input.off('keydown'); // Remove the event binding
    }
  });
  input.on('blur', (e) => {
    input.hide();
    input.off('keydown'); // Remove the event binding
  });
}

/** *
 *
 * Get line Attribute
 *
 ***/
exports.doGetLineNumber = function (lineNumber) {
  const documentAttributeManager = this.documentAttributeManager;
  return documentAttributeManager.getAttributeOnLine(lineNumber, 'number'); // remove the line attribute
};

/** *
 *
 * Set line Attribute
 *
 ***/
exports.doSetLineNumber = function (lineNumber, value) {
  const documentAttributeManager = this.documentAttributeManager;
  if (value === '') value = ' ';
  // documentAttributeManager.removeAttributeOnLine(lineNumber, 'number'); // remove the line attribute
  documentAttributeManager.setAttributeOnLine(lineNumber, 'number', value); // make it done
};

/** *
 *
 * Remove line Attribute
 *
 ***/
exports.doRemoveLineNumber = function () {
  const rep = {};
  rep.selStart = this.rep.selStart;
  rep.selEnd = this.rep.selEnd;
  const documentAttributeManager = this.documentAttributeManager;

  let firstLine, lastLine;
  firstLine = rep.selStart[0];
  lastLine = Math.max(firstLine, rep.selEnd[0] - ((rep.selEnd[1] === 0) ? 1 : 0));
  _(_.range(firstLine, lastLine + 1)).each((lineNumber) => {
    documentAttributeManager.removeAttributeOnLine(lineNumber, 'number'); // remove the line attribute
  });
};


/** *
 *
 *  Format the line based on the attribute
 *
 ***/
exports.aceDomLinePreProcessLineAttributes = function (name, context) {
  // Takes class values and parses them..  So we'd already need the class here..
  if (context.cls.indexOf('number') !== -1) var type = 'number';
  const value = /(?:^| )number:([%A-Za-z0-9]*)/.exec(context.cls);
  if (value && value[1]) {
    const className = value[1];
    const modifier = {
      preHtml: `<number class="number number${className}">`,
      postHtml: '</number>',
      processedMarker: true,
    };
    return [modifier]; // return the modifier
  }
  return []; // or return nothing
};

/** *
 *
 * Turn attributes into classes
 *
 ***/
exports.aceAttribsToClasses = function (hook, context) {
  if (context.key == 'number') {
    // We make a UID!  Pretty fancy huh!  This means we can have
    // Escaped requiring chars such as f00$ in as a prefix
    const className = makeid();
    const inner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
    const head = inner.contents().find('head');
    const content = context.value;

    // First one might not be needed
    //    head.append("<style>.number"+content+" before{content:'' !important;}</style>");
    // This one isn't strict enough
    //    head.append("<style>.number"+content+":first-child:not(ul):before{content:'"+content+"' !important;}</style>");

    head.append(`<style>.number${className}:first-child:not(ul):before{display:none;content:'' !important;}</style>`);
    head.append(`<style>.number${className} > ul > li:before{content:'${content}' !important;}</style>`);
    const str = `number:${className}`;
    return [str];
  }
};

// Block elements - Prevents character walking
exports.aceRegisterBlockElements = function () {
  return ['number'];
};

function makeid() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
