const { MongoClient } = require('mongodb')

import { logger } from './utils/Logger/Logger'

import { Token } from './api/Tokens'
import { getToken } from './api/accounts/utils/utils'

async function main() {
  const dbUrl = 'mongodb://localhost:9999'
  const client = await MongoClient.connect(dbUrl)
  const db = client.db('admin')
  const collection = db.collection('accounts')
  const accounts = await collection.find().toArray()

  for (const account of accounts) {
    logger.error(account)
    logger.error({ getToken: getToken(account.email, Token.ApiKey) })
  }

  await client.close()
}

main().catch(console.log)
