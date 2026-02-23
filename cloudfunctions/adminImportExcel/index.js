const cloud = require('wx-server-sdk')
const XLSX = require('xlsx')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function toNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  // 1) 权限：必须是 admin / super_admin
  const me = await db.collection('admins').where({ openid: OPENID }).get()
  const role = me.data && me.data[0] && (me.data[0].role || 'admin')
  if (!me.data.length || !['admin', 'super_admin'].includes(role)) {
    return { ok: false, error: 'Permission denied' }
  }

  // 2) 必须传 fileID（前端先上传到云存储）
  const fileID = event.fileID
  if (!fileID) return { ok: false, error: 'fileID required' }

  // 3) 下载 Excel 到云函数临时目录
  const dl = await cloud.downloadFile({ fileID })
  const buffer = dl.fileContent

  // 4) 解析第一个 sheet
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]

  // 5) 读取为二维数组：第一行当作表头丢弃（你要求从第二行开始）
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true })
  const dataRows = aoa.slice(1).filter(r => r && r.length && String(r[0] ?? '').trim() !== '')

  // 先返回解析情况（下一步再写库）
  return {
    ok: true,
    role,
    sheetName,
    totalRows: dataRows.length,
    preview: dataRows.slice(0, 3) // 预览前3行，方便你确认列顺序
  }
}