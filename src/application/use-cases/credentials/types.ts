import type { Dependencies } from "../../common/types/dependencies";

export type CredentialDependencies = Pick<Dependencies, 
  "vcService" |
  "vaultOperator" |
  "logger" 
>;