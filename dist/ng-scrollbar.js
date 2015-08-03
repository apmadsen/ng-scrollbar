angular.module('ngScrollbar', []).directive('ngScrollbar', ['$parse', '$window',
  function ($parse, $window) {
      return {
          restrict: 'AC',
          replace: true,
          transclude: true,
          scope: {},
          link: function (scope, element, attrs) {

              // DOM elements
              var elements = {
                  mainElm: null,
                  tools: null,
                  transcludedContainer: null,
                  thumb: null,
                  thumbLine: null,
                  track: null
              };

              var flags = { bottom: attrs.hasOwnProperty('bottom') },
                  win = angular.element($window),
                  hasAddEventListener = !!win[0].addEventListener,
                  hasRemoveEventListener = !!win[0].removeEventListener,
                  lastOffsetY = 0,
                  rebuildTimer;

              // Elements
              var dragger = { top: 0 },
                  page = { top: 0 };

              // Styles
              var scrollboxStyle,
                  draggerStyle,
                  draggerLineStyle,
                  pageStyle;


              var methods = {
                  calcStyles: function () {
                      scrollboxStyle = {
                          position: 'relative',
                          overflow: 'hidden',
                          'max-width': '100%',
                          height: '100%'
                      };
                      if (page.height) {
                          scrollboxStyle.height = page.height + 'px';
                      }
                      draggerStyle = {
                          position: 'absolute',
                          height: dragger.height + 'px',
                          top: dragger.top + 'px'
                      };
                      draggerLineStyle = {
                          position: 'relative',
                          'line-height': dragger.height + 'px'
                      };
                      pageStyle = {
                          position: 'relative',
                          top: page.top + 'px',
                          overflow: 'hidden'
                      };
                  },
                  redraw: function () {
                      elements.thumb.css('top', dragger.top + 'px');
                      var draggerOffset = dragger.top / page.height;
                      page.top = -Math.round(page.scrollHeight * draggerOffset);
                      elements.transcludedContainer.css('top', page.top + 'px');
                  },
                  thumbDrag: function (event, offsetX, offsetY) {
                      dragger.top = Math.max(0, Math.min(parseInt(dragger.trackHeight, 10) - parseInt(dragger.height, 10), offsetY));
                      event.stopPropagation();
                  },
                  registerEvent: function (elm) {
                      var wheelEvent = win[0].onmousewheel !== undefined ? 'mousewheel' : 'DOMMouseScroll';
                      if (hasAddEventListener) {
                          elm.addEventListener(wheelEvent, handlers.wheel, false);
                      } else {
                          elm.attachEvent('onmousewheel', handlers.wheel);
                      }
                  },
                  unregisterEvent: function (elm) {
                      var wheelEvent = win[0].onmousewheel !== undefined ? 'mousewheel' : 'DOMMouseScroll';
                      if (hasRemoveEventListener) {
                          elm.removeEventListener(wheelEvent, handlers.wheel, false);
                      } else {
                          elm.detachEvent('onmousewheel', handlers.wheel);
                      }
                  },
                  build: function (rollToBottom) {
                      rollToBottom = flags.bottom || rollToBottom;
                      elements.mainElm = angular.element(element.children()[0]);
                      elements.transcludedContainer = angular.element(elements.mainElm.children()[0]);
                      elements.tools = angular.element(elements.mainElm.children()[1]);
                      elements.thumb = angular.element(angular.element(elements.tools.children()[0]).children()[0]);
                      elements.thumbLine = angular.element(elements.thumb.children()[0]);
                      elements.track = angular.element(angular.element(elements.tools.children()[0]).children()[1]);
                      page.height = element[0].offsetHeight;
                      page.scrollHeight = elements.transcludedContainer[0].scrollHeight;
                      if (page.height < page.scrollHeight) {
                          scope.showYScrollbar = true;
                          scope.$emit('scrollbar.show');

                          // Calculate the dragger height
                          dragger.height = Math.round(page.height / page.scrollHeight * page.height);
                          dragger.trackHeight = page.height;

                          // update the transcluded content style and clear the parent's
                          methods.calcStyles();
                          element.css({ overflow: 'hidden' });
                          elements.mainElm.css(scrollboxStyle);
                          elements.transcludedContainer.css(pageStyle);
                          elements.thumb.css(draggerStyle);
                          elements.thumbLine.css(draggerLineStyle);

                          // Bind scroll bar events
                          elements.track.bind('click', handlers.trackClick);

                          // Handle mousewheel
                          methods.registerEvent(elements.transcludedContainer[0]);

                          // Drag the scroller with the mouse
                          elements.thumb.on('mousedown', function (event) {
                              lastOffsetY = event.pageY - elements.thumb[0].offsetTop;
                              win.on('mouseup', handlers.mouseUp);
                              win.on('mousemove', handlers.drag);
                              event.preventDefault();
                          });

                          // Drag scrollable area by touch
                          elements.transcludedContainer.on('touchstart', function (event) {
                              lastOffsetY = event.changedTouches[0].pageY - elements.transcludedContainer[0].offsetTop;

                              elements.transcludedContainer.on('touchend', handlers.touchEnd);
                              elements.transcludedContainer.on('touchmove', handlers.touchDrag);
                              event.preventDefault();
                          });
                          if (rollToBottom) {
                              flags.bottom = false;
                              dragger.top = parseInt(page.height, 10) - parseInt(dragger.height, 10);
                          } else {
                              dragger.top = Math.max(0, Math.min(parseInt(page.height, 10) - parseInt(dragger.height, 10), parseInt(dragger.top, 10)));
                          }
                          methods.redraw();
                      } else {
                          scope.showYScrollbar = false;
                          scope.$emit('scrollbar.hide');
                          elements.thumb.off('mousedown');
                          methods.unregisterEvent(elements.transcludedContainer[0]);
                          elements.transcludedContainer.attr('style', 'position:relative;top:0');

                          // little hack to remove other inline styles
                          elements.mainElm.css({ height: '100%' });
                      }
                  },
                  rebuild: function (e, data) {
                      /* jshint -W116 */
                      if (rebuildTimer != null) {
                          clearTimeout(rebuildTimer);
                      }
                      /* jshint +W116 */
                      var rollToBottom = !!data && !!data.rollToBottom;
                      rebuildTimer = setTimeout(function () {
                          page.height = null;
                          methods.build(rollToBottom);
                          if (!scope.$$phase) {
                              scope.$digest();
                          }
                          // update parent for flag update
                          if (!scope.$parent.$$phase) {
                              scope.$parent.$digest();
                          }
                      }, 72);
                  }
              };

              var handlers = {
                  trackClick: function (event) {
                      var offsetY = event.hasOwnProperty('offsetY') ? event.offsetY : event.layerY;
                      var newTop = Math.max(0, Math.min(parseInt(dragger.trackHeight, 10) - parseInt(dragger.height, 10), offsetY));
                      dragger.top = newTop;
                      methods.redraw();
                      event.stopPropagation();
                  },
                  wheel: function (event) {
                      var wheelSpeed = 40;
                      // Mousewheel speed normalization approach adopted from
                      // http://stackoverflow.com/a/13650579/1427418
                      var o = event, d = o.detail, w = o.wheelDelta, n = 225, n1 = n - 1;
                      // Normalize delta
                      d = d ? w && (f = w / d) ? d / f : -d / 1.35 : w / 120;
                      // Quadratic scale if |d| > 1
                      d = d < 1 ? d < -1 ? (-Math.pow(d, 2) - n1) / n : d : (Math.pow(d, 2) + n1) / n;
                      // Delta *should* not be greater than 2...
                      event.delta = Math.min(Math.max(d / 2, -1), 1);
                      event.delta = event.delta * wheelSpeed;
                      dragger.top = Math.max(0, Math.min(parseInt(page.height, 10) - parseInt(dragger.height, 10), parseInt(dragger.top, 10) - event.delta));
                      methods.redraw();
                      if (!!event.preventDefault) {
                          event.preventDefault();
                      } else {
                          return false;
                      }
                  },
                  mouseUp: function (event) {
                      win.off('mousemove', handlers.drag);
                      win.off('mouseup', handlers.mouseUp);
                      event.stopPropagation();
                  },
                  drag: function (event) {
                      var newOffsetX = 0;
                      var newOffsetY = event.pageY - elements.thumb[0].scrollTop - lastOffsetY;
                      methods.thumbDrag(event, newOffsetX, newOffsetY);
                      methods.redraw();
                  },
                  touchDrag: function (event) {
                      var newOffsetX = 0;
                      var newOffsetY = event.changedTouches[0].pageY - lastOffsetY;
                      methods.thumbDrag(event, newOffsetX, -newOffsetY);
                      methods.redraw();
                      event.stopPropagation();
                  },
                  touchEnd: function (event) {
                      elements.transcludedContainer.off('touchmove', handlers.touchDrag);
                      elements.transcludedContainer.off('touchend', handlers.touchEnd);
                      event.stopPropagation();
                  }
              };
             
              methods.build();

              if (!!attrs.rebuildOn) {
                  attrs.rebuildOn.split(' ').forEach(function (eventName) {
                      scope.$on(eventName, methods.rebuild);
                  });
              }
              if (attrs.hasOwnProperty('rebuildOnResize')) {
                  win.on('resize', methods.rebuild);
              }
          },
          template: '<div>'
                  + '  <div class="ngsb-wrap">'
                  + '    <div class="ngsb-container" ng-transclude></div>'
                  + '    <div class="ngsb-scrollbar" style="position: absolute; display: block;" ng-show="showYScrollbar">'
                  + '      <div class="ngsb-thumb-container">'
                  + '        <div class="ngsb-thumb-pos" oncontextmenu="return false;">'
                  + '          <div class="ngsb-thumb" ></div>'
                  + '        </div>'
                  + '        <div class="ngsb-track"></div>'
                  + '      </div>'
                  + '    </div>'
                  + '  </div>'
                  + '</div>'
      };
  }
]);
