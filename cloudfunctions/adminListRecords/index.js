const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  // 1) 校验管理员
  const adminRes = await db.collection('admins').where({
    openid: wxContext.OPENID
  }).get()

  if (adminRes.data.length === 0) {
    return {
      ok: false,
      error: 'Permission denied',
      debug_openid: wxContext.OPENID,
      debug_appid: wxContext.APPID,
      debug_admins_found: adminRes.data
    }
  }
  

  // 2) 分页拉取所有记录
  const MAX_LIMIT = 100
  const countRes = await db.collection('user_records').count()
  const total = countRes.total

  let allRecords = []

  for (let i = 0; i < total; i += MAX_LIMIT) {
    const res = await db.collection('user_records')
      .orderBy('createdAt', 'desc')
      .skip(i)
      .limit(MAX_LIMIT)
      .get()

    allRecords = allRecords.concat(res.data)
  }

  return { ok: true, total, records: allRecords }
}
