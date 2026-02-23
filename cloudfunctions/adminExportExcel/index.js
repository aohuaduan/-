const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const xlsx = require('xlsx')
const fs = require('fs')
const path = require('path')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  // 1) 校验管理员
  const adminRes = await db.collection('admins').where({
    openid: wxContext.OPENID
  }).get()

  if (adminRes.data.length === 0) {
    return { ok: false, error: 'Permission denied' }
  }

  // 2) 拉取全部记录（分页）
  const MAX_LIMIT = 100
  const countRes = await db.collection('user_records').count()
  const total = countRes.total

  let records = []
  for (let i = 0; i < total; i += MAX_LIMIT) {
    const res = await db.collection('user_records')
      .orderBy('createdAt', 'desc')
      .skip(i)
      .limit(MAX_LIMIT)
      .get()
    records = records.concat(res.data)
  }

  // 3) 展平为表格行（你后面想加列，改这里最方便）
  const rows = records.map(r => {
    const inputs = r.inputs || {}
    const result = r.result || {}

    return {
      记录ID: r._id,
      创建时间: r.createdAt,
      用户ID: r.openid,
      总排放g: result.total_g,
      总排放kg: result.total_kg,

      n初诊: inputs.n,
      x复诊: inputs.x,
      k套数: inputs.k,

      交通方式: inputs.travelModeIndex,
      往返公里数: inputs.travel_km_roundtrip,
      往返站数: inputs.travel_station_roundtrip,

      血常规次数: inputs.lab_blood_count,
      洗牙次数: inputs.cleaning_count,

      皮筋每天: inputs.elastic_per_day,
      皮筋天数: inputs.elastic_days,

      收纳盒数: inputs.case_box,
      咬胶数: inputs.chewie,

      舌侧扣数: inputs.lingual_button_count,
      支抗钉数: inputs.miniscrew_count
    }
  })

  // 4) 生成 xlsx 到 /tmp
  const wb = xlsx.utils.book_new()
  const ws = xlsx.utils.json_to_sheet(rows)
  xlsx.utils.book_append_sheet(wb, ws, 'records')

  const filename = `user_records_${Date.now()}.xlsx`
  const filepath = path.join('/tmp', filename)
  xlsx.writeFile(wb, filepath)

  // 5) 上传到云存储，返回 fileID
  const uploadRes = await cloud.uploadFile({
    cloudPath: `exports/${filename}`,
    fileContent: fs.createReadStream(filepath)
  })

  return { ok: true, fileID: uploadRes.fileID, total }
}
