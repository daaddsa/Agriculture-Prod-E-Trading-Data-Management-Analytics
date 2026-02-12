/**
 * autofit.js - 大屏自适应工具
 * 基于 https://github.com/Auto-Plugin/autofit.js 源码编译
 * 版本对齐: v3.x
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.autofit = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // ---- state ----
  var state = {
    currRenderDom: null,
    resizeListener: null,
    timer: null,
    isElRectification: false,
    currelRectification: null,
    currelRectificationIsKeepRatio: true,
    currelRectificationLevel: 1,
    currScale: 1,
    isAutofitRunning: false
  };

  // ---- strategy: keepFit ----
  function keepFit(dw, dh, dom, ignore, limit, cssMode) {
    // 取浏览器兼容的最大可用视口尺寸
    var clientWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    var clientHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    // contain 策略：等比缩放，保证内容完整不裁切
    state.currScale = Math.min(clientWidth / dw, clientHeight / dh);

    if (Math.abs(1 - state.currScale) <= limit) {
      state.currScale = 1;
    }

    // 保持设计稿原始尺寸
    dom.style.width = dw + 'px';
    dom.style.height = dh + 'px';

    // 居中：多余空间均匀分配到两侧（背景色融合，视觉无感）
    var offsetX = (clientWidth - dw * state.currScale) / 2;
    var offsetY = (clientHeight - dh * state.currScale) / 2;

    if (cssMode === 'zoom') {
      dom.style.zoom = '' + state.currScale;
    } else {
      dom.style.transform = 'translate(' + offsetX + 'px, ' + offsetY + 'px) scale(' + state.currScale + ')';
    }

    var ignoreStyleDOM = document.querySelector('#ignoreStyle');
    if (ignoreStyleDOM) {
      ignoreStyleDOM.innerHTML = '';
    }

    if (!ignore || !ignore.length) return;

    for (var i = 0; i < ignore.length; i++) {
      var temp = ignore[i];
      var itemEl = typeof temp === 'string' ? temp : (temp.el || temp.dom);
      if (!itemEl) continue;

      var realScale = temp.scale ? temp.scale : (1 / state.currScale);
      var realFontSize = (realScale !== state.currScale) && temp.fontSize;
      var realWidth = (realScale !== state.currScale) && temp.width;
      var realHeight = (realScale !== state.currScale) && temp.height;

      ignoreStyleDOM.innerHTML += '\n' + itemEl + ' { ' +
        'transform: scale(' + realScale + ')!important; ' +
        'transform-origin: 0 0; ' +
        (realWidth ? 'width: ' + realWidth + '!important; ' : '') +
        (realHeight ? 'height: ' + realHeight + '!important; ' : '') +
        '}';

      if (realFontSize) {
        ignoreStyleDOM.innerHTML += '\n' + itemEl + ' div, ' + itemEl + ' span, ' + itemEl + ' a, ' + itemEl + ' * { font-size: ' + realFontSize + 'px; }';
      }
    }
  }

  // ---- rectification ----
  function elRectification(el, isKeepRatio, level) {
    if (isKeepRatio === undefined) isKeepRatio = true;
    if (level === undefined) level = 1;

    if (!state.isAutofitRunning) {
      console.error('autofit.js: autofit has not been initialized yet');
      return;
    }
    offelRectification();
    if (!el) {
      console.error('autofit.js: elRectification bad selector: ' + el);
      return;
    }
    state.currelRectification = el;
    state.currelRectificationLevel = level;
    state.currelRectificationIsKeepRatio = isKeepRatio;
    var currEl = Array.from(document.querySelectorAll(el));
    if (currEl.length === 0) {
      console.error('autofit.js: elRectification found no element by selector: "' + el + '"');
      return;
    }
    for (var i = 0; i < currEl.length; i++) {
      var item = currEl[i];
      var rectification = state.currScale === 1 ? 1 : state.currScale * Number(level);
      if (!state.isElRectification) {
        item._origW = item.clientWidth;
        item._origH = item.clientHeight;
      }
      if (isKeepRatio) {
        item.style.width = (item._origW * rectification) + 'px';
        item.style.height = (item._origH * rectification) + 'px';
      } else {
        item.style.width = (100 * rectification) + '%';
        item.style.height = (100 * rectification) + '%';
      }
      item.style.transform = 'translateZ(0) scale(' + (1 / state.currScale) + ')';
      item.style.transformOrigin = '0 0';
    }
    state.isElRectification = true;
  }

  function offelRectification() {
    if (!state.currelRectification) return;
    state.isElRectification = false;
    var items = Array.from(document.querySelectorAll(state.currelRectification));
    for (var i = 0; i < items.length; i++) {
      items[i].style.width = '';
      items[i].style.height = '';
      items[i].style.transform = '';
    }
  }

  // ---- autofit ----
  var autofit = {
    isAutofitRunning: false,

    init: function (options, isShowInitTip) {
      if (isShowInitTip === undefined) isShowInitTip = true;
      if (!options) options = {};

      if (isShowInitTip) {
        console.log('autofit.js is running');
      }

      var dw = options.dw || 1920;
      var dh = options.dh || 1080;
      var el = typeof options === 'string' ? options : (options.el || 'body');
      var resize = options.resize !== undefined ? options.resize : true;
      var ignore = options.ignore || [];
      var transition = options.transition || 0;
      var delay = options.delay || 0;
      var limit = options.limit !== undefined ? options.limit : 0.1;
      var cssMode = options.cssMode || 'scale';
      var allowScroll = options.allowScroll || false;

      state.currRenderDom = el;
      var dom = document.querySelector(el);

      if (!dom) {
        console.error("autofit: '" + el + "' does not exist");
        return;
      }

      var style = document.createElement('style');
      var ignoreStyle = document.createElement('style');
      style.id = 'autofit-style';
      ignoreStyle.id = 'ignoreStyle';

      if (!allowScroll) {
        style.innerHTML = 'body { overflow: hidden; }';
      }

      document.body.appendChild(style);
      document.body.appendChild(ignoreStyle);

      dom.style.height = dh + 'px';
      dom.style.width = dw + 'px';
      dom.style.transformOrigin = '0 0';
      dom.style.position = 'fixed';
      dom.style.left = '0';
      dom.style.top = '0';

      if (!allowScroll) {
        dom.style.overflow = 'hidden';
      }

      keepFit(dw, dh, dom, ignore, limit, cssMode);

      state.resizeListener = function () {
        clearTimeout(state.timer);
        if (delay !== 0) {
          state.timer = setTimeout(function () {
            keepFit(dw, dh, dom, ignore, limit, cssMode);
            if (state.isElRectification) {
              elRectification(state.currelRectification, state.currelRectificationIsKeepRatio, state.currelRectificationLevel);
            }
          }, delay);
        } else {
          keepFit(dw, dh, dom, ignore, limit, cssMode);
          if (state.isElRectification) {
            elRectification(state.currelRectification, state.currelRectificationIsKeepRatio, state.currelRectificationLevel);
          }
        }
      };

      if (resize) {
        window.addEventListener('resize', state.resizeListener);
      }

      // 监听全屏切换（F11、ESC、API全屏）—— 不同浏览器事件名不同
      var fsHandler = function () {
        // 全屏切换后视口尺寸更新有延迟，需要等一帧再重算
        requestAnimationFrame(function () {
          keepFit(dw, dh, dom, ignore, limit, cssMode);
          // 部分浏览器（Edge）需要额外延迟
          setTimeout(function () { keepFit(dw, dh, dom, ignore, limit, cssMode); }, 100);
          setTimeout(function () { keepFit(dw, dh, dom, ignore, limit, cssMode); }, 300);
        });
      };
      document.addEventListener('fullscreenchange', fsHandler);
      document.addEventListener('webkitfullscreenchange', fsHandler);
      document.addEventListener('msfullscreenchange', fsHandler);

      this.isAutofitRunning = true;
      state.isAutofitRunning = true;

      // 首次也延迟再算一次，确保 DOM 完全就绪
      setTimeout(function () { keepFit(dw, dh, dom, ignore, limit, cssMode); }, 200);
      setTimeout(function () { keepFit(dw, dh, dom, ignore, limit, cssMode); }, 500);

      setTimeout(function () {
        dom.style.transition = transition + 's';
      });
    },

    off: function (el) {
      if (!el) el = 'body';
      try {
        if (state.resizeListener) {
          window.removeEventListener('resize', state.resizeListener);
        }
        var autofitStyle = document.querySelector('#autofit-style');
        if (autofitStyle) autofitStyle.remove();
        var ignoreStyleDOM = document.querySelector('#ignoreStyle');
        if (ignoreStyleDOM) ignoreStyleDOM.remove();

        var targetDom = state.currRenderDom || el;
        var temp = document.querySelector(targetDom);
        if (temp) temp.style.cssText = '';

        if (state.isElRectification) offelRectification();
      } catch (e) {
        console.error('autofit: Failed to remove normally', e);
      }
      this.isAutofitRunning = false;
      state.isAutofitRunning = false;
    },

    elRectification: elRectification,

    get scale() {
      return state.currScale;
    }
  };

  return autofit;
});
