Page({
  data: {
    loading: true,
    ok: false,
    error: '',
    admins: [],
    newOpenid: '',
    newRoleIndex: 0,
    roleOptions: ['admin', 'super_admin'],
    requests: [],
    reqLoading: false,
    reqError: '',
    refresherTriggered: false
  },

  onLoad() {
    this.refresh()
    this.refreshRequests()
  },

  refresh() {
    this.setData({ loading: true, error: '' })
    return wx.cloud.callFunction({
      name: 'superManageAdmins',
      data: { action: 'list' }
    }).then(res => {
      const r = res.result || {}
      this.setData({
        loading: false,
        ok: !!r.ok,
        error: r.error || '',
        admins: r.admins || []
      })
    }).catch(err => {
      console.error(err)
      this.setData({
        loading: false,
        ok: false,
        error: '调用失败，请看控制台',
        admins: []
      })
    })
  },

  onInputNewOpenid(e) {
    this.setData({ newOpenid: e.detail.value })
  },
  
  onChangeNewRole(e) {
    this.setData({ newRoleIndex: Number(e.detail.value) })
  },
  
  onAddAdmin() {
    const openid = (this.data.newOpenid || '').trim()
    const role = this.data.roleOptions[this.data.newRoleIndex] || 'admin'
    if (!openid) {
      wx.showToast({ title: '请填写openid', icon: 'none' })
      return
    }
  
    wx.showLoading({ title: '添加中...' })
    wx.cloud.callFunction({
      name: 'superManageAdmins',
      data: { action: 'add', openid, role }
    }).then(res => {
      wx.hideLoading()
      const r = res.result || {}
      if (!r.ok) {
        wx.showToast({ title: r.error || '添加失败', icon: 'none' })
        return
      }
      wx.showToast({ title: '已添加/已更新' })
      this.setData({ newOpenid: '', newRoleIndex: 0 })
      this.refresh()
    }).catch(err => {
      wx.hideLoading()
      console.error(err)
      wx.showToast({ title: '添加失败', icon: 'none' })
    })
  },
  
  onRemoveAdmin(e) {
    const openid = (e.currentTarget.dataset.openid || '').trim()
    if (!openid) return
  
    wx.showModal({
      title: '确认删除管理员？',
      content: `openid: ${openid}`,
      success: (r) => {
        if (!r.confirm) return
  
        wx.showLoading({ title: '删除中...' })
        wx.cloud.callFunction({
          name: 'superManageAdmins',
          data: { action: 'remove', openid }
        }).then(res => {
          wx.hideLoading()
          const rr = res.result || {}
          if (!rr.ok) {
            wx.showToast({ title: rr.error || '删除失败', icon: 'none' })
            return
          }
          wx.showToast({ title: '已删除' })
          this.refresh()
        }).catch(err => {
          wx.hideLoading()
          console.error(err)
          wx.showToast({ title: '删除失败', icon: 'none' })
        })
      }
    })
  },

  refreshRequests() {
    this.setData({ reqLoading: true, reqError: '' })
    return wx.cloud.callFunction({
      name: 'superManageAdmins',
      data: { action: 'listRequests' }
    }).then(res => {
      const r = res.result || {}
      this.setData({
        reqLoading: false,
        requests: r.requests || [],
        reqError: r.error || ''
      })
    }).catch(err => {
      console.error(err)
      this.setData({ reqLoading: false, reqError: '加载申请失败', requests: [] })
    })
  },
  
  onApproveRequest(e) {
    const requestId = e.currentTarget.dataset.id
    wx.showModal({
      title: '通过申请？',
      content: '通过后将加入管理员（admin）',
      success: (r) => {
        if (!r.confirm) return
        wx.showLoading({ title: '处理中...' })
        wx.cloud.callFunction({
          name: 'superManageAdmins',
          data: { action: 'approveRequest', requestId }
        }).then(res => {
          wx.hideLoading()
          const rr = res.result || {}
          if (!rr.ok) {
            wx.showToast({ title: rr.error || '失败', icon: 'none' })
            return
          }
          wx.showToast({ title: '已通过', icon: 'none' })
          this.refresh()
          this.refreshRequests()
        }).catch(err => {
          wx.hideLoading()
          console.error(err)
          wx.showToast({ title: '失败', icon: 'none' })
        })
      }
    })
  },
  
  onRejectRequest(e) {
    const requestId = e.currentTarget.dataset.id
    wx.showModal({
      title: '拒绝申请？',
      content: '拒绝后不会加入管理员',
      success: (r) => {
        if (!r.confirm) return
        wx.showLoading({ title: '处理中...' })
        wx.cloud.callFunction({
          name: 'superManageAdmins',
          data: { action: 'rejectRequest', requestId }
        }).then(res => {
          wx.hideLoading()
          const rr = res.result || {}
          if (!rr.ok) {
            wx.showToast({ title: rr.error || '失败', icon: 'none' })
            return
          }
          wx.showToast({ title: '已拒绝', icon: 'none' })
          this.refreshRequests()
        }).catch(err => {
          wx.hideLoading()
          console.error(err)
          wx.showToast({ title: '失败', icon: 'none' })
        })
      }
    })
  },

  onRefresherRefresh() {
    this.setData({ refresherTriggered: true })
  
    // 同时刷新：管理员列表 + 待审核申请
    Promise.all([
      this.refresh(),
      this.refreshRequests()
    ]).finally(() => {
      this.setData({ refresherTriggered: false })
    })
  },

  onRemarkBlur(e) {
    const openid = (e.currentTarget.dataset.openid || '').trim()
    const remark = (e.detail.value || '').trim()
    if (!openid) return
  
    wx.cloud.callFunction({
      name: 'superManageAdmins',
      data: { action: 'updateRemark', openid, remark }
    }).then(res => {
      const r = res.result || {}
      if (!r.ok) {
        wx.showToast({ title: r.error || '保存失败', icon: 'none' })
        return
      }
  
      // ✅ 本地直接更新，不用整页刷新
      const next = (this.data.admins || []).map(a =>
        a.openid === openid ? { ...a, remark } : a
      )
      this.setData({ admins: next })
    }).catch(err => {
      console.error(err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  }
})
