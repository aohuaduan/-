Page({
  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },

  data: {
    // ✅ 登录态：用于 index.wxml 的 wx:if="{{!openid}}"
    openid: '',
    isAdmin: false,
    adminRole: null,
    showHiddenAdmin: false,
    _tapCount: 0,
    _tapStart: 0,
    refresherTriggered: false,

    // 选择项
    brandOptions: ['时代天使', '隐适美'],
    // 替牙期是否结束（与原“儿童/成人”一一对应：未结束≈儿童；已结束≈成人）
    ageOptions: ['未结束', '已结束'],
    brandIndex: 0, // 0 Angelalign, 1 Invisalign
    ageIndex: 1,   // 0 未结束, 1 已结束

    // 交通方式（单选）
    travelModeOptions: [
      '不计算交通',
      '私家车（油） g/km',
      '私家车（电） g/km',
      '公交/电瓶车 g/km',
      '地铁 g/站'
    ],
    travelModeIndex: 0,
    travelModeUnit: 'km', // km or station（根据选择自动切换）

    // 输入
    inputs: {
      n: 0,
      x: 0,
      k: 8,

      // 次数（支持多次）
      lab_blood_count: 0,
      cleaning_count: 0,

      // 事件型耗材（疗程总数）
      lingual_button_count: 0,
      miniscrew_count: 0,

      // 交通
      travel_km_roundtrip: 0,
      travel_station_roundtrip: 0,

      // 科室用电口径：每次复诊固定 1 小时（不再需要输入）

      // 正畸附件
      elastic_per_day: 0,
      elastic_days: 0,
      case_box: 1,
      chewie: 1
    },

    // 结果
    result: {
      ready: false,
      total_g: '0.000',
      total_kg: '0.000',
      categorySums: [],
      rows: []
    },
    importing: false,
    importResult: null
  },

  onPullDownRefresh() {
    // 下拉刷新：重新拉取权限状态
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      wx.stopPullDownRefresh()
      return
    }
  
    wx.cloud.callFunction({ name: 'checkAdmin' })
      .then(r => {
        const rr = r.result || {}
        this.setData({
          isAdmin: !!rr.isAdmin,
          adminRole: rr.role || null
        })
      })
      .catch(err => {
        console.error(err)
      })
      .finally(() => {
        wx.stopPullDownRefresh()
      })
  },

  onRefresherRefresh() {
    // 开始刷新动画
    this.setData({ refresherTriggered: true })
  
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      this.setData({ refresherTriggered: false })
      return
    }
  
    wx.cloud.callFunction({ name: 'checkAdmin' })
      .then(r => {
        const rr = r.result || {}
        this.setData({
          isAdmin: !!rr.isAdmin,
          adminRole: rr.role || null
        })
      })
      .catch(err => console.error(err))
      .finally(() => {
        // 结束刷新动画
        this.setData({ refresherTriggered: false })
      })
  },

  onShow() {
    const openid = wx.getStorageSync('openid')
    if (!openid) return
  
    wx.cloud.callFunction({
      name: 'checkAdmin'
    }).then(r => {
      const rr = r.result || {}
      this.setData({
        isAdmin: !!rr.isAdmin,
        adminRole: rr.role || null
      })
    })
  },
  
  // ✅ 不自动登录：只从缓存恢复（让“请先登录”能看到）
  onLoad() {
    const openid = wx.getStorageSync('openid')
    if (openid) {
      this.setData({ openid })
      wx.cloud.callFunction({ name: 'checkAdmin' }).then(r => {
        const rr = r.result || {}
        this.setData({
          isAdmin: !!rr.isAdmin,
          adminRole: rr.role || null
        })        
      })
    } else {
      this.setData({ isAdmin: false })
    }
  },
  
  // ✅ 点击按钮才登录
  doLogin() {
    wx.cloud.callFunction({ name: 'login' })
      .then(res => {
        const openid = res.result.openid
        console.log('登录成功 openid:', openid)
        wx.setStorageSync('openid', openid)
        this.setData({ openid })
        wx.cloud.callFunction({ name: 'checkAdmin' }).then(r => {
          const rr = r.result || {}
          this.setData({
            isAdmin: !!rr.isAdmin,
            adminRole: rr.role || null
         })

        })        
        wx.showToast({ title: '登录成功' })
      })
      .catch(err => {
        console.error('登录失败:', err)
        wx.showToast({ title: '登录失败', icon: 'none' })
      })
  },

  onSecretTap() {
    const now = Date.now()
    const start = this.data._tapStart || 0
  
    // 3 秒内连续点 7 次触发
    if (!start || now - start > 3000) {
      this.setData({ _tapStart: now, _tapCount: 1 })
      return
    }
  
    const nextCount = (this.data._tapCount || 0) + 1
    if (nextCount >= 7) {
      this.setData({ showHiddenAdmin: true, _tapCount: 0, _tapStart: 0 })
      wx.showToast({ title: '管理员申请入口已显示', icon: 'none' })
    } else {
      this.setData({ _tapCount: nextCount })
    }
  },

    // ✅ 管理员：Excel 批量导入
    onImportExcel() {
      if (!this.data.isAdmin) {
        wx.showToast({ title: '仅管理员可用', icon: 'none' })
        return
      }
  
      // 选文件（微信聊天/文件管理器）
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        success: async (res) => {
          try {
            const file = res.tempFiles && res.tempFiles[0]
            if (!file) return
  
            const name = file.name || ''
            const path = file.path
            if (!/\.xlsx$/i.test(name)) {
              wx.showToast({ title: '请上传 .xlsx 文件', icon: 'none' })
              return
            }
  
            this.setData({ importing: true, importResult: null })
            wx.showLoading({ title: '上传并导入中...' })
  
            // 1) 上传到云存储
            const cloudPath = `imports/${Date.now()}_${name}`
            const up = await wx.cloud.uploadFile({
              cloudPath,
              filePath: path
            })
  
            if (!up || !up.fileID) {
              throw new Error('uploadFile failed: no fileID')
            }
  
            // 2) 让云函数去解析 + 批量写库
            const callRes = await wx.cloud.callFunction({
              name: 'compute',
              data: {
                action: 'importExcel',
                fileID: up.fileID
              }
            })
  
            wx.hideLoading()
  
            const r = (callRes && callRes.result) || {}
            if (!r.ok) {
              wx.showToast({ title: r.error || '导入失败', icon: 'none' })
              this.setData({ importing: false })
              return
            }
  
            // r: { ok:true, total, success, failed, errors:[...] }
            this.setData({ importing: false, importResult: r })
            wx.showModal({
              title: '导入完成',
              content: `共 ${r.total || 0} 行\n成功 ${r.success || 0} 行\n失败 ${r.failed || 0} 行`,
              showCancel: false
            })
          } catch (e) {
            wx.hideLoading()
            console.error(e)
            this.setData({ importing: false })
            wx.showToast({ title: '导入异常，请看控制台', icon: 'none' })
          }
        },
        fail: (err) => {
          console.error(err)
        }
      })
    },
    
  // ---------- 输入绑定 ----------
  _setNumber(path, val) {
    const num = Number(val)
    this.setData({ [path]: Number.isFinite(num) ? num : 0 })
  },

  onInputN(e) { this._setNumber('inputs.n', e.detail.value) },
  onInputX(e) { this._setNumber('inputs.x', e.detail.value) },
  onInputK(e) { this._setNumber('inputs.k', e.detail.value) },

  onInputLabBloodCount(e) { this._setNumber('inputs.lab_blood_count', e.detail.value) },
  onInputCleaningCount(e) { this._setNumber('inputs.cleaning_count', e.detail.value) },

  onInputLingual(e) { this._setNumber('inputs.lingual_button_count', e.detail.value) },
  onInputMiniscrew(e) { this._setNumber('inputs.miniscrew_count', e.detail.value) },

  onInputTravelKm(e) { this._setNumber('inputs.travel_km_roundtrip', e.detail.value) },
  onInputTravelStation(e) { this._setNumber('inputs.travel_station_roundtrip', e.detail.value) },

  onInputElasticPerDay(e) { this._setNumber('inputs.elastic_per_day', e.detail.value) },
  onInputElasticDays(e) { this._setNumber('inputs.elastic_days', e.detail.value) },
  onInputCaseBox(e) { this._setNumber('inputs.case_box', e.detail.value) },
  onInputChewie(e) { this._setNumber('inputs.chewie', e.detail.value) },

  onBrandChange(e) { this.setData({ brandIndex: Number(e.detail.value) }) },
  onAgeChange(e) { this.setData({ ageIndex: Number(e.detail.value) }) },

  onTravelModeChange(e) {
    const idx = Number(e.detail.value)
    let unit = 'km'
    if (idx === 4) unit = 'station' // 地铁
    this.setData({
      travelModeIndex: idx,
      travelModeUnit: unit
    })
  },

  // ---------- 核心计算 ----------
  onCompute() {
    const inps = this.data.inputs
    const n = this._safeInt(inps.n)
    const x = this._safeInt(inps.x)
    const k = this._safeInt(inps.k, 8)

    const brandIndex = this.data.brandIndex // 0/1
    const ageIndex = this.data.ageIndex     // 0/1

    // 牙套每套排放因子（g/套）
    const alignerFactor = this._getAlignerFactor(brandIndex, ageIndex)

    const rows = []
    const catSum = {}

    let total = 0

    // --- 影像学：按 n / n+1 ---
    total += this._add(rows, catSum, '影像学检验', '全景片', (n + 1), 2.98)
    total += this._add(rows, catSum, '影像学检验', 'CBCT', n, 6.86)
    total += this._add(rows, catSum, '影像学检验', '头颅侧位片', (n + 1), 1.49)
    total += this._add(rows, catSum, '影像学检验', '正位片', n, 1.49)
    total += this._add(rows, catSum, '影像学检验', '正畸人像照（一套6张）', n, 0.045)
    total += this._add(rows, catSum, '影像学检验', '口内照摄影（一套6张）', (n + 1), 0.045)

    // --- 实验室/洗牙：次数 ---
    total += this._add(rows, catSum, '实验室检验', '血常规＋传染病四项', this._safeInt(inps.lab_blood_count), 770)
    total += this._add(rows, catSum, '洗牙', '洗牙', this._safeInt(inps.cleaning_count), 1250)

    // --- 牙套：k*x；粘接材料：k（仅初诊一次） ---
    total += this._add(rows, catSum, '牙套（算运输）', `牙套（每套）${this._brandAgeLabel(brandIndex, ageIndex)}`, (k * x), alignerFactor)
    total += this._add(rows, catSum, '粘接材料（同牙套）', `粘接材料（每套）${this._brandAgeLabel(brandIndex, ageIndex)}`, k, alignerFactor)

    // --- 一次性耗材 ---
    total += this._add(rows, catSum, '一次性医疗耗材', '无菌手套', x, 65)
    total += this._add(rows, catSum, '一次性医疗耗材', '医用口罩（分摊0.1x）', 0.1 * x, 19.2)
    total += this._add(rows, catSum, '一次性医疗耗材', '口镜（每患者1个）', 1, 91.66)
    total += this._add(rows, catSum, '一次性医疗耗材', '吸唾管', x, 45)
    total += this._add(rows, catSum, '一次性医疗耗材', '消毒棉球（1颗，2x）', 2 * x, 6.45)

    // 事件型：疗程总数
    total += this._add(rows, catSum, '一次性医疗耗材', '舌侧扣（一个）', this._safeInt(inps.lingual_button_count), 6)
    total += this._add(rows, catSum, '一次性医疗耗材', '支抗钉（一个）', this._safeInt(inps.miniscrew_count), 15)

    // --- 交通（地铁按站） ---
    total += this._computeTravel(rows, catSum, x)

    // --- 科室用电：每次复诊固定 1 小时 ---
    total += this._add(rows, catSum, '科室用电', '科室用电（每次按1小时）', 1 * x, 330)

    // --- 正畸附件 ---
    const elasticTotal = this._safeInt(inps.elastic_per_day) * this._safeInt(inps.elastic_days)
    total += this._add(rows, catSum, '正畸附件', '正畸皮筋（0.75g/条）', elasticTotal, 0.75)
    total += this._add(rows, catSum, '正畸附件', '牙套收纳盒（70g/个）', this._safeInt(inps.case_box, 1), 70)
    total += this._add(rows, catSum, '正畸附件', '咬胶（55g/个）', this._safeInt(inps.chewie, 1), 55)

    const categorySums = Object.keys(catSum).map(cat => ({
      category: cat,
      g: this._fmt(catSum[cat])
    })).sort((a, b) => Number(b.g) - Number(a.g))

    const finalResult = {
      ready: true,
      total_g: this._fmt(total),
      total_kg: this._fmt(total / 1000),
      categorySums,
      rows: rows.filter(r => Number(r.g) !== 0)
    }

    // 首页预览
    this.setData({ result: finalResult })

    // 存缓存（结果页读取）
    wx.setStorageSync('calc_result', finalResult)
    wx.setStorageSync('calc_inputs', {
      n, x, k,
      travelModeIndex: this.data.travelModeIndex,
      travel_km_roundtrip: this.data.inputs.travel_km_roundtrip,
      travel_station_roundtrip: this.data.inputs.travel_station_roundtrip
    })

    // 写库：成功后跳转
    wx.cloud.callFunction({
      name: 'saveRecord',
      data: {
        inputs: this.data.inputs,
        result: finalResult
      }
    }).then(res => {
      console.log('保存成功', res)
      wx.navigateTo({ url: '/pages/results/results' })
    }).catch(err => {
      console.error('保存失败', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
      wx.navigateTo({ url: '/pages/results/results' })
    })
  },

  // ---------- 工具函数 ----------
  _add(rows, catSum, category, name, count, gPerUnit) {
    const c = Number(count)
    const g = Number(gPerUnit) * c
    rows.push({ category, name, count: this._fmt(c), g: this._fmt(g) })
    catSum[category] = (catSum[category] || 0) + g
    return g
  },

  _computeTravel(rows, catSum, x) {
    const mode = this.data.travelModeIndex
    const inps = this.data.inputs

    if (mode === 0) {
      this._add(rows, catSum, '交通碳排放', '交通（不计）', 0, 0)
      return 0
    }

    let g = 0
    if (mode === 1) {
      const km = this._safeNumber(inps.travel_km_roundtrip)
      g = 240 * km * x
      rows.push({ category: '交通碳排放', name: '私家车（油）', count: this._fmt(km * x) + ' km', g: this._fmt(g) })
    } else if (mode === 2) {
      const km = this._safeNumber(inps.travel_km_roundtrip)
      g = 60 * km * x
      rows.push({ category: '交通碳排放', name: '私家车（电）', count: this._fmt(km * x) + ' km', g: this._fmt(g) })
    } else if (mode === 3) {
      const km = this._safeNumber(inps.travel_km_roundtrip)
      g = 10 * km * x
      rows.push({ category: '交通碳排放', name: '公交车/电瓶车', count: this._fmt(km * x) + ' km', g: this._fmt(g) })
    } else if (mode === 4) {
      const st = this._safeInt(inps.travel_station_roundtrip)
      g = 100 * st * x
      rows.push({ category: '交通碳排放', name: '地铁（每站）', count: this._fmt(st * x) + ' 站', g: this._fmt(g) })
    }

    catSum['交通碳排放'] = (catSum['交通碳排放'] || 0) + g
    return g
  },

  goHiddenAdmin() {
    wx.navigateTo({ url: '../adminRequest/adminRequest' })
  },
  
  _getAlignerFactor(brandIndex, ageIndex) {
    const table = {
      '0_0': 11.0147,
      '0_1': 10.4872,
      '1_0': 12.7012,
      '1_1': 14.8202
    }
    return table[`${brandIndex}_${ageIndex}`]
  },

  _brandAgeLabel(brandIndex, ageIndex) {
    const b = this.data.brandOptions[brandIndex]
    const a = this.data.ageOptions[ageIndex]
    return `（${a} / ${b}）`
  },

  _safeInt(v, def = 0) {
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : def
  },

  _safeNumber(v, def = 0) {
    const n = Number(v)
    return Number.isFinite(n) ? n : def
  },

  _fmt(num) {
    const n = Number(num)
    if (!Number.isFinite(n)) return '0.000'
    return n.toFixed(3)
  }
})
