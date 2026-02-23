const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  const res = await db.collection('admins').where({
    openid: wxContext.OPENID
  }).get()

  if (!res.data || res.data.length === 0) {
    return { ok: true, isAdmin: false, role: null }
  }

  const doc = res.data[0]
  return {
    ok: true,
    isAdmin: true,
    role: doc.role || 'admin' // 兼容旧数据没 role 的情况
  }
}
