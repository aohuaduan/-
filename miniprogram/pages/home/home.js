const { withTabBar } = require('../../utils/tabbar');

Page(withTabBar(0,{
  data: {
    hospital: '上海·同济口腔医院',
    hasNotice: true,

    role: 'doctor', // patient | doctor

    taskLeft: '23小时',
    taskPoint: '+10',
    taskTitle: '预约就诊，采用线上签到',
    taskCo2: '150g',

    tab: 'eco',
    articles: []
  },

  onLoad() {
    this._refreshArticles();
  },

  setRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ role });
  },

  setTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab }, () => this._refreshArticles());
  },

  _refreshArticles() {
    // 先用静态数据撑起外观，后面再接 content 云函数/数据库
    const map = {
      ortho: [
        { id: 'a1', title: '如何选择正畸方案？', tag: '正畸科普', read: '---  ', date: 'xxxx-xx-xx', thumbClass: 't1' },
        { id: 'a2', title: '隐形矫治日常护理要点', tag: '正畸科普', read: '---  ', date: 'xxxx-xx-xx', thumbClass: 't2' }
      ],
      eco: [
        { id: 'e1', title: '如何选择环保口腔护理产品？', tag: '环保指南', read: '---  ', date: 'xxxx-xx-xx', thumbClass: 't3' },
        { id: 'e2', title: '绿植选择环保口腔护理产品？', tag: '绿色医疗', read: '---  ', date: 'xxxx-xx-xx', thumbClass: 't1' }
      ],
      news: [
        { id: 'n1', title: '项目动态：低碳诊疗试点启动', tag: '项目动态', read: '---  ', date: 'xxxx-xx-xx', thumbClass: 't2' }
      ]
    };
    this.setData({ articles: map[this.data.tab] || [] });
  },

  goCalc(e) {
    const mode = e.currentTarget.dataset.mode; // friendly | pro
    // tabBar 页面要用 switchTab；你现有计算页是 tabBar 里的 /pages/index/index
    wx.switchTab({
      url: '/pages/index/index',
      success: () => {
        // 如果你想后续根据 mode 切换 UI，可用 eventChannel 或 storage
        wx.setStorageSync('calc_mode', mode);
      }
    });
  },

  goLowcarbon() {
    wx.switchTab({ url: '/pages/lowcarbon/lowcarbon' });
  },

  openArticle(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({ title: `文章占位：${id}`, icon: 'none' });
  },

  onTapLocation() {
    wx.showToast({ title: '位置选择占位', icon: 'none' });
  },

  onTapBell() {
    wx.showToast({ title: '消息中心占位', icon: 'none' });
  },

  onTapBanner() {
    wx.showToast({ title: 'Banner点击占位', icon: 'none' });
  }
}))