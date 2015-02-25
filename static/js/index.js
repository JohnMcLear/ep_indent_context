var underscore = require('ep_etherpad-lite/static/js/underscore');
var padEditor;

/***
*
* Once ace is initialized, we bind the functions to the context
*
***/
exports.aceInitialized = function(hook, context){
  var editorInfo = context.editorInfo;
  editorInfo.ace_doSetLineNumber = underscore(exports.doSetLineNumber).bind(context); // What does underscore do here?
  padEditor = context.editorInfo.editor;
}

exports.postAceInit = function(name, context){

  // Show the definition on a click event
  context.ace.callWithAce(function(ace){
    var doc = ace.ace_getDocument();
    var $inner = $(doc).find('#innerdocbody');
    // On click ensure all image controls are hidden
    $inner.on("click", "div", function(e){
      // Get line number
      var lineNumber = $(this).prevAll().length;

      var clientX = e.clientX;
      var offset = 20;
      // Click offset was < 20px so must be wanting to change line number
      if(clientX <= offset){
        changeSection(lineNumber);
        return;
      }

      // Travel up the dom until we find the parent UL
      var ul = $(e.target).closest("ul"); // Gets the closest UL

      var elementLeft = $(ul).css("margin-left");
      if(elementLeft){
        var clientX = e.clientX;
        elementLeft = elementLeft.replace("px", "");
        elementLeft = parseInt(elementLeft);

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
          // I need to get line number..
          changeSection(lineNumber);
        }
        
       }
    });
  });
}

function changeSection(lineNumber){
  var value = prompt("Change Line Number");
  value = escape(value);
  padEditor.callWithAce(function(ace){ // call the function to apply the attribute inside ACE
    ace.ace_doSetLineNumber(lineNumber, value);
  }, 'number', true); // TODO what's the second attribute do here?
};

/***
 *
 * Toggle the line Attribute
 *
 ***/
exports.doSetLineNumber = function(lineNumber,  value){
  var documentAttributeManager = this.documentAttributeManager;
  var isDone = documentAttributeManager.getAttributeOnLine(lineNumber, 'number');
  if(!value){
    documentAttributeManager.removeAttributeOnLine(lineNumber, 'number'); // remove the line attribute
  }else{
    documentAttributeManager.setAttributeOnLine(lineNumber, 'number', value); // make it done
  }
}



/***
 * 
 *  Format the line based on the attribute
 * 
 ***/
exports.aceDomLinePreProcessLineAttributes = function(name, context){
  if( context.cls.indexOf("number") !== -1) var type="number";
  var value = /(?:^| )number:([%A-Za-z0-9]*)/.exec(context.cls);  
  if (value && value[1]){
    var className = value[1].replace(/%20| /g, '-');
    
    // Add CSS to head, just for trial
    var inner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
    var head = inner.contents().find("head");
// First one might not be needed
//    head.append("<style>.number"+value[1]+" before{content:'' !important;}</style>");
// This one isn't strict enough
//    head.append("<style>.number"+value[1]+":first-child:not(ul):before{content:'"+value[1]+"' !important;}</style>");
    head.append("<style>.number"+className+":first-child:not(ul):before{display:none;content:'' !important;}</style>");
    head.append("<style>.number"+className+" > ul > li:before{content:'"+unescape(value[1])+"' !important;}</style>");

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
    var str = "number:"+context.value;
    return [str];
  }
}

// Block elements - Prevents character walking
exports.aceRegisterBlockElements = function(){
  return ['number'];
}
