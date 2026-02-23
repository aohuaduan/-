Page({

  
  onExportExcel() {
    wx.showLoading({ title: '正在导出...' })
  
    wx.cloud.callFunction({
      name: 'adminExportExcel'
    }).then(res => {
      wx.hideLoading()
      const r = res.result || {}
      if (!r.ok) {
        wx.showToast({ title: r.error || '导出失败', icon: 'none' })
        return
      }
  
      // 生成临时下载链接
      wx.cloud.getTempFileURL({
        fileList: [r.fileID]
      }).then(rr => {
        const url = rr.fileList && rr.fileList[0] && rr.fileList[0].tempFileURL
        if (!url) {
          wx.showToast({ title: '获取下载链接失败', icon: 'none' })
          return
        }
  
        // 下载到本地
        wx.downloadFile({
          url,
          success: (d) => {
            wx.showToast({ title: '已下载' })
            // 直接打开（真机上可用）
            wx.openDocument({
              filePath: d.tempFilePath,
              showMenu: true
            })
          },
          fail: () => wx.showToast({ title: '下载失败', icon: 'none' })
        })
      })
    }).catch(err => {
      wx.hideLoading()
      console.error('导入失败（完整错误）:', err)
    
      // 兼容：尽量把云函数返回的 error 信息展示出来
      const msg =
        (err && err.errMsg) ||
        (err && err.message) ||
        (err && err.toString && err.toString()) ||
        '导入失败'
    
      wx.showModal({
        title: '导入失败',
        content: msg,
        showCancel: false
      })
    })
  },
  
  data: {
    loading: true,
    ok: false,
    error: '',
    total: 0,
    records: [],
    adminRole: null,
    refresherTriggered: false
  },

  onLoad() {
    this.refresh()
    wx.cloud.callFunction({ name: 'checkAdmin' }).then(r => {
      const rr = r.result || {}
      this.setData({
        adminRole: rr.role || null
      })
    })    
  },
  
  refresh() {
    this.setData({ loading: true })
    return wx.cloud.callFunction({ name: 'adminListRecords' })
      .then(res => {
        const r = res.result || {}
        this.setData({
          loading: false,
          ok: !!r.ok,
          error: r.error || '',
          total: r.total || (r.records ? r.records.length : 0),
          records: r.records || []
        })
      })
      .catch(err => {
        console.error(err)
        this.setData({
          loading: false,
          ok: false,
          error: '调用失败，请看控制台',
          total: 0,
          records: []
        })
      })
  },

  onDelete(e) {
    const recordId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除？',
      content: '删除后不可恢复',
      success: (r) => {
        if (!r.confirm) return
  
        wx.cloud.callFunction({
          name: 'adminDeleteRecord',
          data: { recordId }
        }).then(res => {
          const rr = res.result || {}
          if (!rr.ok) {
            wx.showToast({ title: rr.error || '删除失败', icon: 'none' })
            return
          }
  
          // ✅ 1) 立刻从当前页面列表移除
          const next = (this.data.records || []).filter(it => it._id !== recordId)
          this.setData({ records: next, total: next.length })
  
          wx.showToast({ title: '已删除' })
  
          // ✅ 2) 再后台刷新一次（保证和数据库一致）
          if (this.refresh) this.refresh()
        }).catch(err => {
          console.error(err)
          wx.showToast({ title: '删除失败', icon: 'none' })
        })
      }
    })
  }   ,
  goAdminManage() {
    wx.navigateTo({
      url: '/pages/adminManage/adminManage'
    })
  },
  onRefresherRefresh() {
    this.setData({ refresherTriggered: true })
    this.refresh().finally(() => {
    this.setData({ refresherTriggered: false })
  })
}
})
