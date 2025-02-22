angular.module('angular-highlight', [])
  .directive('highlight', ["$compile", function($compile) {
    const component = function(scope, element, attrs) {
      if (!attrs.highlightClass) {
        attrs.highlightClass = 'angular-highlight';
      }
      
      function arrSearch(nameKey, myArray) {
        for (let i=0; i < myArray.length; i++) {
          const rx = new RegExp(myArray[i].match, "gi");

          if (nameKey.search(rx) > -1) {
            return myArray[i];
          }
        }
      }
      
      const rReplacer = function(match) {
        const resultObject = arrSearch(match, scope.replacement);
        let thisMode = false;

        // Fix issue with undefined variables, mostly from migrated configs.
        if (typeof resultObject.highlight !== 'undefined') {
          thisMode = resultObject.highlight;
        }
        
        let html = "";
        
        if (thisMode == "replace") {
          const thisRex = new RegExp(resultObject.match)
          html = match.replace(thisRex, resultObject.replace);
        } else {
          html = `
            <a href="#"
              ng-click="clickHandler('query','${match}'); $event.preventDefault();"
              data-toggle="popover"
              class="${attrs.highlightClass}"
              title="${resultObject.replace}"
              onmouseenter="$(this).tooltip(\'show\')"
            >
              ${match}
            </a>
          `;
        }

        return html;
      };
      
      const rTokenize = function(keywords) {
        let i;
        const l = keywords.length;
        const keyArr = [];

        for (i=0;i<l;i++) {
          keyArr.push(keywords[i].match.replace(new RegExp('^ | $','g'), ''));
        }

        return keyArr;
      };
      
      scope.$watch('replacement', function() {
        if (!scope.replacement || scope.replacement == '') {
          element.html(scope.highlight);
          return false;
        }
        
        const rTokenized = rTokenize(scope.replacement);
        const rRegex = new RegExp(rTokenized.join('|'), 'gmi');
        
        // Find the words
        const html = scope.highlight.replace(rRegex, rReplacer);
        element.html(
          $compile(`<span>${html}</span>`)(scope)
        );
      });
    };
    
    return {
      link: component,
      replace: false,
      scope: {
        highlight: '=',
        replacement: '=',
        clickHandler: '=',
      }
    };
  }]);
