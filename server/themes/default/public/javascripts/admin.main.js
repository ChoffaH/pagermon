angular.module('app', ['ngRoute', 'ngResource', 'angular-uuid', 'color.picker', 'ui.validate', 'textAngular', 'ngFileSaver', 'angular-sortable-view'])
    // Service
    .factory('Api', ['$resource',
     function($resource) {
      return {
        Aliases: $resource('/api/capcodes/', null, {
          'delete': { method:'DELETE', hasBody: true }
        }),
        AliasDetail: $resource('/api/capcodes/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false },
          'delete': { method: 'DELETE', isArray: false}
        }),
        Settings: $resource('/admin/settingsData', null, {
          'post': { method:'POST', isArray: false }
        }),
        AliasDupeCheck: $resource('/api/capcodeCheck/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false }
        }),
        AliasRefresh: $resource('/api/capcodeRefresh', null, {
          'post': { method:'POST', isArray: false }
        }),
        AliasExport: $resource('/api/capcodeExport', null, {
          'post': { method:'POST', isArray: false }
        }),
        AliasImport: $resource('/api/capcodeImport', null, {
          'post': { method:'POST', isArray: false }
        }),
        Users: $resource('/api/user', null, {
        }),
        UserDetail: $resource('/api/user/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false }
        }),
        UsernameCheck: $resource('/api/userCheck/username/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false }
        }),
        UseremailCheck: $resource('/api/userCheck/email/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false }
        }),
      };
    }])

    // Controller
    .controller('AliasController', ['$scope', 'Api', '$filter', '$location', '$timeout', 'FileSaver', function ($scope, Api, $filter, $location, $timeout, FileSaver) {
      $scope.loading = true;
      $scope.alertMessage = {};

      Api.Aliases.query(null, function(results) {
        $scope.aliases = results;
        $scope.page = 'aliases';
        $scope.loading = false;
      });

      Api.Settings.get(null, function(results) {
        if (results?.settings?.database?.aliasRefreshRequired == 1) {
          $scope.showAlertMessage('Alias refresh required!', 'alert-warning');
          $scope.aliasRefreshRequired = 1;
        }
      });

      $scope.showAlertMessage = function(message, type) {
        $scope.alertMessage.text = message;
        $scope.alertMessage.type = type;
        $scope.alertMessage.show = true;
        $timeout(function () {
          $scope.alertMessage.show = false;
        }, 3000);
      };

      $scope.modalConfirmed = function () {
        if ($scope.modal?.confirmAction) {
          $scope.modal.confirmAction();
        }
      };

      $scope.aliasDetail = function (alias_id) {
        $location.url('/aliases/' + alias_id);
      };

      $scope.aliasMessages = function (alias_id) {
        $location.url('../../?alias=' + alias_id);
      }

      $scope.selectedAliases = function () {
        let selected = [];

        if ($scope.aliases) {
          selected = $filter("filter")($scope.aliases, {
            selected: true
          });
        }

        return selected;
      };

      $scope.hasAliasSelection = function () {
        return $scope.selectedAliases().length > 0;
      };

      $scope.aliasRefresh = function () {
        $scope.loading = true;
        $scope.alertMessage = {};

        Api.AliasRefresh.post(null, null).$promise.then(function (response) {
          $scope.loading = false;

          if (response.status == 'ok') {
            $scope.showAlertMessage('Alias refresh complete!', 'alert-success');
            $scope.aliasRefreshRequired = 0;
          } else {
            $scope.showAlertMessage('Error refreshing aliases: ' + response.data.error, 'alert-danger');
          }
        }, function(response) {
          $scope.showAlertMessage('Error refreshing aliases: ' + response.data.error, 'alert-danger');
          $scope.loading = false;
        });
      };

      $scope.aliasImport = function () {
        const importModal = document.getElementById("importModal");
        bootstrap.Modal.getOrCreateInstance(importModal).show();
      };

      $scope.aliasImportConfirmed = function () {
        const filename = document.getElementById("importcsv");
        $scope.loading = true;

        if (filename.value.length >= 1) {
          const file = filename.files[0];

          if (file) {
            const reader = new FileReader();

            reader.onload = function (e) {
              const rows = e.target.result.split("\n");

              Api.AliasImport.post(rows).$promise.then(function (response) {
                $scope.loading = false;
                $scope.modal = {
                  title: "Import Results",
                  body: `
                    <table class="table table-striped">
                      <thead>
                      <tr>
                        <th>Address</th>
                        <th>Alias</th>
                        <th>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${response.results.map(result => `
                          <tr>
                            <td>${result.address}</td>
                            <td>${result.alias}</td>
                            <td>${result.result}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  `,
                  confirm: "Ok",
                  confirmClass: "btn-success",
                  confirmAction: $scope.aliasImportDone,
                  hideCancel: true,
                };

                const confirmModal = document.getElementById("confirmModal");
                bootstrap.Modal.getOrCreateInstance(confirmModal).show();
              }, function (response) {
                $scope.loading = false;
                $scope.showAlertMessage('Error importing aliases: ' + response.data.error, 'alert-danger');
              })
            }

            reader.readAsText(file);
          }
        }
      };

      $scope.aliasImportDone = function () {
        $scope.aliasRefreshRequired = 1;
        $location.url('/aliases/');
      };

      $scope.aliasExport = function () {
        $scope.loading = true;
        $scope.alertMessage = {};

        Api.AliasExport.post(null, null).$promise.then(function (response) {
          $scope.loading = false;

          if (response.data) {
            var blob = new Blob([response.data], {type: "text/csv;charset=utf-8"});
            FileSaver.saveAs(blob, "export.csv");

            $scope.showAlertMessage('Alias export complete!', 'alert-success');
          } else {
            $scope.showAlertMessage('Error exporting aliases: ' + response.data.error, 'alert-danger');
          }
        }, function(response) {
          $scope.showAlertMessage('Error exporting aliases: ' + response.data.error, 'alert-danger');
          $scope.loading = false;
        });
      };

      $scope.aliasDelete = function () {
        const confirmModal = document.getElementById("confirmModal");
        const numSelected = $scope.selectedAliases().length;

        $scope.modal = {
          title: "Delete Aliases",
          body: `
            <div>Are you sure you want to delete these aliases?</div>
            <strong>There are ${numSelected} aliases selected for deletion.</strong>
          `,
          confirm: "Delete",
          confirmClass: "btn-danger",
          confirmAction: $scope.aliasDeleteConfirmed,
        };

        bootstrap.Modal.getOrCreateInstance(confirmModal).show();
      };

      $scope.aliasDeleteConfirmed = function () {
        $scope.loading = true;
        $scope.selectedAll = false
        const data = {
          deleteList: $scope.selectedAliases().map(alias => alias.id)
        };

        Api.AliasDetail.post({id: 'deleteMultiple' }, data).$promise.then(function (response) {
          $scope.loading = false;

          if (response.status == 'ok') {
            $scope.showAlertMessage('Aliases deleted!', 'alert-success');
            $scope.aliasRefreshRequired = 1;
            $location.url('/aliases/');
          } else {
            $scope.showAlertMessage('Error deleting aliases: ' + response.data.error, 'alert-danger');
          }
        }, function(response) {
          $scope.showAlertMessage('Error deleting aliases: ' + response.data.error, 'alert-danger');
          $scope.loading = false;
        });
      };
    }])
    
    .controller('AliasDetailCtrl', ['$scope', '$routeParams', 'Api', '$location', '$timeout', function ($scope, $routeParams, Api, $location, $timeout) {
      $scope.page = 'aliasDetail';
      $scope.hasEnabledPlugins = false;
      $scope.alertMessage = {};
      $scope.colorOptions = {
        required: true,
        inputClass: 'form-control',
        id: 'alias.color',
        name: 'alias.color',
        format: 'hexString',
        saturation: true,
        alpha: false
      };

      Api.Settings.get(null, function(results) {
        if (results) {
          if (results.database && results.database.aliasRefreshRequired == 1) {
            $scope.aliasRefreshRequired = 1;
          }
          $scope.settings = results.settings;
          $scope.plugins = results.plugins;
          $scope.themes = results.themes;

          $scope.hasEnabledPlugins = $scope.plugins.some(plugin => $scope.settings.plugins[plugin.name]?.enable);
        }
        $scope.aliasLoad();
      });

      $scope.showAlertMessage = function(message, type) {
        $scope.alertMessage.text = message;
        $scope.alertMessage.type = type;
        $scope.alertMessage.show = true;
        $timeout(function () {
          $scope.alertMessage.show = false;
        }, 3000);
      };

      $scope.modalConfirmed = function () {
        if ($scope.modal?.confirmAction) {
          $scope.modal.confirmAction();
        }
      };

      $scope.aliasDetail = function(address) {
          $location.url('/aliases/' + address);
      };

      $scope.applyTemplate = function(template) {
        $scope.alias.agency = template.agency ?? "";
        $scope.alias.icon = template.icon ?? "";
        $scope.alias.color = template.color ?? "";
        $scope.alias.filter = template.filter ? true : false;
      };

      $scope.aliasLoad = function() {
        $scope.loading = true;

        Api.AliasDetail.get({id: $routeParams.id }, function(results) {
          $scope.alias = results;
          $scope.aliasLoading = false;
          $scope.existingAddress = false;
          $scope.loading = false;

          if (results.pluginconf) {
            $scope.plugins.forEach(plugin => {
              if (!$scope.alias.pluginconf[plugin.name]) {
                $scope.alias.pluginconf[plugin.name] = {};
              }
            });
          } else {
            // populate pluginconf
            $scope.alias.pluginconf = {};
            $scope.plugins.forEach(plugin => {
              $scope.alias.pluginconf[plugin.name] = {};
            });
          }

          if (results.address) {
            $scope.alias.originalAddress = results.address;
            $scope.isNew = false;
          } else {
            $scope.alias.address = $routeParams.address || '';
            $scope.alias.originalAddress = $routeParams.address || '';
            $scope.isNew = true;
          }
        });
      };

      // controls the form validation on the address field
      $scope.checkAddress = function() {
        $scope.aliasLoading = true;

        if ($scope.alias.address) {
          Api.AliasDupeCheck.get({id: $scope.alias.address }, function(results) {
            if (results.address) {
              $scope.aliasLoading = false;
              if (results.address == $scope.alias.originalAddress) {
                $scope.existingAddress = false;
                return false;
              } else {
                $scope.existingID = results.id;
                $scope.existingAddress = true;
                return true;
              }
            } else {
              $scope.aliasLoading = false;
              $scope.existingAddress = false;
              return false;
            }
          });
        } else {
          $scope.aliasLoading = false;
          $scope.existingAddress = false;
          return false;
        }
      };

      $scope.aliasSubmit = function() {
        if ($scope.existingAddress) {
          $scope.showAlertMessage('Error saving alias: Alias with this address already exists.', 'alert-danger');
        } else {
          $scope.loading = true;
          let id = $routeParams.id || "new";

          Api.AliasDetail.save({ id: id }, $scope.alias).$promise.then(function (response) {
            if (response.status == 'ok') {
                $location.url('/aliases');
            } else {
              $scope.showAlertMessage('Error saving alias: ' + response, 'alert-danger');
              $scope.loading = false;
            }
          }, function (response) {
            $scope.showAlertMessage('Error saving alias: ' + response.data.error, 'alert-danger');
            $scope.loading = false;
          });
        }
      };

      $scope.aliasDelete = function () {
        const confirmModal = document.getElementById("confirmModal");

        $scope.modal = {
          title: "Delete Alias",
          body: `
            <div>Are you sure you want to delete this alias?</div>
          `,
          confirm: "Delete",
          confirmClass: "btn-danger",
          confirmAction: $scope.aliasDeleteConfirmed,
        };

        bootstrap.Modal.getOrCreateInstance(confirmModal).show();
      };

      $scope.aliasDeleteConfirmed = function () {
        $scope.loading = true;

        Api.AliasDetail.delete({id: $routeParams.id }, $scope.alias).$promise.then(function (response) {
          if (response.status == 'ok') {
            $scope.loading = false;
            $scope.showAlertMessage('Alias deleted!', 'alert-success');
            $location.url('/aliases/');
          } else {
            $scope.loading = false;
            $scope.showAlertMessage('Error deleting alias: ' + response.data.error, 'alert-danger');
          }
        }, function(response) {
          $scope.loading = false;
          $scope.showAlertMessage('Error deleting alias: ' + response.data.error, 'alert-danger');
        });
      };

      //FontAwesome v5 Icons for Helper
      $scope.faIcons = ["ad","address-book","address-card","adjust","air-freshener","align-center","align-justify","align-left","align-right","allergies","ambulance","american-sign-language-interpreting","anchor","angle-double-down","angle-double-left","angle-double-right","angle-double-up","angle-down","angle-left","angle-right","angle-up","angry","ankh","apple-alt","archive","archway","arrow-alt-circle-down","arrow-alt-circle-left","arrow-alt-circle-right","arrow-alt-circle-up","arrow-circle-down","arrow-circle-left","arrow-circle-right","arrow-circle-up","arrow-down","arrow-left","arrow-right","arrow-up","arrows-alt","arrows-alt-h","arrows-alt-v","assistive-listening-systems","asterisk","at","atlas","atom","audio-description","award","baby","baby-carriage","backspace","backward","bacon","bacteria","bacterium","bahai","balance-scale","balance-scale-left","balance-scale-right","ban","band-aid","barcode","bars","baseball-ball","basketball-ball","bath","battery-empty","battery-full","battery-half","battery-quarter","battery-three-quarters","bed","beer","bell","bell-slash","bezier-curve","bible","bicycle","biking","binoculars","biohazard","birthday-cake","blender","blender-phone","blind","blog","bold","bolt","bomb","bone","bong","book","book-dead","book-medical","book-open","book-reader","bookmark","border-all","border-none","border-style","bowling-ball","box","box-open","box-tissue","boxes","braille","brain","bread-slice","briefcase","briefcase-medical","broadcast-tower","broom","brush","bug","building","bullhorn","bullseye","burn","bus","bus-alt","business-time","calculator","calendar","calendar-alt","calendar-check","calendar-day","calendar-minus","calendar-plus","calendar-times","calendar-week","camera","camera-retro","campground","candy-cane","cannabis","capsules","car","car-alt","car-battery","car-crash","car-side","caravan","caret-down","caret-left","caret-right","caret-square-down","caret-square-left","caret-square-right","caret-square-up","caret-up","carrot","cart-arrow-down","cart-plus","cash-register","cat","certificate","chair","chalkboard","chalkboard-teacher","charging-station","chart-area","chart-bar","chart-line","chart-pie","check","check-circle","check-double","check-square","cheese","chess","chess-bishop","chess-board","chess-king","chess-knight","chess-pawn","chess-queen","chess-rook","chevron-circle-down","chevron-circle-left","chevron-circle-right","chevron-circle-up","chevron-down","chevron-left","chevron-right","chevron-up","child","church","circle","circle-notch","city","clinic-medical","clipboard","clipboard-check","clipboard-list","clock","clone","closed-captioning","cloud","cloud-download-alt","cloud-meatball","cloud-moon","cloud-moon-rain","cloud-rain","cloud-showers-heavy","cloud-sun","cloud-sun-rain","cloud-upload-alt","cocktail","code","code-branch","coffee","cog","cogs","coins","columns","comment","comment-alt","comment-dollar","comment-dots","comment-medical","comment-slash","comments","comments-dollar","compact-disc","compass","compress","compress-alt","compress-arrows-alt","concierge-bell","cookie","cookie-bite","copy","copyright","couch","credit-card","crop","crop-alt","cross","crosshairs","crow","crown","crutch","cube","cubes","cut","database","deaf","democrat","desktop","dharmachakra","diagnoses","dice","dice-d20","dice-d6","dice-five","dice-four","dice-one","dice-six","dice-three","dice-two","digital-tachograph","directions","disease","divide","dizzy","dna","dog","dollar-sign","dolly","dolly-flatbed","donate","door-closed","door-open","dot-circle","dove","download","drafting-compass","dragon","draw-polygon","drum","drum-steelpan","drumstick-bite","dumbbell","dumpster","dumpster-fire","dungeon","edit","egg","eject","ellipsis-h","ellipsis-v","envelope","envelope-open","envelope-open-text","envelope-square","equals","eraser","ethernet","euro-sign","exchange-alt","exclamation","exclamation-circle","exclamation-triangle","expand","expand-alt","expand-arrows-alt","external-link-alt","external-link-square-alt","eye","eye-dropper","eye-slash","fan","fast-backward","fast-forward","faucet","fax","feather","feather-alt","female","fighter-jet","file","file-alt","file-archive","file-audio","file-code","file-contract","file-csv","file-download","file-excel","file-export","file-image","file-import","file-invoice","file-invoice-dollar","file-medical","file-medical-alt","file-pdf","file-powerpoint","file-prescription","file-signature","file-upload","file-video","file-word","fill","fill-drip","film","filter","fingerprint","fire","fire-alt","fire-extinguisher","first-aid","fish","fist-raised","flag","flag-checkered","flag-usa","flask","flushed","folder","folder-minus","folder-open","folder-plus","font","football-ball","forward","frog","frown","frown-open","funnel-dollar","futbol","gamepad","gas-pump","gavel","gem","genderless","ghost","gift","gifts","glass-cheers","glass-martini","glass-martini-alt","glass-whiskey","glasses","globe","globe-africa","globe-americas","globe-asia","globe-europe","golf-ball","gopuram","graduation-cap","greater-than","greater-than-equal","grimace","grin","grin-alt","grin-beam","grin-beam-sweat","grin-hearts","grin-squint","grin-squint-tears","grin-stars","grin-tears","grin-tongue","grin-tongue-squint","grin-tongue-wink","grin-wink","grip-horizontal","grip-lines","grip-lines-vertical","grip-vertical","guitar","h-square","hamburger","hammer","hamsa","hand-holding","hand-holding-heart","hand-holding-medical","hand-holding-usd","hand-holding-water","hand-lizard","hand-middle-finger","hand-paper","hand-peace","hand-point-down","hand-point-left","hand-point-right","hand-point-up","hand-pointer","hand-rock","hand-scissors","hand-sparkles","hand-spock","hands","hands-helping","hands-wash","handshake","handshake-alt-slash","handshake-slash","hanukiah","hard-hat","hashtag","hat-cowboy","hat-cowboy-side","hat-wizard","hdd","head-side-cough","head-side-cough-slash","head-side-mask","head-side-virus","heading","headphones","headphones-alt","headset","heart","heart-broken","heartbeat","helicopter","highlighter","hiking","hippo","history","hockey-puck","holly-berry","home","horse","horse-head","hospital","hospital-alt","hospital-symbol","hospital-user","hot-tub","hotdog","hotel","hourglass","hourglass-end","hourglass-half","hourglass-start","house-damage","house-user","hryvnia","i-cursor","ice-cream","icicles","icons","id-badge","id-card","id-card-alt","igloo","image","images","inbox","indent","industry","infinity","info","info-circle","italic","jedi","joint","journal-whills","kaaba","key","keyboard","khanda","kiss","kiss-beam","kiss-wink-heart","kiwi-bird","landmark","language","laptop","laptop-code","laptop-house","laptop-medical","laugh","laugh-beam","laugh-squint","laugh-wink","layer-group","leaf","lemon","less-than","less-than-equal","level-down-alt","level-up-alt","life-ring","lightbulb","link","lira-sign","list","list-alt","list-ol","list-ul","location-arrow","lock","lock-open","long-arrow-alt-down","long-arrow-alt-left","long-arrow-alt-right","long-arrow-alt-up","low-vision","luggage-cart","lungs","lungs-virus","magic","magnet","mail-bulk","male","map","map-marked","map-marked-alt","map-marker","map-marker-alt","map-pin","map-signs","marker","mars","mars-double","mars-stroke","mars-stroke-h","mars-stroke-v","mask","medal","medkit","meh","meh-blank","meh-rolling-eyes","memory","menorah","mercury","meteor","microchip","microphone","microphone-alt","microphone-alt-slash","microphone-slash","microscope","minus","minus-circle","minus-square","mitten","mobile","mobile-alt","money-bill","money-bill-alt","money-bill-wave","money-bill-wave-alt","money-check","money-check-alt","monument","moon","mortar-pestle","mosque","motorcycle","mountain","mouse","mouse-pointer","mug-hot","music","network-wired","neuter","newspaper","not-equal","notes-medical","object-group","object-ungroup","oil-can","om","otter","outdent","pager","paint-brush","paint-roller","palette","pallet","paper-plane","paperclip","parachute-box","paragraph","parking","passport","pastafarianism","paste","pause","pause-circle","paw","peace","pen","pen-alt","pen-fancy","pen-nib","pen-square","pencil-alt","pencil-ruler","people-arrows","people-carry","pepper-hot","percent","percentage","person-booth","phone","phone-alt","phone-slash","phone-square","phone-square-alt","phone-volume","photo-video","piggy-bank","pills","pizza-slice","place-of-worship","plane","plane-arrival","plane-departure","plane-slash","play","play-circle","plug","plus","plus-circle","plus-square","podcast","poll","poll-h","poo","poo-storm","poop","portrait","pound-sign","power-off","pray","praying-hands","prescription","prescription-bottle","prescription-bottle-alt","print","procedures","project-diagram","pump-medical","pump-soap","puzzle-piece","qrcode","question","question-circle","quidditch","quote-left","quote-right","quran","radiation","radiation-alt","rainbow","random","receipt","record-vinyl","recycle","redo","redo-alt","registered","remove-format","reply","reply-all","republican","restroom","retweet","ribbon","ring","road","robot","rocket","route","rss","rss-square","ruble-sign","ruler","ruler-combined","ruler-horizontal","ruler-vertical","running","rupee-sign","sad-cry","sad-tear","satellite","satellite-dish","save","school","screwdriver","scroll","sd-card","search","search-dollar","search-location","search-minus","search-plus","seedling","server","shapes","share","share-alt","share-alt-square","share-square","shekel-sign","shield-alt","shield-virus","ship","shipping-fast","shoe-prints","shopping-bag","shopping-basket","shopping-cart","shower","shuttle-van","sign","sign-in-alt","sign-language","sign-out-alt","signal","signature","sim-card","sink","sitemap","skating","skiing","skiing-nordic","skull","skull-crossbones","slash","sleigh","sliders-h","smile","smile-beam","smile-wink","smog","smoking","smoking-ban","sms","snowboarding","snowflake","snowman","snowplow","soap","socks","solar-panel","sort","sort-alpha-down","sort-alpha-down-alt","sort-alpha-up","sort-alpha-up-alt","sort-amount-down","sort-amount-down-alt","sort-amount-up","sort-amount-up-alt","sort-down","sort-numeric-down","sort-numeric-down-alt","sort-numeric-up","sort-numeric-up-alt","sort-up","spa","space-shuttle","spell-check","spider","spinner","splotch","spray-can","square","square-full","square-root-alt","stamp","star","star-and-crescent","star-half","star-half-alt","star-of-david","star-of-life","step-backward","step-forward","stethoscope","sticky-note","stop","stop-circle","stopwatch","stopwatch-20","store","store-alt","store-alt-slash","store-slash","stream","street-view","strikethrough","stroopwafel","subscript","subway","suitcase","suitcase-rolling","sun","superscript","surprise","swatchbook","swimmer","swimming-pool","synagogue","sync","sync-alt","syringe","table","table-tennis","tablet","tablet-alt","tablets","tachometer-alt","tag","tags","tape","tasks","taxi","teeth","teeth-open","temperature-high","temperature-low","tenge","terminal","text-height","text-width","th","th-large","th-list","theater-masks","thermometer","thermometer-empty","thermometer-full","thermometer-half","thermometer-quarter","thermometer-three-quarters","thumbs-down","thumbs-up","thumbtack","ticket-alt","times","times-circle","tint","tint-slash","tired","toggle-off","toggle-on","toilet","toilet-paper","toilet-paper-slash","toolbox","tools","tooth","torah","torii-gate","tractor","trademark","traffic-light","trailer","train","tram","transgender","transgender-alt","trash","trash-alt","trash-restore","trash-restore-alt","tree","trophy","truck","truck-loading","truck-monster","truck-moving","truck-pickup","tshirt","tty","tv","umbrella","umbrella-beach","underline","undo","undo-alt","universal-access","university","unlink","unlock","unlock-alt","upload","user","user-alt","user-alt-slash","user-astronaut","user-check","user-circle","user-clock","user-cog","user-edit","user-friends","user-graduate","user-injured","user-lock","user-md","user-minus","user-ninja","user-nurse","user-plus","user-secret","user-shield","user-slash","user-tag","user-tie","user-times","users","users-cog","users-slash","utensil-spoon","utensils","vector-square","venus","venus-double","venus-mars","vest","vest-patches","vial","vials","video","video-slash","vihara","virus","virus-slash","viruses","voicemail","volleyball-ball","volume-down","volume-mute","volume-off","volume-up","vote-yea","vr-cardboard","walking","wallet","warehouse","water","wave-square","weight","weight-hanging","wheelchair","wifi","wind","window-close","window-maximize","window-minimize","window-restore","wine-bottle","wine-glass","wine-glass-alt","won-sign","wrench","x-ray","yen-sign","yin-yang"];
    }])

    .controller('UserController', ['$scope', 'Api', '$filter', '$location', '$timeout', function ($scope, Api, $filter, $location, $timeout) {
      $scope.loading = true;
      $scope.alertMessage = {};

      Api.Users.query(null, function(results) {
        $scope.users = results;
        $scope.page = 'users';
        $scope.loading = false;
      });

      $scope.showAlertMessage = function(message, type) {
        $scope.alertMessage.text = message;
        $scope.alertMessage.type = type;
        $scope.alertMessage.show = true;
        $timeout(function () {
          $scope.alertMessage.show = false;
        }, 3000);
      };

      $scope.modalConfirmed = function () {
        if ($scope.modal?.confirmAction) {
          $scope.modal.confirmAction();
        }
      };
      
      $scope.userDetail = function(id) {
          $location.url('/users/'+id);
      };

      $scope.selectedUsers = function () {
        let selected = [];

        if ($scope.users) {
          selected = $filter("filter")($scope.users, {
            selected: true
          });
        }

        return selected;
      };

      $scope.hasUserSelection = function () {
        return $scope.selectedUsers().length > 0;
      };
      
      $scope.usersDelete = function () {
        const confirmModal = document.getElementById("confirmModal");
        const numSelected = $scope.selectedUsers().length;

        $scope.modal = {
          title: "Delete Users",
          body: `
            <div>Are you sure you want to delete these users?</div>
            <strong>There are ${numSelected} users selected for deletion.</strong>
          `,
          confirm: "Delete",
          confirmClass: "btn-danger",
          confirmAction: $scope.usersDeleteConfirmed,
        };

        bootstrap.Modal.getOrCreateInstance(confirmModal).show();
      };
      
      $scope.usersDeleteConfirmed = function () {
        $scope.loading = true;
        $scope.selectedAll = false;
        const data = {
          deleteList: $scope.selectedUsers().map(user => user.id)
        };

        Api.UserDetail.post({id: 'deleteMultiple' }, data).$promise.then(function (response) {
          $scope.loading = false;

          if (response.status == 'ok') {
            $scope.showAlertMessage('Users deleted!', 'alert-success');
            $location.url('/users/');
          } else {
            $scope.showAlertMessage('Error deleting users: ' + response.data.error, 'alert-danger');
          }
        }, function(response) {
          $scope.showAlertMessage('Error deleting users: ' + response.data.error, 'alert-danger');
          $scope.loading = false;          
        });
      };
    }])

    .controller('UserDetailController', ['$scope', '$routeParams', 'Api', '$location', '$timeout', function ($scope, $routeParams, Api, $location, $timeout) {
      $scope.loading = true;
      $scope.page = 'userDetail';
      $scope.alertMessage = {};

      Api.UserDetail.get({ id: $routeParams.id }, function (results) {
        $scope.user = results;
        $scope.userLoading = false;
        $scope.existingUsername = false;
        $scope.existingEmail = false;
        $scope.loading = false;

        if (results.username) {
          $scope.user.originalUsername = results.username;
          $scope.user.originalEmail = results.email;
          $scope.isNew = false;
          $scope.user.lastlogondate = new Date(results.lastlogondate).toLocaleString()
          console.log(results)
        } else {
          $scope.user.username = $routeParams.username || '';
          $scope.user.originalUsername = $routeParams.username || '';
          $scope.isNew = true;
          console.log(results);
        }
      });

      $scope.showAlertMessage = function(message, type) {
        $scope.alertMessage.text = message;
        $scope.alertMessage.type = type;
        $scope.alertMessage.show = true;
        $timeout(function () {
          $scope.alertMessage.show = false;
        }, 3000);
      };

      $scope.modalConfirmed = function () {
        if ($scope.modal?.confirmAction) {
          $scope.modal.confirmAction();
        }
      };

      // controls the form validation on the username field
      $scope.checkUsername = function() {
        $scope.userLoading = true;

        if ($scope.user.username) {
          Api.UsernameCheck.get({id: $scope.user.username }, function(results) {
            if (results.username) {
              $scope.userLoading = false;

              if (results.username == $scope.user.originalUsername) {
                $scope.existingUser = false;
                return false;
              } else {
                $scope.existingID = results.id;
                $scope.existingUsername = true;
                return true;
              }
            } else {
              $scope.userLoading = false;
              $scope.existingUsername = false;
              return false;
            }
          });
        } else {
          $scope.userLoading = false;
          $scope.existingUsername = false;
          return false;
        }
      };

      $scope.checkEmail = function() {
        $scope.userLoading = true;

        if ($scope.user.email) {
          Api.UseremailCheck.get({id: $scope.user.email }, function(results) {
            if (results.email) {
              $scope.userLoading = false;

              if (results.email == $scope.user.originalEmail) {
                $scope.existingEmail= false;
                return false;
              } else {
                $scope.existingID = results.id;
                $scope.existingEmail = true;
                return true;
              }
            } else {
              $scope.userLoading = false;
              $scope.existingEmail = false;
              return false;
            }
          });
        } else {
          $scope.userLoading = false;
          $scope.existingEmail = false;
          return false;
        }
      };

      $scope.userSubmit = function() {
        if ($scope.existingUsername) {
          $scope.showAlertMessage('Error saving user: User with this username already exists.', 'alert-danger');
        } else if ($scope.existingEmail) {
          $scope.showAlertMessage('Error saving user: User with this email already exists.', 'alert-danger');
        } else {
          $scope.loading = true;
          const id = $routeParams.id || "new";

          Api.UserDetail.save({ id: id }, $scope.user).$promise.then(function (response) {
            if (response.status == 'ok') {
              $scope.showAlertMessage('User saved!', 'alert-success');
              $scope.loading = false;

              if ($scope.isNew) {
                $location.url('/users/' + response.id);
              }
            } else {
              $scope.showAlertMessage('Error saving user: ' + response, 'alert-danger');
              $scope.loading = false;
            }
          }, function (response) {
            $scope.showAlertMessage('Error saving user: ' + response.data.error, 'alert-danger');
            $scope.loading = false;
          });
        }
      };
      
      $scope.userDelete = function () {
        const confirmModal = document.getElementById("confirmModal");

        $scope.modal = {
          title: "Delete User",
          body: `
            <div>Are you sure you want to delete this user?</div>
          `,
          confirm: "Delete",
          confirmClass: "btn-danger",
          confirmAction: $scope.userDeleteConfirmed,
        };

        bootstrap.Modal.getOrCreateInstance(confirmModal).show();
      };
      
      $scope.userDeleteConfirmed = function () {
        $scope.loading = true;

        Api.UserDetail.delete({id: $routeParams.id }, $scope.user).$promise.then(function (response) {
          $scope.loading = false;

          if (response.status == 'ok') {
            $scope.showAlertMessage('User deleted!', 'alert-success');
            $location.url('/users/');
          } else {
            $scope.showAlertMessage('Error deleting user: ' + response.data.error, 'alert-danger');
          }
        }, function(response) {
          $scope.loading = false;
          $scope.showAlertMessage('Error deleting user: ' + response.data.error, 'alert-danger');
        });
      };

      $scope.userResetPassword = function () {
        const resetPasswordModal = document.getElementById("resetPasswordModal");
        bootstrap.Modal.getOrCreateInstance(resetPasswordModal).show();
      };

      $scope.userResetPasswordConfirmed = function () {
        var id = $routeParams.id
        Api.UserDetail.save({ id: id }, $scope.user).$promise.then(function (response) {
          if (response.status == 'ok') {
            $scope.showAlertMessage('User password reset!', 'alert-success');
            $scope.user.newpassword = null;
            $scope.loading = false;
            if ($scope.isNew) {
              $location.url('/users/' + response.id);
            }
          } else {
            $scope.showAlertMessage('Error saving user: ' + response, 'alert-danger');
            $scope.loading = false;
          }
        }, function (response) {
          $scope.showAlertMessage('Error saving user: ' + response.data.error, 'alert-danger');
          $scope.loading = false;
        });
      }
    }])
 
    .controller('SettingsController', ['$scope', 'Api', 'uuid', '$filter', '$timeout', function ($scope, Api, uuid, $filter, $timeout) {
      $scope.alertMessage = {};
      $scope.page = 'settings';
      $scope.showPassword = false;

      Api.Settings.get(null, function(results) {
        if (!results.settings.messages.replaceText)
          results.settings.messages.replaceText = [{}];
        if (!results.settings.aliases)
          results.settings.aliases = {};
        if (!results.settings.aliases.templates)
          results.settings.aliases.templates = [{}];
        if (!results.settings.auth.keys)
          results.settings.auth.keys = [{}];
        $scope.settings = results.settings;
        $scope.plugins = results.plugins;
        $scope.themes = results.themes;
      });

      $scope.showAlertMessage = function(message, type) {
        $scope.alertMessage.text = message;
        $scope.alertMessage.type = type;
        $scope.alertMessage.show = true;
        $timeout(function () {
          $scope.alertMessage.show = false;
        }, 3000);
      };

      $scope.settingsSubmit = function() {
        $scope.loading = true;
        Api.Settings.save(null, $scope.settings).$promise.then(function (response) {
          $scope.loading = false;
          if (response.status == 'ok') {
            $scope.showAlertMessage('Settings saved!', 'alert-success');
          } else {
            $scope.showAlertMessage('Error saving settings: ' + response, 'alert-danger');
          }
        }, function(response) {
          $scope.showAlertMessage('Error saving settings: ' + response.data.error, 'alert-danger');
          $scope.loading = false;
        });
      };

      // this function generates the long API keys
      // gets two 36 char UUIDs, removes the dashes, base36 encodes them, then joins together half of each string
      // for increased key length, uncomment the h2/k2 lines, and swap the kf lines
      $scope.generateKey = function(index) {
        var hash = uuid.v4().replace(/-/g,"");
        var hash2 = uuid.v4().replace(/-/g,"");
        var h1 = hash.slice(0, 15);
      //  var h2 = hash.slice(16, -1);
        var h3 = hash2.slice(0, 15);
        var k1 = parseInt(h1, 16).toString(36);
      //  var k2 = parseInt(h2, 16).toString(36);
        var k3 = parseInt(h3, 16).toString(36);
      //  var kf = k1+k2+k3;
        var kf = k1+k3;
        var key = kf.toUpperCase();
        if (index == 'sessionSecret') {
          $scope.settings.global.sessionSecret = key;
        } else {
          $scope.settings.auth.keys[index].key = key;
        }
      };

      $scope.addKey = function () {
        $scope.settings.auth.keys.push({
          'name': "",
          'key': ""
        });
      };

      $scope.addMatch = function () {
        $scope.settings.messages.replaceText.push({
          'match': "",
          'replace': ""
        });
      };

      $scope.addTemplate = function () {
        $scope.settings.aliases.templates.push({
          'name': "",
          'agency': "",
          'icon': "",
          'color': ""
        });
      };

      $scope.selectedKeys = function () {
        let selected = [];

        if ($scope.settings?.auth?.keys) {
          selected = $filter("filter")($scope.settings.auth.keys, {
            selected: true
          });
        }

        return selected;
      };

      $scope.hasKeySelection = function () {
        return $scope.selectedKeys().length > 0;
      };

      $scope.selectedMatches = function () {
        let selected = [];

        if ($scope.settings?.messages?.replaceText) {
          selected = $filter("filter")($scope.settings.messages.replaceText, {
            selected: true
          });
        }

        return selected;
      };

      $scope.hasMatchSelection = function () {
        return $scope.selectedMatches().length > 0;
      };

      $scope.selectedTemplates = function () {
        let selected = [];

        if ($scope.settings?.aliases?.templates) {
          selected = $filter("filter")($scope.settings.aliases.templates, {
            selected: true
          });
        }

        return selected;
      };

      $scope.hasTemplateSelection = function () {
        return $scope.selectedTemplates().length > 0;
      };

      $scope.removeKey = function () {
        var newDataList=[];
        $scope.selectedAll = false;
        angular.forEach($scope.settings.auth.keys, function(selected){
            if(!selected.selected){
                newDataList.push(selected);
            }
            else {
              console.log('Deleting key '+selected.name);
            }
        });
        $scope.settings.auth.keys = newDataList;
      };

      $scope.removeMatch = function () {
        var newDataList=[];
        $scope.selectedAll = false;
        angular.forEach($scope.settings.messages.replaceText, function(selected){
            if(!selected.selected){
                newDataList.push(selected);
            }
            else {
              console.log('Deleting key '+selected.name);
            }
        });
        $scope.settings.messages.replaceText = newDataList;
      };

      $scope.removeTemplate = function () {
        var newDataList=[];
        $scope.selectedAll = false;
        angular.forEach($scope.settings.aliases.templates, function(selected){
            if(!selected.selected){
                newDataList.push(selected);
            }
            else {
              console.log('Deleting key '+selected.name);
            }
        });
        $scope.settings.aliases.templates = newDataList;
      };
    }])

    .controller('AdminController', ['$scope', '$routeParams', 'Api', function ($scope, $routeParams, Api) {
      $scope.page = 'admin';
    }])

    // Routes
    .config(['$routeProvider', '$locationProvider', '$httpProvider', function ($routeProvider, $locationProvider, $httpProvider) {
      $routeProvider
        .when('/', {
          templateUrl: '/templates/admin/admin.html',
          controller: 'AdminController'
        })
        .when('/aliases', {
          templateUrl: '/templates/admin/aliases.html',
          controller: 'AliasController'
        })
        .when('/users', {
          templateUrl: '/templates/admin/users.html',
          controller: 'UserController'
        })
        .when('/users/:id', {
          templateUrl: '/templates/admin/userDetails.html',
          controller: 'UserDetailController'
        })
        .when('/settings', {
          templateUrl: '/templates/admin/settings.html',
          controller: 'SettingsController'
        })
        .when('/aliases/:id', {
          templateUrl: '/templates/admin/aliasDetails.html',
          controller: 'AliasDetailCtrl'
      });

      $httpProvider.defaults.headers.delete = { "Content-Type": "application/json;charset=utf-8" };
      $httpProvider.interceptors.push(function($q, $location) {
        return {
          response: function(response) {
            return response;
          },
          responseError: function(response) {
            if (response.status === 401)
              $location.absUrl('/login');
            return $q.reject(response);
          }
        };
      });
      $locationProvider.html5Mode({ enabled: true, requireBase: false, rewriteLinks: true});
    }]);
