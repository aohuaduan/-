// miniprogram/utils/tabbar.js

function setTabBarActive(page, index) {
  const tb = page.getTabBar && page.getTabBar();
  if (tb && typeof tb.setActive === 'function') {
    tb.setActive(index);
  }
}

/**
 * 给 Page 配置自动注入 onShow：
 * - 先设置 tab 高亮
 * - 再调用原本的 onShow（如果有）
 */
function withTabBar(index, pageConfig = {}) {
  const origOnShow = pageConfig.onShow;

  pageConfig.onShow = function (...args) {
    setTabBarActive(this, index);
    if (typeof origOnShow === 'function') {
      return origOnShow.apply(this, args);
    }
  };

  return pageConfig;
}

module.exports = {
  setTabBarActive,
  withTabBar
};