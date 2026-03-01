Component({
  data: { active: 0 },
  methods: {
    setActive(i) {
      this.setData({ active: i });
    },
    go(e) {
      const i = Number(e.currentTarget.dataset.i);
      const urls = [
        '/pages/home/home',
        '/pages/index/index',
        '/pages/lowcarbon/lowcarbon',
        '/pages/admin/admin'
      ];
      wx.switchTab({ url: urls[i] });
    }
  }
});