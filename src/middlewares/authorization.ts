import { verify } from 'jsonwebtoken'
import { errors } from '../errors/errors'
import { AccountsController } from '../modules/Accounts/Accounts.controller'
import { logger } from '../utils/Logger/Logger'
import { Vault } from '../utils/Vault/Vault'

const { AuthenticationFailed, ExpiredToken, InvalidToken } = errors

export const extractToken = (ctx: any) => (ctx.header.token ? ctx.header.token : ctx.params.token)

export const authorization = (verifiedAccount: boolean) => {
  return async (ctx: any, next: any) => {
    try {
      const secret = await Vault.readSecret('frost')
      const { jwt } = secret.data
      const decoded = verify(extractToken(ctx).replace('TEST_', ''), jwt)
      const { client_token, email } = decoded as any

      const tokenData = await Vault.verifyToken(client_token)
      const usersController = new AccountsController(verifiedAccount)
      ctx.state.tokenData = tokenData
      ctx.state.user = await usersController.get(email)
      ctx.state.jwtSecret = jwt
      return ctx.state.user ? next() : (ctx.status = 404)
    } catch (e) {
      logger.error('middleware.authorization', e)

      switch (e.message) {
        case 'bad token':
          ctx.throw(ExpiredToken.code, ExpiredToken.message)
          break
        case 'invalid token':
          ctx.throw(InvalidToken.code, InvalidToken.message)
          break
        case 'jwt malformed':
          ctx.throw(InvalidToken.code, InvalidToken.message)
          break
        default:
          ctx.throw(AuthenticationFailed.code, AuthenticationFailed.message)
      }
    }
  }
}
