var underscore = require('ep_etherpad-lite/static/js/underscore');
var _ = underscore;
var padEditor;

/***
*
* Once ace is initialized, we bind the functions to the context
*
***/
exports.aceInitialized = function(hook, context){
  var editorInfo = context.editorInfo;
  editorInfo.ace_doSetLineNumber = underscore(exports.doSetLineNumber).bind(context); // What does underscore do here?
  editorInfo.ace_doRemoveLineNumber = underscore(exports.doRemoveLineNumber).bind(context); // What does underscore do here?
  padEditor = context.editorInfo.editor;
}

exports.postAceInit = function(name, context){

  $('iframe[name="ace_outer"]').contents().find('#sidediv').append("<input id='inputsection' style='margin-top:3px;font-size:11px;line-height:14px;top:6px;position:absolute;width:20px;height:14px;display:none;'>");

  $(".numbericon").on("click", function(e){
    padEditor.callWithAce(function(ace){ // call the function to apply the attribute inside ACE
      ace.ace_doRemoveLineNumber();
    }, 'number', true);
  });

  // Show the definition on a click event
  context.ace.callWithAce(function(ace){
    var doc = ace.ace_getDocument();
    var $inner = $(doc).find('#innerdocbody');
    // On click ensure all image controls are hidden
    $inner.on("click", "div", function(e){
      var topOffset = $(this).offset().top +3; // Gets the offset from the top
      // this is used for putting an input in place

      // Get line number
      var lineNumber = $(this).prevAll().length;

      var clientX = e.clientX;
      var offset = 20;
      // Click offset was < 20px so must be wanting to change line number
      if(clientX <= offset){
        $('iframe[name="ace_outer"]').contents().find('#outerdocbody > #sidediv > #inputsection').css({"left":"26px"});
        changeSection(lineNumber, topOffset);
        return;
      }

      // Travel up the dom until we find the parent UL
      var ul = $(e.target).closest("ul"); // Gets the closest UL

      var elementLeft = $(ul).css("margin-left");
      if(elementLeft){
        var clientX = e.clientX;
        elementLeft = elementLeft.replace("px", "");
        elementLeft = parseInt(elementLeft);
        var inputLeft = elementLeft + 25; // left of the input

        // This is a hack.  We can't get the actual width of a psuedo element so we only
        // check first 20 px ..
        var maxClient = elementLeft +offset;

        // clientX = the left click location IE 150
        // elementLeft = Where the left Element starts
        // maxClient = The max X location a client can click before it's no longer used.
        var counterClicked = clientX < maxClient;

        // console.log("mC", maxClient);
        // console.log("cX", clientX);
        // console.log("cC", counterClicked);
        if(counterClicked){
          $('iframe[name="ace_outer"]').contents().find('#outerdocbody > #sidediv > #inputsection').css({"left":inputLeft+"px"});
          // I need to get line number..
          changeSection(lineNumber, topOffset);
        }
        
       }
    });
  });
}

function changeSection(lineNumber, topOffset){
  var input = $('iframe[name="ace_outer"]').contents().find('#inputsection').css({"top": topOffset+"px","display":"block"});
  input.off("keydown"); // Remove the event binding
  input.val("");
  input.focus();
  input.on("keydown", function(e){
    if(e.keyCode === 13){ // On enter key
      padEditor.callWithAce(function(ace){ // call the function to apply the attribute inside ACE
        ace.ace_doSetLineNumber(lineNumber, input.val());
      }, 'number', true);
      input.hide(); // Remove the input box
      input.off("keydown"); // Remove the event binding
    }
  });
  input.on("blur", function(e){
    // input.hide();
    input.off("keydown"); // Remove the event binding
  });
};

/***
 *
 * Set line Attribute
 *
 ***/
exports.doSetLineNumber = function(lineNumber,  value){
  var documentAttributeManager = this.documentAttributeManager;
  if(value === "") value = " ";
  // documentAttributeManager.removeAttributeOnLine(lineNumber, 'number'); // remove the line attribute
  documentAttributeManager.setAttributeOnLine(lineNumber, 'number', value); // make it done
}

/***
 *
 * Remove line Attribute
 *
 ***/
exports.doRemoveLineNumber = function(){
  var rep = {};
  rep.selStart = this.rep.selStart;
  rep.selEnd = this.rep.selEnd;
  var documentAttributeManager = this.documentAttributeManager;

  var firstLine, lastLine;
  firstLine = rep.selStart[0];
  lastLine = Math.max(firstLine, rep.selEnd[0] - ((rep.selEnd[1] === 0) ? 1 : 0));
  _(_.range(firstLine, lastLine + 1)).each(function(lineNumber){
    documentAttributeManager.removeAttributeOnLine(lineNumber, 'number'); // remove the line attribute
  });
}



/***
 * 
 *  Format the line based on the attribute
 * 
 ***/
exports.aceDomLinePreProcessLineAttributes = function(name, context){
  // Takes class values and parses them..  So we'd already need the class here..
  if( context.cls.indexOf("number") !== -1) var type="number";
  var value = /(?:^| )number:([%A-Za-z0-9]*)/.exec(context.cls);  
  if (value && value[1]){
    var className = value[1];
    var modifier = {
      preHtml: '<number class="number number'+className+'">',
      postHtml: '</number>',
      processedMarker: true
    };
    return [modifier]; // return the modifier
  }
  return []; // or return nothing
};

/***
 *
 * Turn attributes into classes
 *
 ***/
exports.aceAttribsToClasses = function(hook, context){
  if(context.key == 'number'){
    // We make a UID!  Pretty fancy huh!  This means we can have
    // Escaped requiring chars such as f00$ in as a prefix
    var className = makeid();
    var inner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
    var head = inner.contents().find("head");
    var content = context.value;

// First one might not be needed
//    head.append("<style>.number"+content+" before{content:'' !important;}</style>");
// This one isn't strict enough
//    head.append("<style>.number"+content+":first-child:not(ul):before{content:'"+content+"' !important;}</style>");

    head.append("<style>.number"+className+":first-child:not(ul):before{display:none;content:'' !important;}</style>");
    head.append("<style>.number"+className+" > ul > li:before{content:'"+content+"' !important;}</style>");
    var str = "number:"+className;
    return [str];
  }
}

// Block elements - Prevents character walking
exports.aceRegisterBlockElements = function(){
  return ['number'];
}

function makeid()
{
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for( var i=0; i < 5; i++ ){
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
