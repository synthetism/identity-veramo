
export interface ProofType {
  type: string
  proofValue?: string
  created?: string
  verificationMethod?: string
  proofPurpose?: string
  [x: string]: unknown
}

export interface SynetVerifiableCredential<S extends BaseCredentialSubject = BaseCredentialSubject> {
  '@context': string[]
  id: string
  type: string[]
  issuer: { id: string }
  issuanceDate: string
  expirationDate?: string
  credentialSubject: S
  proof: ProofType
  meta?: {
    version?: string  // e.g. "1.0.0"
    schema?: string   // e.g. "https://synthetism.org/schemas/IpAsset/1.0.0"
  }
}
// Common
export interface SynetHolder {
  id: string          // DID of the entity
  name?: string       // Optional human-readable name
  type?: string       // Optional, like 'did', 'service', 'agent'
  [key: string]: unknown
}

export interface BaseCredentialSubject {
  networkId: string
  [key: string]: unknown
}

export interface RootCredentialSubject extends BaseCredentialSubject {
  holder: SynetHolder;  // Who holds this pool
  poolCidr: string;   // The IP range operated by root
  role?: string;  // Optional role of root - admin, operator, etc.
  url?: string;  // Optional URL for more info
}

export interface OrgCredentialSubject extends BaseCredentialSubject {
  holder: SynetHolder
}

export interface ServiceCredentialSubject extends BaseCredentialSubject {
  holder: SynetHolder
}

export interface GatewayCredentialSubject extends BaseCredentialSubject {
  holder: SynetHolder
  regionId?: string
  cidr?: string
  ip?: string
  ipPoolId?: string
  publicKeyHex?: string // optional, for rotation
}

// Authorization 
export interface OrgAuthorizationSubject extends BaseCredentialSubject {
  holder: SynetHolder       // The org
  authorizedBy: SynetHolder // Root or verifier
  scope?: string // e.g. "network-participation" or "kyc-level-3"
}

export interface GatewayAuthorizationSubject extends BaseCredentialSubject {
  holder: SynetHolder
  regionId: string
  authorizedBy: SynetHolder
  ip: string
  cidr: string
  ipPoolId: string
  validUntil?: string
}

// IP Resources
export interface IpPoolAssetSubject extends BaseCredentialSubject {
  holder: SynetHolder
  cidr: string
  regionId: string
  orgAuthorizationId?: string // optional, for traceability
}

export interface IpAssetSubject extends BaseCredentialSubject {
  holder: SynetHolder
  ip: string
  ipPoolId?: string
}

// Governance

export interface RootPolicySubject extends BaseCredentialSubject {
  holder: SynetHolder
  policyId: string
  version: string
  url?: string
}

export interface NetworkDeclarationSubject extends BaseCredentialSubject {
  networkId: string
  policyId: string
  ipv4?: string
  ipv6?: string
  cidr?: string
  networkType?: string
  topology?: string 
  rootUrl?: string      
}

// Logic types

// Credential = Identity, "I AM"
// Authorization = Contract - "I CAN"
// Policy = Rules  - "I MUST"
// Asset = Resource - "I HAVE / USE / OWN"
// Declaration = Statement - "I DECLARE TO BE TRUE"

// Credential types
export enum CredentialType {
  
  // Identity types

  RootCredential = "RootCredential", 
  ServiceCredential = "ServiceCredential", 
  OrgCredential = "OrgCredential", 
  GatewayCredential = "GatewayCredential", 
  
  // Authorization types
  orgAuthorization = "OrgAuthorization", 
  gatewayAuthorization = "GatewayAuthorization",

  // Asset types

  IpPool = "IpPoolAsset", 
  IpAsset = "IpAsset", 

  // Governance types

  RootPolicy = "RootPolicy", 

  // Informative types

  NetworkDeclaration = "NetworkDeclaration" 
}