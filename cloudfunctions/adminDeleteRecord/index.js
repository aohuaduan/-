const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { recordId } = event

  if (!recordId) return { ok: false, error: 'recordId is required' }

  // 校验管理员
  const adminRes = await db.collection('admins').where({
    openid: wxContext.OPENID
  }).get()

  if (adminRes.data.length === 0) {
    return { ok: false, error: 'Permission denied', openid: wxContext.OPENID }
  }

  // 删除
  await db.collection('user_records').doc(recordId).remove()
  return { ok: true, recordId }
}
