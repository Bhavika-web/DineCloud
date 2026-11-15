
const {
  cert,
  getApp,
  getApps,
  initializeApp,
} = require('firebase-admin/app')
const path = require('path')

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json')

const app = getApps().length
  ? getApp()
  : (() => {
      const serviceAccount = require(serviceAccountPath)

      return initializeApp({
        credential: cert(serviceAccount),
      })
    })()

console.info('[FCM] Firebase Admin initialized successfully.')

module.exports = app
