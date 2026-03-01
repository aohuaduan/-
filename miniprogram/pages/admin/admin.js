const { callFn } = require('../../api/call')
const { withTabBar } = require('../../utils/tabbar');

Page(withTabBar(3, {
  data: {
    loading: true,
    ok: false,
    error: '',
    total: 0,
    records: [],
    adminRole: null,
    refresherTriggered: false,
    exporting: false
  },

  onLoad() {
    this.refresh()
    callFn('auth', { action: 'whoami' })
    .then(rr => {
      this.setData({
        isAdmin: !!rr.isAdmin,
        adminRole: rr.role || null
      })
    })
    .catch(err => console.error(err))  },

  refresh() {
    this.setData({ loading: true, error: '' })

    return callFn('records', { action: 'admin.list' })
      .then(r => {
        this.setData({
          loading: false,
          ok: true,
          error: '',
          total: r.total || 0,
          records: r.records || []
        })
      })
      .catch(err => {
        console.error(err)
        this.setData({
          loading: false,
          ok: false,
          error: err.message || '调用失败',
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

        callFn('records', { action: 'admin.delete', recordId })
          .then(() => {
            wx.showToast({ title: '已删除' })
            this.refresh()
          })
          .catch(err => {
            console.error(err)
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          })
      }
    })
  },


  // ⚠️ 所有管理员都可执行（建议后续收紧权限，但这步先不动业务）
  onDeleteAll() {
    wx.showModal({
      title: '危险操作',
      content: '确认要删除全部记录吗？此操作不可恢复。',
      confirmText: '继续',
      success: (r1) => {
        if (!r1.confirm) return

        wx.showModal({
          title: '再次确认',
          content: '请确认：真的要清空全部数据？',
          confirmText: '删除',
          success: (r2) => {
            if (!r2.confirm) return

            wx.showLoading({ title: '删除中...' })
            callFn('records', { action: 'admin.deleteAll', confirm: 'DELETE_ALL' })
              .then(rr => {
                wx.hideLoading()
                wx.showToast({ title: `已删除 ${rr.deleted || 0} 条`, icon: 'none' })
                this.refresh()
              })
              .catch(err => {
                wx.hideLoading()
                console.error(err)
                wx.showToast({ title: err.message || '删除失败', icon: 'none' })
              })
          }
        })
      }
    })
  },

  // ✅ 新增：导出Excel
  async onExportExcel() {
    if (this.data.exporting) return
    this.setData({ exporting: true })

    wx.showLoading({ title: '生成中...' })
    try {
      // 后端是 records 云函数下的 admin.exportExcel
      const r = await callFn('records', { action: 'admin.exportExcel' })

      // 兼容不同返回结构：{fileID} / {fileId} / 直接返回字符串
      const fileID = (r && (r.fileID || r.fileId)) || r
      if (!fileID || typeof fileID !== 'string') {
        throw new Error('导出失败：未获取到 fileID')
      }

      // 下载到本地临时文件
      const dl = await wx.cloud.downloadFile({ fileID })
      const filePath = dl && dl.tempFilePath
      if (!filePath) throw new Error('导出失败：下载文件失败')

      wx.hideLoading()

      // 打开文档预览（带菜单可转发/保存）
      await wx.openDocument({
        filePath,
        fileType: 'xlsx',
        showMenu: true
      })
    } catch (e) {
      wx.hideLoading()
      wx.showModal({
        title: '导出失败',
        content: (e && e.message) ? e.message : String(e),
        showCancel: false
      })
    } finally {
      this.setData({ exporting: false })
    }
  },

  onRefresherRefresh() {
    this.setData({ refresherTriggered: true })
    Promise.resolve(this.refresh()).finally(() => {
      this.setData({ refresherTriggered: false })
    })
  },

  goAdminManage() {
    wx.navigateTo({ url: '/pages/adminManage/adminManage' })
  }
}))