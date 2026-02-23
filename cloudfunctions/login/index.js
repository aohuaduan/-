const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { inputs, result } = event

  return await db.collection('user_records').add({
    data: {
      openid: wxContext.OPENID,
      inputs,
      result,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 'v1'
    }
  })
}
