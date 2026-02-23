const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// event: { action: 'list' | 'add' | 'updateRole' | 'remove' | 'approveRequest' | 'rejectRequest', openid?: string, role?: string, requestId?: string }
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action

  // 1) 必须是 super_admin
  const me = await db.collection('admins').where({ openid: OPENID }).get()
  const myRole = me.data && me.data[0] && (me.data[0].role || 'admin')
  if (!me.data.length || myRole !== 'super_admin') {
    return { ok: false, error: 'Permission denied' }
  }

  // 2) list
  if (action === 'list') {
    const res = await db.collection('admins').orderBy('createdAt', 'desc').get()
    return { ok: true, admins: res.data }
  }

  // 2.5) listRequests（待审核申请）
if (action === 'listRequests') {
  const res = await db.collection('admin_requests')
    .where({ status: 'pending' })
    .orderBy('createdAt', 'desc')
    .get()
  return { ok: true, requests: res.data }
}

  // 3) 审核申请：approve / reject（注意：这里不需要 event.openid）
  if (action === 'approveRequest') {
    const requestId = event.requestId
    if (!requestId) return { ok: false, error: 'requestId required' }

    const reqRes = await db.collection('admin_requests').doc(requestId).get()
    const req = reqRes && reqRes.data
    if (!req) return { ok: false, error: 'request not found' }
    if (req.status !== 'pending') return { ok: false, error: 'request already handled' }

    const targetOpenid = req.openid

    // 防止重复加到 admins
    const exists = await db.collection('admins').where({ openid: targetOpenid }).get()
    if (exists.data.length === 0) {
      await db.collection('admins').add({
        data: {
          openid: targetOpenid,
          role: 'admin',
          createdAt: Date.now(),
          createdBy: OPENID
        }
      })
    }

    await db.collection('admin_requests').doc(requestId).update({
      data: {
        status: 'approved',
        handledAt: Date.now(),
        handledBy: OPENID
      }
    })

    return { ok: true }
  }

  if (action === 'rejectRequest') {
    const requestId = event.requestId
    if (!requestId) return { ok: false, error: 'requestId required' }

    // 可选：只允许拒绝 pending
    const reqRes = await db.collection('admin_requests').doc(requestId).get()
    const req = reqRes && reqRes.data
    if (!req) return { ok: false, error: 'request not found' }
    if (req.status !== 'pending') return { ok: false, error: 'request already handled' }

    await db.collection('admin_requests').doc(requestId).update({
      data: {
        status: 'rejected',
        handledAt: Date.now(),
        handledBy: OPENID
      }
    })

    return { ok: true }
  }

  // 4) 下面这些操作才需要 openid
  const targetOpenid = (event.openid || '').trim()
  if (!targetOpenid) return { ok: false, error: 'openid is required' }

  // 防止删自己
  if (action === 'remove' && targetOpenid === OPENID) {
    return { ok: false, error: 'cannot remove yourself' }
  }
// updateRemark（保存备注）
if (action === 'updateRemark') {
  const remark = (event.remark || '').trim()

  const found = await db.collection('admins').where({ openid: targetOpenid }).get()
  if (!found.data.length) return { ok: false, error: 'target not found' }

  await db.collection('admins').doc(found.data[0]._id).update({
    data: { remark }
  })

  return { ok: true }
}
  // add
  if (action === 'add') {
    const role = (event.role || 'admin').trim()
    const remark = (event.remark || '').trim()
    if (!['admin', 'super_admin'].includes(role)) return { ok: false, error: 'invalid role' }

    const exists = await db.collection('admins').where({ openid: targetOpenid }).get()
    if (exists.data.length > 0) {
      await db.collection('admins').doc(exists.data[0]._id).update({ data: { role, remark } })
      return { ok: true, msg: 'updated existing', role }
    }

    const addRes = await db.collection('admins').add({
      data: { openid: targetOpenid, role, remark, createdAt: Date.now(), createdBy: OPENID }
    })
    return { ok: true, id: addRes._id, role }
  }

  // updateRole
  if (action === 'updateRole') {
    const role = (event.role || '').trim()
    if (!['admin', 'super_admin'].includes(role)) return { ok: false, error: 'invalid role' }

    const found = await db.collection('admins').where({ openid: targetOpenid }).get()
    if (!found.data.length) return { ok: false, error: 'target not found' }

    await db.collection('admins').doc(found.data[0]._id).update({ data: { role } })
    return { ok: true }
  }

  // remove
  if (action === 'remove') {
    const found = await db.collection('admins').where({ openid: targetOpenid }).get()
    if (!found.data.length) return { ok: true, msg: 'not admin' }

    await db.collection('admins').doc(found.data[0]._id).remove()
    return { ok: true }
  }

  return { ok: false, error: 'unknown action' }
}