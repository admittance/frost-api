import {
  configureCreateVerifiableClaim,
  SignedVerifiableClaim,
  VerifiableClaimSigner,
} from '@po.et/poet-js'
import Pino from 'pino'
import { pipeP } from 'ramda'

import { PoetNode, WorkSearchFilters } from '../daos/PoetNodeDao'
import { Network } from '../interfaces/Network'

export interface WorkController {
  readonly getById: (id: string, network: Network) => Promise<SignedVerifiableClaim>
  readonly searchWorks: (filters: WorkSearchFilters, network: Network) => Promise<ReadonlyArray<SignedVerifiableClaim>>
  readonly create: (
    claim: any,
    context: any,
    issuer: string,
    privateKey: string,
    network: Network,
  ) => Promise<SignedVerifiableClaim>
}

interface Arguments {
  readonly dependencies: Dependencies
}

interface Dependencies {
  readonly logger: Pino.Logger
  readonly mainnetNode: PoetNode
  readonly testnetNode: PoetNode
  readonly verifiableClaimSigner: VerifiableClaimSigner
}

export const WorkController = ({
  dependencies: {
    logger,
    mainnetNode,
    testnetNode,
    verifiableClaimSigner,
  },
}: Arguments): WorkController => {
  const networkToNode = (network: Network) => network === Network.LIVE ? mainnetNode : testnetNode

  const getById = async (id: string, network: Network) => {
    const node = networkToNode(network)
    return node.getWorkById(id)
  }

  const searchWorks = async (filters: WorkSearchFilters, network: Network) => {
    const node = networkToNode(network)
    return node.searchWorks(filters)
  }

  const create = async (claim: any, context: any, issuer: string, privateKey: string, network: Network) => {
    const node = networkToNode(network)

    const legacyContext = {
      content: 'schema:text',
    }

    const aboutContext = {
      about: {
        '@id': 'schema:url',
        '@container': '@list',
      },
    }

    const createAndSignClaim = pipeP(
      configureCreateVerifiableClaim({ issuer, context: { ...legacyContext, ...context, ...aboutContext} }),
      verifiableClaimSigner.configureSignVerifiableClaim({ privateKey }),
    )

    const { content, ...newWork } = claim

    const [{ archiveUrl = '', hash = '' }  = {}] = content ? await node.postArchive(content) : []

    const signedVerifiableClaim = await createAndSignClaim({ about: [ archiveUrl ], hash, ...newWork })

    logger.info({ signedVerifiableClaim })

    await node.postWork(signedVerifiableClaim)

    return signedVerifiableClaim
  }

  return {
    getById,
    searchWorks,
    create,
  }
}
