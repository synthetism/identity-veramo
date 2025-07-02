import type { Dependencies } from "../../common/types/dependencies";

export type CredentialgDependencies = Pick<Dependencies, 
  "vcService" |
  "vaultOperator" |
  "logger" 
>;