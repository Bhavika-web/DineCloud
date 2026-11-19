
const {
  cert,
  getApp,
  getApps,
  initializeApp,
} = require('firebase-admin/app')

const path = require('path')

let serviceAccount

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  )
} else {
  const serviceAccountPath = path.join(
    __dirname,
    'serviceAccountKey.json'
  )

  serviceAccount = require(serviceAccountPath)
}

const app = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert(serviceAccount),
    })

console.info('[FCM] Firebase Admin initialized successfully.')

module.exports = app
